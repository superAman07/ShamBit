import { Injectable } from '@nestjs/common';
import { 
  NotificationChannel, 
  NotificationRecipient,
  NotificationPriority
} from '../types/notification.types';
import { EmailChannelService } from './channels/email-channel.service';
import { SMSChannelService } from './channels/sms-channel.service';
import { PushChannelService } from './channels/push-channel.service';
import { WebhookChannelService } from './channels/webhook-channel.service';
import { InAppChannelService } from './channels/in-app-channel.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface ChannelDeliveryRequest {
  subject?: string;
  title?: string;
  content: string;
  htmlContent?: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  webhookSecret?: string; // Optional webhook secret for webhook channel
}

export interface ChannelDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationChannelService {
  private readonly channelServices: Map<NotificationChannel, any>;

  constructor(
    private readonly emailService: EmailChannelService,
    private readonly smsService: SMSChannelService,
    private readonly pushService: PushChannelService,
    private readonly webhookService: WebhookChannelService,
    private readonly inAppService: InAppChannelService,
    private readonly logger: LoggerService,
  ) {
    this.channelServices = new Map();
    this.channelServices.set(NotificationChannel.EMAIL, this.emailService);
    this.channelServices.set(NotificationChannel.SMS, this.smsService);
    this.channelServices.set(NotificationChannel.PUSH, this.pushService);
    this.channelServices.set(NotificationChannel.WEBHOOK, this.webhookService);
    this.channelServices.set(NotificationChannel.IN_APP, this.inAppService);
  }

  async deliver(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest
  ): Promise<ChannelDeliveryResult> {
    this.logger.log('Delivering notification through channel', {
      channel,
      recipient: recipient.userId || recipient.email || recipient.phone,
      priority: request.priority,
    });

    try {
      const channelService = this.channelServices.get(channel);
      if (!channelService) {
        throw new Error(`Channel service not found for ${channel}`);
      }

      const result = await channelService.send(recipient, request);
      
      this.logger.log('Channel delivery completed', {
        channel,
        success: result.success,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      this.logger.error('Channel delivery failed', error.stack, {
        channel,
        recipient: recipient.userId || recipient.email,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateRecipient(
    channel: NotificationChannel,
    recipient: NotificationRecipient
  ): Promise<boolean> {
    try {
      const channelService = this.channelServices.get(channel);
      if (!channelService || !channelService.validateRecipient) {
        return true; // Default to valid if no validation method
      }

      return await channelService.validateRecipient(recipient);
    } catch (error) {
      this.logger.error('Recipient validation failed', error.stack, {
        channel,
        recipient: recipient.userId || recipient.email,
      });
      return false;
    }
  }

  async getChannelHealth(channel: NotificationChannel): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    errorRate?: number;
    avgResponseTime?: number;
  }> {
    try {
      const channelService = this.channelServices.get(channel);
      if (!channelService || !channelService.getHealth) {
        return {
          isHealthy: true,
          lastCheck: new Date(),
        };
      }

      return await channelService.getHealth();
    } catch (error) {
      this.logger.error('Channel health check failed', error.stack, { channel });
      return {
        isHealthy: false,
        lastCheck: new Date(),
      };
    }
  }

  getSupportedChannels(): NotificationChannel[] {
    return Array.from(this.channelServices.keys());
  }

  async testChannel(
    channel: NotificationChannel,
    testRecipient: NotificationRecipient,
    testMessage: string
  ): Promise<ChannelDeliveryResult> {
    return this.deliver(channel, testRecipient, {
      title: 'Test Notification',
      content: testMessage,
      priority: NotificationPriority.LOW,
    });
  }
}