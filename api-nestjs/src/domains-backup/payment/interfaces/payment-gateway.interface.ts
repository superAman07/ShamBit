import { PaymentMethod, PaymentGatewayProvider } from '../enums/payment-status.enum';

// Gateway Response Types
export interface GatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type: string;
    details?: Record<string, any>;
  };
  rawResponse?: any;
}

// Payment Intent Operations
export interface CreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency: string;
  orderId: string;
  customerId: string;
  paymentMethods: PaymentMethod[];
  confirmationMethod?: 'AUTOMATIC' | 'MANUAL';
  captureMethod?: 'AUTOMATIC' | 'MANUAL';
  description?: string;
  metadata?: Record<string, any>;
  
  // Multi-seller support
  applicationFee?: number;
  transferGroup?: string;
  transfers?: Array<{
    destination: string;
    amount: number;
  }>;
}

export interface CreatePaymentIntentResponse {
  intentId: string;
  clientSecret?: string;
  status: string;
  requiresAction?: boolean;
  nextAction?: {
    type: string;
    redirectUrl?: string;
    data?: Record<string, any>;
  };
}

export interface ConfirmPaymentIntentRequest {
  intentId: string;
  paymentMethod?: {
    type: PaymentMethod;
    card?: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: {
      name: string;
      email: string;
      phone?: string;
      address?: Record<string, any>;
    };
  };
  returnUrl?: string;
}

export interface ConfirmPaymentIntentResponse {
  status: string;
  requiresAction?: boolean;
  nextAction?: {
    type: string;
    redirectUrl?: string;
    data?: Record<string, any>;
  };
}

// Refund Operations
export interface CreateRefundRequest {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CreateRefundResponse {
  refundId: string;
  status: string;
  amount: number;
}

// Webhook Operations
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  created: number;
}

export interface WebhookVerificationRequest {
  payload: string;
  signature: string;
  secret: string;
}

// Gateway Configuration
export interface GatewayConfig {
  provider: PaymentGatewayProvider;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  apiVersion?: string;
  
  // Gateway-specific configuration
  additionalConfig?: Record<string, any>;
}

// Main Gateway Interface
export interface IPaymentGateway {
  readonly provider: PaymentGatewayProvider;
  
  // Configuration
  configure(config: GatewayConfig): Promise<void>;
  isConfigured(): boolean;
  
  // Payment Intent Operations
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<GatewayResponse<CreatePaymentIntentResponse>>;
  retrievePaymentIntent(intentId: string): Promise<GatewayResponse<any>>;
  confirmPaymentIntent(request: ConfirmPaymentIntentRequest): Promise<GatewayResponse<ConfirmPaymentIntentResponse>>;
  cancelPaymentIntent(intentId: string): Promise<GatewayResponse<any>>;
  
  // Transaction Operations
  capturePayment(intentId: string, amount?: number): Promise<GatewayResponse<any>>;
  
  // Refund Operations
  createRefund(request: CreateRefundRequest): Promise<GatewayResponse<CreateRefundResponse>>;
  retrieveRefund(refundId: string): Promise<GatewayResponse<any>>;
  
  // Webhook Operations
  verifyWebhook(request: WebhookVerificationRequest): Promise<boolean>;
  parseWebhook(payload: string): Promise<WebhookEvent>;
  
  // Utility Methods
  getSupportedPaymentMethods(): PaymentMethod[];
  getSupportedCurrencies(): string[];
  getMinimumAmount(currency: string): number;
  getMaximumAmount(currency: string): number;
  
  // Error Handling
  mapError(error: any): {
    code: string;
    message: string;
    type: string;
    retryable: boolean;
  };
}

// Gateway Factory Interface
export interface IPaymentGatewayFactory {
  createGateway(provider: PaymentGatewayProvider): IPaymentGateway;
  getSupportedProviders(): PaymentGatewayProvider[];
}

// Gateway Registry Interface
export interface IPaymentGatewayRegistry {
  register(provider: PaymentGatewayProvider, gateway: IPaymentGateway): void;
  get(provider: PaymentGatewayProvider): IPaymentGateway | undefined;
  getDefault(): IPaymentGateway | undefined;
  getAll(): Map<PaymentGatewayProvider, IPaymentGateway>;
}