import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus,
  NotificationCategory,
  NotificationPayload,
  NotificationDeliveryResult,
  NotificationContext,
  NotificationRecipient
} from './types/notification.types';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationChannelService } from './services/notification-channel.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { NotificationRateLimitService } from './services/notification-rate-limit.service';
import { NotificationDeduplicationService } from './services/notification-deduplication.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { WebhookService } from './services/webhook.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import type { DomainEvent } from '../../infrastructure/events/event.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly channelService: NotificationChannelService,
    private readonly queueService: NotificationQueueService,
    private readonly rateLimitService: NotificationRateLimitService,
    private readonly deduplicationService: NotificationDeduplicationService,
    private readonly metricsService: NotificationMetricsService,
    private readonly webhookService: WebhookService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    this.logger.log('NotificationService initialized');
    await this.initializeEventListeners();
  }

  // ============================================================================
  // MAIN NOTIFICATION PROCESSING
  // ============================================================================

  async sendNotification(payload: NotificationPayload): Promise<string> {
    const notificationId = await this.generateNotificationId();
    
    this.logger.log('Processing notification request', {
      notificationId,
      type: payload.type,
      recipientCount: payload.recipients.length,
      channels: payload.channels,
    });

    try {
      // Check for idempotency
      if (payload.idempotencyKey) {
        const existing = await this.deduplicationService.checkIdempotency(
          payload.idempotencyKey
        );
        if (existing) {
          this.logger.log('Duplicate notification request ignored', {
            notificationId,
            idempotencyKey: payload.idempotencyKey,
          });
          return existing.notificationId;
        }
      }

      // Create notification record
      const notification = await this.notificationRepository.create({
        id: notificationId,
        type: payload.type,
        category: payload.category,
        priority: payload.priority,
        status: NotificationStatus.PENDING,
        recipients: payload.recipients,
        channels: payload.channels,
        templateVariables: payload.templateVariables,
        context: payload.context,
        scheduledAt: payload.scheduledAt,
        expiresAt: payload.expiresAt,
        idempotencyKey: payload.idempotencyKey,
        createdAt: new Date(),
      });

      // Store idempotency key if provided
      if (payload.idempotencyKey) {
        await this.deduplicationService.storeIdempotency(
          payload.idempotencyKey,
          notificationId
        );
      }

      // Schedule or queue for immediate processing
      if (payload.scheduledAt && payload.scheduledAt > new Date()) {
        await this.scheduleNotification(notificationId, payload.scheduledAt);
      } else {
        await this.queueNotificationForProcessing(notificationId);
      }

      this.logger.log('Notification queued successfully', {
        notificationId,
        type: payload.type,
      });

      return notificationId;
    } catch (error) {
      this.logger.error('Failed to process notification', error.stack, {
        notificationId,
        type: payload.type,
      });
      throw error;
    }
  }

  async processNotification(notificationId: string): Promise<void> {
    this.logger.log('Processing notification', { notificationId });

    try {
      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      // Check if notification has expired
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        await this.notificationRepository.updateStatus(
          notificationId,
          NotificationStatus.CANCELLED
        );
        return;
      }

      // Update status to processing
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.PROCESSING
      );

      // Process each recipient and channel combination
      const deliveryResults: NotificationDeliveryResult[] = [];

      for (const recipient of notification.recipients) {
        // Get user preferences if userId is available
        let allowedChannels = notification.channels;
        if (recipient.userId) {
          const preferences = await this.preferenceService.getUserPreferences(
            recipient.userId,
            notification.type as NotificationType | undefined
          );
          allowedChannels = this.filterChannelsByPreferences(
            notification.channels as NotificationChannel[],
            preferences
          );
        }

        // Process each allowed channel
        for (const channel of allowedChannels) {
          try {
            const result = await this.deliverNotification(
              notification,
              recipient,
              channel as NotificationChannel
            );
            deliveryResults.push(result);
          } catch (error) {
            this.logger.error('Channel delivery failed', error.stack, {
              notificationId,
              channel,
              recipient: recipient.userId || recipient.email,
            });

            deliveryResults.push({
              notificationId,
              channel: channel as NotificationChannel,
              recipient,
              status: NotificationStatus.FAILED,
              success: false,
              error: error.message,
              attempts: 1,
            });
          }
        }
      }

      // Store delivery results
      await this.notificationRepository.storeDeliveryResults(
        notificationId,
        deliveryResults
      );

      // Update overall notification status
      const overallStatus = this.calculateOverallStatus(deliveryResults);
      await this.notificationRepository.updateStatus(notificationId, overallStatus);

      // Update metrics
      await this.metricsService.recordDeliveryResults(deliveryResults);

      this.logger.log('Notification processing completed', {
        notificationId,
        deliveryResults: deliveryResults.length,
        status: overallStatus,
      });

    } catch (error) {
      this.logger.error('Notification processing failed', error.stack, {
        notificationId,
      });

      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.FAILED
      );
      throw error;
    }
  }

  private async deliverNotification(
    notification: any,
    recipient: NotificationRecipient,
    channel: NotificationChannel
  ): Promise<NotificationDeliveryResult> {
    // Check rate limits
    const rateLimitKey = this.buildRateLimitKey(recipient, channel);
    const isAllowed = await this.rateLimitService.checkRateLimit(
      rateLimitKey,
      channel
    );

    if (!isAllowed) {
      throw new Error(`Rate limit exceeded for ${channel}`);
    }

    // Get and render template
    const template = await this.templateService.getTemplate(
      notification.type,
      channel,
      recipient.userId ? await this.getUserLocale(recipient.userId) : 'en'
    );

    if (!template) {
      throw new Error(`Template not found for ${notification.type}:${channel}`);
    }

    const renderedContent = await this.templateService.renderTemplate(
      template,
      notification.templateVariables
    );

    // Deliver through channel
    const deliveryResult = await this.channelService.deliver(
      channel,
      recipient,
      {
        subject: renderedContent.subject,
        title: renderedContent.title,
        content: renderedContent.content,
        htmlContent: renderedContent.htmlContent,
        data: notification.templateVariables,
        priority: notification.priority,
      }
    );

    return {
      notificationId: notification.id,
      channel,
      recipient,
      status: deliveryResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      success: deliveryResult.success,
      messageId: deliveryResult.messageId,
      error: deliveryResult.error,
      deliveredAt: deliveryResult.success ? new Date() : undefined,
      attempts: 1,
    };
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  @OnEvent('order.created')
  async handleOrderCreated(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.ORDER_CONFIRMATION,
      recipients: [{ userId: event.data.userId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        orderNumber: event.data.orderNumber,
        customerName: event.data.customerName,
        totalAmount: event.data.totalAmount,
        items: event.data.items,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'order-service',
        metadata: { orderId: event.aggregateId },
      },
    });
  }

  @OnEvent('payment.success')
  async handlePaymentSuccess(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.PAYMENT_SUCCESS,
      recipients: [{ userId: event.data.userId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        amount: event.data.amount,
        orderNumber: event.data.orderNumber,
        paymentMethod: event.data.paymentMethod,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'payment-service',
        metadata: { paymentId: event.aggregateId },
      },
    });
  }

  @OnEvent('settlement.processed')
  async handleSettlementProcessed(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.SETTLEMENT_PROCESSED,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        settlementId: event.data.settlementId,
        amount: event.data.netAmount,
        period: event.data.period,
        accountNumber: event.data.accountNumber,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'settlement-service',
        metadata: { settlementId: event.aggregateId },
      },
    });
  }

  @OnEvent('product.approved')
  async handleProductApproved(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.PRODUCT_APPROVED,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        productName: event.data.productName,
        productId: event.data.productId,
        approvedAt: event.data.approvedAt,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'product-service',
        metadata: { productId: event.aggregateId },
      },
    });
  }

  @OnEvent('product.rejected')
  async handleProductRejected(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.PRODUCT_REJECTED,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        productName: event.data.productName,
        productId: event.data.productId,
        rejectionReason: event.data.rejectionReason,
        rejectedAt: event.data.rejectedAt,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'product-service',
        metadata: { productId: event.aggregateId },
      },
    });
  }

  @OnEvent('inventory.low_stock')
  async handleLowStockAlert(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.LOW_STOCK_ALERT,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      category: NotificationCategory.OPERATIONAL,
      templateVariables: {
        productName: event.data.productName,
        currentStock: event.data.currentStock,
        threshold: event.data.threshold,
        variantSku: event.data.variantSku,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'inventory-service',
        metadata: { variantId: event.aggregateId },
      },
    });
  }

  @OnEvent('seller.application.approved')
  async handleSellerApplicationApproved(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.SELLER_APPLICATION_APPROVED,
      recipients: [{ userId: event.data.userId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        businessName: event.data.businessName,
        approvedAt: event.data.approvedAt,
        nextSteps: event.data.nextSteps,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'seller-service',
        metadata: { applicationId: event.aggregateId },
      },
    });
  }

  @OnEvent('seller.payout.processed')
  async handleSellerPayoutProcessed(event: DomainEvent) {
    await this.sendNotification({
      type: NotificationType.SELLER_PAYOUT_PROCESSED,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      category: NotificationCategory.TRANSACTIONAL,
      templateVariables: {
        payoutAmount: event.data.amount,
        payoutId: event.data.payoutId,
        accountNumber: event.data.accountNumber,
        processedAt: event.data.processedAt,
      },
      context: {
        tenantId: event.metadata.tenantId,
        userId: event.metadata.userId,
        correlationId: event.metadata.correlationId,
        source: 'payout-service',
        metadata: { payoutId: event.aggregateId },
      },
    });
  }

  // ============================================================================
  // SCHEDULED TASKS
  // ============================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    const scheduledNotifications = await this.notificationRepository.findScheduledNotifications();
    
    for (const notification of scheduledNotifications) {
      await this.queueNotificationForProcessing(notification.id);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications() {
    const failedNotifications = await this.notificationRepository.findFailedNotificationsForRetry();
    
    for (const notification of failedNotifications) {
      await this.queueNotificationForProcessing(notification.id);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredNotifications() {
    const count = await this.notificationRepository.deleteExpiredNotifications();
    this.logger.log('Cleaned up expired notifications', { count });
  }

  // ============================================================================
  // USER NOTIFICATION METHODS
  // ============================================================================

  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      skip?: number;
      isRead?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{ notifications: any[]; total: number }> {
    // Convert skip to offset for repository
    const repositoryOptions = {
      ...options,
      offset: options.skip,
    };
    delete repositoryOptions.skip;
    
    return this.notificationRepository.findUserNotifications(userId, repositoryOptions);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async deleteNotification(notificationId: string, userId?: string): Promise<void> {
    await this.notificationRepository.deleteNotification(notificationId, userId);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async initializeEventListeners() {
    // Event listeners are registered via decorators
    this.logger.log('Event listeners initialized');
  }

  private filterChannelsByPreferences(
    requestedChannels: NotificationChannel[],
    preferences: any
  ): NotificationChannel[] {
    if (!preferences || !preferences.isEnabled) {
      return [];
    }
    return requestedChannels.filter(channel => preferences.channels.includes(channel));
  }

  private calculateOverallStatus(results: NotificationDeliveryResult[]): NotificationStatus {
    if (results.length === 0) return NotificationStatus.FAILED;
    
    const hasSuccess = results.some(r => r.status === NotificationStatus.SENT);
    const hasFailure = results.some(r => r.status === NotificationStatus.FAILED);
    
    if (hasSuccess && !hasFailure) return NotificationStatus.SENT;
    if (hasSuccess && hasFailure) return NotificationStatus.SENT; // Partial success
    return NotificationStatus.FAILED;
  }

  private buildRateLimitKey(recipient: NotificationRecipient, channel: NotificationChannel): string {
    const identifier = recipient.userId || recipient.email || recipient.phone;
    return `${channel}:${identifier}`;
  }

  private async getUserLocale(userId: string): Promise<string> {
    // TODO: Implement user locale retrieval from user service
    return 'en';
  }

  private async generateNotificationId(): Promise<string> {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async scheduleNotification(notificationId: string, scheduledAt: Date): Promise<void> {
    await this.queueService.scheduleNotification(notificationId, scheduledAt);
  }

  private async queueNotificationForProcessing(notificationId: string): Promise<void> {
    await this.queueService.addNotification(notificationId);
  }
}