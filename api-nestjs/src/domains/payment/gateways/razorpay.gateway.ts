import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  IPaymentGateway,
  GatewayConfig,
  GatewayResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentIntentRequest,
  ConfirmPaymentIntentResponse,
  CreateRefundRequest,
  CreateRefundResponse,
  WebhookEvent,
  WebhookVerificationRequest,
} from '../interfaces/payment-gateway.interface';
import {
  PaymentMethod,
  PaymentGatewayProvider,
  PaymentErrorType,
} from '../enums/payment-status.enum';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

@Injectable()
export class RazorpayGateway implements IPaymentGateway {
  readonly provider = PaymentGatewayProvider.RAZORPAY;

  private razorpay?: Razorpay;
  private config?: GatewayConfig;

  constructor(private readonly logger: LoggerService) {}

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  async configure(config: GatewayConfig): Promise<void> {
    this.config = config;
    this.razorpay = new Razorpay({
      key_id: config.apiKey,
      key_secret: config.secretKey,
    });

    this.logger.log('Razorpay gateway configured', {
      provider: this.provider,
      environment: config.environment,
    });
  }

  isConfigured(): boolean {
    return !!this.razorpay && !!this.config;
  }

  // ============================================================================
  // PAYMENT INTENT OPERATIONS (RAZORPAY ORDERS)
  // ============================================================================

  async createPaymentIntent(
    request: CreatePaymentIntentRequest,
  ): Promise<GatewayResponse<CreatePaymentIntentResponse>> {
    this.logger.log('RazorpayGateway.createPaymentIntent', {
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
    });

    try {
      this.ensureConfigured();

      const orderOptions: any = {
        amount: request.amount, // Razorpay expects amount in paise (cents)
        currency: request.currency.toUpperCase(),
        receipt: `order_${request.orderId}`,
        notes: {
          orderId: request.orderId,
          customerId: request.customerId,
          ...request.metadata,
        },
      };

      // Multi-seller support with transfers
      if (request.transfers && request.transfers.length > 0) {
        orderOptions.transfers = request.transfers.map((transfer) => ({
          account: transfer.destination,
          amount: transfer.amount,
          currency: request.currency.toUpperCase(),
          notes: {
            orderId: request.orderId,
          },
        }));
      }

      const order = await this.razorpay!.orders.create(orderOptions);

      const response: CreatePaymentIntentResponse = {
        intentId: order.id,
        clientSecret: order.id, // Razorpay uses order ID as client reference
        status: this.mapRazorpayOrderStatus(order.status),
        requiresAction: false, // Razorpay handles action on client side
      };

      this.logger.log('Razorpay order created successfully', {
        orderId: order.id,
        status: order.status,
        amount: order.amount,
      });

      return {
        success: true,
        data: response,
        rawResponse: order,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error, {
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async retrievePaymentIntent(intentId: string): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.retrievePaymentIntent', { intentId });

    try {
      this.ensureConfigured();

      const order = await this.razorpay!.orders.fetch(intentId);

      return {
        success: true,
        data: order,
        rawResponse: order,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve Razorpay order', error, {
        intentId,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async confirmPaymentIntent(
    request: ConfirmPaymentIntentRequest,
  ): Promise<GatewayResponse<ConfirmPaymentIntentResponse>> {
    this.logger.log('RazorpayGateway.confirmPaymentIntent', {
      intentId: request.intentId,
    });

    // Note: Razorpay payments are confirmed via webhooks after client-side payment
    // This method is used for server-side verification of payment signature

    try {
      this.ensureConfigured();

      // Fetch the order to get current status
      const order = await this.razorpay!.orders.fetch(request.intentId);

      const response: ConfirmPaymentIntentResponse = {
        status: this.mapRazorpayOrderStatus(order.status),
        requiresAction: order.status === 'created', // Still awaiting payment
      };

      return {
        success: true,
        data: response,
        rawResponse: order,
      };
    } catch (error) {
      this.logger.error('Failed to confirm Razorpay payment', error, {
        intentId: request.intentId,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async cancelPaymentIntent(intentId: string): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.cancelPaymentIntent', { intentId });

    try {
      this.ensureConfigured();

      // Razorpay doesn't have explicit order cancellation
      // Orders automatically expire after 24 hours
      const order = await this.razorpay!.orders.fetch(intentId);

      return {
        success: true,
        data: { ...order, status: 'cancelled' },
        rawResponse: order,
      };
    } catch (error) {
      this.logger.error('Failed to cancel Razorpay order', error, { intentId });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  async capturePayment(
    intentId: string,
    amount?: number,
  ): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.capturePayment', { intentId, amount });

    try {
      this.ensureConfigured();

      // Get payments for this order
      const payments = await this.razorpay!.orders.fetchPayments(intentId);

      if (payments.items.length === 0) {
        throw new Error('No payments found for this order');
      }

      const payment = payments.items[0]; // Get the latest payment

      if (payment.status === 'authorized') {
        // Capture the authorized payment
        const captureData: any = {};
        if (amount !== undefined) {
          captureData.amount = amount;
        }

        const capturedPayment = await this.razorpay!.payments.capture(
          payment.id,
          captureData.amount || payment.amount,
          payment.currency,
        );

        return {
          success: true,
          data: capturedPayment,
          rawResponse: capturedPayment,
        };
      }

      return {
        success: true,
        data: payment,
        rawResponse: payment,
      };
    } catch (error) {
      this.logger.error('Failed to capture Razorpay payment', error, {
        intentId,
        amount,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================================
  // REFUND OPERATIONS
  // ============================================================================

  async createRefund(
    request: CreateRefundRequest,
  ): Promise<GatewayResponse<CreateRefundResponse>> {
    this.logger.log('RazorpayGateway.createRefund', {
      transactionId: request.transactionId,
      amount: request.amount,
    });

    try {
      this.ensureConfigured();

      const refundData: any = {
        notes: request.metadata || {},
      };

      if (request.amount !== undefined) {
        refundData.amount = request.amount;
      }

      if (request.reason) {
        refundData.notes.reason = request.reason;
      }

      const refund = await this.razorpay!.payments.refund(
        request.transactionId,
        refundData,
      );

      const response: CreateRefundResponse = {
        refundId: refund.id,
        status: this.mapRazorpayRefundStatus(refund.status),
        amount: refund.amount || 0,
      };

      this.logger.log('Razorpay refund created successfully', {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      });

      return {
        success: true,
        data: response,
        rawResponse: refund,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay refund', error, {
        transactionId: request.transactionId,
        amount: request.amount,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async retrieveRefund(refundId: string): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.retrieveRefund', { refundId });

    try {
      this.ensureConfigured();

      const refund = await this.razorpay!.refunds.fetch(refundId);

      return {
        success: true,
        data: refund,
        rawResponse: refund,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve Razorpay refund', error, {
        refundId,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================================
  // WEBHOOK OPERATIONS
  // ============================================================================

  async verifyWebhook(request: WebhookVerificationRequest): Promise<boolean> {
    try {
      this.ensureConfigured();

      const expectedSignature = crypto
        .createHmac('sha256', request.secret)
        .update(request.payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(request.signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Razorpay webhook verification failed', error);
      return false;
    }
  }

  async parseWebhook(payload: string): Promise<WebhookEvent> {
    const event = JSON.parse(payload);

    return {
      id: event.id || `webhook_${Date.now()}`,
      type: event.event,
      data: event.payload,
      created: event.created_at || Math.floor(Date.now() / 1000),
    };
  }

  // ============================================================================
  // SETTLEMENT OPERATIONS (RAZORPAY SPECIFIC)
  // ============================================================================

  async getSettlements(
    options: {
      from?: Date;
      to?: Date;
      count?: number;
      skip?: number;
    } = {},
  ): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.getSettlements', options);

    try {
      this.ensureConfigured();

      const queryParams: any = {};

      if (options.from) {
        queryParams.from = Math.floor(options.from.getTime() / 1000);
      }

      if (options.to) {
        queryParams.to = Math.floor(options.to.getTime() / 1000);
      }

      if (options.count) {
        queryParams.count = options.count;
      }

      if (options.skip) {
        queryParams.skip = options.skip;
      }

      const settlements = await this.razorpay!.settlements.all(queryParams);

      return {
        success: true,
        data: settlements,
        rawResponse: settlements,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Razorpay settlements', error, options);

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async getSettlement(settlementId: string): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.getSettlement', { settlementId });

    try {
      this.ensureConfigured();

      const settlement = await this.razorpay!.settlements.fetch(settlementId);

      return {
        success: true,
        data: settlement,
        rawResponse: settlement,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Razorpay settlement', error, {
        settlementId,
      });

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  async createTransfer(options: {
    account: string;
    amount: number;
    currency: string;
    notes?: Record<string, any>;
  }): Promise<GatewayResponse<any>> {
    this.logger.log('RazorpayGateway.createTransfer', options);

    try {
      this.ensureConfigured();

      const transferData = {
        account: options.account,
        amount: options.amount,
        currency: options.currency,
        notes: options.notes || {},
      };

      const transfer = await this.razorpay!.transfers.create(transferData);

      return {
        success: true,
        data: transfer,
        rawResponse: transfer,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay transfer', error, options);

      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [
      PaymentMethod.CARD,
      PaymentMethod.NET_BANKING,
      PaymentMethod.WALLET,
      PaymentMethod.UPI,
      PaymentMethod.EMI,
    ];
  }

  getSupportedCurrencies(): string[] {
    return ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'MYR'];
  }

  getMinimumAmount(currency: string): number {
    // Razorpay minimum amounts in paise/cents
    const minimums: Record<string, number> = {
      INR: 100, // ₹1.00
      USD: 50, // $0.50
      EUR: 50, // €0.50
      GBP: 30, // £0.30
      AUD: 50, // A$0.50
      CAD: 50, // C$0.50
      SGD: 50, // S$0.50
      AED: 200, // AED 2.00
      MYR: 200, // MYR 2.00
    };

    return minimums[currency.toUpperCase()] || 100;
  }

  getMaximumAmount(currency: string): number {
    // Razorpay maximum amounts in paise/cents
    const maximums: Record<string, number> = {
      INR: 1500000000, // ₹15,00,000.00
      USD: 99999999, // $999,999.99
      EUR: 99999999, // €999,999.99
      GBP: 99999999, // £999,999.99
      AUD: 99999999, // A$999,999.99
      CAD: 99999999, // C$999,999.99
      SGD: 99999999, // S$999,999.99
      AED: 99999999, // AED 999,999.99
      MYR: 99999999, // MYR 999,999.99
    };

    return maximums[currency.toUpperCase()] || 1500000000;
  }

  mapError(error: any): {
    code: string;
    message: string;
    type: string;
    retryable: boolean;
  } {
    const errorCode = error.error?.code || error.code || 'unknown_error';
    const errorMessage =
      error.error?.description || error.message || 'Unknown error occurred';

    // Map Razorpay error codes to our error types
    if (errorCode.includes('BAD_REQUEST')) {
      return {
        code: errorCode,
        message: errorMessage,
        type: PaymentErrorType.INVALID_REQUEST_ERROR,
        retryable: false,
      };
    }

    if (errorCode.includes('GATEWAY_ERROR')) {
      return {
        code: errorCode,
        message: errorMessage,
        type: PaymentErrorType.CARD_ERROR,
        retryable: false,
      };
    }

    if (errorCode.includes('SERVER_ERROR')) {
      return {
        code: errorCode,
        message: errorMessage,
        type: PaymentErrorType.API_ERROR,
        retryable: true,
      };
    }

    return {
      code: errorCode,
      message: errorMessage,
      type: PaymentErrorType.API_ERROR,
      retryable: false,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Razorpay gateway is not configured');
    }
  }

  private mapRazorpayOrderStatus(status: string): string {
    const mapping: Record<string, string> = {
      created: 'REQUIRES_PAYMENT_METHOD',
      attempted: 'PROCESSING',
      paid: 'SUCCEEDED',
    };

    return mapping[status] || status.toUpperCase();
  }

  private mapRazorpayPaymentStatus(status: string): string {
    const mapping: Record<string, string> = {
      created: 'PENDING',
      authorized: 'PROCESSING',
      captured: 'SUCCEEDED',
      refunded: 'REFUNDED',
      failed: 'FAILED',
    };

    return mapping[status] || status.toUpperCase();
  }

  private mapRazorpayRefundStatus(status: string): string {
    const mapping: Record<string, string> = {
      pending: 'PENDING',
      processed: 'SUCCEEDED',
      failed: 'FAILED',
    };

    return mapping[status] || status.toUpperCase();
  }
}
