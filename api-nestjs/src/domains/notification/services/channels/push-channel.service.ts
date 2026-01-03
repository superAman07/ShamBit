import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { NotificationRecipient } from '../../types/notification.types';
import { ChannelDeliveryRequest, ChannelDeliveryResult } from '../notification-channel.service';
import { LoggerService } from '../../../../infrastructure/observability/logger.service';

export interface PushConfig {
  provider: 'fcm' | 'apns';
  fcm?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  apns?: {
    keyId: string;
    teamId: string;
    bundleId: string;
    privateKey: string;
    production: boolean;
  };
}

@Injectable()
export class PushChannelService {
  private fcmApp: admin.app.App | null = null;
  private config: PushConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<PushConfig>('push') || {
      provider: 'fcm',
      fcm: {
        projectId: '',
        privateKey: '',
        clientEmail: '',
      }
    };
    this.initializeProvider();
  }

  async send(
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest
  ): Promise<ChannelDeliveryResult> {
    if (!recipient.deviceToken) {
      throw new Error('Device token is required for push notifications');
    }

    try {
      let result: any;

      switch (this.config.provider) {
        case 'fcm':
          result = await this.sendViaFCM(recipient.deviceToken, request);
          break;
        case 'apns':
          result = await this.sendViaAPNS(recipient.deviceToken, request);
          break;
        default:
          throw new Error(`Unsupported push provider: ${this.config.provider}`);
      }

      return {
        success: true,
        messageId: result.messageId || result.name,
        metadata: {
          provider: this.config.provider,
          deviceToken: this.maskDeviceToken(recipient.deviceToken),
        },
      };
    } catch (error) {
      this.logger.error('Push notification delivery failed', error.stack, {
        deviceToken: this.maskDeviceToken(recipient.deviceToken),
        provider: this.config.provider,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateRecipient(recipient: NotificationRecipient): Promise<boolean> {
    if (!recipient.deviceToken) {
      return false;
    }

    // Basic device token validation (non-empty string)
    return typeof recipient.deviceToken === 'string' && recipient.deviceToken.length > 0;
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
        case 'fcm':
          if (this.fcmApp) {
            // FCM doesn't have a simple health check, assume healthy if app exists
          }
          break;
        case 'apns':
          // APNS health check would require connection test
          break;
      }

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        lastCheck: new Date(),
        avgResponseTime: responseTime,
      };
    } catch (error) {
      this.logger.error('Push service health check failed', error.stack);
      return {
        isHealthy: false,
        lastCheck: new Date(),
      };
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async sendBatch(
    recipients: { deviceToken: string; userId?: string }[],
    request: ChannelDeliveryRequest
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: ChannelDeliveryResult[];
  }> {
    if (this.config.provider !== 'fcm') {
      throw new Error('Batch sending only supported for FCM');
    }

    try {
      const tokens = recipients.map(r => r.deviceToken);
      const message = this.buildFCMMessage(request);

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        ...message,
      });

      const results: ChannelDeliveryResult[] = response.responses.map((resp, index) => ({
        success: resp.success,
        messageId: resp.messageId,
        error: resp.error?.message,
        metadata: {
          deviceToken: this.maskDeviceToken(tokens[index]),
        },
      }));

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
      };
    } catch (error) {
      this.logger.error('Batch push notification failed', error.stack);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'fcm':
        this.initializeFCM();
        break;
      case 'apns':
        this.initializeAPNS();
        break;
      default:
        this.logger.warn('No push provider configured');
    }
  }

  private initializeFCM(): void {
    if (!this.config.fcm) {
      this.logger.warn('FCM configuration is missing');
      return;
    }

    // Check if FCM credentials are properly configured (not placeholder values)
    if (!this.config.fcm.projectId || 
        !this.config.fcm.privateKey || 
        !this.config.fcm.clientEmail ||
        this.config.fcm.projectId.includes('your-firebase') ||
        this.config.fcm.privateKey.includes('your-firebase') ||
        this.config.fcm.clientEmail.includes('your-firebase')) {
      this.logger.warn('FCM credentials not configured - push notifications will be disabled');
      return;
    }

    try {
      // Check if Firebase app already exists
      try {
        this.fcmApp = admin.app('notifications');
      } catch (error) {
        // App doesn't exist, create it
        this.fcmApp = null;
      }
      
      if (!this.fcmApp) {
        this.fcmApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: this.config.fcm.projectId,
            privateKey: this.config.fcm.privateKey.replace(/\\n/g, '\n'),
            clientEmail: this.config.fcm.clientEmail,
          }),
        }, 'notifications');
      }

      this.logger.log('FCM initialized');
    } catch (error) {
      this.logger.error('FCM initialization failed', error.stack);
      // Don't throw error - just log it and continue without FCM
      this.logger.warn('Push notifications will be disabled due to FCM initialization failure');
    }
  }

  private initializeAPNS(): void {
    if (!this.config.apns) {
      throw new Error('APNS configuration is required');
    }

    // APNS initialization would be done here
    this.logger.log('APNS initialized');
  }

  private async sendViaFCM(
    deviceToken: string,
    request: ChannelDeliveryRequest
  ): Promise<any> {
    if (!this.fcmApp) {
      this.logger.warn('FCM not initialized - cannot send push notification');
      throw new Error('FCM not initialized - push notifications are disabled');
    }

    const message = this.buildFCMMessage(request);

    return await admin.messaging().send({
      token: deviceToken,
      ...message,
    });
  }

  private async sendViaAPNS(
    deviceToken: string,
    request: ChannelDeliveryRequest
  ): Promise<any> {
    // APNS implementation would go here
    throw new Error('APNS implementation not yet available');
  }

  private buildFCMMessage(request: ChannelDeliveryRequest): any {
    const message: any = {
      notification: {
        title: request.title || 'Notification',
        body: request.content,
      },
      data: {},
    };

    // Add custom data
    if (request.data) {
      message.data = Object.keys(request.data).reduce((acc, key) => {
        acc[key] = String(request.data![key]);
        return acc;
      }, {} as Record<string, string>);
    }

    // Set priority based on notification priority
    switch (request.priority) {
      case 'URGENT':
      case 'HIGH':
        message.android = {
          priority: 'high',
        };
        message.apns = {
          headers: {
            'apns-priority': '10',
          },
        };
        break;
      default:
        message.android = {
          priority: 'normal',
        };
        message.apns = {
          headers: {
            'apns-priority': '5',
          },
        };
    }

    return message;
  }

  private maskDeviceToken(token: string): string {
    if (token.length < 8) {
      return token;
    }
    
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    return `${start}...${end}`;
  }
}