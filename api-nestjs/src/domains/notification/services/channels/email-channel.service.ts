import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { NotificationRecipient } from '../../types/notification.types';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
} from '../notification-channel.service';
import { LoggerService } from '../../../../infrastructure/observability/logger.service';

export interface EmailConfig {
  provider: 'smtp' | 'ses' | 'sendgrid';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  from: {
    name: string;
    email: string;
  };
}

@Injectable()
export class EmailChannelService {
  private transporter: nodemailer.Transporter | null = null;
  private sesClient: SESClient | null = null;
  private config: EmailConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<EmailConfig>('email') || {
      provider: 'smtp',
      from: {
        name: 'Marketplace',
        email: 'noreply@marketplace.com',
      },
      smtp: {
        host: 'localhost',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      },
    };
    this.initializeProvider();
  }

  async send(
    recipient: NotificationRecipient,
    request: ChannelDeliveryRequest,
  ): Promise<ChannelDeliveryResult> {
    if (!recipient.email) {
      throw new Error('Email address is required for email notifications');
    }

    try {
      const emailData = {
        to: recipient.email,
        from: `${this.config.from.name} <${this.config.from.email}>`,
        subject: request.subject || request.title || 'Notification',
        text: request.content,
        html: request.htmlContent || this.convertTextToHtml(request.content),
      };

      let result: any;

      switch (this.config.provider) {
        case 'smtp':
          result = await this.sendViaSMTP(emailData);
          break;
        case 'ses':
          result = await this.sendViaSES(emailData);
          break;
        case 'sendgrid':
          result = await this.sendViaSendGrid(emailData);
          break;
        default:
          throw new Error(
            `Unsupported email provider: ${this.config.provider}`,
          );
      }

      return {
        success: true,
        messageId: result.messageId || result.id,
        metadata: {
          provider: this.config.provider,
          recipient: recipient.email,
        },
      };
    } catch (error) {
      this.logger.error('Email delivery failed', error.stack, {
        recipient: recipient.email,
        provider: this.config.provider,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateRecipient(recipient: NotificationRecipient): Promise<boolean> {
    if (!recipient.email) {
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient.email);
  }

  async getHealth(): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    errorRate?: number;
    avgResponseTime?: number;
  }> {
    try {
      // Perform a simple health check based on provider
      const startTime = Date.now();

      switch (this.config.provider) {
        case 'smtp':
          if (this.transporter) {
            await this.transporter.verify();
          }
          break;
        case 'ses':
          if (this.sesClient) {
            // SES doesn't have a simple verify method, so we'll assume healthy if client exists
          }
          break;
        case 'sendgrid':
          // SendGrid health check would require API call
          break;
      }

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        lastCheck: new Date(),
        avgResponseTime: responseTime,
      };
    } catch (error) {
      this.logger.error('Email service health check failed', error.stack);
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
      case 'smtp':
        this.initializeSMTP();
        break;
      case 'ses':
        this.initializeSES();
        break;
      case 'sendgrid':
        this.initializeSendGrid();
        break;
      default:
        this.logger.warn('No email provider configured');
    }
  }

  private initializeSMTP(): void {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration is required');
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: this.config.smtp.auth,
    });

    this.logger.log('SMTP transporter initialized');
  }

  private initializeSES(): void {
    if (!this.config.ses) {
      throw new Error('SES configuration is required');
    }

    this.sesClient = new SESClient({
      region: this.config.ses.region,
      credentials: {
        accessKeyId: this.config.ses.accessKeyId,
        secretAccessKey: this.config.ses.secretAccessKey,
      },
    });

    this.logger.log('SES client initialized');
  }

  private initializeSendGrid(): void {
    if (!this.config.sendgrid) {
      throw new Error('SendGrid configuration is required');
    }

    // SendGrid initialization would be done here
    this.logger.log('SendGrid client initialized');
  }

  private async sendViaSMTP(emailData: any): Promise<any> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    return await this.transporter.sendMail(emailData);
  }

  private async sendViaSES(emailData: any): Promise<any> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const command = new SendEmailCommand({
      Source: emailData.from,
      Destination: {
        ToAddresses: [emailData.to],
      },
      Message: {
        Subject: {
          Data: emailData.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailData.text,
            Charset: 'UTF-8',
          },
          Html: {
            Data: emailData.html,
            Charset: 'UTF-8',
          },
        },
      },
    });

    return await this.sesClient.send(command);
  }

  private async sendViaSendGrid(emailData: any): Promise<any> {
    // SendGrid implementation would go here
    // For now, we'll throw an error
    throw new Error('SendGrid implementation not yet available');
  }

  private convertTextToHtml(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
}
