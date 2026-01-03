import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { NotificationRecipient } from '../../types/notification.types';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
} from '../notification-channel.service';
import { LoggerService } from '../../../../infrastructure/observability/logger.service';

export interface SMSConfig {
  provider: 'twilio' | 'sns' | 'nexmo';
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  sns?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  nexmo?: {
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
  };
  maxLength: number;
}

@Injectable()
export class SMSChannelService {
  private twilioClient: Twilio | null = null;
  private snsClient: SNSClient | null = null;
  private config: SMSConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<SMSConfig>('sms') || {
      provider: 'twilio',
      maxLength: 160,
      twilio: {
        accountSid: '',
        authToken: '',
        fromNumber: '',
      },
    };
    this.initializeProvider();
  }

  async send(
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest,
  ): Promise<ChannelDeliveryResult> {
    if (!recipient.phone) {
      throw new Error('Phone number is required for SMS notifications');
    }

    try {
      // Truncate message if too long
      const message = this.truncateMessage(
        request.content,
        this.config.maxLength || 160,
      );

      let result: any;

      switch (this.config.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(recipient.phone, message);
          break;
        case 'sns':
          result = await this.sendViaSNS(recipient.phone, message);
          break;
        case 'nexmo':
          result = await this.sendViaNexmo(recipient.phone, message);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }

      return {
        success: true,
        messageId: result.sid || result.MessageId || result.messageId,
        metadata: {
          provider: this.config.provider,
          recipient: this.maskPhoneNumber(recipient.phone),
          messageLength: message.length,
        },
      };
    } catch (error) {
      this.logger.error('SMS delivery failed', error.stack, {
        recipient: this.maskPhoneNumber(recipient.phone),
        provider: this.config.provider,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateRecipient(recipient: NotificationRecipient): Promise<boolean> {
    if (!recipient.phone) {
      return false;
    }

    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(recipient.phone);
  }

  async getHealth(): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    errorRate?: number;
    avgResponseTime?: number;
  }> {
    try {
      const startTime = Date.now();

      switch (this.config.provider) {
        case 'twilio':
          if (this.twilioClient) {
            // Twilio account validation
            await this.twilioClient.api
              .accounts(this.config.twilio?.accountSid || '')
              .fetch();
          }
          break;
        case 'sns':
          if (this.snsClient) {
            // SNS doesn't have a simple health check, assume healthy if client exists
          }
          break;
        case 'nexmo':
          // Nexmo health check would require API call
          break;
      }

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        lastCheck: new Date(),
        avgResponseTime: responseTime,
      };
    } catch (error) {
      this.logger.error('SMS service health check failed', error.stack);
      return {
        isHealthy: false,
        lastCheck: new Date(),
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'twilio':
        this.initializeTwilio();
        break;
      case 'sns':
        this.initializeSNS();
        break;
      case 'nexmo':
        this.initializeNexmo();
        break;
      default:
        this.logger.warn('No SMS provider configured');
    }
  }

  private initializeTwilio(): void {
    if (!this.config.twilio) {
      throw new Error('Twilio configuration is required');
    }

    this.twilioClient = new Twilio(
      this.config.twilio.accountSid,
      this.config.twilio.authToken,
    );

    this.logger.log('Twilio client initialized');
  }

  private initializeSNS(): void {
    if (!this.config.sns) {
      throw new Error('SNS configuration is required');
    }

    this.snsClient = new SNSClient({
      region: this.config.sns.region,
      credentials: {
        accessKeyId: this.config.sns.accessKeyId,
        secretAccessKey: this.config.sns.secretAccessKey,
      },
    });

    this.logger.log('SNS client initialized');
  }

  private initializeNexmo(): void {
    if (!this.config.nexmo) {
      throw new Error('Nexmo configuration is required');
    }

    // Nexmo/Vonage initialization would be done here
    this.logger.log('Nexmo client initialized');
  }

  private async sendViaTwilio(
    phoneNumber: string,
    message: string,
  ): Promise<any> {
    if (!this.twilioClient || !this.config.twilio) {
      throw new Error('Twilio client not initialized');
    }

    return await this.twilioClient.messages.create({
      body: message,
      from: this.config.twilio.fromNumber,
      to: phoneNumber,
    });
  }

  private async sendViaSNS(phoneNumber: string, message: string): Promise<any> {
    if (!this.snsClient) {
      throw new Error('SNS client not initialized');
    }

    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    });

    return await this.snsClient.send(command);
  }

  private async sendViaNexmo(
    phoneNumber: string,
    message: string,
  ): Promise<any> {
    // Nexmo implementation would go here
    throw new Error('Nexmo implementation not yet available');
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }

    // Truncate and add ellipsis
    return message.substring(0, maxLength - 3) + '...';
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) {
      return phoneNumber;
    }

    const lastFour = phoneNumber.slice(-4);
    const masked = '*'.repeat(phoneNumber.length - 4);
    return masked + lastFour;
  }
}
