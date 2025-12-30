import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SettlementRepository } from './repositories/settlement.repository';
import { SellerAccountRepository } from './repositories/seller-account.repository';
import { SellerWalletRepository } from './repositories/seller-wallet.repository';
import { SettlementCalculationService } from './services/settlement-calculation.service';
import { SettlementJobService } from './services/settlement-job.service';
import { SettlementAuditService } from './services/settlement-audit.service';
import { RazorpayPayoutService } from './services/razorpay-payout.service';
import { SettlementValidationService } from './services/settlement-validation.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Settlement } from './entities/settlement.entity';
import { SellerAccount } from './entities/seller-account.entity';
import { SellerWallet } from './entities/seller-wallet.entity';

import { 
  SettlementStatus,
  SettlementJobType,
  SettlementJobStatus,
  WalletTransactionType,
  WalletTransactionCategory,
} from './enums/settlement-status.enum';

import { SettlementValidators } from './settlement.validators';

import { 
  CreateSettlementDto,
  ProcessSettlementDto,
  CancelSettlementDto,
  BulkSettlementDto,
  ReconcileSettlementDto,
  RetrySettlementDto,
} from './dtos/create-settlement.dto';

import {
  SettlementFilters,
  PaginationOptions,
  SettlementIncludeOptions,
  PaginatedResult,
} from './interfaces/settlement-repository.interface';

import {
  SettlementCreatedEvent,
  SettlementProcessingStartedEvent,
  SettlementCompletedEvent,
  SettlementFailedEvent,
  SettlementCancelledEvent,
  SettlementReconciledEvent,
  SettlementBatchStartedEvent,
  SettlementBatchCompletedEvent,
  SettlementAuditEvent,
} from './events/settlement.events';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly sellerAccountRepository: SellerAccountRepository,
    private readonly sellerWalletRepository: SellerWalletRepository,
    private readonly settlementCalculationService: SettlementCalculationService,
    private readonly settlementJobService: SettlementJobService,
    private readonly settlementAuditService: SettlementAuditService,
    private readonly razorpayPayoutService: RazorpayPayoutService,
    private readonly settlementValidationService: SettlementValidationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerService: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // SETTLEMENT CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: SettlementFilters = {},
    pagination: PaginationOptions = {},
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: string
  ): Promise<PaginatedResult<Settlement>> {
    this.loggerService.log('SettlementService.findAll', { filters, pagination, userId });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(filters, userId, userRole);

    return this.settlementRepository.findAll(enhancedFilters, pagination, undefined, includes);
  }

  async findById(
    id: string,
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: string
  ): Promise<Settlement> {
    this.loggerService.log('SettlementService.findById', { id, userId });

    const settlement = await this.settlementRepository.findById(id, includes);
    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${id}`);
    }

    // Check access permissions
    await this.checkSettlementAccess(settlement, userId, userRole);

    return settlement;
  }

  async findBySettlementId(
    settlementId: string,
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: string
  ): Promise<Settlement> {
    this.loggerService.log('SettlementService.findBySettlementId', { settlementId, userId });

    const settlement = await this.settlementRepository.findBySettlementId(settlementId, includes);
    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${settlementId}`);
    }

    // Check access permissions
    await this.checkSettlementAccess(settlement, userId, userRole);

    return settlement;
  }

  // ============================================================================
  // SETTLEMENT CREATION
  // ============================================================================

  async createSettlement(dto: CreateSettlementDto): Promise<Settlement> {
    this.loggerService.log('SettlementService.createSettlement', { 
      sellerId: dto.sellerId,
      netAmount: dto.netAmount,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    // Validate input
    SettlementValidators.validateSettlementCreation(dto);
    SettlementValidators.validateSettlementAmounts(dto);

    // Check seller account eligibility
    const sellerAccount = await this.sellerAccountRepository.findBySellerId(dto.sellerId);
    if (!sellerAccount) {
      throw new NotFoundException(`Seller account not found: ${dto.sellerId}`);
    }

    const wallet = await this.sellerWalletRepository.findBySellerId(dto.sellerId);
    if (!wallet) {
      throw new NotFoundException(`Seller wallet not found: ${dto.sellerId}`);
    }

    // Validate settlement eligibility
    SettlementValidators.validateSettlementEligibility(sellerAccount, wallet, dto.netAmount);

    // Check for concurrent settlements
    const existingSettlements = await this.settlementRepository.findBySellerId(
      dto.sellerId,
      { status: [SettlementStatus.PENDING, SettlementStatus.PROCESSING] }
    );
    SettlementValidators.validateConcurrentSettlement(existingSettlements.data);

    // Generate settlement ID
    const settlementId = await this.generateSettlementId();

    // Create settlement entity
    const settlementData = {
      settlementId,
      sellerId: dto.sellerId,
      sellerAccountId: dto.sellerAccountId,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      grossAmount: dto.grossAmount,
      commissionAmount: dto.commissionAmount,
      platformFeeAmount: dto.platformFeeAmount || 0,
      taxAmount: dto.taxAmount || 0,
      adjustmentAmount: dto.adjustmentAmount || 0,
      netAmount: dto.netAmount,
      currency: dto.currency || 'INR',
      status: SettlementStatus.PENDING,
      settlementDate: dto.settlementDate ? new Date(dto.settlementDate) : undefined,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      notes: dto.notes,
      metadata: dto.metadata || {},
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const settlement = await this.settlementRepository.create(settlementData);

    // Emit event
    this.eventEmitter.emit('settlement.created', new SettlementCreatedEvent(
      settlement.settlementId,
      settlement.sellerId,
      settlement.netAmount,
      settlement.currency,
      settlement.periodStart,
      settlement.periodEnd,
      settlement.metadata
    ));

    // Audit log
    await this.settlementAuditService.logAction(
      settlement.id,
      'CREATED',
      dto.createdBy,
      undefined,
      settlement,
      { source: 'manual' }
    );

    this.loggerService.log('Settlement created successfully', {
      settlementId: settlement.settlementId,
      sellerId: settlement.sellerId,
      netAmount: settlement.netAmount,
    });

    return settlement;
  }

  async createBulkSettlements(dto: BulkSettlementDto): Promise<string> {
    this.loggerService.log('SettlementService.createBulkSettlements', {
      sellerCount: dto.sellerIds.length,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    // Validate input
    SettlementValidators.validateDateRange(new Date(dto.periodStart), new Date(dto.periodEnd));
    SettlementValidators.validateBatchSize(dto.batchSize || 100);

    // Create batch job
    const jobId = await this.settlementJobService.createJob({
      type: SettlementJobType.BATCH_SETTLEMENT,
      batchSize: dto.batchSize,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      totalItems: dto.sellerIds.length,
      metadata: {
        sellerIds: dto.sellerIds,
        currency: dto.currency,
        createdBy: dto.createdBy,
        ...dto.metadata,
      },
    });

    // Emit batch started event
    this.eventEmitter.emit('settlement.batch.started', new SettlementBatchStartedEvent(
      jobId,
      jobId,
      dto.sellerIds.length,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      dto.metadata
    ));

    // Process batch asynchronously
    this.processBulkSettlementsAsync(jobId, dto);

    return jobId;
  }

  // ============================================================================
  // SETTLEMENT PROCESSING
  // ============================================================================

  async processSettlement(dto: ProcessSettlementDto): Promise<Settlement> {
    this.loggerService.log('SettlementService.processSettlement', {
      settlementId: dto.settlementId,
      processedBy: dto.processedBy,
    });

    // Find and lock settlement
    const settlement = await this.settlementRepository.lockForProcessing(
      dto.settlementId,
      dto.processedBy
    );

    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${dto.settlementId}`);
    }

    try {
      // Validate processing eligibility
      SettlementValidators.validateSettlementProcessing(settlement);

      // Transition to processing status
      settlement.transitionTo(SettlementStatus.PROCESSING, dto.processedBy);
      
      // Update settlement
      const updatedSettlement = await this.settlementRepository.updateWithVersion(
        settlement.id,
        {
          status: settlement.status,
          processedAt: settlement.processedAt,
          notes: dto.notes,
          metadata: { ...settlement.metadata, ...dto.metadata },
          updatedAt: new Date(),
        },
        settlement.version
      );

      // Emit processing started event
      this.eventEmitter.emit('settlement.processing.started', new SettlementProcessingStartedEvent(
        settlement.settlementId,
        settlement.sellerId,
        settlement.netAmount,
        dto.processedBy,
        dto.metadata
      ));

      // Audit log
      await this.settlementAuditService.logAction(
        settlement.id,
        'PROCESSING_STARTED',
        dto.processedBy,
        { status: SettlementStatus.PENDING },
        { status: SettlementStatus.PROCESSING },
        dto.metadata
      );

      // Process payout asynchronously
      this.processPayoutAsync(updatedSettlement);

      return updatedSettlement;

    } catch (error) {
      // Unlock settlement on error
      await this.settlementRepository.unlock(settlement.id);
      throw error;
    }
  }

  async cancelSettlement(dto: CancelSettlementDto): Promise<Settlement> {
    this.loggerService.log('SettlementService.cancelSettlement', {
      settlementId: dto.settlementId,
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    const settlement = await this.settlementRepository.findBySettlementId(dto.settlementId);
    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${dto.settlementId}`);
    }

    // Validate cancellation
    if (!settlement.canTransitionTo(SettlementStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel settlement in status: ${settlement.status}`
      );
    }

    // Lock settlement
    settlement.lock(dto.cancelledBy);

    try {
      // Transition to cancelled status
      settlement.transitionTo(SettlementStatus.CANCELLED, dto.cancelledBy);

      // Update settlement
      const updatedSettlement = await this.settlementRepository.updateWithVersion(
        settlement.id,
        {
          status: settlement.status,
          notes: dto.notes,
          metadata: { 
            ...settlement.metadata, 
            cancellationReason: dto.reason,
            ...dto.metadata 
          },
          updatedAt: new Date(),
        },
        settlement.version
      );

      // Emit cancelled event
      this.eventEmitter.emit('settlement.cancelled', new SettlementCancelledEvent(
        settlement.settlementId,
        settlement.sellerId,
        settlement.netAmount,
        dto.cancelledBy,
        dto.reason,
        dto.metadata
      ));

      // Audit log
      await this.settlementAuditService.logAction(
        settlement.id,
        'CANCELLED',
        dto.cancelledBy,
        { status: settlement.status },
        { status: SettlementStatus.CANCELLED, cancellationReason: dto.reason },
        dto.metadata
      );

      return updatedSettlement;

    } finally {
      // Unlock settlement
      settlement.unlock();
      await this.settlementRepository.update(settlement.id, {
        lockedAt: settlement.lockedAt,
        lockedBy: settlement.lockedBy,
        version: settlement.version,
      });
    }
  }

  async retrySettlement(dto: RetrySettlementDto): Promise<Settlement> {
    this.loggerService.log('SettlementService.retrySettlement', {
      settlementId: dto.settlementId,
      retriedBy: dto.retriedBy,
    });

    const settlement = await this.settlementRepository.findBySettlementId(dto.settlementId);
    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${dto.settlementId}`);
    }

    // Validate retry eligibility
    if (!settlement.canRetry()) {
      throw new BadRequestException(
        `Settlement cannot be retried. Status: ${settlement.status}, Retry count: ${settlement.retryCount}`
      );
    }

    // Lock settlement
    settlement.lock(dto.retriedBy);

    try {
      // Increment retry count
      settlement.incrementRetryCount();

      // Transition to processing status
      settlement.transitionTo(SettlementStatus.PROCESSING, dto.retriedBy);

      // Update settlement
      const updatedSettlement = await this.settlementRepository.updateWithVersion(
        settlement.id,
        {
          status: settlement.status,
          retryCount: settlement.retryCount,
          nextRetryAt: settlement.nextRetryAt,
          processedAt: settlement.processedAt,
          notes: dto.notes,
          metadata: { ...settlement.metadata, ...dto.metadata },
          updatedAt: new Date(),
        },
        settlement.version
      );

      // Audit log
      await this.settlementAuditService.logAction(
        settlement.id,
        'RETRY_ATTEMPTED',
        dto.retriedBy,
        { retryCount: settlement.retryCount - 1 },
        { retryCount: settlement.retryCount },
        dto.metadata
      );

      // Process payout asynchronously
      this.processPayoutAsync(updatedSettlement);

      return updatedSettlement;

    } finally {
      // Unlock settlement
      settlement.unlock();
      await this.settlementRepository.update(settlement.id, {
        lockedAt: settlement.lockedAt,
        lockedBy: settlement.lockedBy,
        version: settlement.version,
      });
    }
  }

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  async reconcileSettlement(dto: ReconcileSettlementDto): Promise<Settlement> {
    this.loggerService.log('SettlementService.reconcileSettlement', {
      settlementId: dto.settlementId,
      reconciledBy: dto.reconciledBy,
    });

    const settlement = await this.settlementRepository.findBySettlementId(dto.settlementId);
    if (!settlement) {
      throw new NotFoundException(`Settlement not found: ${dto.settlementId}`);
    }

    if (settlement.status !== SettlementStatus.COMPLETED) {
      throw new BadRequestException(
        `Can only reconcile completed settlements. Current status: ${settlement.status}`
      );
    }

    if (settlement.isReconciled) {
      throw new BadRequestException('Settlement is already reconciled');
    }

    // Mark as reconciled
    settlement.markReconciled(dto.reconciledBy);

    // Update settlement
    const updatedSettlement = await this.settlementRepository.update(settlement.id, {
      isReconciled: settlement.isReconciled,
      reconciledAt: settlement.reconciledAt,
      reconciledBy: settlement.reconciledBy,
      notes: dto.notes,
      metadata: { ...settlement.metadata, ...dto.metadata },
      updatedAt: new Date(),
    });

    // Emit reconciled event
    this.eventEmitter.emit('settlement.reconciled', new SettlementReconciledEvent(
      settlement.settlementId,
      settlement.sellerId,
      dto.reconciledBy,
      settlement.reconciledAt!,
      dto.metadata
    ));

    // Audit log
    await this.settlementAuditService.logAction(
      settlement.id,
      'RECONCILED',
      dto.reconciledBy,
      { isReconciled: false },
      { isReconciled: true, reconciledAt: settlement.reconciledAt },
      dto.metadata
    );

    return updatedSettlement;
  }

  // ============================================================================
  // SCHEDULED PROCESSING
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledSettlements(): Promise<void> {
    this.logger.log('Processing scheduled settlements...');

    try {
      // Find settlements ready for processing
      const pendingSettlements = await this.settlementRepository.findPendingSettlements();
      
      if (pendingSettlements.data.length === 0) {
        this.logger.log('No pending settlements found');
        return;
      }

      this.logger.log(`Found ${pendingSettlements.data.length} pending settlements`);

      // Process each settlement
      for (const settlement of pendingSettlements.data) {
        try {
          await this.processSettlement({
            settlementId: settlement.settlementId,
            processedBy: 'SYSTEM',
            metadata: { source: 'scheduled' },
          });
        } catch (error) {
          this.logger.error(`Failed to process settlement ${settlement.settlementId}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Error in scheduled settlement processing:', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async retryFailedSettlements(): Promise<void> {
    this.logger.log('Retrying failed settlements...');

    try {
      // Find settlements ready for retry
      const retryableSettlements = await this.settlementRepository.findRetryableSettlements();
      
      if (retryableSettlements.data.length === 0) {
        this.logger.log('No retryable settlements found');
        return;
      }

      this.logger.log(`Found ${retryableSettlements.data.length} retryable settlements`);

      // Retry each settlement
      for (const settlement of retryableSettlements.data) {
        try {
          if (settlement.shouldRetry()) {
            await this.retrySettlement({
              settlementId: settlement.settlementId,
              retriedBy: 'SYSTEM',
              metadata: { source: 'auto_retry' },
            });
          }
        } catch (error) {
          this.logger.error(`Failed to retry settlement ${settlement.settlementId}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Error in settlement retry processing:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async processPayoutAsync(settlement: Settlement): Promise<void> {
    try {
      // Get seller account
      const sellerAccount = await this.sellerAccountRepository.findById(settlement.sellerAccountId);
      if (!sellerAccount) {
        throw new Error(`Seller account not found: ${settlement.sellerAccountId}`);
      }

      // Process payout via Razorpay
      const payoutResult = await this.razorpayPayoutService.createPayout({
        settlementId: settlement.settlementId,
        amount: settlement.netAmount,
        currency: settlement.currency,
        sellerAccount,
        description: `Settlement payout for period ${settlement.periodStart.toISOString().split('T')[0]} to ${settlement.periodEnd.toISOString().split('T')[0]}`,
        metadata: settlement.metadata,
      });

      // Update settlement with payout data
      settlement.setRazorpayData({
        payoutId: payoutResult.payoutId,
        response: payoutResult.response,
      });

      // Mark as completed if payout is successful
      if (payoutResult.status === 'processed') {
        settlement.transitionTo(SettlementStatus.COMPLETED, 'SYSTEM');
        
        // Emit completed event
        this.eventEmitter.emit('settlement.completed', new SettlementCompletedEvent(
          settlement.settlementId,
          settlement.sellerId,
          settlement.netAmount,
          payoutResult.payoutId,
          settlement.completedAt,
          settlement.metadata
        ));
      }

      // Update settlement in database
      await this.settlementRepository.updateWithVersion(
        settlement.id,
        {
          status: settlement.status,
          razorpayPayoutId: settlement.razorpayPayoutId,
          gatewayResponse: settlement.gatewayResponse,
          completedAt: settlement.completedAt,
          updatedAt: new Date(),
        },
        settlement.version
      );

      // Unlock settlement
      await this.settlementRepository.unlock(settlement.id);

    } catch (error) {
      this.logger.error(`Payout processing failed for settlement ${settlement.settlementId}:`, error);

      // Mark settlement as failed
      settlement.transitionTo(SettlementStatus.FAILED, 'SYSTEM');
      settlement.failureReason = error.message;
      settlement.failureCode = error.code || 'PAYOUT_ERROR';

      // Update settlement
      await this.settlementRepository.updateWithVersion(
        settlement.id,
        {
          status: settlement.status,
          failedAt: settlement.failedAt,
          failureReason: settlement.failureReason,
          failureCode: settlement.failureCode,
          updatedAt: new Date(),
        },
        settlement.version
      );

      // Emit failed event
      this.eventEmitter.emit('settlement.failed', new SettlementFailedEvent(
        settlement.settlementId,
        settlement.sellerId,
        settlement.netAmount,
        settlement.failureReason || 'Unknown error',
        settlement.failureCode,
        settlement.retryCount,
        settlement.metadata
      ));

      // Unlock settlement
      await this.settlementRepository.unlock(settlement.id);
    }
  }

  private async processBulkSettlementsAsync(jobId: string, dto: BulkSettlementDto): Promise<void> {
    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    try {
      // Update job status to running
      await this.settlementJobService.updateJobStatus(jobId, SettlementJobStatus.RUNNING);

      // Process sellers in batches
      const batchSize = dto.batchSize || 100;
      const batches = this.chunkArray(dto.sellerIds, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (sellerId) => {
          try {
            // Calculate settlement for seller
            const settlementData = await this.settlementCalculationService.calculateSettlement(
              sellerId,
              new Date(dto.periodStart),
              new Date(dto.periodEnd),
              dto.currency || 'INR'
            );

            if (settlementData.netAmount > 0) {
              // Create settlement
              await this.createSettlement({
                sellerId: settlementData.sellerId,
                sellerAccountId: settlementData.sellerAccountId,
                periodStart: settlementData.periodStart.toISOString(),
                periodEnd: settlementData.periodEnd.toISOString(),
                grossAmount: settlementData.grossAmount,
                commissionAmount: settlementData.commissionAmount,
                platformFeeAmount: settlementData.platformFeeAmount,
                taxAmount: settlementData.taxAmount,
                adjustmentAmount: settlementData.adjustmentAmount,
                netAmount: settlementData.netAmount,
                currency: settlementData.currency,
                createdBy: dto.createdBy,
                metadata: { 
                  ...dto.metadata, 
                  batchId: jobId,
                  source: 'bulk_creation' 
                },
              });
              successCount++;
            }

          } catch (error) {
            this.logger.error(`Failed to create settlement for seller ${sellerId}:`, error);
            failureCount++;
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);

        // Update job progress
        await this.settlementJobService.updateJobProgress(jobId, successCount + failureCount);
      }

      // Mark job as completed
      await this.settlementJobService.completeJob(jobId, {
        successfulItems: successCount,
        failedItems: failureCount,
        duration: Date.now() - startTime,
      });

      // Emit batch completed event
      this.eventEmitter.emit('settlement.batch.completed', new SettlementBatchCompletedEvent(
        jobId,
        jobId,
        dto.sellerIds.length,
        successCount,
        failureCount,
        Date.now() - startTime,
        dto.metadata
      ));

    } catch (error) {
      this.logger.error(`Bulk settlement processing failed for job ${jobId}:`, error);

      // Mark job as failed
      await this.settlementJobService.failJob(jobId, error.message, {
        processedItems: successCount + failureCount,
      });
    }
  }

  private async generateSettlementId(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `STL_${timestamp}_${random}`.toUpperCase();
  }

  private async applyAccessFilters(
    filters: SettlementFilters,
    userId?: string,
    userRole?: string
  ): Promise<SettlementFilters> {
    // Apply role-based filtering
    if (userRole === 'SELLER' && userId) {
      return { ...filters, sellerId: userId };
    }

    return filters;
  }

  private async checkSettlementAccess(
    settlement: Settlement,
    userId?: string,
    userRole?: string
  ): Promise<void> {
    if (userRole === 'SELLER' && settlement.sellerId !== userId) {
      throw new BadRequestException('Access denied to this settlement');
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}