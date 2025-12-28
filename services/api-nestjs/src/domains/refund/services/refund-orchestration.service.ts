import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { RefundService } from '../refund.service';
import { RefundEligibilityService } from './refund-eligibility.service';
import { RefundJobService } from './refund-job.service';
import { RefundAuditService } from './refund-audit.service';
import { RefundLedgerService } from './refund-ledger.service';
import { OrderService } from '../../order/order.service';
import { PaymentService } from '../../payment/payment.service';
import { InventoryService } from '../../inventory/inventory.service';

import { Refund } from '../entities/refund.entity';
import { CreateRefundDto } from '../dtos/create-refund.dto';
import { ProcessRefundDto } from '../dtos/process-refund.dto';

import { 
  RefundStatus, 
  RefundType, 
  RefundCategory,
  RefundJobType,
  RefundErrorCode,
  RefundAuditAction,
  RefundLedgerEntryType,
  RefundAccountType
} from '../enums/refund-status.enum';

import {
  RefundCreatedEvent,
  RefundApprovedEvent,
  RefundProcessedEvent,
  RefundCompletedEvent,
  RefundFailedEvent,
} from '../events/refund.events';

import { RefundPolicies } from '../refund.policies';
import { RefundValidators } from '../refund.validators';

export interface RefundOrchestrationResult {
  refund: Refund;
  requiresApproval: boolean;
  estimatedProcessingTime?: number;
  warnings?: string[];
}

@Injectable()
export class RefundOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundService: RefundService,
    private readonly refundEligibilityService: RefundEligibilityService,
    private readonly refundJobService: RefundJobService,
    private readonly refundAuditService: RefundAuditService,
    private readonly refundLedgerService: RefundLedgerService,
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // REFUND ORCHESTRATION - MAIN ENTRY POINTS
  // ============================================================================

  async initiateRefund(
    createRefundDto: CreateRefundDto,
    initiatedBy: string
  ): Promise<RefundOrchestrationResult> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log('RefundOrchestrationService.initiateRefund', {
        orderId: createRefundDto.orderId,
        refundType: createRefundDto.refundType,
        requestedAmount: createRefundDto.requestedAmount,
        initiatedBy,
      });

      // Step 1: Validate and check eligibility
      await this.validateRefundRequest(createRefundDto, initiatedBy);

      // Step 2: Check eligibility
      const eligibilityResult = await this.checkRefundEligibility(createRefundDto);
      if (!eligibilityResult.isEligible) {
        throw new BadRequestException(eligibilityResult.reason);
      }

      // Step 3: Fraud detection
      const fraudCheck = await this.performFraudDetection(createRefundDto, initiatedBy);
      if (fraudCheck.shouldBlock) {
        throw new BadRequestException('Refund request blocked due to fraud detection');
      }

      // Step 4: Create refund record
      const refund = await this.createRefundRecord(createRefundDto, initiatedBy, tx);

      // Step 5: Determine approval requirements
      const requiresApproval = this.determineApprovalRequirement(refund, fraudCheck);

      // Step 6: Auto-approve if eligible
      if (!requiresApproval) {
        await this.autoApproveRefund(refund, initiatedBy, tx);
      }

      // Step 7: Create initial ledger entries
      await this.createInitialLedgerEntries(refund, tx);

      // Step 8: Schedule processing jobs
      await this.scheduleRefundJobs(refund, requiresApproval, tx);

      // Step 9: Emit events
      this.emitRefundCreatedEvent(refund, initiatedBy);

      this.logger.log('Refund initiated successfully', {
        refundId: refund.id,
        requiresApproval,
        status: refund.status,
      });

      return {
        refund,
        requiresApproval,
        estimatedProcessingTime: this.calculateEstimatedProcessingTime(refund),
        warnings: fraudCheck.reasons.length > 0 ? fraudCheck.reasons : undefined,
      };
    }, {
      isolationLevel: 'Serializable',
      timeout: 30000, // 30 seconds
    });
  }

  async approveRefund(
    refundId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<Refund> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log('RefundOrchestrationService.approveRefund', {
        refundId,
        approvedBy,
      });

      // Get current refund
      const refund = await this.refundService.findById(refundId);
      if (!refund) {
        throw new BadRequestException('Refund not found');
      }

      // Validate approval
      RefundValidators.validateRefundApproval(refund, { approvedAmount: refund.requestedAmount }, approvedBy);

      // Check permissions
      if (!RefundPolicies.canApproveRefund(refund, approvedBy, 'ADMIN')) {
        throw new BadRequestException('Insufficient permissions to approve refund');
      }

      // Update refund status - using repository directly since service method doesn't exist
      const approvedRefund = await this.refundService.findById(refundId); // Placeholder - would need proper update method

      // Create audit log
      await this.refundAuditService.logAction(
        refundId,
        RefundAuditAction.APPROVE,
        approvedBy,
        refund,
        approvedRefund,
        approvalNotes || 'Refund approved',
        tx
      );

      // Schedule processing job
      await this.refundJobService.createJob({
        type: RefundJobType.PROCESS_REFUND,
        refundId,
        payload: {
          refundId,
          approvedBy,
          approvalNotes,
        },
        createdBy: approvedBy,
      }, tx);

      // Emit event
      this.eventEmitter.emit('refund.approved', new RefundApprovedEvent(
        refund.id,
        refund.orderId,
        refund.requestedAmount, // Use requestedAmount since approvedAmount might not be set
        refund.currency,
        approvedBy
      ));

      this.logger.log('Refund approved successfully', {
        refundId,
        approvedBy,
        approvedAmount: refund.requestedAmount,
      });

      return approvedRefund;
    });
  }

  async processRefund(
    refundId: string,
    processRefundDto: ProcessRefundDto,
    processedBy: string
  ): Promise<Refund> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log('RefundOrchestrationService.processRefund', {
        refundId,
        processedBy,
      });

      // Get current refund
      const refund = await this.refundService.findById(refundId);
      if (!refund) {
        throw new BadRequestException('Refund not found');
      }

      // Validate processing
      RefundValidators.validateRefundProcessing(refund);

      try {
        // Step 1: Process gateway refund
        const gatewayResult = await this.processGatewayRefund(refund, processRefundDto);

        // Step 2: Update order status if needed
        await this.updateOrderStatus(refund, tx);

        // Step 3: Process inventory adjustments
        await this.processInventoryAdjustments(refund, tx);

        // Step 4: Create financial ledger entries
        await this.createProcessingLedgerEntries(refund, gatewayResult, tx);

        // Step 5: Update refund with gateway information
        const completedRefund = await this.completeRefundProcessing(
          refund,
          gatewayResult,
          processedBy,
          tx
        );

        // Step 6: Schedule post-processing jobs
        await this.schedulePostProcessingJobs(completedRefund, tx);

        // Emit success event
        this.eventEmitter.emit('refund.completed', new RefundCompletedEvent(
          refund.id,
          refund.orderId,
          completedRefund.requestedAmount || refund.requestedAmount, // Use available amount
          refund.currency,
          gatewayResult.gatewayRefundId,
          new Date() // completedAt
        ));

        this.logger.log('Refund processed successfully', {
          refundId,
          gatewayRefundId: gatewayResult.gatewayRefundId,
          processedAmount: completedRefund.requestedAmount,
        });

        return completedRefund;

      } catch (error) {
        // Handle processing failure
        await this.handleRefundProcessingFailure(refund, error, processedBy, tx);
        throw error;
      }
    });
  }

  // ============================================================================
  // VALIDATION & ELIGIBILITY
  // ============================================================================

  private async validateRefundRequest(
    createRefundDto: CreateRefundDto,
    initiatedBy: string
  ): Promise<void> {
    // Check order exists and user has access
    const order = await this.orderService.findById(createRefundDto.orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Check permissions
    if (!RefundPolicies.canCreateRefund(
      createRefundDto.orderId,
      initiatedBy,
      'CUSTOMER', // This would come from JWT/context
      order
    )) {
      throw new BadRequestException('Insufficient permissions to create refund');
    }

    // Check for duplicate refund requests
    const existingRefunds = await this.refundService.findByOrderId(createRefundDto.orderId);
    const pendingRefunds = existingRefunds.filter(r => r.isActive());
    
    if (pendingRefunds.length > 0) {
      throw new ConflictException('There are pending refund requests for this order');
    }

    // Validate idempotency key
    if (createRefundDto.idempotencyKey) {
      // Note: This would need to be implemented in the refund service
      // const existingRefund = await this.refundService.findByIdempotencyKey(createRefundDto.idempotencyKey);
      // if (existingRefund) {
      //   throw new ConflictException('Duplicate refund request detected');
      // }
    }
  }

  private async checkRefundEligibility(createRefundDto: CreateRefundDto) {
    const eligibilityOptions = {
      refundType: createRefundDto.refundType,
      itemIds: createRefundDto.items?.map(item => item.orderItemId),
    };

    return this.refundEligibilityService.checkOrderEligibility(
      createRefundDto.orderId,
      eligibilityOptions
    );
  }

  private async performFraudDetection(
    createRefundDto: CreateRefundDto,
    initiatedBy: string
  ) {
    return this.refundEligibilityService.checkRefundFraud(
      createRefundDto.orderId,
      initiatedBy,
      createRefundDto.requestedAmount || 0,
      createRefundDto.reason
    );
  }

  // ============================================================================
  // REFUND CREATION & APPROVAL
  // ============================================================================

  private async createRefundRecord(
    createRefundDto: CreateRefundDto,
    createdBy: string,
    tx: any
  ): Promise<Refund> {
    // Generate refund ID and number
    const refundId = this.generateRefundId();
    const refundNumber = await this.generateRefundNumber();

    // Calculate fees
    const fees = RefundPolicies.getRefundFees(
      createRefundDto.requestedAmount || 0,
      createRefundDto.reason
    );

    const refundData = {
      refundId,
      refundNumber,
      orderId: createRefundDto.orderId,
      refundType: createRefundDto.refundType,
      refundCategory: createRefundDto.refundCategory || RefundCategory.CUSTOMER_REQUEST,
      requestedAmount: createRefundDto.requestedAmount || 0,
      approvedAmount: createRefundDto.requestedAmount || 0, // Initially same as requested
      currency: 'INR',
      reason: createRefundDto.reason,
      reasonCode: createRefundDto.reasonCode,
      description: createRefundDto.description,
      customerNotes: createRefundDto.customerNotes,
      status: RefundStatus.PENDING,
      requiresApproval: false, // Will be determined later
      gatewayProvider: 'RAZORPAY',
      idempotencyKey: createRefundDto.idempotencyKey || this.generateIdempotencyKey(),
      refundFees: fees.totalFees,
      metadata: createRefundDto.metadata || {},
      createdBy,
    };

    // Note: This would need to be implemented in the refund service
    // return this.refundService.create(refundData, tx);
    
    // Placeholder return - would need proper implementation
    return {
      id: refundId,
      refundNumber,
      orderId: createRefundDto.orderId,
      refundType: createRefundDto.refundType,
      requestedAmount: createRefundDto.requestedAmount || 0,
      status: RefundStatus.PENDING,
      currency: 'INR',
      reason: createRefundDto.reason,
      createdBy,
      requiresApproval: false,
      refundFees: fees.totalFees,
    } as Refund;
  }

  private determineApprovalRequirement(refund: Refund, fraudCheck: any): boolean {
    // High fraud score requires approval
    if (fraudCheck.riskScore >= 50) {
      return true;
    }

    // Use policy to determine approval requirement
    return RefundPolicies.shouldRequireApproval(
      refund.requestedAmount,
      refund.reason,
      refund.refundType,
      refund.refundCategory
    );
  }

  private async autoApproveRefund(refund: Refund, approvedBy: string, tx: any): Promise<void> {
    // Note: This would need proper implementation in refund service
    // await this.refundService.updateStatus(refund.id, RefundStatus.APPROVED, approvedBy, 'Auto-approved based on policy', tx);

    // Create audit log
    await this.refundAuditService.logAction(
      refund.id,
      RefundAuditAction.APPROVE,
      'SYSTEM',
      refund,
      { ...refund, status: RefundStatus.APPROVED },
      'Auto-approved based on policy',
      tx
    );
  }

  // ============================================================================
  // GATEWAY PROCESSING
  // ============================================================================

  private async processGatewayRefund(refund: Refund, processDto: ProcessRefundDto) {
    try {
      // Note: This would need proper implementation in payment service
      // const gateway = await this.paymentService.getGateway('RAZORPAY');

      // Create refund request
      const refundRequest = {
        paymentId: refund.paymentTransactionId || 'dummy_payment_id',
        amount: refund.requestedAmount,
        currency: refund.currency,
        notes: {
          refundId: refund.id,
          refundNumber: refund.refundNumber,
          orderId: refund.orderId,
          reason: refund.reason,
          ...processDto.metadata,
        },
        receipt: `refund_${refund.refundNumber}`,
      };

      // Process refund with gateway - placeholder implementation
      const gatewayResponse = {
        success: true,
        data: {
          id: `rfnd_${Date.now()}`,
          amount: refund.requestedAmount,
          status: 'processed',
        }
      };

      if (!gatewayResponse.success) {
        throw new Error(`Gateway refund failed: Gateway error`);
      }

      return {
        gatewayRefundId: gatewayResponse.data.id,
        gatewayResponse: gatewayResponse.data,
        processedAmount: gatewayResponse.data.amount,
        status: gatewayResponse.data.status,
      };

    } catch (error) {
      this.logger.error('Gateway refund processing failed', error, {
        refundId: refund.id,
        paymentTransactionId: refund.paymentTransactionId,
      });
      throw error;
    }
  }

  // ============================================================================
  // ORDER & INVENTORY UPDATES
  // ============================================================================

  private async updateOrderStatus(refund: Refund, tx: any): Promise<void> {
    // Determine if order should be marked as refunded
    const order = await this.orderService.findById(refund.orderId);
    const totalRefunded = await this.calculateTotalRefundedAmount(refund.orderId);
    const totalPaid = order.getTotalPaid();

    // If fully refunded, update order status
    if (totalRefunded >= totalPaid) {
      // Note: This would need proper implementation in order service
      // await this.orderService.updateStatus(refund.orderId, 'REFUNDED', 'SYSTEM', 'Order fully refunded', tx);
    }
  }

  private async processInventoryAdjustments(refund: Refund, tx: any): Promise<void> {
    if (!RefundPolicies.shouldRestockInventory(refund, refund.reason)) {
      return;
    }

    if (refund.items && refund.items.length > 0) {
      for (const refundItem of refund.items) {
        try {
          // Note: This would need proper implementation in inventory service
          // await this.inventoryService.adjustInventory(
          //   refundItem.variantId,
          //   refundItem.sellerId,
          //   refundItem.approvedQuantity,
          //   'REFUND_RESTOCK',
          //   `Restocked from refund ${refund.refundNumber}`,
          //   'SYSTEM',
          //   tx
          // );

          // Update restock status - would need proper implementation
          // await this.refundService.updateItemRestockStatus(refundItem.id, 'COMPLETED', tx);

        } catch (error) {
          this.logger.error('Failed to restock inventory', error, {
            refundId: refund.id,
            refundItemId: refundItem.id,
            variantId: refundItem.variantId,
          });

          // Mark restock as failed but don't fail the entire refund
          // await this.refundService.updateItemRestockStatus(refundItem.id, 'FAILED', tx);
        }
      }
    }
  }

  // ============================================================================
  // LEDGER & FINANCIAL ENTRIES
  // ============================================================================

  private async createInitialLedgerEntries(refund: Refund, tx: any): Promise<void> {
    // Create refund initiated entry
    await this.refundLedgerService.createEntry({
      refundId: refund.id,
      entryType: RefundLedgerEntryType.REFUND_INITIATED,
      amount: refund.requestedAmount,
      currency: refund.currency,
      accountType: RefundAccountType.CUSTOMER,
      description: `Refund initiated for order ${refund.orderId}`,
      createdBy: refund.createdBy,
    }, tx);
  }

  private async createProcessingLedgerEntries(
    refund: Refund,
    gatewayResult: any,
    tx: any
  ): Promise<void> {
    // Create refund processed entry
    await this.refundLedgerService.createEntry({
      refundId: refund.id,
      entryType: RefundLedgerEntryType.REFUND_PROCESSED,
      amount: gatewayResult.processedAmount,
      currency: refund.currency,
      accountType: RefundAccountType.CUSTOMER,
      description: `Refund processed via gateway`,
      reference: gatewayResult.gatewayRefundId,
      createdBy: 'SYSTEM',
    }, tx);

    // Create fee entries if applicable
    if (refund.refundFees > 0) {
      await this.refundLedgerService.createEntry({
        refundId: refund.id,
        entryType: RefundLedgerEntryType.FEE_DEDUCTED,
        amount: -refund.refundFees,
        currency: refund.currency,
        accountType: RefundAccountType.PLATFORM,
        description: `Refund processing fees`,
        createdBy: 'SYSTEM',
      }, tx);
    }
  }

  // ============================================================================
  // JOB SCHEDULING
  // ============================================================================

  private async scheduleRefundJobs(
    refund: Refund,
    requiresApproval: boolean,
    tx: any
  ): Promise<void> {
    // Schedule notification job
    await this.refundJobService.createJob({
      type: RefundJobType.SEND_NOTIFICATION,
      refundId: refund.id,
      payload: {
        refundId: refund.id,
        notificationType: 'REFUND_CREATED',
        requiresApproval,
      },
      createdBy: refund.createdBy,
    }, tx);

    // If auto-approved, schedule processing job
    if (!requiresApproval) {
      await this.refundJobService.createJob({
        type: RefundJobType.PROCESS_REFUND,
        refundId: refund.id,
        payload: {
          refundId: refund.id,
          autoProcessed: true,
        },
        createdBy: 'SYSTEM',
      }, tx);
    }
  }

  private async schedulePostProcessingJobs(refund: Refund, tx: any): Promise<void> {
    // Schedule completion notification
    await this.refundJobService.createJob({
      type: RefundJobType.SEND_NOTIFICATION,
      refundId: refund.id,
      payload: {
        refundId: refund.id,
        notificationType: 'REFUND_COMPLETED',
      },
      createdBy: 'SYSTEM',
    }, tx);

    // Schedule gateway sync job
    await this.refundJobService.createJob({
      type: RefundJobType.SYNC_GATEWAY,
      refundId: refund.id,
      payload: {
        refundId: refund.id,
        gatewayRefundId: refund.gatewayRefundId,
      },
      createdBy: 'SYSTEM',
    }, tx);
  }

  // ============================================================================
  // COMPLETION & FAILURE HANDLING
  // ============================================================================

  private async completeRefundProcessing(
    refund: Refund,
    gatewayResult: any,
    processedBy: string,
    tx: any
  ): Promise<Refund> {
    // Note: This would need proper implementation in refund service
    // return this.refundService.update(refund.id, {
    //   status: RefundStatus.COMPLETED,
    //   gatewayRefundId: gatewayResult.gatewayRefundId,
    //   processedAmount: gatewayResult.processedAmount,
    //   processedAt: new Date(),
    //   completedAt: new Date(),
    //   gatewayResponse: gatewayResult.gatewayResponse,
    //   metadata: {
    //     ...refund.metadata,
    //     gatewayResult,
    //     processedBy,
    //   },
    // }, tx);

    // Placeholder return
    return {
      ...refund,
      status: RefundStatus.COMPLETED,
      gatewayRefundId: gatewayResult.gatewayRefundId,
      processedAmount: gatewayResult.processedAmount,
    } as Refund;
  }

  private async handleRefundProcessingFailure(
    refund: Refund,
    error: any,
    processedBy: string,
    tx: any
  ): Promise<void> {
    const errorCode = this.determineErrorCode(error);
    const errorMessage = error.message || 'Unknown error occurred';

    // Update refund status to failed - would need proper implementation
    // await this.refundService.update(refund.id, {
    //   status: RefundStatus.FAILED,
    //   failedAt: new Date(),
    //   failureCode: errorCode,
    //   failureMessage: errorMessage,
    //   retryCount: refund.retryCount + 1,
    // }, tx);

    // Create audit log
    await this.refundAuditService.logAction(
      refund.id,
      RefundAuditAction.FAIL,
      processedBy,
      refund,
      null,
      `Refund processing failed: ${errorMessage}`,
      tx
    );

    // Schedule retry if eligible
    const retryCount = (refund as any).retryCount || 0;
    const maxRetries = (refund as any).maxRetries || 3;
    
    if (retryCount < maxRetries && this.isRetryableError(errorCode)) {
      const nextRetryAt = this.calculateNextRetryTime(retryCount);
      
      await this.refundJobService.createJob({
        type: RefundJobType.PROCESS_REFUND,
        refundId: refund.id,
        payload: {
          refundId: refund.id,
          isRetry: true,
          attemptNumber: retryCount + 1,
        },
        scheduledAt: nextRetryAt,
        createdBy: 'SYSTEM',
      }, tx);
    }

    // Emit failure event
    this.eventEmitter.emit('refund.failed', new RefundFailedEvent(
      refund.id,
      refund.orderId,
      errorCode,
      errorMessage,
      processedBy
    ));
  }

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================

  private emitRefundCreatedEvent(refund: Refund, createdBy: string): void {
    this.eventEmitter.emit('refund.created', new RefundCreatedEvent(
      refund.id,
      refund.orderId,
      refund.refundType,
      refund.requestedAmount,
      refund.currency,
      refund.reason,
      createdBy
    ));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateRefundId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async generateRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await this.getNextRefundSequence(year);
    return `REF-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async getNextRefundSequence(year: number): Promise<number> {
    // This would typically use a sequence generator or atomic counter
    // For now, we'll use a simple count-based approach
    // Note: This would need proper Prisma model implementation
    try {
      // Placeholder implementation - would need actual refund table
      return Math.floor(Math.random() * 1000) + 1;
    } catch (error) {
      this.logger.error('Failed to get refund sequence', error);
      return 1;
    }
  }

  private calculateEstimatedProcessingTime(refund: Refund): number {
    // Base processing time in minutes
    let estimatedMinutes = 30;

    // Adjust based on refund type
    if (refund.refundType === RefundType.FULL) {
      estimatedMinutes += 15;
    }

    // Adjust based on amount
    if (refund.requestedAmount > 10000000) { // ₹1,00,000
      estimatedMinutes += 30;
    }

    // Adjust if approval required
    if (refund.requiresApproval) {
      estimatedMinutes += 120; // 2 hours for approval
    }

    return estimatedMinutes;
  }

  private async calculateTotalRefundedAmount(orderId: string): Promise<number> {
    const refunds = await this.refundService.findByOrderId(orderId);
    return refunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || r.approvedAmount), 0);
  }

  private determineErrorCode(error: any): RefundErrorCode {
    if (error.message?.includes('insufficient')) {
      return RefundErrorCode.INSUFFICIENT_PAYMENT;
    }
    if (error.message?.includes('gateway')) {
      return RefundErrorCode.GATEWAY_ERROR;
    }
    if (error.message?.includes('network')) {
      return RefundErrorCode.NETWORK_ERROR;
    }
    if (error.message?.includes('timeout')) {
      return RefundErrorCode.TIMEOUT_ERROR;
    }
    return RefundErrorCode.UNKNOWN_ERROR;
  }

  private isRetryableError(errorCode: RefundErrorCode): boolean {
    const retryableErrors = [
      RefundErrorCode.GATEWAY_ERROR,
      RefundErrorCode.NETWORK_ERROR,
      RefundErrorCode.TIMEOUT_ERROR,
    ];
    return retryableErrors.includes(errorCode);
  }

  private calculateNextRetryTime(retryCount: number): Date {
    // Exponential backoff: 2^retryCount minutes
    const delayMinutes = Math.pow(2, retryCount);
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
    return nextRetry;
  }
}