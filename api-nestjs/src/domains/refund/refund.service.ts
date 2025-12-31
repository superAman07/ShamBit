import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RefundRepository } from './repositories/refund.repository';
import { RefundAuditService } from './services/refund-audit.service';
import { RefundEligibilityService } from './services/refund-eligibility.service';
import { RefundCalculationService } from './services/refund-calculation.service';
import { RefundJobService } from './services/refund-job.service';
import { RefundNotificationService } from './services/refund-notification.service';
import { PaymentGatewayService } from '../payment/services/payment-gateway.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderService } from '../order/order.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Refund, RefundItem } from './entities/refund.entity';
import {
  RefundStatus,
  RefundType,
  RefundCategory,
  RefundAuditAction,
  RefundJobType,
  RefundErrorCode,
  getRefundErrorMessage,
  canTransitionRefundStatus,
} from './enums/refund-status.enum';

import { RefundValidators } from './refund.validators';
import { RefundPolicies } from './refund.policies';

import { CreateRefundDto, CreateBulkRefundDto } from './dtos/create-refund.dto';
import {
  UpdateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
} from './dtos/update-refund.dto';
import { RefundQueryDto } from './dtos/refund-query.dto';

import {
  RefundFilters,
  PaginationOptions,
  RefundIncludeOptions,
} from './interfaces/refund-repository.interface';

import {
  RefundCreatedEvent,
  RefundApprovedEvent,
  RefundRejectedEvent,
  RefundProcessedEvent,
  RefundCompletedEvent,
  RefundFailedEvent,
  RefundCancelledEvent,
  RefundStatusChangedEvent,
} from './events/refund.events';

import { UserRole } from '../../common/types/index';
import { PaymentGatewayProvider } from '../payment/enums/payment-status.enum';

@Injectable()
export class RefundService {
  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly refundAuditService: RefundAuditService,
    private readonly refundEligibilityService: RefundEligibilityService,
    private readonly refundCalculationService: RefundCalculationService,
    private readonly refundJobService: RefundJobService,
    private readonly refundNotificationService: RefundNotificationService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly inventoryService: InventoryService,
    private readonly orderService: OrderService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // REFUND CRUD OPERATIONS
  // ============================================================================

  async findAll(
    queryDto: RefundQueryDto,
    userId?: string,
    userRole?: UserRole,
  ) {
    this.logger.log('RefundService.findAll', { queryDto, userId });

    // Convert query DTO to filters
    const filters = this.buildFiltersFromQuery(queryDto, userId, userRole);
    const pagination = this.buildPaginationFromQuery(queryDto);
    const includes = this.buildIncludesFromQuery(queryDto);

    return this.refundRepository
      .findAll(filters, pagination, includes)
      .then((result) => {
        // Placeholder implementation - return empty result structure
        return {
          data: [],
          total: 0,
          page: pagination.offset
            ? Math.floor(pagination.offset / (pagination.limit || 10)) + 1
            : 1,
          limit: pagination.limit || 10,
        };
      });
  }

  async findById(
    id: string,
    includes: RefundIncludeOptions = {},
    userId?: string,
    userRole?: UserRole,
  ): Promise<Refund> {
    const refund = await this.refundRepository.findById(id, includes);
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    // Check access permissions
    await this.checkRefundAccess(refund, userId, userRole, 'VIEW');

    return refund;
  }

  async findByOrderId(
    orderId: string,
    filters: RefundFilters = {},
    pagination: PaginationOptions = {},
    includes: RefundIncludeOptions = {},
    userId?: string,
    userRole?: UserRole,
  ): Promise<Refund[]> {
    // Check order access
    const order = await this.orderService.findById(orderId);

    const enhancedFilters = { ...filters, orderId };
    return this.refundRepository.findAll(enhancedFilters, pagination, includes);
  }

  async updateStatus(
    refundId: string,
    newStatus: string,
    updatedBy: string,
    reason?: string,
  ): Promise<any> {
    this.logger.log('RefundService.updateStatus', {
      refundId,
      newStatus,
      updatedBy,
    });
    // TODO: Implement status update
    return { id: refundId, status: newStatus };
  }

  async update(refundId: string, updateData: any): Promise<any> {
    this.logger.log('RefundService.update', { refundId, updateData });
    // TODO: Implement refund update
    return { id: refundId, ...updateData };
  }

  async createRefund(
    createRefundDto: CreateRefundDto,
    createdBy: string,
    userRole: UserRole = UserRole.CUSTOMER,
  ): Promise<Refund> {
    this.logger.log('RefundService.createRefund', {
      orderId: createRefundDto.orderId,
      refundType: createRefundDto.refundType,
      createdBy,
    });

    // Note: Transaction logic would be implemented with proper database service
    try {
      // Get order with items and existing refunds
      const order = await this.orderService.findById(createRefundDto.orderId, {
        includeItems: true,
        includeRefunds: true,
        includePayments: true,
      });

      // Check permissions
      if (
        !RefundPolicies.canCreateRefund(order.id, createdBy, userRole, order)
      ) {
        throw new ForbiddenException(
          'Insufficient permissions to create refund',
        );
      }

      // Validate refund creation
      RefundValidators.validateRefundCreation(
        createRefundDto,
        order,
        order.refunds || [],
      );

      // Check eligibility
      let eligibilityResult;
      if (
        createRefundDto.refundType === RefundType.ITEM_LEVEL &&
        createRefundDto.items
      ) {
        // For item-level refunds, check each item
        eligibilityResult = { isEligible: true, reason: null };
        for (const item of createRefundDto.items) {
          const itemEligibility =
            await this.refundEligibilityService.checkItemEligibility(
              order.id,
              item.orderItemId,
              item.requestedQuantity,
            );
          if (!itemEligibility.isEligible) {
            eligibilityResult = itemEligibility;
            break;
          }
        }
      } else {
        // For full/partial refunds, check order eligibility
        eligibilityResult =
          await this.refundEligibilityService.checkOrderEligibility(order.id);
      }

      if (!eligibilityResult.isEligible) {
        throw new BadRequestException(
          eligibilityResult.reason || 'Refund not eligible',
        );
      }

      // Get applicable policy
      const refundPolicy = await this.getApplicablePolicy(order);

      // Validate business rules
      RefundValidators.validateBusinessRules(
        createRefundDto,
        order,
        refundPolicy,
      );

      // Calculate refund amounts
      const calculationResult =
        await this.refundCalculationService.calculateRefundAmount(
          order,
          createRefundDto.items,
        );

      // Generate unique identifiers
      const refundId = this.generateRefundId();
      const refundNumber = await this.generateRefundNumber();
      const idempotencyKey =
        createRefundDto.idempotencyKey || this.generateIdempotencyKey(refundId);

      // Check for duplicate idempotency key
      // Note: This would need to be implemented in the repository
      // const existingRefund = await this.refundRepository.findByIdempotencyKey(idempotencyKey);
      // if (existingRefund) {
      //   this.logger.log('Duplicate refund request detected', { idempotencyKey, existingRefundId: existingRefund.id });
      //   return existingRefund;
      // }

      // Determine if approval is required
      const requiresApproval = RefundPolicies.shouldRequireApproval(
        calculationResult.maxRefundAmount,
        createRefundDto.reason,
        createRefundDto.refundType,
        createRefundDto.refundCategory || RefundCategory.CUSTOMER_REQUEST,
        refundPolicy,
      );

      // Create refund record
      const refundData = {
        refundId,
        refundNumber,
        orderId: order.id,
        paymentIntentId: this.getLatestPaymentIntentId(order),
        paymentTransactionId: this.getLatestSuccessfulTransaction(order)?.id,
        refundType: createRefundDto.refundType,
        refundCategory:
          createRefundDto.refundCategory || RefundCategory.CUSTOMER_REQUEST,
        requestedAmount: calculationResult.maxRefundAmount,
        approvedAmount: requiresApproval
          ? 0
          : calculationResult.maxRefundAmount,
        currency: order.currency || 'INR',
        reason: createRefundDto.reason,
        reasonCode: createRefundDto.reasonCode,
        description: createRefundDto.description,
        customerNotes: createRefundDto.customerNotes,
        merchantNotes: createRefundDto.merchantNotes,
        status: requiresApproval ? RefundStatus.PENDING : RefundStatus.APPROVED,
        requiresApproval,
        gatewayProvider: PaymentGatewayProvider.RAZORPAY,
        idempotencyKey,
        eligibilityChecked: true,
        eligibilityResult: eligibilityResult,
        restockRequired:
          createRefundDto.restockRequired ??
          RefundPolicies.shouldRestockInventory(
            {
              refundType: createRefundDto.refundType,
              reason: createRefundDto.reason,
            } as Refund,
            createRefundDto.reason,
          ),
        refundFees: calculationResult.refundFees,
        adjustmentAmount: calculationResult.refundFees,
        metadata: createRefundDto.metadata || {},
        tags: createRefundDto.tags || [],
        createdBy,
      };

      const refund = await this.refundRepository.create(refundData);

      // Create refund items for item-level refunds
      if (
        createRefundDto.refundType === RefundType.ITEM_LEVEL &&
        createRefundDto.items
      ) {
        for (const itemDto of createRefundDto.items) {
          const orderItem = order.items?.find(
            (item) => item.id === itemDto.orderItemId,
          );
          if (orderItem) {
            await this.refundRepository.createItem({
              refundId: refund.id,
              orderItemId: itemDto.orderItemId,
              variantId: orderItem.variantId,
              productId: orderItem.productId,
              sellerId: orderItem.sellerId,
              sku: orderItem.sku,
              productName: orderItem.productName,
              variantName: orderItem.variantName,
              requestedQuantity: itemDto.requestedQuantity,
              approvedQuantity: requiresApproval
                ? 0
                : itemDto.requestedQuantity,
              unitPrice: orderItem.unitPrice,
              totalAmount: orderItem.unitPrice * itemDto.requestedQuantity,
              reason: itemDto.reason,
              reasonCode: itemDto.reasonCode,
              condition: itemDto.condition,
              restockQuantity: itemDto.requestedQuantity,
              restockStatus: 'PENDING',
              itemSnapshot: orderItem,
            });
          }
        }
      }

      // Create initial ledger entry
      await this.refundRepository.createLedgerEntry({
        refundId: refund.id,
        entryType: 'REFUND_INITIATED',
        amount: calculationResult.maxRefundAmount,
        currency: refund.currency,
        accountType: 'CUSTOMER',
        accountId: order.customerId,
        description: `Refund initiated for order ${order.orderNumber}`,
        metadata: { orderId: order.id, refundType: createRefundDto.refundType },
        createdBy,
      });

      // Create audit log
      await this.refundAuditService.logAction(
        refund.id,
        RefundAuditAction.CREATE,
        createdBy,
        null,
        refund,
        'Refund created',
      );

      // Emit event
      this.eventEmitter.emit(
        'refund.created',
        new RefundCreatedEvent(
          refund.id,
          refund.orderId,
          refund.refundType,
          refund.requestedAmount,
          refund.currency,
          refund.reason,
          createdBy,
        ),
      );

      // Auto-process if no approval required
      if (!requiresApproval) {
        await this.scheduleRefundProcessing(refund.id, createdBy);
      }

      // Send notifications
      await this.refundNotificationService.sendRefundInitiatedNotification({
        refundId: refund.id,
        orderId: refund.orderId,
        customerId: order.customerId,
        amount: refund.requestedAmount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
      });

      this.logger.log('Refund created successfully', {
        refundId: refund.id,
        refundNumber: refund.refundNumber,
        amount: refund.requestedAmount,
        requiresApproval,
      });

      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async checkRefundAccess(
    refund: Refund,
    userId?: string,
    userRole?: UserRole,
    action: string = 'VIEW',
  ): Promise<void> {
    if (!userId || !userRole) {
      return; // Skip access check if no user context
    }

    RefundValidators.validateRefundPermissions(
      refund,
      userId,
      userRole,
      action,
    );
  }

  private generateRefundId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.refundRepository.getRefundCountForYear(year);
    return `REF-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private generateIdempotencyKey(refundId: string): string {
    return `refund_${refundId}_${Date.now()}`;
  }

  private getLatestSuccessfulTransaction(order: any): any {
    return order.payments
      ?.find((p: any) => p.status === 'COMPLETED')
      ?.transactions?.find((t: any) => t.status === 'SUCCEEDED');
  }

  private getLatestPaymentIntentId(order: any): string | undefined {
    return order.payments?.find((p: any) => p.status === 'COMPLETED')
      ?.paymentIntentId;
  }

  private async getApplicablePolicy(order: any): Promise<any> {
    // Get seller-specific policy or default policy
    // This would typically query the RefundPolicy table
    return RefundPolicies.getDefaultRefundPolicy();
  }

  private async scheduleRefundProcessing(
    refundId: string,
    scheduledBy: string,
  ): Promise<void> {
    await this.refundJobService.createJob({
      type: RefundJobType.PROCESS_REFUND,
      refundId,
      payload: { refundId },
      createdBy: scheduledBy,
    });
  }

  // Query building helpers
  private buildFiltersFromQuery(
    queryDto: RefundQueryDto,
    userId?: string,
    userRole?: UserRole,
  ): RefundFilters {
    const filters: RefundFilters = {};

    // Apply role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      filters.createdBy = userId;
    } else if (userRole === UserRole.MERCHANT) {
      filters.sellerId = userId;
    }

    // Apply query filters
    if (queryDto.orderId) filters.orderId = queryDto.orderId;
    if (queryDto.customerId) filters.customerId = queryDto.customerId;
    if (queryDto.sellerId) filters.sellerId = queryDto.sellerId;
    if (queryDto.status) filters.status = queryDto.status;
    if (queryDto.statuses) filters.statuses = queryDto.statuses;
    if (queryDto.refundType) filters.refundType = queryDto.refundType;
    if (queryDto.refundCategory)
      filters.refundCategory = queryDto.refundCategory;
    if (queryDto.reason) filters.reason = queryDto.reason;
    if (queryDto.gatewayRefundId)
      filters.gatewayRefundId = queryDto.gatewayRefundId;
    if (queryDto.refundNumber) filters.refundNumber = queryDto.refundNumber;
    if (queryDto.minAmount) filters.minAmount = queryDto.minAmount;
    if (queryDto.maxAmount) filters.maxAmount = queryDto.maxAmount;
    if (queryDto.createdAfter)
      filters.createdAfter = new Date(queryDto.createdAfter);
    if (queryDto.createdBefore)
      filters.createdBefore = new Date(queryDto.createdBefore);
    if (queryDto.processedAfter)
      filters.processedAfter = new Date(queryDto.processedAfter);
    if (queryDto.processedBefore)
      filters.processedBefore = new Date(queryDto.processedBefore);
    if (queryDto.search) filters.search = queryDto.search;
    if (queryDto.tags) filters.tags = queryDto.tags;

    return filters;
  }

  private buildPaginationFromQuery(
    queryDto: RefundQueryDto,
  ): PaginationOptions {
    return {
      limit: queryDto.limit,
      offset: queryDto.offset,
      cursor: queryDto.cursor,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
    };
  }

  private buildIncludesFromQuery(
    queryDto: RefundQueryDto,
  ): RefundIncludeOptions {
    return {
      includeOrder: queryDto.includeOrder,
      includeItems: queryDto.includeItems,
      includeLedger: queryDto.includeLedger,
      includeAuditLogs: queryDto.includeAuditLogs,
    };
  }
}
