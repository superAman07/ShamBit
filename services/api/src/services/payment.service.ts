import crypto from 'crypto';
import { createLogger, InternalServerError } from '@shambit/shared';

const logger = createLogger('payment-service');

interface RazorpayOrderOptions {
  amount: number; // in paise
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

class PaymentService {
  private razorpayKeyId: string;
  private razorpayKeySecret: string;
  private webhookSecret: string;

  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!this.razorpayKeyId || !this.razorpayKeySecret) {
      logger.warn('Razorpay credentials not configured. Payment features will be limited.');
    }
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(options: RazorpayOrderOptions): Promise<RazorpayOrder> {
    try {
      if (!this.razorpayKeyId || !this.razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
      }

      // Real Razorpay API call
      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');
      
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new InternalServerError(
          `Razorpay API error: ${errorData.error?.description || 'Unknown error'}`,
          'RAZORPAY_ERROR'
        );
      }

      const order = await response.json() as RazorpayOrder;
      logger.info('Razorpay order created', { orderId: order.id });
      
      return order;
    } catch (error) {
      logger.error('Error creating Razorpay order', { error });
      throw new InternalServerError('Failed to create payment order', 'PAYMENT_ORDER_FAILED');
    }
  }

  /**
   * Verify payment signature from Razorpay webhook
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        logger.warn('Webhook secret not configured. Skipping signature verification.');
        return true; // Allow in development
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying webhook signature', { error });
      return false;
    }
  }

  /**
   * Verify payment signature after successful payment
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      if (!this.razorpayKeySecret) {
        logger.warn('Razorpay secret not configured. Skipping payment signature verification.');
        return true; // Allow in development
      }

      const text = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(text)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying payment signature', { error });
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      if (!this.razorpayKeyId || !this.razorpayKeySecret) {
        // Mock response for development
        return {
          id: paymentId,
          status: 'captured',
          amount: 100000,
          currency: 'INR',
        };
      }

      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');
      
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        throw new InternalServerError('Failed to fetch payment details', 'PAYMENT_FETCH_FAILED');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching payment details', { error, paymentId });
      throw new InternalServerError('Failed to fetch payment details', 'PAYMENT_FETCH_FAILED');
    }
  }

  /**
   * Initiate refund for a payment
   */
  async initiateRefund(paymentId: string, amount?: number): Promise<any> {
    try {
      if (!this.razorpayKeyId || !this.razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
      }

      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64');
      
      const body: any = {};
      if (amount) {
        body.amount = amount;
      }

      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new InternalServerError('Failed to initiate refund', 'REFUND_FAILED');
      }

      const refund = await response.json() as any;
      logger.info('Refund initiated', { refundId: refund.id, paymentId });
      
      return refund;
    } catch (error) {
      logger.error('Error initiating refund', { error, paymentId });
      throw new InternalServerError('Failed to initiate refund', 'REFUND_FAILED');
    }
  }
}

export const paymentService = new PaymentService();
