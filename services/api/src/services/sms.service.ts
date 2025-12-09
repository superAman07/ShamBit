import { getConfig } from '@shambit/config';
import { createLogger, InternalServerError, RateLimitError } from '@shambit/shared';
import { NotificationType } from '../types/notification.types';

const logger = createLogger('sms-service');

interface RateLimitData {
  count: number;
  expiresAt: number;
}

/**
 * SMS Service for sending SMS messages
 * Integrates with SMS providers (Twilio, AWS SNS, etc.) and includes rate limiting
 * Uses in-memory storage (suitable for single-server startup deployment)
 */
export class SMSService {
  private readonly MAX_SMS_PER_HOUR = 10; // Maximum SMS per mobile number per hour
  private readonly MAX_SMS_PER_DAY = 50; // Maximum SMS per mobile number per day
  private readonly RATE_LIMIT_WINDOW_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly RATE_LIMIT_WINDOW_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private hourlyLimits = new Map<string, RateLimitData>();
  private dailyLimits = new Map<string, RateLimitData>();

  private get config() {
    return getConfig();
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Clean hourly limits
    for (const [key, data] of this.hourlyLimits.entries()) {
      if (data.expiresAt < now) {
        this.hourlyLimits.delete(key);
      }
    }
    
    // Clean daily limits
    for (const [key, data] of this.dailyLimits.entries()) {
      if (data.expiresAt < now) {
        this.dailyLimits.delete(key);
      }
    }
  }

  /**
   * Check rate limiting for SMS
   */
  private async checkRateLimit(mobileNumber: string): Promise<void> {
    this.cleanupExpired();
    
    const now = Date.now();
    const hourlyData = this.hourlyLimits.get(mobileNumber);
    const dailyData = this.dailyLimits.get(mobileNumber);

    const hourlyAttempts = hourlyData && hourlyData.expiresAt > now ? hourlyData.count : 0;
    const dailyAttempts = dailyData && dailyData.expiresAt > now ? dailyData.count : 0;

    if (hourlyAttempts >= this.MAX_SMS_PER_HOUR) {
      throw new RateLimitError(
        'Too many SMS sent. Please try again after an hour',
        'SMS_HOURLY_RATE_LIMIT_EXCEEDED'
      );
    }

    if (dailyAttempts >= this.MAX_SMS_PER_DAY) {
      throw new RateLimitError(
        'Daily SMS limit exceeded. Please try again tomorrow',
        'SMS_DAILY_RATE_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Increment rate limit counters
   */
  private async incrementRateLimit(mobileNumber: string): Promise<void> {
    const now = Date.now();
    
    // Increment hourly limit
    const hourlyData = this.hourlyLimits.get(mobileNumber);
    if (hourlyData && hourlyData.expiresAt > now) {
      hourlyData.count++;
    } else {
      this.hourlyLimits.set(mobileNumber, {
        count: 1,
        expiresAt: now + this.RATE_LIMIT_WINDOW_HOUR,
      });
    }
    
    // Increment daily limit
    const dailyData = this.dailyLimits.get(mobileNumber);
    if (dailyData && dailyData.expiresAt > now) {
      dailyData.count++;
    } else {
      this.dailyLimits.set(mobileNumber, {
        count: 1,
        expiresAt: now + this.RATE_LIMIT_WINDOW_DAY,
      });
    }
  }

  /**
   * Get SMS template for notification type
   */
  private getSMSTemplate(type: NotificationType, data?: any): string {
    const templates: Record<NotificationType, (data?: any) => string> = {
      order_confirmed: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} has been confirmed! We're preparing it for delivery. Track your order on ShamBit app.`,
      order_preparing: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} is being prepared and will be out for delivery soon.`,
      order_out_for_delivery: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} is on its way! Expected delivery: ${data?.eta || 'soon'}.`,
      order_delivered: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} has been delivered. Thank you for shopping with ShamBit!`,
      order_canceled: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} has been canceled. ${data?.reason || 'Contact support for details.'}`,
      payment_success: (data) =>
        `Payment of Rs.${data?.amount ? (data.amount / 100).toFixed(2) : '0.00'} received for order ${data?.orderNumber || 'N/A'}. Thank you!`,
      payment_failed: (data) =>
        `Payment for order ${data?.orderNumber || 'N/A'} failed. Please try again or contact support.`,
      delivery_assigned: (data) =>
        `${data?.deliveryPersonName || 'A delivery partner'} has been assigned to deliver your order ${data?.orderNumber || 'N/A'}.`,
      delivery_eta_update: (data) =>
        `Delivery update: Your order ${data?.orderNumber || 'N/A'} will arrive by ${data?.eta || 'soon'}.`,
      promotional: (data) =>
        data?.message || 'Special offer from ShamBit! Check the app for exciting deals.',
      low_stock_alert: (data) =>
        `Low stock alert: ${data?.productName || 'Product'} has only ${data?.stock || 0} units remaining.`,
      order_ready_for_pickup: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} is ready for pickup. Please collect it at your convenience.`,
      order_on_hold: (data) =>
        `Your order ${data?.orderNumber || 'N/A'} is on hold. ${data?.reason || 'We will update you soon.'}`,
      delivery_failed: (data) =>
        `Delivery attempt for order ${data?.orderNumber || 'N/A'} failed. ${data?.reason || 'We will retry soon.'}`,
      delivery_rescheduled: (data) =>
        `Delivery for order ${data?.orderNumber || 'N/A'} has been rescheduled to ${data?.newDate || 'a new date'}.`,
      return_requested: (data) =>
        `Your return request for order ${data?.orderNumber || 'N/A'} has been received. We'll review it shortly.`,
      return_approved: (data) =>
        `Your return request for order ${data?.orderNumber || 'N/A'} has been approved. Pickup will be scheduled soon.`,
      return_rejected: (data) =>
        `Your return request for order ${data?.orderNumber || 'N/A'} has been rejected. ${data?.reason || 'Contact support for details.'}`,
      return_pickup_scheduled: (data) =>
        `Pickup for your return (Order ${data?.orderNumber || 'N/A'}) is scheduled for ${data?.pickupDate || 'soon'}.`,
      refund_initiated: (data) =>
        `Refund of Rs.${data?.amount ? (data.amount / 100).toFixed(2) : '0.00'} for order ${data?.orderNumber || 'N/A'} has been initiated. It will be credited in 5-7 business days.`,
      refund_completed: (data) =>
        `Refund of Rs.${data?.amount ? (data.amount / 100).toFixed(2) : '0.00'} for order ${data?.orderNumber || 'N/A'} has been completed.`,
    };

    const templateFn = templates[type];
    return templateFn ? templateFn(data) : 'You have a new notification from ShamBit.';
  }

  /**
   * Send SMS via provider (placeholder for actual integration)
   */
  private async sendSMSViaProvider(mobileNumber: string, message: string): Promise<void> {
    // In development, just log the SMS
    if (this.config.NODE_ENV === 'development') {
      logger.info('SMS for development', {
        mobileNumber,
        message,
      });
      return;
    }

    // TODO: Integrate with actual SMS provider (Twilio, AWS SNS, etc.)
    // Example Twilio integration:
    // const twilio = require('twilio');
    // const client = twilio(this.config.TWILIO_ACCOUNT_SID, this.config.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: this.config.TWILIO_PHONE_NUMBER,
    //   to: `+91${mobileNumber}`,
    // });

    // Example AWS SNS integration:
    // const AWS = require('aws-sdk');
    // const sns = new AWS.SNS({ region: this.config.AWS_REGION });
    // await sns.publish({
    //   Message: message,
    //   PhoneNumber: `+91${mobileNumber}`,
    // }).promise();

    logger.info('SMS sent via provider', { mobileNumber });
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(mobileNumber: string, otp: string): Promise<void> {
    try {
      // Check rate limiting
      await this.checkRateLimit(mobileNumber);

      const message = `Your ShamBit verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

      // Send SMS
      await this.sendSMSViaProvider(mobileNumber, message);

      // Increment rate limit counter
      await this.incrementRateLimit(mobileNumber);

      logger.info('OTP sent via SMS', { mobileNumber });
    } catch (error) {
      logger.error('Failed to send OTP via SMS', {
        mobileNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw rate limit errors
      if (error instanceof RateLimitError) {
        throw error;
      }

      throw new InternalServerError('Failed to send OTP. Please try again', 'SMS_SEND_FAILED');
    }
  }

  /**
   * Send notification SMS
   */
  async sendNotificationSMS(
    mobileNumber: string,
    type: NotificationType,
    data?: any
  ): Promise<void> {
    try {
      // Check rate limiting
      await this.checkRateLimit(mobileNumber);

      // Get SMS template
      const message = this.getSMSTemplate(type, data);

      // Send SMS
      await this.sendSMSViaProvider(mobileNumber, message);

      // Increment rate limit counter
      await this.incrementRateLimit(mobileNumber);

      logger.info('Notification SMS sent', { mobileNumber, type });
    } catch (error) {
      logger.error('Failed to send notification SMS', {
        mobileNumber,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Don't throw error for notification failures (except rate limits)
      if (error instanceof RateLimitError) {
        throw error;
      }
    }
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(mobileNumber: string, orderNumber: string): Promise<void> {
    await this.sendNotificationSMS(mobileNumber, 'order_confirmed', { orderNumber });
  }

  /**
   * Send delivery update SMS
   */
  async sendDeliveryUpdate(mobileNumber: string, status: string, eta?: Date): Promise<void> {
    const notificationTypeMap: Record<string, NotificationType> = {
      confirmed: 'order_confirmed',
      preparing: 'order_preparing',
      out_for_delivery: 'order_out_for_delivery',
      delivered: 'order_delivered',
      canceled: 'order_canceled',
    };

    const type = notificationTypeMap[status] || 'delivery_eta_update';
    await this.sendNotificationSMS(mobileNumber, type, {
      eta: eta?.toLocaleString(),
    });
  }

  /**
   * Get current rate limit status for a mobile number
   */
  async getRateLimitStatus(mobileNumber: string): Promise<{
    hourlyCount: number;
    hourlyLimit: number;
    dailyCount: number;
    dailyLimit: number;
  }> {
    this.cleanupExpired();
    
    const now = Date.now();
    const hourlyData = this.hourlyLimits.get(mobileNumber);
    const dailyData = this.dailyLimits.get(mobileNumber);

    return {
      hourlyCount: hourlyData && hourlyData.expiresAt > now ? hourlyData.count : 0,
      hourlyLimit: this.MAX_SMS_PER_HOUR,
      dailyCount: dailyData && dailyData.expiresAt > now ? dailyData.count : 0,
      dailyLimit: this.MAX_SMS_PER_DAY,
    };
  }
}

export const smsService = new SMSService();
