import axios from 'axios';

interface OTPMessage {
  to: string;
  otp: string;
  purpose: string;
}

interface CredentialsNotification {
  to: string;
  sellerName: string;
  loginUrl: string;
}

class SMSService {
  private apiKey: string;
  private apiUrl: string;
  private senderId: string;

  constructor() {
    this.apiKey = process.env.SMS_API_KEY || '';
    this.apiUrl = process.env.SMS_API_URL || 'https://api.textlocal.in/send/';
    this.senderId = process.env.SMS_SENDER_ID || 'SHAMBIT';
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(data: OTPMessage): Promise<void> {
    const message = `Your ShamBit ${data.purpose} OTP is: ${data.otp}. Valid for 5 minutes. Do not share this OTP with anyone. - ShamBit`;
    
    await this.sendSMS(data.to, message);
  }

  /**
   * Send credentials notification via SMS
   */
  async sendCredentialsNotification(data: CredentialsNotification): Promise<void> {
    const message = `Dear ${data.sellerName}, your ShamBit seller account is approved! Login credentials sent to your email. Visit: ${data.loginUrl} - ShamBit`;
    
    await this.sendSMS(data.to, message);
  }

  /**
   * Send password reset notification
   */
  async sendPasswordResetNotification(to: string, sellerName: string): Promise<void> {
    const message = `Dear ${sellerName}, your ShamBit seller account password has been reset successfully. If this wasn't you, contact support immediately. - ShamBit`;
    
    await this.sendSMS(to, message);
  }

  /**
   * Send generic SMS
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    try {
      // Clean phone number (remove +91 if present, ensure 10 digits)
      const cleanNumber = to.replace(/^\+91/, '').replace(/\D/g, '');
      
      if (cleanNumber.length !== 10) {
        throw new Error('Invalid phone number format');
      }

      // Different SMS providers can be integrated here
      if (process.env.SMS_PROVIDER === 'textlocal') {
        await this.sendViaTextLocal(cleanNumber, message);
      } else if (process.env.SMS_PROVIDER === 'twilio') {
        await this.sendViaTwilio(cleanNumber, message);
      } else if (process.env.SMS_PROVIDER === 'aws_sns') {
        await this.sendViaAWSSNS(cleanNumber, message);
      } else {
        // Development mode - log instead of sending
        if (process.env.NODE_ENV === 'development') {
          const { createLogger } = await import('@shambit/shared');
          const logger = createLogger('sms-service');
          logger.info('SMS would be sent in production', { to: cleanNumber, message });
        } else {
          throw new Error('SMS provider not configured');
        }
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  /**
   * Send SMS via TextLocal
   */
  private async sendViaTextLocal(to: string, message: string): Promise<void> {
    const params = new URLSearchParams({
      apikey: this.apiKey,
      numbers: to,
      message: message,
      sender: this.senderId,
    });

    const response = await axios.post(this.apiUrl, params);
    
    if (response.data.status !== 'success') {
      throw new Error(`TextLocal API error: ${response.data.errors?.[0]?.message || 'Unknown error'}`);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const client = require('twilio')(accountSid, authToken);
    
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: `+91${to}`,
    });
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAWSSNS(to: string, message: string): Promise<void> {
    const AWS = require('aws-sdk');
    
    const sns = new AWS.SNS({
      region: process.env.AWS_REGION || 'ap-south-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const params = {
      Message: message,
      PhoneNumber: `+91${to}`,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: this.senderId,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    await sns.publish(params).promise();
  }

  /**
   * Send notification SMS
   */
  async sendNotificationSMS(to: string, type: string, data: any): Promise<void> {
    let message = '';
    
    switch (type) {
      case 'order_confirmed':
        message = `Your order #${data.orderId} has been confirmed. Track your order at ${data.trackingUrl} - ShamBit`;
        break;
      case 'order_shipped':
        message = `Your order #${data.orderId} has been shipped. Expected delivery: ${data.expectedDelivery} - ShamBit`;
        break;
      case 'order_delivered':
        message = `Your order #${data.orderId} has been delivered. Thank you for shopping with ShamBit!`;
        break;
      case 'seller_approved':
        message = `Congratulations! Your seller account has been approved. Login at ${data.loginUrl} - ShamBit`;
        break;
      case 'product_approved':
        message = `Your product "${data.productName}" has been approved and is now live on ShamBit!`;
        break;
      default:
        message = data.message || 'You have a new notification from ShamBit';
    }
    
    await this.sendSMS(to, message);
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const cleanNumber = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    return cleanNumber.length === 10 && /^[6-9]\d{9}$/.test(cleanNumber);
  }
}

export const smsService = new SMSService();