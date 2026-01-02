import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { createHmac } from 'crypto';
import { NotificationRecipient } from '../../types/notification.types';
import { ChannelDeliveryRequest, ChannelDeliveryResult } from '../notification-channel.service';
import { LoggerService } from '../../../../infrastructure/observability/logger.service';

export interface WebhookConfig {
  timeout: number;
  retries: number;
  userAgent: string;
}

@Injectable()
export class WebhookChannelService {
  private config: WebhookConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<WebhookConfig>('webhook') || {
      timeout: 30000,
      retries: 3,
      userAgent: 'NotificationService/1.0',
    };
  }

  async send(
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest
  ): Promise<ChannelDeliveryResult> {
    if (!recipient.webhookUrl) {
      throw new Error('Webhook URL is required for webhook notifications');
    }

    try {
      const payload = this.buildWebhookPayload(request);
      const headers = this.buildHeaders(payload, request.webhookSecret);

      const response = await this.httpService.axiosRef.post(
        recipient.webhookUrl,
        payload,
        {
          headers,
          timeout: this.config.timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        }
      );

      return {
        success: true,
        messageId: response.headers['x-message-id'] || `webhook_${Date.now()}`,
        metadata: {
          url: recipient.webhookUrl,
          statusCode: response.status,
          responseTime: response.headers['x-response-time'],
        },
      };
    } catch (error) {
      this.logger.error('Webhook delivery failed', error.stack, {
        url: recipient.webhookUrl,
        status: error.response?.status,
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          url: recipient.webhookUrl,
          statusCode: error.response?.status,
          responseBody: error.response?.data,
        },
      };
    }
  }

  async validateRecipient(recipient: NotificationRecipient): Promise<boolean> {
    if (!recipient.webhookUrl) {
      return false;
    }

    try {
      const url = new URL(recipient.webhookUrl);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    errorRate?: number;
    avgResponseTime?: number;
  }> {
    // Webhook service is always healthy as it's just HTTP calls
    return {
      isHealthy: true,
      lastCheck: new Date(),
    };
  }

  // ============================================================================
  // WEBHOOK SPECIFIC METHODS
  // ============================================================================

  async testWebhook(
    url: string,
    secret?: string,
    testPayload?: any
  ): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const payload = testPayload || {
        type: 'test',
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
      };

      const headers = this.buildHeaders(payload, secret);

      const response = await this.httpService.axiosRef.post(url, payload, {
        headers,
        timeout: this.config.timeout,
        validateStatus: (status) => status >= 200 && status < 500,
      });

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

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.stack);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildWebhookPayload(request: ChannelDeliveryRequest): any {
    return {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      type: 'notification',
      timestamp: new Date().toISOString(),
      data: {
        title: request.title,
        content: request.content,
        priority: request.priority,
        ...request.data,
      },
    };
  }

  private buildHeaders(payload: any, secret?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
      'X-Timestamp': Date.now().toString(),
    };

    if (secret) {
      const payloadString = JSON.stringify(payload);
      headers['X-Signature'] = this.generateSignature(payloadString, secret);
    }

    return headers;
  }

  private generateSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  private secureCompare(signature1: string, signature2: string): boolean {
    if (signature1.length !== signature2.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature1.length; i++) {
      result |= signature1.charCodeAt(i) ^ signature2.charCodeAt(i);
    }

    return result === 0;
  }
}