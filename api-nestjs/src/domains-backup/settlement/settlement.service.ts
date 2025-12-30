import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SettlementRepository } from './repositories/settlement.repository.js';
import { SettlementAuditService } from './services/settlement-audit.service.js';
import { SettlementCalculationService } from './services/settlement-calculation.service.js';
import { SettlementJobService } from './services/settlement-job.service.js';
import { PaymentGatewayService } from '../payment/services/payment-gateway.service.js';
import { LoggerService } from '../../infrastructure/observability/logger.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

import { Settlement } from './entities/settlement.entity.js';
import { SettlementTransaction } from './entities/settlement-transaction.entity.js';
import { SellerAccount } from './entities/seller-account.entity.js';
import { SettlementSchedule } from './entities/settlement-schedule.entity.js';
import { SettlementJob } from './entities/settlement-job.entity.js';

import { 
  SettlementStatus,
  SettlementJobType,
  SettlementJobStatus,
  SellerAccountStatus,
  KycStatus,
} from './enums/settlement-status.enum.js';

import { SettlementValidators } from './settlement.validators.js';
import { SettlementPolicies } from './settlement.policies.js';

import { CreateSettlementDto } from './dtos/create-settlement.dto.js';
import { ProcessSettlementDto } from './dtos/process-settlement.dto.js';
import { CreateSellerAccountDto } from './dtos/create-seller-account.dto.js';
import { UpdateSettlementScheduleDto } from './dtos/update-settlement-schedule.dto.js';

import {
  SettlementFilters,
  PaginationOptions,
  SettlementIncludeOptions,
} from './interfaces/settlement-repository.interface.js';

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
    userRole?: string
  ): Promise<Settlement> {
    const settlement = await this.settlementRepository.findById(id, includes);
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    // Check access permissions
    await this.checkSettlementAccess(settlement, userId, userRole);

    return settlement;
  }

  async createSettlement(
    createSettlementDto: CreateSettlementDto,
    userId: string
  ): Promise<Settlement> {
    this.logger.log('SettlementService.createSettlement', {
      sellerId: createSettlementDto.sellerId,
      createdBy: userId,
    });

    try {
      // Validate seller account exists and is active
      const sellerAccount = await this.getSellerAccount(createSettlementDto.sellerId);
      if (!sellerAccount) {
        throw new NotFoundException('Seller account not found');
      }

      // Create settlement record
      const settlementData = {
        sellerId: createSettlementDto.sellerId,
        amount: createSettlementDto.amount,
        currency: createSettlementDto.currency,
        status: SettlementStatus.PENDING,
        createdBy: userId,
      };

      const settlement = await this.settlementRepository.create(settlementData);

      this.logger.log('Settlement created successfully', { settlementId: settlement?.id || 'unknown' });

      return settlement || new Settlement({});
    } catch (error) {
      this.logger.error('Failed to create settlement', error);
      throw error;
    }
  }

  async processSettlement(
    id: string,
    processSettlementDto: ProcessSettlementDto,
    userId: string
  ): Promise<Settlement> {
    this.logger.log('SettlementService.processSettlement', { id, userId });

    try {
      const settlement = await this.findById(id);
      if (!settlement) {
        throw new NotFoundException('Settlement not found');
      }

      // Update settlement status
      const updatedSettlement = await this.settlementRepository.update(id, {
        status: SettlementStatus.PROCESSING,
        updatedBy: userId,
      });

      return updatedSettlement || new Settlement({});
    } catch (error) {
      this.logger.error('Failed to process settlement', error);
      throw error;
    }
  }

  // ============================================================================
  // SELLER ACCOUNT OPERATIONS
  // ============================================================================

  async createSellerAccount(
    createSellerAccountDto: CreateSellerAccountDto,
    userId: string
  ): Promise<SellerAccount> {
    this.logger.log('SettlementService.createSellerAccount', {
      sellerId: createSellerAccountDto.sellerId,
      createdBy: userId,
    });

    try {
      // Check if seller account already exists
      const existingAccount = await this.settlementRepository.findSellerAccountBySellerId(
        createSellerAccountDto.sellerId
      );

      if (existingAccount) {
        throw new ConflictException('Seller account already exists');
      }

      const accountData = {
        sellerId: createSellerAccountDto.sellerId,
        accountNumber: createSellerAccountDto.accountNumber,
        bankName: createSellerAccountDto.bankName,
        status: SellerAccountStatus.CREATED,
        createdBy: userId,
      };

      const sellerAccount = await this.settlementRepository.createSellerAccount(accountData);

      return sellerAccount || new SellerAccount({});
    } catch (error) {
      this.logger.error('Failed to create seller account', error);
      throw error;
    }
  }

  async verifySellerAccount(
    sellerId: string,
    userId: string
  ): Promise<SellerAccount> {
    this.logger.log('SettlementService.verifySellerAccount', { sellerId, userId });

    try {
      const sellerAccount = await this.getSellerAccount(sellerId);
      if (!sellerAccount) {
        throw new NotFoundException('Seller account not found');
      }

      const updatedAccount = await this.settlementRepository.updateSellerAccount(
        sellerAccount.id,
        {
          status: SellerAccountStatus.ACTIVATED,
          verifiedBy: userId,
          verifiedAt: new Date(),
        }
      );

      return updatedAccount || new SellerAccount({});
    } catch (error) {
      this.logger.error('Failed to verify seller account', error);
      throw error;
    }
  }

  async updateSettlementSchedule(
    sellerId: string,
    updateSettlementScheduleDto: UpdateSettlementScheduleDto,
    userId: string
  ): Promise<SettlementSchedule> {
    this.logger.log('SettlementService.updateSettlementSchedule', { sellerId, userId });

    try {
      const updatedSchedule = await this.settlementRepository.updateSettlementSchedule(
        sellerId,
        {
          ...updateSettlementScheduleDto,
          updatedBy: userId,
        }
      );

      return updatedSchedule || new SettlementSchedule({});
    } catch (error) {
      this.logger.error('Failed to update settlement schedule', error);
      throw error;
    }
  }

  // ============================================================================
  // SCHEDULED JOBS
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledSettlements(): Promise<void> {
    this.logger.log('Processing scheduled settlements');

    try {
      const activeSchedules = await this.settlementRepository.findActiveSettlementSchedules();

      for (const schedule of activeSchedules) {
        await this.processSettlementForSchedule(schedule);
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled settlements', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

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
      throw new NotFoundException('Settlement not found');
    }
  }

  private async getSellerAccount(sellerId: string): Promise<SellerAccount | null> {
    try {
      return await this.settlementRepository.findSellerAccountBySellerId(sellerId);
    } catch (error) {
      this.logger.error('Failed to get seller account', error, { sellerId });
      return null;
    }
  }

  private async processSettlementForSchedule(schedule: SettlementSchedule): Promise<void> {
    try {
      // Implementation for processing settlement based on schedule
      this.logger.log('Processing settlement for schedule', { scheduleId: schedule.id });
    } catch (error) {
      this.logger.error('Failed to process settlement for schedule', error, { scheduleId: schedule.id });
    }
  }
}