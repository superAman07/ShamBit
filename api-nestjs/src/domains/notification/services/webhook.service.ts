import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { createHmac, randomBytes } from 'crypto';
import { 
  NotificationType, 
  WebhookSubscription,
  WebhookStatus
} from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: NotificationType[];
  secret?: string;
  headers?: Record<string, string>;
  isActive?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryBackoff?: 'LINEAR' | 'EXPONENTIAL';
  retryMultiplier?: number;
  maxRetryDelay?: number;
  filters?: any;
  tenantId?: string;
  userId?: string;
  description?: string;
  tags?: string[];
}

export interface WebhookDeliveryAttempt {
  id: string;
  subscriptionId: string;
  eventType: NotificationType;
  payload: any;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  httpMethod: string;
  url: string;
  headers?: Record<string, string>;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime?: number;
  attempts: number;
  nextRetryAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  scheduledAt: Date;
  sentAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // WEBHOOK SUBSCRIPTION MANAGEMENT
  // ============================================================================

  async createSubscription(dto: CreateWebhookDto, createdBy: string): Promise<WebhookSubscription> {
    this.logger.log('Creating webhook subscription', {
      name: dto.name,
      url: dto.url,
      events: dto.events,
    });

    const secret = dto.secret || this.generateSecret();

    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        secret,
        headers: dto.headers || {},
        isActive: dto.isActive ?? true,
        timeout: dto.timeout || 30,
        maxRetries: dto.maxRetries || 3,
        retryBackoff: dto.retryBackoff || 'EXPONENTIAL',
        retryMultiplier: dto.retryMultiplier || 2.0,
        maxRetryDelay: dto.maxRetryDelay || 300,
        filters: dto.filters || {},
        tenantId: dto.tenantId,
        userId: dto.userId,
        description: dto.description,
        tags: dto.tags || [],
        status: WebhookStatus.ACTIVE,
        createdBy,
      },
    });

    return this.mapToWebhookType(subscription);
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<CreateWebhookDto>
  ): Promise<WebhookSubscription> {
    const subscription = await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return this.mapToWebhookType(subscription);
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.prisma.webhookSubscription.delete({
      where: { id: subscriptionId },
    });

    this.logger.log('Webhook subscription deleted', { subscriptionId });
  }

  async getSubscription(subscriptionId: string): Promise<WebhookSubscription | null> {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });

    return subscription ? this.mapToWebhookType(subscription) : null;
  }

  async getSubscriptions(filters: {
    tenantId?: string;
    userId?: string;
    isActive?: boolean;
    events?: NotificationType[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ subscriptions: WebhookSubscription[]; total: number }> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.events && filters.events.length > 0) {
      where.events = { hasSome: filters.events };
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.webhookSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.webhookSubscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map(s => this.mapToWebhookType(s)),
      total,
    };
  }

  // ============================================================================
  // WEBHOOK DELIVERY
  // ============================================================================

  async deliverWebhook(
    eventType: NotificationType,
    eventData: any,
    eventId?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      // Find matching subscriptions
      const subscriptions = await this.findMatchingSubscriptions(eventType, tenantId);

      if (subscriptions.length === 0) {
        this.logger.log('No webhook subscriptions found for event', { eventType, tenantId });
        return;
      }

      // Create delivery attempts for each subscription
      const deliveryPromises = subscriptions.map(subscription =>
        this.createDeliveryAttempt(subscription, eventType, eventData, eventId)
      );

      await Promise.allSettled(deliveryPromises);

      this.logger.log('Webhook deliveries initiated', {
        eventType,
        subscriptionCount: subscriptions.length,
      });
    } catch (error) {
      this.logger.error('Failed to deliver webhooks', error.stack, { eventType });
    }
  }

  async retryFailedDeliveries(): Promise<number> {
    try {
      const failedDeliveries = await this.prisma.webhookDelivery.findMany({
        where: {
          status: 'FAILED',
          nextRetryAt: {
            lte: new Date(),
          },
        },
        include: {
          subscription: true,
        },
        take: 100, // Process in batches
      });

      let retryCount = 0;

      for (const delivery of failedDeliveries) {
        try {
          await this.executeDelivery(delivery.subscription, delivery);
          retryCount++;
        } catch (error) {
          this.logger.error('Retry delivery failed', error.stack, {
            deliveryId: delivery.id,
          });
        }
      }

      this.logger.log('Webhook retries completed', { retryCount });
      return retryCount;
    } catch (error) {
      this.logger.error('Failed to retry webhook deliveries', error.stack);
      return 0;
    }
  }

  // ============================================================================
  // WEBHOOK TESTING & VALIDATION
  // ============================================================================

  async testWebhook(subscriptionId: string): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) {
        throw new Error('Webhook subscription not found');
      }

      const testPayload = {
        id: `test_${Date.now()}`,
        type: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          subscription: {
            id: subscription.id,
            name: subscription.name,
          },
        },
      };

      const startTime = Date.now();
      const response = await this.sendWebhookRequest(subscription, testPayload);
      const responseTime = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateWebhookUrl(url: string): Promise<{
    isValid: boolean;
    isReachable: boolean;
    error?: string;
  }> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          isReachable: false,
          error: 'URL must use HTTP or HTTPS protocol',
        };
      }

      // Test reachability with a HEAD request
      const response = await this.httpService.axiosRef.head(url, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status code
      });

      return {
        isValid: true,
        isReachable: response.status < 500,
        error: response.status >= 500 ? `Server error: ${response.status}` : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        isReachable: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // WEBHOOK ANALYTICS
  // ============================================================================

  async getWebhookMetrics(
    subscriptionId?: string,
    timeRange: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    try {
      const where: any = {};
      if (subscriptionId) where.subscriptionId = subscriptionId;

      // Calculate time range
      const now = new Date();
      const timeRanges = {
        hour: new Date(now.getTime() - 60 * 60 * 1000),
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      };
      where.scheduledAt = { gte: timeRanges[timeRange] };

      const [totalResult, successResult, avgResponseTime] = await Promise.all([
        this.prisma.webhookDelivery.count({ where }),
        this.prisma.webhookDelivery.count({
          where: { ...where, status: 'SUCCESS' },
        }),
        this.prisma.webhookDelivery.aggregate({
          where: { ...where, status: 'SUCCESS' },
          _avg: { responseTime: true },
        }),
      ]);

      const totalDeliveries = totalResult;
      const successfulDeliveries = successResult;
      const failedDeliveries = totalDeliveries - successfulDeliveries;
      const successRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0;

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        avgResponseTime: avgResponseTime._avg.responseTime || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get webhook metrics', error.stack, { subscriptionId });
      return {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
        avgResponseTime: 0,
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async findMatchingSubscriptions(
    eventType: NotificationType,
    tenantId?: string
  ): Promise<any[]> {
    return this.prisma.webhookSubscription.findMany({
      where: {
        isActive: true,
        status: WebhookStatus.ACTIVE,
        events: { has: eventType },
        tenantId: tenantId || null,
      },
    });
  }

  private async createDeliveryAttempt(
    subscription: any,
    eventType: NotificationType,
    eventData: any,
    eventId?: string
  ): Promise<void> {
    const payload = this.buildWebhookPayload(eventType, eventData, eventId);

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        eventType,
        eventId,
        payload,
        status: 'PENDING',
        httpMethod: 'POST',
        url: subscription.url,
        headers: this.buildWebhookHeaders(subscription, payload),
        attempts: 0,
        scheduledAt: new Date(),
      },
    });

    // Execute delivery asynchronously
    setImmediate(() => this.executeDelivery(subscription, delivery));
  }

  private async executeDelivery(subscription: any, delivery: any): Promise<void> {
    try {
      const startTime = Date.now();

      // Update delivery status to processing
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'PENDING',
          attempts: { increment: 1 },
          sentAt: new Date(),
        },
      });

      const response = await this.sendWebhookRequest(subscription, delivery.payload);
      const responseTime = Date.now() - startTime;

      // Update delivery with success
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCESS',
          responseStatus: response.status,
          responseHeaders: response.headers,
          responseBody: typeof response.data === 'string' 
            ? response.data.substring(0, 1000) // Limit response body size
            : JSON.stringify(response.data).substring(0, 1000),
          responseTime,
          completedAt: new Date(),
        },
      });

      // Update subscription health
      await this.updateSubscriptionHealth(subscription.id, true);

    } catch (error) {
      const shouldRetry = delivery.attempts < subscription.maxRetries;
      const nextRetryAt = shouldRetry 
        ? this.calculateNextRetryTime(delivery.attempts, subscription)
        : null;

      // Update delivery with failure
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: shouldRetry ? 'FAILED' : 'FAILED',
          responseStatus: error.response?.status,
          responseHeaders: error.response?.headers,
          responseBody: error.response?.data 
            ? JSON.stringify(error.response.data).substring(0, 1000)
            : error.message,
          errorCode: error.code,
          errorMessage: error.message,
          nextRetryAt,
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      // Update subscription health
      await this.updateSubscriptionHealth(subscription.id, false);

      if (!shouldRetry) {
        this.logger.error('Webhook delivery failed permanently', error.stack, {
          subscriptionId: subscription.id,
          deliveryId: delivery.id,
        });
      }
    }
  }

  private async sendWebhookRequest(subscription: any, payload: any): Promise<any> {
    const headers = this.buildWebhookHeaders(subscription, payload);

    return this.httpService.axiosRef.post(subscription.url, payload, {
      headers,
      timeout: subscription.timeout * 1000,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private buildWebhookPayload(
    eventType: NotificationType,
    eventData: any,
    eventId?: string
  ): any {
    return {
      id: eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
    };
  }

  private buildWebhookHeaders(subscription: any, payload: any): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NotificationService-Webhook/1.0',
      'X-Webhook-Timestamp': Date.now().toString(),
      ...subscription.headers,
    };

    if (subscription.secret) {
      const payloadString = JSON.stringify(payload);
      headers['X-Webhook-Signature'] = this.generateSignature(payloadString, subscription.secret);
    }

    return headers;
  }

  private generateSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  private calculateNextRetryTime(attempts: number, subscription: any): Date {
    const baseDelay = 1000; // 1 second
    let delay: number;

    if (subscription.retryBackoff === 'LINEAR') {
      delay = baseDelay * attempts;
    } else {
      // Exponential backoff
      delay = baseDelay * Math.pow(subscription.retryMultiplier || 2, attempts - 1);
    }

    // Cap at max retry delay
    delay = Math.min(delay, (subscription.maxRetryDelay || 300) * 1000);

    return new Date(Date.now() + delay);
  }

  private async updateSubscriptionHealth(subscriptionId: string, success: boolean): Promise<void> {
    const updateData: any = {};

    if (success) {
      updateData.lastSuccessAt = new Date();
      updateData.consecutiveFailures = 0;
    } else {
      updateData.lastFailureAt = new Date();
      updateData.consecutiveFailures = { increment: 1 };
    }

    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  }

  private mapToWebhookType(subscription: any): WebhookSubscription {
    return {
      id: subscription.id,
      name: subscription.name,
      url: subscription.url,
      events: subscription.events,
      isActive: subscription.isActive,
      secret: subscription.secret,
      headers: subscription.headers,
      retryPolicy: {
        maxRetries: subscription.maxRetries,
        backoffMultiplier: subscription.retryMultiplier,
        maxBackoffSeconds: subscription.maxRetryDelay,
      },
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}