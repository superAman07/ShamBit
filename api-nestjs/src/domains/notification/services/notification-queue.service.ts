import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { NotificationPayload } from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private notificationQueue: Queue;
  private bulkQueue: Queue;
  private worker: Worker;
  private bulkWorker: Worker;
  private redis: Redis;
  private config: QueueConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<QueueConfig>('queue') || {
      redis: {
        host: 'localhost',
        port: 6379,
      },
      concurrency: 10,
      retryAttempts: 3,
      retryDelay: 5000,
    };
  }

  async onModuleInit() {
    await this.initializeRedis();
    await this.initializeQueues();
    await this.initializeWorkers();
  }

  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  async addNotification(
    notificationId: string,
    options: {
      delay?: number;
      priority?: number;
      attempts?: number;
    } = {}
  ): Promise<void> {
    try {
      await this.notificationQueue.add(
        'process-notification',
        { notificationId },
        {
          delay: options.delay || 0,
          priority: options.priority || 0,
          attempts: options.attempts || this.config.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: this.config.retryDelay,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log('Notification queued', { notificationId });
    } catch (error) {
      this.logger.error('Failed to queue notification', error.stack, { notificationId });
      throw error;
    }
  }

  async addBulkNotification(
    payload: NotificationPayload,
    options: {
      delay?: number;
      priority?: number;
    } = {}
  ): Promise<void> {
    try {
      await this.bulkQueue.add(
        'process-bulk-notification',
        payload,
        {
          delay: options.delay || 0,
          priority: options.priority || 0,
          attempts: this.config.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: this.config.retryDelay,
          },
          removeOnComplete: 50,
          removeOnFail: 25,
        }
      );

      this.logger.log('Bulk notification queued', {
        type: payload.type,
        recipientCount: payload.recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to queue bulk notification', error.stack);
      throw error;
    }
  }

  async scheduleNotification(
    notificationId: string,
    scheduledAt: Date
  ): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Schedule immediately if time has passed
      await this.addNotification(notificationId);
    } else {
      await this.addNotification(notificationId, { delay });
    }
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  async getQueueStats(): Promise<{
    notification: any;
    bulk: any;
  }> {
    const [notificationStats, bulkStats] = await Promise.all([
      this.getQueueCounts(this.notificationQueue),
      this.getQueueCounts(this.bulkQueue),
    ]);

    return {
      notification: notificationStats,
      bulk: bulkStats,
    };
  }

  async pauseQueue(queueName: 'notification' | 'bulk'): Promise<void> {
    const queue = queueName === 'notification' ? this.notificationQueue : this.bulkQueue;
    await queue.pause();
    this.logger.log(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: 'notification' | 'bulk'): Promise<void> {
    const queue = queueName === 'notification' ? this.notificationQueue : this.bulkQueue;
    await queue.resume();
    this.logger.log(`Queue resumed: ${queueName}`);
  }

  async clearQueue(queueName: 'notification' | 'bulk'): Promise<void> {
    const queue = queueName === 'notification' ? this.notificationQueue : this.bulkQueue;
    await queue.obliterate({ force: true });
    this.logger.log(`Queue cleared: ${queueName}`);
  }

  async retryFailedJobs(queueName: 'notification' | 'bulk'): Promise<number> {
    const queue = queueName === 'notification' ? this.notificationQueue : this.bulkQueue;
    const failedJobs = await queue.getFailed();
    
    let retryCount = 0;
    for (const job of failedJobs) {
      await job.retry();
      retryCount++;
    }

    this.logger.log(`Retried failed jobs: ${retryCount}`, { queueName });
    return retryCount;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async initializeRedis(): Promise<void> {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for notification queue');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error.stack);
    });
  }

  private async initializeQueues(): Promise<void> {
    const connection = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
    };

    this.notificationQueue = new Queue('notification-processing', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.bulkQueue = new Queue('bulk-notification-processing', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    });

    this.logger.log('Notification queues initialized');
  }

  private async initializeWorkers(): Promise<void> {
    const connection = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
    };

    // Notification processing worker
    this.worker = new Worker(
      'notification-processing',
      async (job: Job) => {
        const { notificationId } = job.data;
        
        // Import here to avoid circular dependency
        const { NotificationService } = await import('../notification.service.js');
        const notificationService = new NotificationService(
          // Dependencies would be injected here in a real implementation
          null as any, null as any, null as any, null as any, 
          null as any, null as any, null as any, null as any, 
          null as any, null as any, null as any
        );
        
        await notificationService.processNotification(notificationId);
      },
      {
        connection,
        concurrency: this.config.concurrency,
      }
    );

    // Bulk notification processing worker
    this.bulkWorker = new Worker(
      'bulk-notification-processing',
      async (job: Job) => {
        const payload: NotificationPayload = job.data;
        
        // Process bulk notification
        // Implementation would depend on the specific bulk processing logic
        this.logger.log('Processing bulk notification', {
          type: payload.type,
          recipientCount: payload.recipients.length,
        });
      },
      {
        connection,
        concurrency: Math.max(1, Math.floor(this.config.concurrency / 2)),
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      this.logger.log('Notification job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error('Notification job failed', err.stack, { jobId: job?.id });
    });

    this.bulkWorker.on('completed', (job) => {
      this.logger.log('Bulk notification job completed', { jobId: job.id });
    });

    this.bulkWorker.on('failed', (job, err) => {
      this.logger.error('Bulk notification job failed', err.stack, { jobId: job?.id });
    });

    this.logger.log('Notification workers initialized');
  }

  private async getQueueCounts(queue: Queue): Promise<any> {
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
}