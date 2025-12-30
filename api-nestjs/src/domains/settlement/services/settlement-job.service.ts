import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { SettlementJobType, SettlementJobStatus } from '../enums/settlement-status.enum';

export interface CreateJobRequest {
  type: SettlementJobType;
  sellerId?: string;
  batchSize?: number;
  periodStart?: Date;
  periodEnd?: Date;
  totalItems?: number;
  metadata?: any;
}

export interface JobProgress {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progressPercentage: number;
}

@Injectable()
export class SettlementJobService {
  private readonly logger = new Logger(SettlementJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  async createJob(request: CreateJobRequest): Promise<string> {
    this.loggerService.log('SettlementJobService.createJob', {
      type: request.type,
      sellerId: request.sellerId,
      totalItems: request.totalItems,
    });

    const jobId = this.generateJobId();

    await this.prisma.settlementJob.create({
      data: {
        jobId,
        type: request.type,
        status: SettlementJobStatus.PENDING,
        sellerId: request.sellerId,
        batchSize: request.batchSize,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        totalItems: request.totalItems || 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Settlement job created: ${jobId}`);
    return jobId;
  }

  async getJob(jobId: string): Promise<any> {
    const job = await this.prisma.settlementJob.findUnique({
      where: { jobId },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  async updateJobStatus(jobId: string, status: SettlementJobStatus): Promise<void> {
    this.loggerService.log('SettlementJobService.updateJobStatus', { jobId, status });

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === SettlementJobStatus.RUNNING) {
      updateData.startedAt = new Date();
    }

    await this.prisma.settlementJob.update({
      where: { jobId },
      data: updateData,
    });
  }

  async updateJobProgress(
    jobId: string,
    processedItems: number,
    successfulItems?: number,
    failedItems?: number
  ): Promise<void> {
    const updateData: any = {
      processedItems,
      updatedAt: new Date(),
    };

    if (successfulItems !== undefined) {
      updateData.successfulItems = successfulItems;
    }

    if (failedItems !== undefined) {
      updateData.failedItems = failedItems;
    }

    await this.prisma.settlementJob.update({
      where: { jobId },
      data: updateData,
    });
  }

  async completeJob(jobId: string, results?: any): Promise<void> {
    this.loggerService.log('SettlementJobService.completeJob', { jobId });

    await this.prisma.settlementJob.update({
      where: { jobId },
      data: {
        status: SettlementJobStatus.COMPLETED,
        completedAt: new Date(),
        results: results || {},
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Settlement job completed: ${jobId}`);
  }

  async failJob(jobId: string, errorMessage: string, errorDetails?: any): Promise<void> {
    this.loggerService.log('SettlementJobService.failJob', { jobId, errorMessage });

    await this.prisma.settlementJob.update({
      where: { jobId },
      data: {
        status: SettlementJobStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
        errorDetails: errorDetails || {},
        updatedAt: new Date(),
      },
    });

    this.logger.error(`Settlement job failed: ${jobId} - ${errorMessage}`);
  }

  // ============================================================================
  // JOB QUERIES
  // ============================================================================

  async getJobProgress(jobId: string): Promise<JobProgress> {
    const job = await this.getJob(jobId);

    const progressPercentage = job.totalItems > 0 
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

    return {
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
      progressPercentage,
    };
  }

  async getActiveJobs(): Promise<any[]> {
    return this.prisma.settlementJob.findMany({
      where: {
        status: {
          in: [SettlementJobStatus.PENDING, SettlementJobStatus.RUNNING],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getJobHistory(
    limit: number = 50,
    offset: number = 0,
    type?: SettlementJobType,
    status?: SettlementJobStatus
  ): Promise<{
    jobs: any[];
    total: number;
  }> {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.settlementJob.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.settlementJob.count({ where }),
    ]);

    return { jobs, total };
  }

  // ============================================================================
  // JOB CLEANUP
  // ============================================================================

  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    this.logger.log(`Cleaning up jobs older than ${olderThanDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.settlementJob.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [SettlementJobStatus.COMPLETED, SettlementJobStatus.FAILED],
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old jobs`);
    return result.count;
  }

  async cancelStaleJobs(staleAfterHours: number = 24): Promise<number> {
    this.logger.log(`Cancelling stale jobs older than ${staleAfterHours} hours`);

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - staleAfterHours);

    const result = await this.prisma.settlementJob.updateMany({
      where: {
        status: {
          in: [SettlementJobStatus.PENDING, SettlementJobStatus.RUNNING],
        },
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: SettlementJobStatus.FAILED,
        failedAt: new Date(),
        errorMessage: 'Job cancelled due to timeout',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Cancelled ${result.count} stale jobs`);
    return result.count;
  }

  // ============================================================================
  // JOB STATISTICS
  // ============================================================================

  async getJobStatistics(
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    runningJobs: number;
    pendingJobs: number;
    averageDuration: number;
    successRate: number;
  }> {
    const where: any = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const jobs = await this.prisma.settlementJob.findMany({
      where,
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
      },
    });

    let totalJobs = jobs.length;
    let completedJobs = 0;
    let failedJobs = 0;
    let runningJobs = 0;
    let pendingJobs = 0;
    let totalDuration = 0;
    let jobsWithDuration = 0;

    for (const job of jobs) {
      switch (job.status) {
        case SettlementJobStatus.COMPLETED:
          completedJobs++;
          if (job.startedAt && job.completedAt) {
            totalDuration += job.completedAt.getTime() - job.startedAt.getTime();
            jobsWithDuration++;
          }
          break;
        case SettlementJobStatus.FAILED:
          failedJobs++;
          if (job.startedAt && job.failedAt) {
            totalDuration += job.failedAt.getTime() - job.startedAt.getTime();
            jobsWithDuration++;
          }
          break;
        case SettlementJobStatus.RUNNING:
          runningJobs++;
          break;
        case SettlementJobStatus.PENDING:
          pendingJobs++;
          break;
      }
    }

    const averageDuration = jobsWithDuration > 0 ? totalDuration / jobsWithDuration : 0;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      runningJobs,
      pendingJobs,
      averageDuration: Math.round(averageDuration / 1000), // Convert to seconds
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `JOB_${timestamp}_${random}`.toUpperCase();
  }

  // ============================================================================
  // JOB MONITORING
  // ============================================================================

  async getJobHealth(): Promise<{
    activeJobs: number;
    staleJobs: number;
    recentFailures: number;
    systemLoad: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeJobs, staleJobs, recentFailures] = await Promise.all([
      this.prisma.settlementJob.count({
        where: {
          status: {
            in: [SettlementJobStatus.PENDING, SettlementJobStatus.RUNNING],
          },
        },
      }),
      this.prisma.settlementJob.count({
        where: {
          status: {
            in: [SettlementJobStatus.PENDING, SettlementJobStatus.RUNNING],
          },
          createdAt: {
            lt: oneDayAgo,
          },
        },
      }),
      this.prisma.settlementJob.count({
        where: {
          status: SettlementJobStatus.FAILED,
          failedAt: {
            gte: oneHourAgo,
          },
        },
      }),
    ]);

    let systemLoad: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (activeJobs > 10) systemLoad = 'MEDIUM';
    if (activeJobs > 50 || staleJobs > 5 || recentFailures > 10) systemLoad = 'HIGH';

    return {
      activeJobs,
      staleJobs,
      recentFailures,
      systemLoad,
    };
  }
}