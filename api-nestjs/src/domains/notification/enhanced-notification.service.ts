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
  NotificationRecipient,
  NotificationBatch,
  BatchStatus,
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
export class EnhancedNotificationService implements OnModuleInit {
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
    this.logger.log('EnhancedNotificationService initialized');
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
          payload.idempotencyKey,
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
          notificationId,
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
      const notification =
        await this.notificationRepository.findById(notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      // Check if notification has expired
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        await this.notificationRepository.updateStatus(
          notificationId,
          NotificationStatus.CANCELLED,
        );
        return;
      }

      // Update status to processing
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.PROCESSING,
      );

      // Process each recipient and channel combination
      const deliveryResults: NotificationDeliveryResult[] = [];

      for (const recipient of notification.recipients) {
        // Get user preferences if userId is available
        let allowedChannels = notification.channels;
        if (recipient.userId) {
          const preferences = await this.preferenceService.getUserPreferences(
            recipient.userId,
            notification.type as NotificationType,
          );
          allowedChannels = this.filterChannelsByPreferences(
            notification.channels as NotificationChannel[],
            preferences,
          );
        }

        // Process each allowed channel
        for (const channel of allowedChannels) {
          try {
            const result = await this.deliverNotification(
              notification,
              recipient,
              channel as NotificationChannel,
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
        deliveryResults,
      );

      // Update overall notification status
      const overallStatus = this.calculateOverallStatus(deliveryResults);
      await this.notificationRepository.updateStatus(
        notificationId,
        overallStatus,
      );

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
        NotificationStatus.FAILED,
      );
      throw error;
    }
  }

  private async deliverNotification(
    notification: any,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
  ): Promise<NotificationDeliveryResult> {
    // Check rate limits
    const rateLimitKey = this.buildRateLimitKey(recipient, channel);
    const isAllowed = await this.rateLimitService.checkRateLimit(
      rateLimitKey,
      channel,
    );

    if (!isAllowed) {
      throw new Error(`Rate limit exceeded for ${channel}`);
    }

    // Get and render template
    const template = await this.templateService.getTemplate(
      notification.type,
      channel,
      recipient.userId ? await this.getUserLocale(recipient.userId) : 'en',
    );

    if (!template) {
      throw new Error(`Template not found for ${notification.type}:${channel}`);
    }

    const renderedContent = await this.templateService.renderTemplate(
      template,
      notification.templateVariables,
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
      },
    );

    return {
      notificationId: notification.id,
      channel,
      recipient,
      status: deliveryResult.success
        ? NotificationStatus.SENT
        : NotificationStatus.FAILED,
      success: deliveryResult.success,
      messageId: deliveryResult.messageId,
      error: deliveryResult.error,
      deliveredAt: deliveryResult.success ? new Date() : undefined,
      attempts: 1,
    };
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  async sendBulkNotifications(
    type: NotificationType,
    recipients: NotificationRecipient[],
    channels: NotificationChannel[],
    templateVariables: Record<string, any>,
    options: {
      priority?: NotificationPriority;
      category?: NotificationCategory;
      batchSize?: number;
      context?: NotificationContext;
    } = {},
  ): Promise<string> {
    const batchId = await this.generateBatchId();
    const batchSize = options.batchSize || 1000;

    this.logger.log('Processing bulk notification', {
      batchId,
      type,
      totalRecipients: recipients.length,
      batchSize,
    });

    // Create batch record
    const batch: NotificationBatch = {
      id: batchId,
      type,
      totalRecipients: recipients.length,
      processedRecipients: 0,
      status: BatchStatus.PENDING,
      createdAt: new Date(),
    };

    await this.notificationRepository.createBatch(batch);

    // Process in batches
    const batches = this.chunkArray(recipients, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batchRecipients = batches[i];

      const payload: NotificationPayload = {
        type,
        recipients: batchRecipients,
        channels,
        priority: options.priority || NotificationPriority.MEDIUM,
        category: options.category || NotificationCategory.TRANSACTIONAL,
        templateVariables,
        context: options.context || {
          source: 'bulk-notification',
          metadata: { batchId, batchIndex: i },
        },
      };

      await this.queueService.addBulkNotification(payload, {
        delay: i * 1000, // Stagger batches by 1 second
        priority: this.getPriorityScore(payload.priority),
      });
    }

    await this.notificationRepository.updateBatchStatus(batchId, 'PROCESSING');

    return batchId;
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

  @OnEvent('inventory.low-stock')
  async handleLowStock(event: DomainEvent) {
    // Notify seller about low stock
    await this.sendNotification({
      type: NotificationType.LOW_STOCK_ALERT,
      recipients: [{ userId: event.data.sellerId }],
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      category: NotificationCategory.SYSTEM,
      templateVariables: {
        productName: event.data.productName,
        currentStock: event.data.currentStock,
        threshold: event.data.threshold,
        sku: event.data.sku,
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

  // ============================================================================
  // SCHEDULED TASKS
  // ============================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    const scheduledNotifications =
      await this.notificationRepository.findScheduledNotifications();

    for (const notification of scheduledNotifications) {
      await this.queueNotificationForProcessing(notification.id);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications() {
    const failedNotifications =
      await this.notificationRepository.findFailedNotificationsForRetry();

    for (const notification of failedNotifications) {
      await this.queueNotificationForProcessing(notification.id);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredNotifications() {
    const count =
      await this.notificationRepository.deleteExpiredNotifications();
    this.logger.log('Cleaned up expired notifications', { count });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async initializeEventListeners() {
    // Register event listeners for all notification types
    const eventMappings = [
      { event: 'order.created', handler: this.handleOrderCreated.bind(this) },
      { event: 'order.shipped', handler: this.handleOrderShipped.bind(this) },
      {
        event: 'payment.success',
        handler: this.handlePaymentSuccess.bind(this),
      },
      { event: 'payment.failed', handler: this.handlePaymentFailed.bind(this) },
      { event: 'inventory.low-stock', handler: this.handleLowStock.bind(this) },
      {
        event: 'settlement.processed',
        handler: this.handleSettlementProcessed.bind(this),
      },
    ];

    for (const mapping of eventMappings) {
      this.eventEmitter.on(mapping.event, mapping.handler);
    }
  }

  private filterChannelsByPreferences(
    requestedChannels: NotificationChannel[],
    preferences: any,
  ): NotificationChannel[] {
    if (!preferences || !preferences.isEnabled) {
      return [];
    }
    return requestedChannels.filter((channel) =>
      preferences.channels.includes(channel),
    );
  }

  private calculateOverallStatus(
    results: NotificationDeliveryResult[],
  ): NotificationStatus {
    if (results.length === 0) return NotificationStatus.FAILED;

    const hasSuccess = results.some(
      (r) => r.status === NotificationStatus.SENT,
    );
    const hasFailure = results.some(
      (r) => r.status === NotificationStatus.FAILED,
    );

    if (hasSuccess && !hasFailure) return NotificationStatus.SENT;
    if (hasSuccess && hasFailure) return NotificationStatus.SENT; // Partial success
    return NotificationStatus.FAILED;
  }

  private buildRateLimitKey(
    recipient: NotificationRecipient,
    channel: NotificationChannel,
  ): string {
    const identifier = recipient.userId || recipient.email || recipient.phone;
    return `${channel}:${identifier}`;
  }

  private async getUserLocale(userId: string): Promise<string> {
    // TODO: Implement user locale retrieval
    return 'en';
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getPriorityScore(priority: NotificationPriority): number {
    const scores = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4,
    };
    return scores[priority] || 2;
  }

  private async generateNotificationId(): Promise<string> {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async generateBatchId(): Promise<string> {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async scheduleNotification(
    notificationId: string,
    scheduledAt: Date,
  ): Promise<void> {
    await this.queueService.scheduleNotification(notificationId, scheduledAt);
  }

  private async queueNotificationForProcessing(
    notificationId: string,
  ): Promise<void> {
    await this.queueService.addNotification(notificationId);
  }

  // Additional event handlers
  private async handleOrderShipped(event: DomainEvent) {
    // Implementation for order shipped notification
  }

  private async handlePaymentFailed(event: DomainEvent) {
    // Implementation for payment failed notification
  }
}
