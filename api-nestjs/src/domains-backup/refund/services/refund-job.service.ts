import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';

// Temporary interface to avoid circular dependency
interface IRefundRepository {
  findById(id: string): Promise<any>;
  update(id: string, data: any, tx?: any): Promise<any>;
  createJob(data: any, tx?: any): Promise<any>;
  findJobById(jobId: string): Promise<any>;
  updateJob(jobId: string, data: any, tx?: any): Promise<any>;
  findScheduledJobs(currentDate: Date): Promise<any[]>;
  findRetryJobs(currentDate: Date): Promise<any[]>;
  deleteCompletedJobs(cutoffDate: Date): Promise<number>;
}

// Temporary interface to avoid circular dependency
interface IPaymentGatewayService {
  getGateway(provider: string): Promise<any>;
}

import { RefundOrchestrationService } from './refund-orchestration.service';
import { RefundAuditService } from './refund-audit.service';
import { NotificationService } from '../../../infrastructure/notifications/notification.service';
// import { PaymentGatewayService } from '../../payment/services/payment-gateway.service';

import { RefundJob } from '../entities/refund-job.entity';
import { CreateRefundJobDto } from '../dtos/create-refund-job.dto';

import { 
  RefundJobType, 
  RefundJobStatus,
  RefundStatus 
} from '../enums/refund-status.enum';

import {
  RefundJobCreatedEvent,
  RefundJobStartedEvent,
  RefundJobCompletedEvent,
  RefundJobFailedEvent,
} from '../events/refund.events';

export interface RefundJobResult {
  success: boolean;
  result?: any;
  error?: string;
  shouldRetry?: boolean;
}

@Injectable()
export class RefundJobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundRepository: IRefundRepository,
    private readonly refundAuditService: RefundAuditService,
    private readonly notificationService: NotificationService,
    private readonly paymentGatewayService: IPaymentGatewayService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  async createJob(
    createJobDto: CreateRefundJobDto,
    tx?: any
  ): Promise<RefundJob> {
    this.logger.log('RefundJobService.createJob', {
      type: createJobDto.type,
      refundId: createJobDto.refundId,
      scheduledAt: createJobDto.scheduledAt,
    });

    const jobData = {
      type: createJobDto.type,
      status: RefundJobStatus.PENDING,
      refundId: createJobDto.refundId,
      orderId: createJobDto.orderId,
      payload: createJobDto.payload || {},
      options: createJobDto.options || {},
      maxRetries: createJobDto.maxRetries || 3,
      scheduledAt: createJobDto.scheduledAt,
      createdBy: createJobDto.createdBy,
    };

    const job = await this.refundRepository.createJob(jobData, tx);

    // Emit job created event
    this.eventEmitter.emit('refund.job.created', new RefundJobCreatedEvent(
      job.id,
      job.type,
      job.refundId,
      job.orderId,
      job.createdBy
    ));

    // Queue job for processing if not scheduled
    if (!createJobDto.scheduledAt) {
      await this.queueJob(job);
    }

    return job;
  }

  async processJob(jobId: string): Promise<RefundJobResult> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log('RefundJobService.processJob', { jobId });

      // Get job details
      const job = await this.refundRepository.findJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if job is already processed
      if (job.status !== RefundJobStatus.PENDING) {
        this.logger.warn('Job already processed', {
          jobId,
          status: job.status,
        });
        return { success: false, error: 'Job already processed' };
      }

      // Update job status to processing
      await this.updateJobStatus(jobId, RefundJobStatus.PROCESSING, tx);

      // Emit job started event
      this.eventEmitter.emit('refund.job.started', new RefundJobStartedEvent(
        job.id,
        job.type,
        job.refundId,
        job.orderId
      ));

      try {
        // Process job based on type
        const result = await this.executeJob(job, tx);

        // Update job as completed
        await this.completeJob(job, result, tx);

        // Emit job completed event
        this.eventEmitter.emit('refund.job.completed', new RefundJobCompletedEvent(
          job.id,
          job.type,
          job.refundId,
          job.orderId,
          result
        ));

        this.logger.log('Job processed successfully', {
          jobId,
          type: job.type,
          result,
        });

        return { success: true, result };

      } catch (error) {
        // Handle job failure
        const shouldRetry = await this.handleJobFailure(job, error, tx);

        // Emit job failed event
        this.eventEmitter.emit('refund.job.failed', new RefundJobFailedEvent(
          job.id,
          job.type,
          error.message,
          job.refundId,
          job.orderId,
          shouldRetry,
          shouldRetry ? this.calculateNextRetryTime(job.retryCount) : undefined
        ));

        this.logger.error('Job processing failed', error, {
          jobId,
          type: job.type,
          shouldRetry,
        });

        return {
          success: false,
          error: error.message,
          shouldRetry,
        };
      }
    });
  }

  // ============================================================================
  // JOB EXECUTION BY TYPE
  // ============================================================================

  private async executeJob(job: RefundJob, tx: any): Promise<any> {
    switch (job.type) {
      case RefundJobType.PROCESS_REFUND:
        return this.processRefundJob(job, tx);

      case RefundJobType.RESTOCK_INVENTORY:
        return this.processRestockJob(job, tx);

      case RefundJobType.SEND_NOTIFICATION:
        return this.processNotificationJob(job, tx);

      case RefundJobType.SYNC_GATEWAY:
        return this.processSyncGatewayJob(job, tx);

      case RefundJobType.UPDATE_ORDER_STATUS:
        return this.processUpdateOrderStatusJob(job, tx);

      case RefundJobType.CALCULATE_FEES:
        return this.processCalculateFeesJob(job, tx);

      case RefundJobType.GENERATE_CREDIT_NOTE:
        return this.processGenerateCreditNoteJob(job, tx);

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async processRefundJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId, isRetry = false } = job.payload;

    // Get refund details
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    // Validate refund can be processed
    if (refund.status !== RefundStatus.APPROVED) {
      throw new Error(`Refund status ${refund.status} cannot be processed`);
    }

    // Process refund through orchestration service
    // Note: This would typically be injected differently to avoid circular dependency
    const processDto = {
      metadata: {
        jobId: job.id,
        isRetry,
        attemptNumber: job.retryCount + 1,
      },
    };

    // The actual processing would be delegated to the orchestration service
    // For now, we'll simulate the processing
    return {
      refundId,
      processed: true,
      jobId: job.id,
    };
  }

  private async processRestockJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId, itemId, quantity, variantId, sellerId } = job.payload;

    this.logger.log('Processing restock job', {
      jobId: job.id,
      refundId,
      itemId,
      quantity,
    });

    // This would integrate with inventory service
    // For now, we'll simulate the restock
    return {
      restocked: true,
      itemId,
      quantity,
      variantId,
    };
  }

  private async processNotificationJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId, notificationType, recipientId } = job.payload;

    this.logger.log('Processing notification job', {
      jobId: job.id,
      refundId,
      notificationType,
    });

    // Get refund details for notification
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    // Send notification based on type
    const notificationResult = await this.sendRefundNotification(
      refund,
      notificationType,
      recipientId
    );

    return {
      notificationSent: true,
      notificationType,
      channels: notificationResult.channels,
    };
  }

  private async processSyncGatewayJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId, gatewayRefundId } = job.payload;

    this.logger.log('Processing gateway sync job', {
      jobId: job.id,
      refundId,
      gatewayRefundId,
    });

    // Get current gateway status
    const gateway = await this.paymentGatewayService.getGateway('RAZORPAY');
    const gatewayStatus = await gateway.getRefundStatus(gatewayRefundId);

    if (!gatewayStatus.success) {
      throw new Error(`Failed to sync gateway status: ${gatewayStatus.error?.message}`);
    }

    // Update refund with latest gateway information
    const updateData = {
      gatewayResponse: gatewayStatus.data,
      metadata: {
        lastSyncAt: new Date(),
        gatewayStatus: gatewayStatus.data.status,
      },
    };

    await this.refundRepository.update(refundId, updateData, tx);

    return {
      synced: true,
      gatewayStatus: gatewayStatus.data.status,
      lastSyncAt: new Date(),
    };
  }

  private async processUpdateOrderStatusJob(job: RefundJob, tx: any): Promise<any> {
    const { orderId, newStatus, reason } = job.payload;

    this.logger.log('Processing order status update job', {
      jobId: job.id,
      orderId,
      newStatus,
    });

    // This would integrate with order service
    // For now, we'll simulate the update
    return {
      orderUpdated: true,
      orderId,
      newStatus,
    };
  }

  private async processCalculateFeesJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId } = job.payload;

    this.logger.log('Processing calculate fees job', {
      jobId: job.id,
      refundId,
    });

    // Get refund details
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    // Calculate fees based on current policies
    const fees = this.calculateRefundFees(refund);

    // Update refund with calculated fees
    await this.refundRepository.update(refundId, {
      refundFees: fees.totalFees,
      metadata: {
        ...refund.metadata,
        feeCalculation: fees,
        calculatedAt: new Date(),
      },
    }, tx);

    return {
      feesCalculated: true,
      fees,
    };
  }

  private async processGenerateCreditNoteJob(job: RefundJob, tx: any): Promise<any> {
    const { refundId } = job.payload;

    this.logger.log('Processing generate credit note job', {
      jobId: job.id,
      refundId,
    });

    // This would integrate with accounting/invoice service
    // For now, we'll simulate credit note generation
    const creditNoteNumber = `CN-${Date.now()}`;

    return {
      creditNoteGenerated: true,
      creditNoteNumber,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // JOB STATUS MANAGEMENT
  // ============================================================================

  private async updateJobStatus(
    jobId: string,
    status: RefundJobStatus,
    tx?: any
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === RefundJobStatus.PROCESSING) {
      updateData.startedAt = new Date();
    } else if (status === RefundJobStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.refundRepository.updateJob(jobId, updateData, tx);
  }

  private async completeJob(job: RefundJob, result: any, tx: any): Promise<void> {
    await this.refundRepository.updateJob(job.id, {
      status: RefundJobStatus.COMPLETED,
      result,
      completedAt: new Date(),
    }, tx);
  }

  private async handleJobFailure(
    job: RefundJob,
    error: Error,
    tx: any
  ): Promise<boolean> {
    const shouldRetry = job.retryCount < job.maxRetries && this.isRetryableError(error);

    const updateData: any = {
      status: shouldRetry ? RefundJobStatus.RETRYING : RefundJobStatus.FAILED,
      errorMessage: error.message,
      retryCount: job.retryCount + 1,
    };

    if (shouldRetry) {
      updateData.nextRetryAt = this.calculateNextRetryTime(job.retryCount);
    }

    await this.refundRepository.updateJob(job.id, updateData, tx);

    // Schedule retry if applicable
    if (shouldRetry) {
      await this.scheduleJobRetry(job, updateData.nextRetryAt);
    }

    return shouldRetry;
  }

  // ============================================================================
  // JOB SCHEDULING & QUEUING
  // ============================================================================

  private async queueJob(job: RefundJob): Promise<void> {
    const queueName = this.getQueueNameForJobType(job.type);
    const priority = this.getJobPriority(job);

    await this.queueService.add(queueName, {
      jobId: job.id,
      type: job.type,
      payload: job.payload,
    }, {
      priority,
      delay: job.scheduledAt ? job.scheduledAt.getTime() - Date.now() : 0,
      attempts: job.maxRetries + 1,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  private async scheduleJobRetry(job: RefundJob, retryAt: Date): Promise<void> {
    const delay = retryAt.getTime() - Date.now();
    const queueName = this.getQueueNameForJobType(job.type);

    await this.queueService.add(queueName, {
      jobId: job.id,
      type: job.type,
      payload: job.payload,
      isRetry: true,
    }, {
      delay: Math.max(0, delay),
      attempts: 1, // Single attempt for retry
    });
  }

  // ============================================================================
  // SCHEDULED JOB PROCESSING
  // ============================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledJobs(): Promise<void> {
    try {
      const scheduledJobs = await this.refundRepository.findScheduledJobs(new Date());

      this.logger.log('Processing scheduled refund jobs', {
        count: scheduledJobs.length,
      });

      for (const job of scheduledJobs) {
        try {
          await this.queueJob(job);
          
          // Update job to remove scheduled time
          await this.refundRepository.updateJob(job.id, {
            scheduledAt: null,
          });

        } catch (error) {
          this.logger.error('Failed to queue scheduled job', error, {
            jobId: job.id,
            type: job.type,
          });
        }
      }

    } catch (error) {
      this.logger.error('Failed to process scheduled jobs', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processRetryJobs(): Promise<void> {
    try {
      const retryJobs = await this.refundRepository.findRetryJobs(new Date());

      this.logger.log('Processing retry refund jobs', {
        count: retryJobs.length,
      });

      for (const job of retryJobs) {
        try {
          await this.processJob(job.id);

        } catch (error) {
          this.logger.error('Failed to process retry job', error, {
            jobId: job.id,
            type: job.type,
          });
        }
      }

    } catch (error) {
      this.logger.error('Failed to process retry jobs', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupCompletedJobs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep jobs for 7 days

      const deletedCount = await this.refundRepository.deleteCompletedJobs(cutoffDate);

      this.logger.log('Cleaned up completed refund jobs', {
        deletedCount,
        cutoffDate,
      });

    } catch (error) {
      this.logger.error('Failed to cleanup completed jobs', error);
    }
  }

  // ============================================================================
  // NOTIFICATION HELPERS
  // ============================================================================

  private async sendRefundNotification(
    refund: any,
    notificationType: string,
    recipientId?: string
  ): Promise<{ channels: string[] }> {
    const channels: string[] = [];

    try {
      // Determine notification channels and content
      const notificationConfig = this.getNotificationConfig(notificationType, refund);

      // Send email notification
      if (notificationConfig.email) {
        await this.notificationService.sendEmail({
          to: recipientId || refund.createdBy,
          template: notificationConfig.email.template,
          data: {
            refund,
            ...notificationConfig.email.data,
          },
        });
        channels.push('EMAIL');
      }

      // Send SMS notification for high-value refunds
      if (notificationConfig.sms && refund.requestedAmount > 10000000) {
        await this.notificationService.sendSMS({
          to: recipientId || refund.createdBy,
          message: notificationConfig.sms.message,
        });
        channels.push('SMS');
      }

      // Send push notification
      if (notificationConfig.push) {
        await this.notificationService.sendPush({
          userId: recipientId || refund.createdBy,
          title: notificationConfig.push.title,
          body: notificationConfig.push.body,
          data: { refundId: refund.id },
        });
        channels.push('PUSH');
      }

    } catch (error) {
      this.logger.error('Failed to send refund notification', error, {
        refundId: refund.id,
        notificationType,
      });
    }

    return { channels };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getQueueNameForJobType(jobType: RefundJobType): string {
    const queueMap = {
      [RefundJobType.PROCESS_REFUND]: 'refund-processing',
      [RefundJobType.RESTOCK_INVENTORY]: 'inventory-restock',
      [RefundJobType.SEND_NOTIFICATION]: 'notifications',
      [RefundJobType.SYNC_GATEWAY]: 'gateway-sync',
      [RefundJobType.UPDATE_ORDER_STATUS]: 'order-updates',
      [RefundJobType.CALCULATE_FEES]: 'fee-calculation',
      [RefundJobType.GENERATE_CREDIT_NOTE]: 'credit-notes',
    };

    return queueMap[jobType] || 'refund-general';
  }

  private getJobPriority(job: RefundJob): number {
    // Higher priority for processing jobs
    if (job.type === RefundJobType.PROCESS_REFUND) {
      return 10;
    }

    // Medium priority for notifications
    if (job.type === RefundJobType.SEND_NOTIFICATION) {
      return 5;
    }

    // Lower priority for sync jobs
    return 1;
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'gateway',
      'temporary',
      'rate limit',
    ];

    return retryableErrors.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  private calculateNextRetryTime(retryCount: number): Date {
    // Exponential backoff: 2^retryCount minutes
    const delayMinutes = Math.pow(2, retryCount);
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
    return nextRetry;
  }

  private calculateRefundFees(refund: any): any {
    // This would use the actual fee calculation logic
    return {
      processingFee: 0,
      gatewayFee: 0,
      totalFees: 0,
    };
  }

  private getNotificationConfig(notificationType: string, refund: any): any {
    const configs = {
      REFUND_CREATED: {
        email: {
          template: 'refund-created',
          data: { status: 'created' },
        },
        push: {
          title: 'Refund Request Created',
          body: `Your refund request for ₹${refund.requestedAmount / 100} has been created.`,
        },
      },
      REFUND_APPROVED: {
        email: {
          template: 'refund-approved',
          data: { status: 'approved' },
        },
        push: {
          title: 'Refund Approved',
          body: `Your refund request has been approved and will be processed soon.`,
        },
      },
      REFUND_COMPLETED: {
        email: {
          template: 'refund-completed',
          data: { status: 'completed' },
        },
        sms: {
          message: `Your refund of ₹${refund.processedAmount / 100} has been processed successfully.`,
        },
        push: {
          title: 'Refund Completed',
          body: `Your refund of ₹${refund.processedAmount / 100} has been processed.`,
        },
      },
    };

    return configs[notificationType] || {};
  }
}