import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface RefundNotificationData {
  refundId: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  customerEmail?: string;
  customerName?: string;
}

@Injectable()
export class RefundNotificationService {
  constructor(
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendRefundInitiatedNotification(data: RefundNotificationData): Promise<void> {
    try {
      // Emit event for email notification
      this.eventEmitter.emit('notification.refund.initiated', {
        type: 'refund_initiated',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          reason: data.reason,
          customerName: data.customerName,
        },
      });

      // Emit event for SMS notification (if enabled)
      this.eventEmitter.emit('notification.sms.refund_initiated', {
        refundId: data.refundId,
        customerId: data.customerId,
        amount: this.formatAmount(data.amount, data.currency),
      });

      this.logger.log('Refund initiated notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund initiated notification', error, { data });
    }
  }

  async sendRefundApprovedNotification(data: RefundNotificationData): Promise<void> {
    try {
      this.eventEmitter.emit('notification.refund.approved', {
        type: 'refund_approved',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          customerName: data.customerName,
        },
      });

      this.logger.log('Refund approved notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund approved notification', error, { data });
    }
  }

  async sendRefundRejectedNotification(data: RefundNotificationData & { rejectionReason: string }): Promise<void> {
    try {
      this.eventEmitter.emit('notification.refund.rejected', {
        type: 'refund_rejected',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          rejectionReason: data.rejectionReason,
          customerName: data.customerName,
        },
      });

      this.logger.log('Refund rejected notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund rejected notification', error, { data });
    }
  }

  async sendRefundProcessedNotification(data: RefundNotificationData): Promise<void> {
    try {
      this.eventEmitter.emit('notification.refund.processed', {
        type: 'refund_processed',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          customerName: data.customerName,
          estimatedArrival: this.getEstimatedRefundArrival(),
        },
      });

      this.logger.log('Refund processed notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund processed notification', error, { data });
    }
  }

  async sendRefundCompletedNotification(data: RefundNotificationData): Promise<void> {
    try {
      this.eventEmitter.emit('notification.refund.completed', {
        type: 'refund_completed',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          customerName: data.customerName,
        },
      });

      this.logger.log('Refund completed notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund completed notification', error, { data });
    }
  }

  async sendRefundFailedNotification(data: RefundNotificationData & { failureReason: string }): Promise<void> {
    try {
      this.eventEmitter.emit('notification.refund.failed', {
        type: 'refund_failed',
        recipient: data.customerEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          failureReason: data.failureReason,
          customerName: data.customerName,
        },
      });

      // Also notify internal team
      this.eventEmitter.emit('notification.internal.refund_failed', {
        refundId: data.refundId,
        orderId: data.orderId,
        failureReason: data.failureReason,
      });

      this.logger.log('Refund failed notification sent', {
        refundId: data.refundId,
        customerId: data.customerId,
      });
    } catch (error) {
      this.logger.error('Failed to send refund failed notification', error, { data });
    }
  }

  async sendMerchantRefundNotification(data: RefundNotificationData & { merchantEmail: string }): Promise<void> {
    try {
      this.eventEmitter.emit('notification.merchant.refund', {
        type: 'merchant_refund_notification',
        recipient: data.merchantEmail,
        data: {
          refundId: data.refundId,
          orderId: data.orderId,
          amount: this.formatAmount(data.amount, data.currency),
          status: data.status,
          reason: data.reason,
        },
      });

      this.logger.log('Merchant refund notification sent', {
        refundId: data.refundId,
        merchantEmail: data.merchantEmail,
      });
    } catch (error) {
      this.logger.error('Failed to send merchant refund notification', error, { data });
    }
  }

  private formatAmount(amount: number, currency: string): string {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  private getEstimatedRefundArrival(): string {
    // Typically 5-10 business days for refunds
    const businessDays = 7;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + businessDays);
    
    return estimatedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}