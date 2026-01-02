import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { NotificationRecipient } from '../../types/notification.types';
import { ChannelDeliveryRequest, ChannelDeliveryResult } from '../notification-channel.service';
import { LoggerService } from '../../../../infrastructure/observability/logger.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class InAppChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async send(
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest
  ): Promise<ChannelDeliveryResult> {
    if (!recipient.userId) {
      throw new Error('User ID is required for in-app notifications');
    }

    try {
      // Store in-app notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId: recipient.userId,
          type: $Enums.NotificationType.SYSTEM_MAINTENANCE,
          channels: [$Enums.NotificationChannel.IN_APP],
          priority: request.priority || $Enums.NotificationPriority.MEDIUM,
          status: $Enums.NotificationStatus.SENT,
          recipients: [recipient] as any,
          templateVariables: {
            title: request.title || 'Notification',
            content: request.content,
            ...request.data,
          },
          source: 'in-app-channel',
          metadata: request.data || {},
        },
      });

      // TODO: Send real-time notification via WebSocket
      // await this.websocketService.sendToUser(recipient.userId, {
      //   type: 'notification',
      //   data: notification,
      // });

      return {
        success: true,
        messageId: notification.id,
        metadata: {
          userId: recipient.userId,
          stored: true,
        },
      };
    } catch (error) {
      this.logger.error('In-app notification delivery failed', error.stack, {
        userId: recipient.userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateRecipient(recipient: NotificationRecipient): Promise<boolean> {
    return !!recipient.userId;
  }

  async getHealth(): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    errorRate?: number;
    avgResponseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        lastCheck: new Date(),
        avgResponseTime: responseTime,
      };
    } catch (error) {
      this.logger.error('In-app service health check failed', error.stack);
      return {
        isHealthy: false,
        lastCheck: new Date(),
      };
    }
  }

  // ============================================================================
  // IN-APP SPECIFIC METHODS
  // ============================================================================

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Create a read event instead of updating the notification directly
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
    // Get all unread notifications for the user
    const notifications = await this.prisma.notification.findMany({
      where: { 
        userId,
        channels: { has: $Enums.NotificationChannel.IN_APP }
      },
      select: { id: true },
    });

    // Create read events for all notifications
    const events = notifications.map(n => ({
      id: `${n.id}_read_${Date.now()}`,
      notificationId: n.id,
      type: 'READ' as const,
      userId,
      timestamp: new Date(),
      metadata: {},
    }));

    if (events.length > 0) {
      await this.prisma.notificationEvent.createMany({
        data: events,
      });
    }

    return events.length;
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Get all in-app notifications for the user
    const allNotifications = await this.prisma.notification.findMany({
      where: {
        userId,
        channels: { has: $Enums.NotificationChannel.IN_APP }
      },
      select: { id: true },
    });

    // Get read notification IDs
    const readNotificationIds = await this.prisma.notificationEvent.findMany({
      where: {
        userId,
        type: 'READ',
        notificationId: { in: allNotifications.map(n => n.id) }
      },
      select: { notificationId: true },
    });

    const readIds = new Set(readNotificationIds.map(e => e.notificationId));
    return allNotifications.filter(n => !readIds.has(n.id)).length;
  }

  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      isRead?: boolean;
      type?: string;
    } = {}
  ): Promise<{ notifications: any[]; total: number }> {
    const where: any = { 
      userId,
      channels: { has: $Enums.NotificationChannel.IN_APP }
    };
    
    if (options.type) {
      where.type = options.type;
    }

    // Get all notifications first
    const [allNotifications, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    // If filtering by read status, we need to check events
    if (options.isRead !== undefined) {
      const readEvents = await this.prisma.notificationEvent.findMany({
        where: {
          userId,
          type: 'READ',
          notificationId: { in: allNotifications.map(n => n.id) }
        },
        select: { notificationId: true },
      });

      const readIds = new Set(readEvents.map(e => e.notificationId));
      const filteredNotifications = allNotifications.filter(n => 
        options.isRead ? readIds.has(n.id) : !readIds.has(n.id)
      );

      return {
        notifications: filteredNotifications,
        total: filteredNotifications.length,
      };
    }

    return { 
      notifications: allNotifications, 
      total: totalCount 
    };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}