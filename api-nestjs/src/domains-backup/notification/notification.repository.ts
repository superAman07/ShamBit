import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { Notification, NotificationType, NotificationChannel, NotificationPriority } from './notification.service.js';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        priority: data.priority,
        title: data.title,
        message: data.message,
        data: data.data || {},
        isRead: false,
        createdAt: new Date(),
      },
    });

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      channel: notification.channel as NotificationChannel,
      priority: notification.priority as NotificationPriority,
      title: notification.title,
      message: notification.message,
      data: notification.data as Record<string, any>,
      isRead: notification.isRead,
      sentAt: notification.sentAt || undefined,
      readAt: notification.readAt || undefined,
      createdAt: notification.createdAt,
    };
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      channel: notification.channel as NotificationChannel,
      priority: notification.priority as NotificationPriority,
      title: notification.title,
      message: notification.message,
      data: notification.data as Record<string, any>,
      isRead: notification.isRead,
      sentAt: notification.sentAt || undefined,
      readAt: notification.readAt || undefined,
      createdAt: notification.createdAt,
    }));
  }

  async markAsRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { 
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAsSent(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { sentAt: new Date() },
    });
  }
}