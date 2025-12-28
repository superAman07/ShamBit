import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { NotificationRepository } from './notification.repository';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

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
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async sendNotification(sendDto: SendNotificationDto): Promise<void> {
    this.logger.log('NotificationService.sendNotification', {
      userId: sendDto.userId,
      type: sendDto.type,
      channels: sendDto.channels,
    });

    // Check user preferences
    const preferences = await this.preferenceService.getUserPreferences(sendDto.userId);
    const allowedChannels = this.filterChannelsByPreferences(sendDto.channels, preferences, sendDto.type);

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
      this.logger.error('Notification template not found', { type: sendDto.type });
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
        this.logger.error('Failed to send notification through channel', {
          userId: sendDto.userId,
          channel,
          error: error.message,
        });
      }
    }
  }