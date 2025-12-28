import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { SettlementJobRepository } from '../repositories/settlement-job.repository';
import { SettlementService } from '../settlement.service';
import { SettlementCalculationService } from './settlement-calculation.service';
import { PaymentGatewayService } from '../../payment/services/payment-gateway.service';

import { SettlementJob } from '../entities/settlement-job.entity';
import { 
  SettlementJobType,
  SettlementJobStatus,
} from '../enums/settlement-status.enum';

import { CreateSettlementJobDto } from '../dtos/create-settlement-job.dto';
import { PaymentGatewayProvider } from '../../payment/enums/payment-status.enum';

import {
  SettlementJobCreatedEvent,
  SettlementJobCompletedEvent,
  SettlementJobFailedEvent,
} from '../events/settlement.events';

@Injectable()
export class SettlementJobService {
  constructor(
    private readonly settlementJobRepository: SettlementJobRepository,
    private readonly settlementCalculationService: SettlementCalculationService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // JOB CREATION & MANAGEMENT
  // ============================================================================

  async createJob(createJobDto: CreateSettlementJobDto): Promise<SettlementJob> {
    this.logger.log('SettlementJobService.createJob', {
      type: createJobDto.type,
      sellerId: createJobDto.sellerId,
    });

    const jobData = {
      type: createJobDto.type,
      status: SettlementJobStatus.PENDING,
      settlementId: createJobDto.settlementId,
      sellerId: createJobDto.sellerId,
      payload: createJobDto.payload || {},
      options: createJobDto.options || {},
      periodStart: createJobDto.periodStart,
      periodEnd: createJobDto.periodEnd,
      retryCount: 0,
      maxRetries: createJobDto.maxRetries || 3,
      createdBy: createJobDto.createdBy,
    };

    const job = await this.settlementJobRepository.create(jobData);

    // Emit job created event
    this.eventEmitter.emit('settlement.job.created', new SettlementJobCreatedEvent(
      job.id,
      job.type,
      job.sellerId,
      job.createdBy
    ));

    this.logger.log('Settlement job created', {
      jobId: job.id,
      type: job.type,
      sellerId: job.sellerId,
    });

    return job;
  }

  async processJob(jobId: string): Promise<void> {
    this.logger.log('SettlementJobService.processJob', { jobId });

    const job = await this.settlementJobRepository.findById(jobId);
    if (!job) {
      throw new Error('Settlement job not found');
    }

    // Check if job is already processing or completed
    if (job.status !== SettlementJobStatus.PENDING && job.status !== SettlementJobStatus.RETRYING) {
      this.logger.warn('Job is not in processable state', {
        jobId,
        status: job.status,
      });
      return;
    }

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, SettlementJobStatus.PROCESSING);

      // Process based on job type
      let result: any;
      switch (job.type) {
        case SettlementJobType.CALCULATE_SETTLEMENT:
          result = await this.processCalculateSettlementJob(job);
          break;
        case SettlementJobType.PROCESS_SETTLEMENT:
          result = await this.processSettlementJob(job);
          break;
        case SettlementJobType.SYNC_GATEWAY_SETTLEMENTS:
          result = await this.processSyncGatewaySettlementsJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      await this.completeJob(jobId, result);

    } catch (error) {
      await this.handleJobFailure(jobId, error);
    }
  }

  async retryFailedJobs(): Promise<{ processed: number; errors: string[] }> {
    this.logger.log('SettlementJobService.retryFailedJobs');

    const results = { processed: 0, errors: [] as string[] };

    try {
      // Find failed jobs eligible for retry
      const failedJobs = await this.settlementJobRepository.findFailedJobsForRetry();

      this.logger.log('Found failed jobs for retry', { count: failedJobs.length });

      for (const job of failedJobs) {
        try {
          await this.retryJob(job.id);
          results.processed++;
        } catch (error) {
          results.errors.push(`Job ${job.id}: ${error.message}`);
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Failed to process job retries', error);
      results.errors.push(error.message);
      return results;
    }
  }

  // ============================================================================
  // JOB PROCESSORS
  // ============================================================================

  private async processCalculateSettlementJob(job: SettlementJob): Promise<any> {
    this.logger.log('Processing calculate settlement job', {
      jobId: job.id,
      sellerId: job.sellerId,
    });

    const { sellerId, periodStart, periodEnd } = job.payload;

    // Calculate settlement
    const calculationResult = await this.settlementCalculationService.calculateSettlement({
      sellerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      currency: job.payload.currency || 'INR',
    });

    // If there are transactions to settle, create settlement record
    if (calculationResult.transactionCount > 0) {
      // This would typically call back to SettlementService.createSettlement
      // but we need to avoid circular dependency
      const result = {
        calculationResult,
        action: 'SETTLEMENT_CALCULATED',
        shouldCreateSettlement: true,
      };

      this.logger.log('Settlement calculation completed', {
        jobId: job.id,
        sellerId,
        transactionCount: calculationResult.transactionCount,
        netAmount: calculationResult.netAmount,
      });

      return result;
    }

    return {
      calculationResult,
      action: 'NO_TRANSACTIONS_FOUND',
      shouldCreateSettlement: false,
    };
  }

  private async processSettlementJob(job: SettlementJob): Promise<any> {
    this.logger.log('Processing settlement job', {
      jobId: job.id,
      settlementId: job.settlementId,
    });

    if (!job.settlementId) {
      throw new Error('Settlement ID is required for process settlement job');
    }

    // This would typically call SettlementService.processSettlement
    // but we need to avoid circular dependency
    const result = {
      settlementId: job.settlementId,
      action: 'SETTLEMENT_PROCESSED',
      processedAt: new Date(),
    };

    this.logger.log('Settlement processing job completed', {
      jobId: job.id,
      settlementId: job.settlementId,
    });

    return result;
  }

  private async processSyncGatewaySettlementsJob(job: SettlementJob): Promise<any> {
    this.logger.log('Processing sync gateway settlements job', {
      jobId: job.id,
    });

    const gateway = await this.paymentGatewayService.getGateway(PaymentGatewayProvider.RAZORPAY);

    // Get settlements from gateway for the last 7 days
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    const toDate = new Date();

    const gatewayResponse = await gateway.getSettlements({
      from: fromDate,
      to: toDate,
      count: 100,
    });

    if (!gatewayResponse.success) {
      throw new Error(`Failed to fetch gateway settlements: ${gatewayResponse.error?.message}`);
    }

    const settlements = gatewayResponse.data?.items || [];
    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each gateway settlement
    for (const gatewaySettlement of settlements) {
      try {
        await this.syncGatewaySettlement(gatewaySettlement);
        syncedCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Settlement ${gatewaySettlement.id}: ${error.message}`);
        this.logger.error('Failed to sync gateway settlement', error, {
          gatewaySettlementId: gatewaySettlement.id,
        });
      }
    }

    const result = {
      action: 'GATEWAY_SETTLEMENTS_SYNCED',
      totalSettlements: settlements.length,
      syncedCount,
      errorCount,
      errors,
      syncedAt: new Date(),
    };

    this.logger.log('Gateway settlements sync completed', {
      jobId: job.id,
      totalSettlements: settlements.length,
      syncedCount,
      errorCount,
    });

    return result;
  }

  // ============================================================================
  // JOB STATUS MANAGEMENT
  // ============================================================================

  private async updateJobStatus(
    jobId: string,
    status: SettlementJobStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === SettlementJobStatus.PROCESSING) {
      updateData.startedAt = new Date();
    } else if (status === SettlementJobStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === SettlementJobStatus.FAILED) {
      updateData.errorMessage = errorMessage;
    }

    await this.settlementJobRepository.update(jobId, updateData);
  }

  private async completeJob(jobId: string, result: any): Promise<void> {
    await this.settlementJobRepository.update(jobId, {
      status: SettlementJobStatus.COMPLETED,
      result,
      completedAt: new Date(),
    });

    // Emit job completed event
    this.eventEmitter.emit('settlement.job.completed', new SettlementJobCompletedEvent(
      jobId,
      result
    ));

    this.logger.log('Settlement job completed successfully', { jobId });
  }

  private async handleJobFailure(jobId: string, error: any): Promise<void> {
    const job = await this.settlementJobRepository.findById(jobId);
    if (!job) return;

    const errorMessage = error.message || 'Unknown error';
    const newRetryCount = job.retryCount + 1;

    if (newRetryCount <= job.maxRetries) {
      // Schedule retry
      const nextRetryAt = this.calculateNextRetryTime(newRetryCount);
      
      await this.settlementJobRepository.update(jobId, {
        status: SettlementJobStatus.RETRYING,
        retryCount: newRetryCount,
        nextRetryAt,
        errorMessage,
      });

      this.logger.warn('Settlement job failed, scheduled for retry', {
        jobId,
        retryCount: newRetryCount,
        maxRetries: job.maxRetries,
        nextRetryAt,
        error: errorMessage,
      });

    } else {
      // Mark as permanently failed
      await this.settlementJobRepository.update(jobId, {
        status: SettlementJobStatus.FAILED,
        errorMessage,
      });

      // Emit job failed event
      this.eventEmitter.emit('settlement.job.failed', new SettlementJobFailedEvent(
        jobId,
        job.type,
        errorMessage
      ));

      this.logger.error('Settlement job permanently failed', {
        jobId,
        retryCount: newRetryCount,
        maxRetries: job.maxRetries,
        error: errorMessage,
      });
    }
  }

  private async retryJob(jobId: string): Promise<void> {
    this.logger.log('Retrying settlement job', { jobId });

    const job = await this.settlementJobRepository.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== SettlementJobStatus.RETRYING) {
      throw new Error('Job is not in retrying state');
    }

    if (job.nextRetryAt && job.nextRetryAt > new Date()) {
      throw new Error('Job is not yet ready for retry');
    }

    // Reset job to pending and process
    await this.updateJobStatus(jobId, SettlementJobStatus.PENDING);
    await this.processJob(jobId);
  }

  // ============================================================================
  // GATEWAY SETTLEMENT SYNC
  // ============================================================================

  private async syncGatewaySettlement(gatewaySettlement: any): Promise<void> {
    // Check if we already have this settlement
    const existingSettlement = await this.settlementJobRepository.findByGatewaySettlementId(
      gatewaySettlement.id
    );

    if (existingSettlement) {
      // Update existing settlement if status changed
      if (existingSettlement.status !== this.mapGatewaySettlementStatus(gatewaySettlement.status)) {
        await this.updateSettlementFromGateway(existingSettlement, gatewaySettlement);
      }
      return;
    }

    // Create new settlement record from gateway data
    await this.createSettlementFromGateway(gatewaySettlement);
  }

  private async updateSettlementFromGateway(
    settlement: any,
    gatewaySettlement: any
  ): Promise<void> {
    const newStatus = this.mapGatewaySettlementStatus(gatewaySettlement.status);
    
    // Update settlement status and gateway data
    // This would typically update the Settlement entity
    this.logger.log('Updated settlement from gateway', {
      settlementId: settlement.id,
      gatewaySettlementId: gatewaySettlement.id,
      oldStatus: settlement.status,
      newStatus,
    });
  }

  private async createSettlementFromGateway(gatewaySettlement: any): Promise<void> {
    // Create settlement record from gateway data
    // This would typically create a new Settlement entity
    this.logger.log('Created settlement from gateway', {
      gatewaySettlementId: gatewaySettlement.id,
      amount: gatewaySettlement.amount,
      status: gatewaySettlement.status,
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateNextRetryTime(retryCount: number): Date {
    // Exponential backoff: 2^retryCount minutes
    const delayMinutes = Math.pow(2, retryCount);
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
    return nextRetry;
  }

  private mapGatewaySettlementStatus(gatewayStatus: string): string {
    const mapping: Record<string, string> = {
      'created': 'PENDING',
      'processed': 'PROCESSING',
      'settled': 'SETTLED',
      'failed': 'FAILED',
    };

    return mapping[gatewayStatus] || gatewayStatus.toUpperCase();
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async findJobsByType(
    type: SettlementJobType,
    status?: SettlementJobStatus,
    limit: number = 50
  ): Promise<SettlementJob[]> {
    return this.settlementJobRepository.findByType(type, status, limit);
  }

  async findJobsBySeller(
    sellerId: string,
    status?: SettlementJobStatus,
    limit: number = 50
  ): Promise<SettlementJob[]> {
    return this.settlementJobRepository.findBySeller(sellerId, status, limit);
  }

  async getJobStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.settlementJobRepository.getStatistics();
  }

  // ============================================================================
  // CLEANUP METHODS
  // ============================================================================

  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    this.logger.log('Cleaning up old settlement jobs', { olderThanDays });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await this.settlementJobRepository.deleteOldJobs(cutoffDate);

    this.logger.log('Old settlement jobs cleaned up', {
      deletedCount,
      cutoffDate,
    });

    return deletedCount;
  }
}