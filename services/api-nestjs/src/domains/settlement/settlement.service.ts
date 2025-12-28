import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SettlementRepository } from './repositories/settlement.repository';
import { SettlementAuditService } from './services/settlement-audit.service';
import { SettlementCalculationService } from './services/settlement-calculation.service';
import { SettlementJobService } from './services/settlement-job.service';
import { PaymentGatewayService } from '../payment/services/payment-gateway.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Settlement } from './entities/settlement.entity';
import { SettlementTransaction } from './entities/settlement-transaction.entity';
import { SellerAccount } from './entities/seller-account.entity';
import { SettlementSchedule } from './entities/settlement-schedule.entity';
import { SettlementJob } from './entities/settlement-job.entity';

import { 
  SettlementStatus,
  SettlementJobType,
  SettlementJobStatus,
  SellerAccountStatus,
  KycStatus,
} from './enums/settlement-status.enum';

import { SettlementValidators } from './settlement.validators';
import { SettlementPolicies } from './settlement.policies';

import { CreateSettlementDto } from './dtos/create-settlement.dto';
import { ProcessSettlementDto } from './dtos/process-settlement.dto';
import { CreateSellerAccountDto } from './dtos/create-seller-account.dto';
import { UpdateSettlementScheduleDto } from './dtos/update-settlement-schedule.dto';

import {
  SettlementFilters,
  PaginationOptions,
  SettlementIncludeOptions,
} from './interfaces/settlement-repository.interface';

import {
  SettlementCreatedEvent,
  SettlementProcessedEvent,
  SettlementSettledEvent,
  SettlementFailedEvent,
  SellerAccountCreatedEvent,
  SellerAccountVerifiedEvent,
} from './events/settlement.events';

import { UserRole } from '../../common/types';
import { PaymentGatewayProvider } from '../payment/enums/payment-status.enum';

@Injectable()
export class SettlementService {
  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly settlementAuditService: SettlementAuditService,
    private readonly settlementCalculationService: SettlementCalculationService,
    private readonly settlementJobService: SettlementJobService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // SETTLEMENT CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: SettlementFilters = {},
    pagination: PaginationOptions = {},
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('SettlementService.findAll', { filters, pagination, userId });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(filters, userId, userRole);

    return this.settlementRepository.findAll(enhancedFilters, pagination, includes);
  }

  async findById(
    id: string,
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Settlement> {
    const settlement = await this.settlementRepository.findById(id, includes);
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    // Check access permissions
    await this.checkSettlementAccess(settlement, userId, userRole);

    return settlement;
  }

  async findBySellerId(
    sellerId: string,
    filters: SettlementFilters = {},
    pagination: PaginationOptions = {},
    includes: SettlementIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Settlement[]> {
    // Check access permissions
    if (!SettlementPolicies.canAccessSellerSettlements(sellerId, userId, userRole)) {
      throw new BadRequestException('Access denied to seller settlements');
    }

    const enhancedFilters = { ...filters, sellerId };
    return this.settlementRepository.findAll(enhancedFilters, pagination, includes);
  }

  // ============================================================================
  // SETTLEMENT CREATION & CALCULATION
  // ============================================================================

  async createSettlement(
    createSettlementDto: CreateSettlementDto,
    createdBy: string
  ): Promise<Settlement> {
    this.logger.log('SettlementService.createSettlement', {
      sellerId: createSettlementDto.sellerId,
      periodStart: createSettlementDto.periodStart,
      periodEnd: createSettlementDto.periodEnd,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // Validate seller account exists and is active
      const sellerAccount = await this.getSellerAccount(createSettlementDto.sellerId);
      SettlementValidators.validateSellerAccountForSettlement(sellerAccount);

      // Check for existing settlement in the same period
      const existingSettlement = await this.settlementRepository.findBySellerAndPeriod(
        createSettlementDto.sellerId,
        createSettlementDto.periodStart,
        createSettlementDto.periodEnd
      );

      if (existingSettlement) {
        throw new ConflictException('Settlement already exists for this period');
      }

      // Calculate settlement amounts
      const calculationResult = await this.settlementCalculationService.calculateSettlement({
        sellerId: createSettlementDto.sellerId,
        periodStart: createSettlementDto.periodStart,
        periodEnd: createSettlementDto.periodEnd,
        currency: createSettlementDto.currency || 'INR',
      });

      if (calculationResult.transactions.length === 0) {
        throw new BadRequestException('No transactions found for settlement period');
      }

      // Create settlement record
      const settlementData = {
        settlementId: this.generateSettlementId(),
        sellerId: createSettlementDto.sellerId,
        sellerAccountId: sellerAccount.accountId,
        settlementDate: createSettlementDto.settlementDate || new Date(),
        periodStart: createSettlementDto.periodStart,
        periodEnd: createSettlementDto.periodEnd,
        grossAmount: calculationResult.grossAmount,
        fees: calculationResult.totalFees,
        tax: calculationResult.totalTax,
        netAmount: calculationResult.netAmount,
        currency: createSettlementDto.currency || 'INR',
        status: SettlementStatus.PENDING,
        gatewayProvider: PaymentGatewayProvider.RAZORPAY,
        bankAccount: sellerAccount.getBankAccountSnapshot(),
        metadata: createSettlementDto.metadata || {},
        notes: createSettlementDto.notes,
        createdBy,
      };

      const settlement = await this.settlementRepository.create(settlementData, tx);

      // Create settlement transactions
      for (const transaction of calculationResult.transactions) {
        await this.settlementRepository.createTransaction({
          settlementId: settlement.id,
          paymentTransactionId: transaction.paymentTransactionId,
          orderId: transaction.orderId,
          orderNumber: transaction.orderNumber,
          transactionAmount: transaction.transactionAmount,
          platformFee: transaction.platformFee,
          gatewayFee: transaction.gatewayFee,
          tax: transaction.tax,
          netAmount: transaction.netAmount,
          transactionDate: transaction.transactionDate,
          paymentMethod: transaction.paymentMethod,
          customerId: transaction.customerId,
          customerEmail: transaction.customerEmail,
          productDetails: transaction.productDetails,
        }, tx);
      }

      // Create audit log
      await this.settlementAuditService.logAction(
        settlement.id,
        'CREATE',
        createdBy,
        null,
        settlement,
        'Settlement created',
        tx
      );

      // Emit event
      this.eventEmitter.emit('settlement.created', new SettlementCreatedEvent(
        settlement.id,
        settlement.sellerId,
        settlement.netAmount,
        settlement.currency,
        settlement.periodStart,
        settlement.periodEnd,
        createdBy
      ));

      this.logger.log('Settlement created successfully', {
        settlementId: settlement.id,
        sellerId: settlement.sellerId,
        netAmount: settlement.netAmount,
        transactionCount: calculationResult.transactions.length,
      });

      return settlement;
    }, {
      isolationLevel: 'Serializable',
    });
  }

  // ============================================================================
  // SETTLEMENT PROCESSING
  // ============================================================================

  async processSettlement(
    id: string,
    processSettlementDto: ProcessSettlementDto,
    processedBy: string
  ): Promise<Settlement> {
    this.logger.log('SettlementService.processSettlement', {
      settlementId: id,
      processedBy,
    });

    return this.prisma.$transaction(async (tx) => {
      const settlement = await this.findById(id);

      // Check permissions
      await this.checkSettlementAccess(settlement, processedBy);

      // Validate processing
      SettlementValidators.validateSettlementProcessing(settlement);

      // Update status to processing
      const updatedSettlement = await this.updateSettlementStatus(
        settlement,
        SettlementStatus.PROCESSING,
        processedBy,
        tx
      );

      // Get Razorpay gateway
      const gateway = await this.paymentGatewayService.getGateway(PaymentGatewayProvider.RAZORPAY);

      try {
        // Create transfer to seller account
        const transferResponse = await gateway.createTransfer({
          account: settlement.sellerAccountId,
          amount: settlement.netAmount,
          currency: settlement.currency,
          notes: {
            settlementId: settlement.id,
            sellerId: settlement.sellerId,
            periodStart: settlement.periodStart.toISOString(),
            periodEnd: settlement.periodEnd.toISOString(),
            ...processSettlementDto.metadata,
          },
        });

        if (!transferResponse.success) {
          throw new Error(`Transfer failed: ${transferResponse.error?.message}`);
        }

        // Update settlement with gateway information
        const finalSettlement = await this.settlementRepository.update(
          settlement.id,
          {
            gatewaySettlementId: transferResponse.data.id,
            processedAt: new Date(),
            status: SettlementStatus.SETTLED,
            metadata: {
              ...settlement.metadata,
              gatewayTransfer: transferResponse.data,
              processedBy,
            },
          },
          tx
        );

        // Create audit log
        await this.settlementAuditService.logAction(
          settlement.id,
          'PROCESS',
          processedBy,
          settlement,
          finalSettlement,
          'Settlement processed successfully',
          tx
        );

        // Emit success event
        this.eventEmitter.emit('settlement.processed', new SettlementProcessedEvent(
          settlement.id,
          settlement.sellerId,
          settlement.netAmount,
          settlement.currency,
          transferResponse.data.id,
          processedBy
        ));

        this.logger.log('Settlement processed successfully', {
          settlementId: settlement.id,
          gatewayTransferId: transferResponse.data.id,
          amount: settlement.netAmount,
        });

        return finalSettlement;

      } catch (error) {
        // Handle processing failure
        await this.handleSettlementFailure(
          settlement,
          error.message,
          'PROCESSING_FAILED',
          processedBy,
          tx
        );

        throw new BadRequestException(`Settlement processing failed: ${error.message}`);
      }
    });
  }

  // ============================================================================
  // SELLER ACCOUNT MANAGEMENT
  // ============================================================================

  async createSellerAccount(
    createSellerAccountDto: CreateSellerAccountDto,
    createdBy: string
  ): Promise<SellerAccount> {
    this.logger.log('SettlementService.createSellerAccount', {
      sellerId: createSellerAccountDto.sellerId,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // Check if seller account already exists
      const existingAccount = await this.settlementRepository.findSellerAccountBySellerId(
        createSellerAccountDto.sellerId
      );

      if (existingAccount) {
        throw new ConflictException('Seller account already exists');
      }

      // Validate business details
      SettlementValidators.validateBusinessDetails(createSellerAccountDto.businessDetails);

      // Create Razorpay linked account
      const gateway = await this.paymentGatewayService.getGateway(PaymentGatewayProvider.RAZORPAY);
      
      // Note: This would require Razorpay Route API for creating linked accounts
      // For now, we'll create a placeholder account ID
      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sellerAccountData = {
        sellerId: createSellerAccountDto.sellerId,
        accountId,
        accountType: createSellerAccountDto.accountType || 'LINKED',
        status: SellerAccountStatus.CREATED,
        businessDetails: createSellerAccountDto.businessDetails,
        bankAccounts: createSellerAccountDto.bankAccounts || [],
        primaryBankId: createSellerAccountDto.primaryBankId,
        kycStatus: KycStatus.PENDING,
        kycDocuments: createSellerAccountDto.kycDocuments || [],
        settlementSchedule: createSellerAccountDto.settlementSchedule || {},
        createdBy,
      };

      const sellerAccount = await this.settlementRepository.createSellerAccount(sellerAccountData, tx);

      // Create default settlement schedule
      await this.createDefaultSettlementSchedule(sellerAccount.sellerId, createdBy, tx);

      // Create audit log
      await this.settlementAuditService.logAction(
        null,
        'CREATE_SELLER_ACCOUNT',
        createdBy,
        null,
        sellerAccount,
        'Seller account created',
        tx
      );

      // Emit event
      this.eventEmitter.emit('seller.account.created', new SellerAccountCreatedEvent(
        sellerAccount.id,
        sellerAccount.sellerId,
        sellerAccount.accountId,
        createdBy
      ));

      this.logger.log('Seller account created successfully', {
        sellerAccountId: sellerAccount.id,
        sellerId: sellerAccount.sellerId,
        accountId: sellerAccount.accountId,
      });

      return sellerAccount;
    });
  }

  async getSellerAccount(sellerId: string): Promise<SellerAccount> {
    const sellerAccount = await this.settlementRepository.findSellerAccountBySellerId(sellerId);
    if (!sellerAccount) {
      throw new NotFoundException('Seller account not found');
    }
    return sellerAccount;
  }

  async updateSellerAccountStatus(
    sellerId: string,
    status: SellerAccountStatus,
    updatedBy: string,
    notes?: string
  ): Promise<SellerAccount> {
    this.logger.log('SettlementService.updateSellerAccountStatus', {
      sellerId,
      status,
      updatedBy,
    });

    return this.prisma.$transaction(async (tx) => {
      const sellerAccount = await this.getSellerAccount(sellerId);

      // Validate status transition
      SettlementValidators.validateSellerAccountStatusTransition(sellerAccount.status, status);

      const updatedAccount = await this.settlementRepository.updateSellerAccount(
        sellerAccount.id,
        {
          status,
          verifiedAt: status === SellerAccountStatus.ACTIVATED ? new Date() : undefined,
          verificationNotes: notes,
          updatedBy,
        },
        tx
      );

      // Create audit log
      await this.settlementAuditService.logAction(
        null,
        'UPDATE_SELLER_ACCOUNT_STATUS',
        updatedBy,
        sellerAccount,
        updatedAccount,
        `Status changed to ${status}${notes ? `: ${notes}` : ''}`,
        tx
      );

      // Emit verification event if activated
      if (status === SellerAccountStatus.ACTIVATED) {
        this.eventEmitter.emit('seller.account.verified', new SellerAccountVerifiedEvent(
          updatedAccount.id,
          updatedAccount.sellerId,
          updatedAccount.accountId,
          updatedBy
        ));
      }

      return updatedAccount;
    });
  }

  // ============================================================================
  // SETTLEMENT SCHEDULE MANAGEMENT
  // ============================================================================

  async updateSettlementSchedule(
    sellerId: string,
    updateSettlementScheduleDto: UpdateSettlementScheduleDto,
    updatedBy: string
  ): Promise<SettlementSchedule> {
    this.logger.log('SettlementService.updateSettlementSchedule', {
      sellerId,
      updatedBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // Validate schedule configuration
      SettlementValidators.validateSettlementSchedule(updateSettlementScheduleDto);

      const updatedSchedule = await this.settlementRepository.updateSettlementSchedule(
        sellerId,
        {
          frequency: updateSettlementScheduleDto.frequency,
          dayOfWeek: updateSettlementScheduleDto.dayOfWeek,
          dayOfMonth: updateSettlementScheduleDto.dayOfMonth,
          minAmount: updateSettlementScheduleDto.minAmount,
          holdDays: updateSettlementScheduleDto.holdDays,
          autoSettle: updateSettlementScheduleDto.autoSettle,
          updatedBy,
        },
        tx
      );

      this.logger.log('Settlement schedule updated successfully', {
        sellerId,
        frequency: updatedSchedule.frequency,
        autoSettle: updatedSchedule.autoSettle,
      });

      return updatedSchedule;
    });
  }

  // ============================================================================
  // AUTOMATED SETTLEMENT PROCESSING
  // ============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processScheduledSettlements(): Promise<void> {
    this.logger.log('SettlementService.processScheduledSettlements - Starting daily job');

    try {
      // Find all active settlement schedules
      const activeSchedules = await this.settlementRepository.findActiveSettlementSchedules();

      this.logger.log('Found active settlement schedules', { count: activeSchedules.length });

      for (const schedule of activeSchedules) {
        try {
          await this.processSellerScheduledSettlement(schedule);
        } catch (error) {
          this.logger.error('Failed to process scheduled settlement', error, {
            sellerId: schedule.sellerId,
            scheduleId: schedule.id,
          });
        }
      }

      this.logger.log('Scheduled settlement processing completed');

    } catch (error) {
      this.logger.error('Failed to process scheduled settlements', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncGatewaySettlements(): Promise<void> {
    this.logger.log('SettlementService.syncGatewaySettlements - Starting sync job');

    try {
      // Create sync job
      const job = await this.settlementJobService.createJob({
        type: SettlementJobType.SYNC_GATEWAY_SETTLEMENTS,
        payload: {
          syncDate: new Date().toISOString(),
        },
        createdBy: 'SYSTEM',
      });

      // Process sync job
      await this.settlementJobService.processJob(job.id);

      this.logger.log('Gateway settlement sync completed', { jobId: job.id });

    } catch (error) {
      this.logger.error('Failed to sync gateway settlements', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyAccessFilters(
    filters: SettlementFilters,
    userId?: string,
    userRole?: UserRole
  ): Promise<SettlementFilters> {
    // Apply role-based filtering
    if (userRole === 'SELLER') {
      return { ...filters, sellerId: userId };
    }

    return filters;
  }

  private async checkSettlementAccess(
    settlement: Settlement,
    userId?: string,
    userRole?: UserRole
  ): Promise<void> {
    if (!SettlementPolicies.canAccess(settlement, userId, userRole)) {
      throw new BadRequestException('Access denied to this settlement');
    }
  }

  private generateSettlementId(): string {
    return `stl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateSettlementStatus(
    settlement: Settlement,
    newStatus: SettlementStatus,
    updatedBy: string,
    tx: any
  ): Promise<Settlement> {
    // Validate status transition
    SettlementValidators.validateSettlementStatusTransition(settlement.status, newStatus);

    // Update status
    const updatedSettlement = await this.settlementRepository.updateStatus(
      settlement.id,
      newStatus,
      updatedBy,
      tx
    );

    return updatedSettlement;
  }

  private async handleSettlementFailure(
    settlement: Settlement,
    errorMessage: string,
    errorCode: string,
    updatedBy: string,
    tx: any
  ): Promise<void> {
    // Update settlement status to failed
    await this.settlementRepository.update(
      settlement.id,
      {
        status: SettlementStatus.FAILED,
        failedAt: new Date(),
        failureReason: errorMessage,
        failureCode: errorCode,
      },
      tx
    );

    // Create audit log
    await this.settlementAuditService.logAction(
      settlement.id,
      'FAIL',
      updatedBy,
      settlement,
      null,
      `Settlement failed: ${errorMessage}`,
      tx
    );

    // Emit failure event
    this.eventEmitter.emit('settlement.failed', new SettlementFailedEvent(
      settlement.id,
      settlement.sellerId,
      errorCode,
      errorMessage,
      updatedBy
    ));
  }

  private async createDefaultSettlementSchedule(
    sellerId: string,
    createdBy: string,
    tx: any
  ): Promise<SettlementSchedule> {
    return this.settlementRepository.createSettlementSchedule({
      sellerId,
      frequency: 'DAILY',
      minAmount: 100, // ₹1.00 minimum
      holdDays: 7,
      autoSettle: true,
      isActive: true,
      createdBy,
    }, tx);
  }

  private async processSellerScheduledSettlement(
    schedule: SettlementSchedule
  ): Promise<void> {
    this.logger.log('Processing scheduled settlement', {
      sellerId: schedule.sellerId,
      frequency: schedule.frequency,
    });

    // Check if settlement is due based on schedule
    const isDue = this.isSettlementDue(schedule);
    if (!isDue) {
      return;
    }

    // Calculate settlement period
    const { periodStart, periodEnd } = this.calculateSettlementPeriod(schedule);

    // Check if settlement already exists for this period
    const existingSettlement = await this.settlementRepository.findBySellerAndPeriod(
      schedule.sellerId,
      periodStart,
      periodEnd
    );

    if (existingSettlement) {
      this.logger.log('Settlement already exists for period', {
        sellerId: schedule.sellerId,
        periodStart,
        periodEnd,
      });
      return;
    }

    // Create settlement job
    const job = await this.settlementJobService.createJob({
      type: SettlementJobType.CALCULATE_SETTLEMENT,
      sellerId: schedule.sellerId,
      payload: {
        sellerId: schedule.sellerId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        scheduleId: schedule.id,
      },
      periodStart,
      periodEnd,
      createdBy: 'SYSTEM',
    });

    // Process the job
    await this.settlementJobService.processJob(job.id);
  }

  private isSettlementDue(schedule: SettlementSchedule): boolean {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'DAILY':
        return true; // Process daily
      case 'WEEKLY':
        return now.getDay() === (schedule.dayOfWeek || 1); // Default to Monday
      case 'MONTHLY':
        return now.getDate() === (schedule.dayOfMonth || 1); // Default to 1st
      default:
        return false;
    }
  }

  private calculateSettlementPeriod(schedule: SettlementSchedule): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    const holdDays = schedule.holdDays || 7;
    
    // End period is hold days ago
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() - holdDays);
    periodEnd.setHours(23, 59, 59, 999);
    
    // Start period depends on frequency
    const periodStart = new Date(periodEnd);
    
    switch (schedule.frequency) {
      case 'DAILY':
        periodStart.setDate(periodStart.getDate() - 1);
        break;
      case 'WEEKLY':
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'MONTHLY':
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
    }
    
    periodStart.setHours(0, 0, 0, 0);
    
    return { periodStart, periodEnd };
  }
}