import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LoggerService } from '../observability/logger.service';

export interface ImageProcessingJob {
  mediaId: string;
  originalUrl: string;
  sizes: { width: number; height: number; suffix: string }[];
}

export interface NotificationJob {
  userId: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface SearchIndexJob {
  action: 'index' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data?: Record<string, any>;
}

export interface InventoryJob {
  action: 'check_reservations' | 'low_stock_alert' | 'reorder';
  variantId?: string;
  sellerId?: string;
  data?: Record<string, any>;
}

@Injectable()
export class JobService {
  constructor(
    @InjectQueue('image-processing') private imageQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectQueue('search-index') private searchQueue: Queue,
    @InjectQueue('inventory') private inventoryQueue: Queue,
    private readonly logger: LoggerService,
  ) {}

  async addImageProcessingJob(
    job: ImageProcessingJob,
    options?: { delay?: number; priority?: number },
  ): Promise<void> {
    this.logger.log('JobService.addImageProcessingJob', { mediaId: job.mediaId });

    await this.imageQueue.add('process-image', job, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async addNotificationJob(
    job: NotificationJob,
    options?: { delay?: number; priority?: number },
  ): Promise<void> {
    this.logger.log('JobService.addNotificationJob', {
      userId: job.userId,
      type: job.type,
      channel: job.channel,
    });

    await this.notificationQueue.add('send-notification', job, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async addSearchIndexJob(
    job: SearchIndexJob,
    options?: { delay?: number; priority?: number },
  ): Promise<void> {
    this.logger.log('JobService.addSearchIndexJob', {
      action: job.action,
      entityType: job.entityType,
      entityId: job.entityId,
    });

    await this.searchQueue.add('update-index', job, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async addInventoryJob(
    job: InventoryJob,
    options?: { delay?: number; priority?: number },
  ): Promise<void> {
    this.logger.log('JobService.addInventoryJob', {
      action: job.action,
      variantId: job.variantId,
      sellerId: job.sellerId,
    });

    await this.inventoryQueue.add('inventory-task', job, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    });
  }

  // Bulk job operations
  async addBulkImageProcessingJobs(jobs: ImageProcessingJob[]): Promise<void> {
    this.logger.log('JobService.addBulkImageProcessingJobs', { count: jobs.length });

    const bulkJobs = jobs.map(job => ({
      name: 'process-image',
      data: job,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    await this.imageQueue.addBulk(bulkJobs);
  }

  async addBulkNotificationJobs(jobs: NotificationJob[]): Promise<void> {
    this.logger.log('JobService.addBulkNotificationJobs', { count: jobs.length });

    const bulkJobs = jobs.map(job => ({
      name: 'send-notification',
      data: job,
      opts: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }));

    await this.notificationQueue.addBulk(bulkJobs);
  }

  // Job monitoring
  async getQueueStats() {
    const [imageStats, notificationStats, searchStats, inventoryStats] = await Promise.all([
      this.getQueueInfo(this.imageQueue),
      this.getQueueInfo(this.notificationQueue),
      this.getQueueInfo(this.searchQueue),
      this.getQueueInfo(this.inventoryQueue),
    ]);

    return {
      imageProcessing: imageStats,
      notifications: notificationStats,
      searchIndex: searchStats,
      inventory: inventoryStats,
    };
  }

  private async getQueueInfo(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  // Scheduled jobs
  async scheduleRecurringJobs(): Promise<void> {
    this.logger.log('JobService.scheduleRecurringJobs');

    // Check expired reservations every 5 minutes
    await this.inventoryQueue.add(
      'inventory-task',
      { action: 'check_reservations' },
      {
        repeat: { cron: '*/5 * * * *' },
        jobId: 'check-reservations',
      },
    );

    // Low stock alerts every hour
    await this.inventoryQueue.add(
      'inventory-task',
      { action: 'low_stock_alert' },
      {
        repeat: { cron: '0 * * * *' },
        jobId: 'low-stock-alerts',
      },
    );

    // Search index maintenance daily at 2 AM
    await this.searchQueue.add(
      'update-index',
      { action: 'maintenance' },
      {
        repeat: { cron: '0 2 * * *' },
        jobId: 'search-maintenance',
      },
    );
  }

  async retryFailedJob(jobId: string) {
    // TODO: Implement job retry logic
    return { success: true };
  }

  async cancelJob(jobId: string) {
    // TODO: Implement job cancellation
  }

  async getFailedJobs(query: any) {
    // TODO: Implement failed jobs retrieval
    return { jobs: [], total: 0 };
  }

  async cleanupCompletedJobs() {
    // TODO: Implement cleanup of completed jobs
    return { cleaned: 0 };
  }

  async getActiveJobs(query: any) {
    // TODO: Implement active jobs retrieval
    return { jobs: [], total: 0 };
  }

  async getWaitingJobs(query: any) {
    // TODO: Implement waiting jobs retrieval
    return { jobs: [], total: 0 };
  }
}