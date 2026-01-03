import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  NotificationDeliveryResult,
  NotificationBatch,
  NotificationRecipient,
  NotificationContext,
  NotificationType,
  NotificationChannel,
} from '../types/notification.types';
import { Prisma, $Enums } from '@prisma/client';

export interface NotificationRecord {
  id: string;
  type: $Enums.NotificationType;
  category: $Enums.NotificationCategory;
  priority: $Enums.NotificationPriority;
  status: $Enums.NotificationStatus;
  recipients: NotificationRecipient[];
  channels: $Enums.NotificationChannel[];
  templateVariables: Record<string, any>;
  context: NotificationContext;
  scheduledAt?: Date;
  expiresAt?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(notification: NotificationRecord): Promise<NotificationRecord> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        status: notification.status,
        recipients: notification.recipients as any,
        channels: notification.channels,
        templateVariables: notification.templateVariables,
        scheduledAt: notification.scheduledAt,
        expiresAt: notification.expiresAt,
        idempotencyKey: notification.idempotencyKey,
        userId: notification.recipients[0]?.userId,
        tenantId: notification.context?.tenantId,
        source: notification.context?.source || 'system',
        metadata: notification.context?.metadata || {},
        createdAt: notification.createdAt,
      },
      include: {
        deliveries: true,
        events: true,
      },
    });

    return this.mapToNotificationRecord(created);
  }

  async findById(id: string): Promise<NotificationRecord | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        deliveries: true,
        events: true,
      },
    });

    return notification ? this.mapToNotificationRecord(notification) : null;
  }

  async updateStatus(
    id: string,
    status: $Enums.NotificationStatus,
  ): Promise<void> {
    const updateData: Prisma.NotificationUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (status === $Enums.NotificationStatus.PROCESSING) {
      updateData.processedAt = new Date();
    } else if (
      status === $Enums.NotificationStatus.SENT ||
      status === $Enums.NotificationStatus.DELIVERED
    ) {
      updateData.completedAt = new Date();
    }

    await this.prisma.notification.update({
      where: { id },
      data: updateData,
    });
  }

  async storeDeliveryResults(
    notificationId: string,
    results: NotificationDeliveryResult[],
  ): Promise<void> {
    // Create individual delivery records for proper tracking
    const deliveryData = results.map((result) => ({
      id: `${notificationId}_${result.channel}_${Date.now()}`,
      notificationId,
      channel: result.channel as $Enums.NotificationChannel,
      recipient: result.recipient as any,
      status: result.success
        ? $Enums.DeliveryStatus.DELIVERED
        : $Enums.DeliveryStatus.FAILED,
      messageId: result.messageId,
      errorCode: result.error,
      errorMessage: result.error,
      attempts: result.attempts || 1,
      sentAt: result.success ? new Date() : undefined,
      deliveredAt: result.success ? new Date() : undefined,
    }));

    await this.prisma.notificationDelivery.createMany({
      data: deliveryData,
    });
  }

  async findScheduledNotifications(): Promise<NotificationRecord[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: $Enums.NotificationStatus.PENDING,
        scheduledAt: {
          lte: new Date(),
        },
      },
      // Temporarily disable includes to fix startup issue
      // include: {
      //   deliveries: true,
      //   events: true,
      // }: 100,
    });

    return notifications.map((n) => this.mapToNotificationRecord(n));
  }

  async findFailedNotificationsForRetry(): Promise<NotificationRecord[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: $Enums.NotificationStatus.FAILED,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        deliveries: {
          where: {
            status: $Enums.DeliveryStatus.FAILED,
            attempts: {
              lt: 3,
            },
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
          },
        },
        events: true,
      },
      take: 50,
    });

    return notifications
      .filter((n) => n.deliveries.length > 0)
      .map((n) => this.mapToNotificationRecord(n));
  }

  async deleteExpiredNotifications(): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        },
        status: {
          in: [
            $Enums.NotificationStatus.SENT,
            $Enums.NotificationStatus.DELIVERED,
            $Enums.NotificationStatus.CANCELLED,
          ],
        },
      },
    });

    return result.count;
  }

  async createBatch(batch: NotificationBatch): Promise<void> {
    const batchData: any = {
      id: batch.id,
      type: batch.type as $Enums.NotificationType,
      status: batch.status as $Enums.BatchStatus,
      totalRecipients: batch.totalRecipients,
      processedRecipients: batch.processedRecipients,
      successfulDeliveries: batch.successfulDeliveries || 0,
      failedDeliveries: batch.failedDeliveries || 0,
      templateVariables: batch.templateVariables || {},
      channels: (batch.channels as $Enums.NotificationChannel[]) || [],
      scheduledAt: batch.scheduledAt,
      createdBy: batch.createdBy,
      createdAt: batch.createdAt,
    };

    // Only include tenantId if it's provided
    if (batch.tenantId) {
      batchData.tenantId = batch.tenantId;
    }

    await this.prisma.notificationBatch.create({
      data: batchData,
    });
  }

  async updateBatchStatus(
    batchId: string,
    status: $Enums.BatchStatus,
  ): Promise<void> {
    await this.prisma.notificationBatch.update({
      where: { id: batchId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async findUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      channels?: $Enums.NotificationChannel[];
      type?: $Enums.NotificationType;
      status?: $Enums.NotificationStatus;
    } = {},
  ): Promise<{ notifications: any[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (options.channels && options.channels.length > 0) {
      where.channels = {
        hasSome: options.channels,
      };
    }

    if (options.type) {
      where.type = options.type;
    }

    if (options.status) {
      where.status = options.status;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          deliveries: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToUserNotification(n)),
      total,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Create a read event for tracking
    await this.prisma.notificationEvent.create({
      data: {
        id: `${notificationId}_read_${Date.now()}`,
        notificationId,
        type: 'READ',
        userId,
        timestamp: new Date(),
        metadata: {},
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      select: { id: true },
    });

    const events = notifications.map((n) => ({
      id: `${n.id}_read_${Date.now()}`,
      notificationId: n.id,
      type: 'READ' as const,
      userId,
      timestamp: new Date(),
      metadata: {},
    }));

    await this.prisma.notificationEvent.createMany({
      data: events,
    });

    return events.length;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const readNotificationIds = await this.prisma.notificationEvent.findMany({
      where: {
        userId,
        type: 'READ',
      },
      select: { notificationId: true },
    });

    const readIds = readNotificationIds.map((e) => e.notificationId);

    return this.prisma.notification.count({
      where: {
        userId,
        id: {
          notIn: readIds,
        },
      },
    });
  }

  async deleteNotification(
    notificationId: string,
    userId?: string,
  ): Promise<void> {
    const where: any = { id: notificationId };
    if (userId) {
      where.userId = userId;
    }

    await this.prisma.notification.delete({ where });
  }

  // ============================================================================
  // ANALYTICS & METRICS
  // ============================================================================

  async getNotificationMetrics(
    filters: {
      type?: NotificationType;
      channel?: NotificationChannel;
      dateFrom?: Date;
      dateTo?: Date;
      userId?: string;
    } = {},
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
  }> {
    const where: Prisma.NotificationWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.userId) where.userId = filters.userId;
    if (filters.channel) {
      where.channels = {
        has: filters.channel,
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [total, sent, delivered, failed] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...where, status: $Enums.NotificationStatus.SENT },
      }),
      this.prisma.notification.count({
        where: { ...where, status: $Enums.NotificationStatus.DELIVERED },
      }),
      this.prisma.notification.count({
        where: { ...where, status: $Enums.NotificationStatus.FAILED },
      }),
    ]);

    // Count opened notifications (those with READ events)
    const openedCount = await this.prisma.notificationEvent.count({
      where: {
        type: 'READ',
        notification: where,
      },
    });

    return {
      total,
      sent,
      delivered,
      failed,
      opened: openedCount,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapToNotificationRecord(notification: any): NotificationRecord {
    return {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      status: notification.status,
      recipients: notification.recipients || [],
      channels: notification.channels || [],
      templateVariables: notification.templateVariables || {},
      context: {
        source: notification.source,
        tenantId: notification.tenantId,
        metadata: notification.metadata || {},
      },
      scheduledAt: notification.scheduledAt,
      expiresAt: notification.expiresAt,
      idempotencyKey: notification.idempotencyKey,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      processedAt: notification.processedAt,
      completedAt: notification.completedAt,
    };
  }

  private mapToUserNotification(notification: any): any {
    return {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      status: notification.status,
      channels: notification.channels,
      templateVariables: notification.templateVariables,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      deliveries: notification.deliveries || [],
    };
  }
}
