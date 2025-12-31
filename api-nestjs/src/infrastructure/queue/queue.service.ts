import { Injectable } from '@nestjs/common';
import { LoggerService } from '../observability/logger.service';

export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts: QueueJobOptions;
  progress: number;
  returnvalue?: any;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

@Injectable()
export class QueueService {
  private queues: Map<string, QueueJob[]> = new Map();

  constructor(private readonly logger: LoggerService) {}

  /**
   * Add a job to the specified queue
   */
  async add(
    queueName: string,
    data: any,
    options: QueueJobOptions = {},
  ): Promise<QueueJob> {
    this.logger.log('QueueService.add', {
      queueName,
      data: typeof data === 'object' ? Object.keys(data) : data,
      options,
    });

    const job: QueueJob = {
      id: this.generateJobId(),
      name: queueName,
      data,
      opts: {
        priority: 0,
        delay: 0,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options,
      },
      progress: 0,
    };

    // Get or create queue
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const queue = this.queues.get(queueName)!;

    // Handle delayed jobs
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.processJob(job);
      }, options.delay);
    } else {
      // Add to queue for immediate processing
      queue.push(job);
      this.processNextJob(queueName);
    }

    return job;
  }

  /**
   * Process jobs in a queue
   */
  async process(
    queueName: string,
    processor: (job: QueueJob) => Promise<any>,
  ): Promise<void> {
    this.logger.log('QueueService.process', { queueName });

    // This would typically set up a processor for the queue
    // For now, we'll store the processor reference
    // In a real implementation, this would integrate with Bull, BullMQ, or similar
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName) || [];

    return {
      waiting: queue.filter((job) => !job.processedOn && !job.failedReason)
        .length,
      active: queue.filter((job) => job.processedOn && !job.finishedOn).length,
      completed: queue.filter((job) => job.finishedOn && !job.failedReason)
        .length,
      failed: queue.filter((job) => job.failedReason).length,
      delayed: 0, // Would track delayed jobs in real implementation
    };
  }

  /**
   * Get jobs in a queue
   */
  async getJobs(
    queueName: string,
    types: string[] = ['waiting', 'active', 'completed', 'failed'],
    start = 0,
    end = -1,
  ): Promise<QueueJob[]> {
    const queue = this.queues.get(queueName) || [];
    return queue.slice(start, end === -1 ? undefined : end + 1);
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const jobIndex = queue.findIndex((job) => job.id === jobId);
    if (jobIndex === -1) return false;

    queue.splice(jobIndex, 1);
    return true;
  }

  /**
   * Clean up completed/failed jobs
   */
  async clean(
    queueName: string,
    grace: number,
    type: 'completed' | 'failed' = 'completed',
  ): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const cutoff = Date.now() - grace;
    let removedCount = 0;

    for (let i = queue.length - 1; i >= 0; i--) {
      const job = queue[i];
      const shouldRemove =
        type === 'completed'
          ? job.finishedOn && job.finishedOn < cutoff && !job.failedReason
          : job.failedReason && job.finishedOn && job.finishedOn < cutoff;

      if (shouldRemove) {
        queue.splice(i, 1);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Pause a queue
   */
  async pause(queueName: string): Promise<void> {
    this.logger.log('QueueService.pause', { queueName });
    // Implementation would pause job processing
  }

  /**
   * Resume a queue
   */
  async resume(queueName: string): Promise<void> {
    this.logger.log('QueueService.resume', { queueName });
    // Implementation would resume job processing
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processNextJob(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return;

    // Sort by priority (higher priority first)
    queue.sort((a, b) => (b.opts.priority || 0) - (a.opts.priority || 0));

    const job = queue.shift();
    if (job) {
      await this.processJob(job);
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    try {
      job.processedOn = Date.now();
      job.progress = 0;

      this.logger.log('Processing queue job', {
        jobId: job.id,
        queueName: job.name,
        data: job.data,
      });

      // In a real implementation, this would call the registered processor
      // For now, we'll simulate job completion
      await this.simulateJobProcessing(job);

      job.progress = 100;
      job.finishedOn = Date.now();
      job.returnvalue = { success: true };

      this.logger.log('Queue job completed', {
        jobId: job.id,
        queueName: job.name,
        duration: job.finishedOn - job.processedOn,
      });
    } catch (error) {
      job.failedReason = error.message;
      job.finishedOn = Date.now();

      this.logger.error('Queue job failed', error, {
        jobId: job.id,
        queueName: job.name,
      });

      // Handle retries
      if (job.opts.attempts && job.opts.attempts > 1) {
        await this.retryJob(job);
      }
    }
  }

  private async simulateJobProcessing(job: QueueJob): Promise<void> {
    // Simulate processing time
    const processingTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      // 10% failure rate
      throw new Error('Simulated job failure');
    }
  }

  private async retryJob(job: QueueJob): Promise<void> {
    const retryDelay = this.calculateRetryDelay(job);

    setTimeout(() => {
      job.processedOn = undefined;
      job.finishedOn = undefined;
      job.failedReason = undefined;
      job.progress = 0;
      job.opts.attempts = (job.opts.attempts || 1) - 1;

      this.processJob(job);
    }, retryDelay);
  }

  private calculateRetryDelay(job: QueueJob): number {
    if (!job.opts.backoff) {
      return 1000; // Default 1 second
    }

    const baseDelay = job.opts.backoff.delay;

    if (job.opts.backoff.type === 'exponential') {
      const attempt = job.opts.attempts || 1;
      return baseDelay * Math.pow(2, attempt - 1);
    }

    return baseDelay;
  }
}
