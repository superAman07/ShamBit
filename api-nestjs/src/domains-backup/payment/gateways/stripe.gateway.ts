import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
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
export class StripeGateway implements IPaymentGateway {
  readonly provider = PaymentGatewayProvider.STRIPE;
  
  private stripe?: Stripe;
  private config?: GatewayConfig;
  
  constructor(private readonly logger: LoggerService) {}
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  async configure(config: GatewayConfig): Promise<void> {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion as any) || '2023-10-16',
      typescript: true,
    });
    
    this.logger.log('Stripe gateway configured', {
      provider: this.provider,
      environment: config.environment,
    });
  }
  
  isConfigured(): boolean {
    return !!this.stripe && !!this.config;
  }
  
  // ============================================================================
  // PAYMENT INTENT OPERATIONS
  // ============================================================================
  
  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<GatewayResponse<CreatePaymentIntentResponse>> {
    this.logger.log('StripeGateway.createPaymentIntent', {
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
    });
    
    try {
      this.ensureConfigured();
      
      const createParams: Stripe.PaymentIntentCreateParams = {
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        payment_method_types: this.mapPaymentMethods(request.paymentMethods),
        confirmation_method: request.confirmationMethod?.toLowerCase() as any || 'automatic',
        capture_method: request.captureMethod?.toLowerCase() as any || 'automatic',
        description: request.description,
        metadata: {
          orderId: request.orderId,
          customerId: request.customerId,
          ...request.metadata,
        },
      };
      
      // Multi-seller support
      if (request.applicationFee) {
        createParams.application_fee_amount = request.applicationFee;
      }
      
      if (request.transferGroup) {
        createParams.transfer_group = request.transferGroup;
      }
      
      const paymentIntent = await this.stripe!.paymentIntents.create(createParams);
      
      const response: CreatePaymentIntentResponse = {
        intentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        status: this.mapStripeStatus(paymentIntent.status),
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action ? {
          type: paymentIntent.next_action.type,
          redirectUrl: (paymentIntent.next_action as any).redirect_to_url?.url,
          data: paymentIntent.next_action,
        } : undefined,
      };
      
      this.logger.log('Stripe payment intent created successfully', {
        intentId: paymentIntent.id,
        status: paymentIntent.status,
      });
      
      return {
        success: true,
        data: response,
        rawResponse: paymentIntent,
      };
      
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', error, {
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
    this.logger.log('StripeGateway.retrievePaymentIntent', { intentId });
    
    try {
      this.ensureConfigured();
      
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(intentId);
      
      return {
        success: true,
        data: paymentIntent,
        rawResponse: paymentIntent,
      };
      
    } catch (error) {
      this.logger.error('Failed to retrieve Stripe payment intent', error, { intentId });
      
      return {
        success: false,
        error: this.mapError(error),
        rawResponse: error,
      };
    }
  }
  
  async confirmPaymentIntent(
    request: ConfirmPaymentIntentRequest
  ): Promise<GatewayResponse<ConfirmPaymentIntentResponse>> {
    this.logger.log('StripeGateway.confirmPaymentIntent', {
      intentId: request.intentId,
    });
    
    try {
      this.ensureConfigured();
      
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        return_url: request.returnUrl,
      };
      
      // Add payment method if provided
      if (request.paymentMethod) {
        if (request.paymentMethod.type === PaymentMethod.CARD && request.paymentMethod.card) {
          // Create payment method first
          const paymentMethod = await this.stripe!.paymentMethods.create({
            type: 'card',
            card: {
              number: request.paymentMethod.card.number,
              exp_month: request.paymentMethod.card.expMonth,
              exp_year: request.paymentMethod.card.expYear,
              cvc: request.paymentMethod.card.cvc,
            },
            billing_details: request.paymentMethod.billingDetails,
          });
          
          confirmParams.payment_method = paymentMethod.id;
        }
      }
      
      const paymentIntent = await this.stripe!.paymentIntents.confirm(
        request.intentId,
        confirmParams
      );
      
      const response: ConfirmPaymentIntentResponse = {
        status: this.mapStripeStatus(paymentIntent.status),
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action ? {
          type: paymentIntent.next_action.type,
          redirectUrl: (paymentIntent.next_action as any).redirect_to_url?.url,
          data: paymentIntent.next_action,
        } : undefined,
      };
      
      this.logger.log('Stripe payment intent confirmed', {
        intentId: request.intentId,
        status: paymentIntent.status,
      });
      
      return {
        success: true,
        data: response,
        rawResponse: paymentIntent,
      };
      
    } catch (error) {
      this.logger.error('Failed to confirm Stripe payment intent', error, {
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
    this.logger.log('StripeGateway.cancelPaymentIntent', { intentId });
    
    try {
      this.ensureConfigured();
      
      const paymentIntent = await this.stripe!.paymentIntents.cancel(intentId);
      
      return {
        success: true,
        data: paymentIntent,
        rawResponse: paymentIntent,
      };
      
    } catch (error) {
      this.logger.error('Failed to cancel Stripe payment intent', error, { intentId });
      
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
  
  async capturePayment(intentId: string, amount?: number): Promise<GatewayResponse<any>> {
    this.logger.log('StripeGateway.capturePayment', { intentId, amount });
    
    try {
      this.ensureConfigured();
      
      const captureParams: Stripe.PaymentIntentCaptureParams = {};
      if (amount !== undefined) {
        captureParams.amount_to_capture = amount;
      }
      
      const paymentIntent = await this.stripe!.paymentIntents.capture(intentId, captureParams);
      
      return {
        success: true,
        data: paymentIntent,
        rawResponse: paymentIntent,
      };
      
    } catch (error) {
      this.logger.error('Failed to capture Stripe payment', error, { intentId, amount });
      
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
  
  async createRefund(request: CreateRefundRequest): Promise<GatewayResponse<CreateRefundResponse>> {
    this.logger.log('StripeGateway.createRefund', {
      transactionId: request.transactionId,
      amount: request.amount,
    });
    
    try {
      this.ensureConfigured();
      
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.transactionId,
        reason: this.mapRefundReason(request.reason),
        metadata: request.metadata,
      };
      
      if (request.amount !== undefined) {
        refundParams.amount = request.amount;
      }
      
      const refund = await this.stripe!.refunds.create(refundParams);
      
      const response: CreateRefundResponse = {
        refundId: refund.id,
        status: this.mapStripeRefundStatus(refund.status || 'pending'),
        amount: refund.amount,
      };
      
      this.logger.log('Stripe refund created successfully', {
        refundId: refund.id,
        amount: refund.amount,
      });
      
      return {
        success: true,
        data: response,
        rawResponse: refund,
      };
      
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error, {
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
    this.logger.log('StripeGateway.retrieveRefund', { refundId });
    
    try {
      this.ensureConfigured();
      
      const refund = await this.stripe!.refunds.retrieve(refundId);
      
      return {
        success: true,
        data: refund,
        rawResponse: refund,
      };
      
    } catch (error) {
      this.logger.error('Failed to retrieve Stripe refund', error, { refundId });
      
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
      
      const event = this.stripe!.webhooks.constructEvent(
        request.payload,
        request.signature,
        request.secret
      );
      
      return !!event;
      
    } catch (error) {
      this.logger.error('Stripe webhook verification failed', error);
      return false;
    }
  }
  
  async parseWebhook(payload: string): Promise<WebhookEvent> {
    const event = JSON.parse(payload) as Stripe.Event;
    
    return {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getSupportedPaymentMethods(): PaymentMethod[] {
    return [
      PaymentMethod.CARD,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.WALLET,
    ];
  }
  
  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'JPY'];
  }
  
  getMinimumAmount(currency: string): number {
    // Stripe minimum amounts in cents
    const minimums: Record<string, number> = {
      USD: 50,   // $0.50
      EUR: 50,   // €0.50
      GBP: 30,   // £0.30
      CAD: 50,   // C$0.50
      AUD: 50,   // A$0.50
      INR: 50,   // ₹0.50
      SGD: 50,   // S$0.50
      JPY: 50,   // ¥50
    };
    
    return minimums[currency.toUpperCase()] || 50;
  }
  
  getMaximumAmount(currency: string): number {
    // Stripe maximum amounts in cents
    return 99999999; // $999,999.99
  }
  
  mapError(error: any): {
    code: string;
    message: string;
    type: string;
    retryable: boolean;
  } {
    if (error.type === 'StripeCardError') {
      return {
        code: error.code || 'card_error',
        message: error.message,
        type: PaymentErrorType.CARD_ERROR,
        retryable: false,
      };
    }
    
    if (error.type === 'StripeRateLimitError') {
      return {
        code: 'rate_limit',
        message: 'Too many requests',
        type: PaymentErrorType.RATE_LIMIT_ERROR,
        retryable: true,
      };
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return {
        code: error.code || 'invalid_request',
        message: error.message,
        type: PaymentErrorType.INVALID_REQUEST_ERROR,
        retryable: false,
      };
    }
    
    if (error.type === 'StripeAPIError') {
      return {
        code: 'api_error',
        message: error.message,
        type: PaymentErrorType.API_ERROR,
        retryable: true,
      };
    }
    
    if (error.type === 'StripeConnectionError') {
      return {
        code: 'connection_error',
        message: 'Network error',
        type: PaymentErrorType.API_CONNECTION_ERROR,
        retryable: true,
      };
    }
    
    if (error.type === 'StripeAuthenticationError') {
      return {
        code: 'authentication_error',
        message: 'Authentication failed',
        type: PaymentErrorType.AUTHENTICATION_ERROR,
        retryable: false,
      };
    }
    
    return {
      code: 'unknown_error',
      message: error.message || 'Unknown error occurred',
      type: PaymentErrorType.API_ERROR,
      retryable: false,
    };
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Stripe gateway is not configured');
    }
  }
  
  private mapPaymentMethods(methods: PaymentMethod[]): string[] {
    const mapping: Record<PaymentMethod, string> = {
      [PaymentMethod.CARD]: 'card',
      [PaymentMethod.BANK_TRANSFER]: 'us_bank_account',
      [PaymentMethod.WALLET]: 'link',
      [PaymentMethod.UPI]: 'upi',
      [PaymentMethod.NET_BANKING]: 'netbanking',
      [PaymentMethod.EMI]: 'card',
      [PaymentMethod.CASH_ON_DELIVERY]: 'card', // Not supported by Stripe
    };
    
    return methods.map(method => mapping[method]).filter(Boolean);
  }
  
  private mapStripeStatus(status: string): string {
    const mapping: Record<string, string> = {
      'requires_payment_method': 'REQUIRES_PAYMENT_METHOD',
      'requires_confirmation': 'REQUIRES_CONFIRMATION',
      'requires_action': 'REQUIRES_ACTION',
      'processing': 'PROCESSING',
      'succeeded': 'SUCCEEDED',
      'canceled': 'CANCELED',
    };
    
    return mapping[status] || status.toUpperCase();
  }
  
  private mapStripeRefundStatus(status: string): string {
    const mapping: Record<string, string> = {
      'pending': 'PENDING',
      'succeeded': 'SUCCEEDED',
      'failed': 'FAILED',
      'canceled': 'CANCELED',
    };
    
    return mapping[status] || status.toUpperCase();
  }
  
  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    if (!reason) return undefined;
    
    const mapping: Record<string, Stripe.RefundCreateParams.Reason> = {
      'DUPLICATE': 'duplicate',
      'FRAUDULENT': 'fraudulent',
      'REQUESTED_BY_CUSTOMER': 'requested_by_customer',
    };
    
    return mapping[reason];
  }
}