import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  NotificationChannel,
  NotificationType,
  NotificationDeliveryResult,
  NotificationCategory,
} from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface NotificationMetrics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened?: number;
  clicked?: number;
  unsubscribed?: number;
}

export interface MetricsFilter {
  dateFrom?: Date;
  dateTo?: Date;
  tenantId?: string;
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  category?: NotificationCategory;
}

export interface ChannelPerformance {
  channel: NotificationChannel;
  metrics: NotificationMetrics;
  avgProcessingTime?: number;
  avgDeliveryTime?: number;
  errorRate: number;
  cost?: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  metrics: NotificationMetrics;
}

@Injectable()
export class NotificationMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // DELIVERY METRICS RECORDING
  // ============================================================================

  async recordDeliveryResults(
    results: NotificationDeliveryResult[],
  ): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Group results by dimensions for aggregation
      const metricsMap = new Map<string, any>();

      for (const result of results) {
        const dimensions = [
          {
            tenantId: null,
            userId: null,
            type: null,
            channel: result.channel,
            category: null,
          },
          {
            tenantId: null,
            userId: result.recipient.userId,
            type: null,
            channel: result.channel,
            category: null,
          },
          // Add more dimension combinations as needed
        ];

        for (const dimension of dimensions) {
          const key = this.buildMetricsKey(dimension);

          if (!metricsMap.has(key)) {
            metricsMap.set(key, {
              ...dimension,
              date,
              hour,
              sent: 0,
              delivered: 0,
              failed: 0,
              bounced: 0,
              opened: 0,
              clicked: 0,
              unsubscribed: 0,
              totalCost: 0,
            });
          }

          const metrics = metricsMap.get(key);

          // Update counters based on result status
          switch (result.status) {
            case 'SENT':
              metrics.sent++;
              metrics.delivered++; // Assume sent = delivered for now
              break;
            case 'FAILED':
              metrics.failed++;
              break;
            case 'BOUNCED':
              metrics.bounced++;
              break;
            case 'OPENED':
              metrics.opened++;
              break;
            case 'CLICKED':
              metrics.clicked++;
              break;
          }
        }
      }

      // Batch upsert metrics
      for (const metrics of metricsMap.values()) {
        await this.upsertMetrics(metrics);
      }

      this.logger.log('Delivery metrics recorded', {
        resultCount: results.length,
        metricsCount: metricsMap.size,
      });
    } catch (error) {
      this.logger.error('Failed to record delivery metrics', error.stack);
    }
  }

  async recordNotificationEvent(
    notificationId: string,
    eventType: string,
    channel?: NotificationChannel,
    data?: any,
  ): Promise<void> {
    try {
      await this.prisma.notificationEvent.create({
        data: {
          notificationId,
          type: eventType,
          channel,
          data: data || {},
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to record notification event', error.stack, {
        notificationId,
        eventType,
      });
    }
  }

  // ============================================================================
  // METRICS QUERIES
  // ============================================================================

  async getMetrics(filters: MetricsFilter = {}): Promise<NotificationMetrics> {
    try {
      const where: any = {};

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.tenantId) where.tenantId = filters.tenantId;
      if (filters.userId) where.userId = filters.userId;
      if (filters.type) where.type = filters.type;
      if (filters.channel) where.channel = filters.channel;
      if (filters.category) where.category = filters.category;

      const result = await this.prisma.notificationMetrics.aggregate({
        where,
        _sum: {
          sent: true,
          delivered: true,
          failed: true,
          bounced: true,
          opened: true,
          clicked: true,
          unsubscribed: true,
        },
      });

      return {
        sent: result._sum.sent || 0,
        delivered: result._sum.delivered || 0,
        failed: result._sum.failed || 0,
        bounced: result._sum.bounced || 0,
        opened: result._sum.opened || 0,
        clicked: result._sum.clicked || 0,
        unsubscribed: result._sum.unsubscribed || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get metrics', error.stack, { filters });
      return {
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0,
      };
    }
  }

  async getChannelPerformance(
    filters: MetricsFilter = {},
  ): Promise<ChannelPerformance[]> {
    try {
      const where: any = {};

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.tenantId) where.tenantId = filters.tenantId;

      const results = await this.prisma.notificationMetrics.groupBy({
        by: ['channel'],
        where,
        _sum: {
          sent: true,
          delivered: true,
          failed: true,
          bounced: true,
          opened: true,
          clicked: true,
          unsubscribed: true,
          totalCost: true,
        },
        _avg: {
          avgProcessingTime: true,
          avgDeliveryTime: true,
        },
      });

      return results.map((result) => {
        const total = (result._sum.sent || 0) + (result._sum.failed || 0);
        const errorRate = total > 0 ? (result._sum.failed || 0) / total : 0;

        return {
          channel: result.channel as NotificationChannel,
          metrics: {
            sent: result._sum.sent || 0,
            delivered: result._sum.delivered || 0,
            failed: result._sum.failed || 0,
            bounced: result._sum.bounced || 0,
            opened: result._sum.opened || 0,
            clicked: result._sum.clicked || 0,
            unsubscribed: result._sum.unsubscribed || 0,
          },
          avgProcessingTime: result._avg.avgProcessingTime || undefined,
          avgDeliveryTime: result._avg.avgDeliveryTime || undefined,
          errorRate,
          cost: result._sum.totalCost
            ? Number(result._sum.totalCost)
            : undefined,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get channel performance', error.stack, {
        filters,
      });
      return [];
    }
  }

  async getTimeSeriesData(
    filters: MetricsFilter = {},
    granularity: 'hour' | 'day' = 'day',
  ): Promise<TimeSeriesData[]> {
    try {
      const where: any = {};

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.tenantId) where.tenantId = filters.tenantId;
      if (filters.type) where.type = filters.type;
      if (filters.channel) where.channel = filters.channel;

      const groupBy = granularity === 'hour' ? ['date', 'hour'] : ['date'];

      const results = await this.prisma.notificationMetrics.groupBy({
        by: groupBy as any,
        where,
        _sum: {
          sent: true,
          delivered: true,
          failed: true,
          bounced: true,
          opened: true,
          clicked: true,
          unsubscribed: true,
        },
        orderBy:
          granularity === 'hour'
            ? [{ date: 'asc' }, { hour: 'asc' }]
            : { date: 'asc' },
      });

      return results.map((result) => {
        const timestamp =
          granularity === 'hour' && result.hour !== null
            ? new Date(result.date.getTime() + result.hour * 60 * 60 * 1000)
            : result.date;

        return {
          timestamp,
          metrics: {
            sent: result._sum.sent || 0,
            delivered: result._sum.delivered || 0,
            failed: result._sum.failed || 0,
            bounced: result._sum.bounced || 0,
            opened: result._sum.opened || 0,
            clicked: result._sum.clicked || 0,
            unsubscribed: result._sum.unsubscribed || 0,
          },
        };
      });
    } catch (error) {
      this.logger.error('Failed to get time series data', error.stack, {
        filters,
      });
      return [];
    }
  }

  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================

  async getEngagementRates(filters: MetricsFilter = {}): Promise<{
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
  }> {
    const metrics = await this.getMetrics(filters);

    const deliveryRate =
      metrics.sent > 0 ? metrics.delivered / metrics.sent : 0;
    const openRate =
      metrics.delivered > 0 ? (metrics.opened || 0) / metrics.delivered : 0;
    const clickRate =
      (metrics.opened || 0) > 0
        ? (metrics.clicked || 0) / (metrics.opened || 1)
        : 0;
    const unsubscribeRate =
      metrics.delivered > 0
        ? (metrics.unsubscribed || 0) / metrics.delivered
        : 0;

    return {
      deliveryRate,
      openRate,
      clickRate,
      unsubscribeRate,
    };
  }

  async getTopPerformingTypes(
    filters: MetricsFilter = {},
    limit: number = 10,
  ): Promise<
    Array<{
      type: NotificationType;
      metrics: NotificationMetrics;
      engagementScore: number;
    }>
  > {
    try {
      const where: any = {};

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.tenantId) where.tenantId = filters.tenantId;
      if (filters.channel) where.channel = filters.channel;

      const results = await this.prisma.notificationMetrics.groupBy({
        by: ['type'],
        where: { ...where, type: { not: null } },
        _sum: {
          sent: true,
          delivered: true,
          failed: true,
          bounced: true,
          opened: true,
          clicked: true,
          unsubscribed: true,
        },
        orderBy: {
          _sum: {
            sent: 'desc',
          },
        },
        take: limit,
      });

      return results.map((result) => {
        const metrics = {
          sent: result._sum.sent || 0,
          delivered: result._sum.delivered || 0,
          failed: result._sum.failed || 0,
          bounced: result._sum.bounced || 0,
          opened: result._sum.opened || 0,
          clicked: result._sum.clicked || 0,
          unsubscribed: result._sum.unsubscribed || 0,
        };

        // Calculate engagement score (weighted combination of rates)
        const deliveryRate =
          metrics.sent > 0 ? metrics.delivered / metrics.sent : 0;
        const openRate =
          metrics.delivered > 0 ? metrics.opened / metrics.delivered : 0;
        const clickRate =
          metrics.opened > 0 ? metrics.clicked / metrics.opened : 0;

        const engagementScore =
          deliveryRate * 0.3 + openRate * 0.4 + clickRate * 0.3;

        return {
          type: result.type as NotificationType,
          metrics,
          engagementScore,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get top performing types', error.stack, {
        filters,
      });
      return [];
    }
  }

  // ============================================================================
  // COST ANALYTICS
  // ============================================================================

  async getCostAnalytics(filters: MetricsFilter = {}): Promise<{
    totalCost: number;
    costPerChannel: Array<{ channel: NotificationChannel; cost: number }>;
    costPerNotification: number;
    currency: string;
  }> {
    try {
      const where: any = {};

      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      if (filters.tenantId) where.tenantId = filters.tenantId;

      const [totalResult, channelResults] = await Promise.all([
        this.prisma.notificationMetrics.aggregate({
          where,
          _sum: {
            totalCost: true,
            sent: true,
          },
        }),
        this.prisma.notificationMetrics.groupBy({
          by: ['channel'],
          where,
          _sum: {
            totalCost: true,
          },
        }),
      ]);

      const totalCost = Number(totalResult._sum.totalCost || 0);
      const totalSent = totalResult._sum.sent || 0;
      const costPerNotification = totalSent > 0 ? totalCost / totalSent : 0;

      const costPerChannel = channelResults.map((result) => ({
        channel: result.channel as NotificationChannel,
        cost: Number(result._sum.totalCost || 0),
      }));

      return {
        totalCost,
        costPerChannel,
        costPerNotification,
        currency: 'USD', // This should come from configuration
      };
    } catch (error) {
      this.logger.error('Failed to get cost analytics', error.stack, {
        filters,
      });
      return {
        totalCost: 0,
        costPerChannel: [],
        costPerNotification: 0,
        currency: 'USD',
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async upsertMetrics(metrics: any): Promise<void> {
    await this.prisma.notificationMetrics.upsert({
      where: {
        date_hour_tenantId_userId_type_channel_category: {
          date: metrics.date,
          hour: metrics.hour,
          tenantId: metrics.tenantId,
          userId: metrics.userId,
          type: metrics.type,
          channel: metrics.channel,
          category: metrics.category,
        },
      },
      update: {
        sent: { increment: metrics.sent },
        delivered: { increment: metrics.delivered },
        failed: { increment: metrics.failed },
        bounced: { increment: metrics.bounced },
        opened: { increment: metrics.opened },
        clicked: { increment: metrics.clicked },
        unsubscribed: { increment: metrics.unsubscribed },
        totalCost: { increment: metrics.totalCost },
      },
      create: metrics,
    });
  }

  private buildMetricsKey(dimension: any): string {
    return [
      dimension.tenantId || 'null',
      dimension.userId || 'null',
      dimension.type || 'null',
      dimension.channel || 'null',
      dimension.category || 'null',
    ].join(':');
  }
}
