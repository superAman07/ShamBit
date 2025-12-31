import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { NotificationRepository } from './notification.repository.js';
import { EmailService } from './email.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { NotificationTemplateService } from './notification-template.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { LoggerService } from '../../infrastructure/observability/logger.service.js';

export enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  SELLER_APPLICATION_APPROVED = 'SELLER_APPLICATION_APPROVED',
  PROMOTION_ACTIVATED = 'PROMOTION_ACTIVATED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  templateVariables?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly logger: LoggerService,
  ) {}

  async sendNotification(sendDto: SendNotificationDto): Promise<void> {
    this.logger.log('NotificationService.sendNotification', {
      userId: sendDto.userId,
      type: sendDto.type,
      channels: sendDto.channels,
    });

    // Check user preferences
    const preferences = await this.preferenceService.getUserPreferences(
      sendDto.userId,
    );
    const allowedChannels = this.filterChannelsByPreferences(
      sendDto.channels,
      preferences,
      sendDto.type,
    );

    if (allowedChannels.length === 0) {
      this.logger.log('No allowed channels for notification', {
        userId: sendDto.userId,
        type: sendDto.type,
      });
      return;
    }

    // Get notification template
    const template = await this.templateService.getTemplate(sendDto.type);
    if (!template) {
      this.logger.error('Notification template not found', undefined, {
        type: sendDto.type,
      });
      return;
    }

    // Render template with variables
    const { title, message } = this.templateService.renderTemplate(
      template,
      sendDto.templateVariables || {},
    );

    // Send through each allowed channel
    for (const channel of allowedChannels) {
      try {
        await this.sendThroughChannel(
          channel,
          sendDto.userId,
          sendDto.type,
          title,
          message,
          sendDto.data,
          sendDto.priority || NotificationPriority.MEDIUM,
        );
      } catch (error) {
        this.logger.error(
          'Failed to send notification through channel',
          undefined,
          {
            userId: sendDto.userId,
            channel,
            error: error.message,
          },
        );
      }
    }
  }

  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    preferences: any[],
    type: NotificationType,
  ): NotificationChannel[] {
    // If no preferences found, use default channels
    if (!preferences || preferences.length === 0) {
      return channels;
    }

    const typePreference = preferences.find((pref) => pref.type === type);
    if (!typePreference || !typePreference.isEnabled) {
      return [];
    }

    // Return intersection of requested channels and user's preferred channels
    return channels.filter((channel) =>
      typePreference.channels.includes(channel),
    );
  }

  private async sendThroughChannel(
    channel: NotificationChannel,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): Promise<void> {
    // Create notification record
    const notification = await this.notificationRepository.create({
      userId,
      type,
      channel,
      priority,
      title,
      message,
      data,
    });

    // Send through specific channel
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(userId, title, message, data);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(userId, title, message, data);
        break;
      case NotificationChannel.IN_APP:
        // In-app notifications are already stored in database
        break;
      case NotificationChannel.SMS:
        await this.sendSMSNotification(userId, title, message, data);
        break;
    }

    // Mark as sent
    await this.notificationRepository.markAsSent(notification.id);
  }

  private async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // TODO: Get user email from user service
    const userEmail = `user-${userId}@example.com`; // Placeholder

    await this.emailService.sendEmail({
      to: userEmail,
      subject: title,
      text: message,
      html: `<p>${message}</p>`,
    });
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.pushNotificationService.sendPushNotification({
      userId,
      title,
      body: message,
      data,
    });
  }

  private async sendSMSNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // TODO: Implement SMS service
    this.logger.log('SMS notification not implemented', { userId, title });
  }

  async getNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId, limit);
  }

  async markAsRead(notificationId: string, userId?: string): Promise<void> {
    // TODO: Add user validation if userId is provided
    await this.notificationRepository.markAsRead(notificationId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications =
      await this.notificationRepository.findByUserId(userId);
    return notifications.filter((n) => !n.isRead).length;
  }

  async getUserNotifications(
    userId: string,
    query: { limit?: number; isRead?: boolean },
  ): Promise<Notification[]> {
    // TODO: Add filtering by isRead status
    return this.notificationRepository.findByUserId(userId, query.limit || 50);
  }

  async getNotification(
    id: string,
    userId: string,
  ): Promise<Notification | null> {
    const notifications =
      await this.notificationRepository.findByUserId(userId);
    return notifications.find((n) => n.id === id) || null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications =
      await this.notificationRepository.findByUserId(userId);
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    for (const notification of unreadNotifications) {
      await this.notificationRepository.markAsRead(notification.id);
    }
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    // TODO: Add delete method to repository
    this.logger.log('Delete notification not implemented', { id, userId });
  }

  async getPreferences(userId: string): Promise<any> {
    return this.preferenceService.getUserPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    preferences: Record<string, any>,
  ): Promise<void> {
    // TODO: Implement preference updates
    this.logger.log('Update preferences not implemented', {
      userId,
      preferences,
    });
  }

  async sendTestNotification(
    userId: string,
    type: string,
    message: string,
  ): Promise<void> {
    // TODO: Implement test notification
    this.logger.log('Send test notification not implemented', {
      userId,
      type,
      message,
    });
  }
}
