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
      if (process.env.SMS_PROVIDER === 'fast2sms') {
        await this.sendViaFast2SMS(cleanNumber, message);
      } else if (process.env.SMS_PROVIDER === 'textlocal') {
        await this.sendViaTextLocal(cleanNumber, message);
      } else if (process.env.SMS_PROVIDER === 'twilio') {
        await this.sendViaTwilio(cleanNumber, message);
      } else if (process.env.SMS_PROVIDER === 'aws_sns') {
        await this.sendViaAWSSNS(cleanNumber, message);
      } else {
        // Development mode - log instead of sending
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 SMS MESSAGE (Development Mode)');
          console.log('=================================');
          console.log(`To: +91${cleanNumber}`);
          console.log(`Message: ${message}`);
          console.log(`Timestamp: ${new Date().toISOString()}`);
          console.log('=================================');
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
   * Send SMS via Fast2SMS
   */
  private async sendViaFast2SMS(to: string, message: string): Promise<void> {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const apiUrl = 'https://www.fast2sms.com/dev/bulkV2';

    // Console log for testing (always show regardless of API key)
    console.log('📱 SMS MESSAGE (Fast2SMS)');
    console.log('========================');
    console.log(`To: +91${to}`);
    console.log(`Message: ${message}`);
    console.log(`Sender ID: ${this.senderId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('========================');

    if (!apiKey) {
      console.log('⚠️  Fast2SMS API key not configured - SMS logged only');
      return; // Don't throw error, just log and return
    }

    try {
      const response = await axios.post(
        apiUrl,
        {
          route: 'v3',
          sender_id: this.senderId,
          message: message,
          language: 'english',
          flash: 0,
          numbers: to,
        },
        {
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.return || response.data.return === false) {
        throw new Error(`Fast2SMS API error: ${response.data.message || 'Unknown error'}`);
      }
      
      console.log('✅ SMS sent successfully via Fast2SMS');
    } catch (error) {
      console.log('❌ Fast2SMS API call failed:', error);
      throw error;
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
   * Send bulk SMS (for notifications)
   */
  async sendBulkSMS(recipients: string[], message: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const recipient of recipients) {
      try {
        await this.sendSMS(recipient, message);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${recipient}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return results;
  }

  /**
   * Get SMS delivery status (if supported by provider)
   */
  async getDeliveryStatus(messageId: string): Promise<{ status: string; delivered_at?: Date }> {
    // Implementation depends on SMS provider
    // Fast2SMS provides delivery reports via webhook or API
    return { status: 'unknown' };
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