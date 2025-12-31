export enum PaymentIntentStatus {
  CREATED = 'CREATED', // Intent created, awaiting payment method
  REQUIRES_PAYMENT_METHOD = 'REQUIRES_PAYMENT_METHOD', // Needs payment method attachment
  REQUIRES_CONFIRMATION = 'REQUIRES_CONFIRMATION', // Needs confirmation from client
  REQUIRES_ACTION = 'REQUIRES_ACTION', // Needs additional action (3DS, etc.)
  PROCESSING = 'PROCESSING', // Payment being processed
  SUCCEEDED = 'SUCCEEDED', // Payment successful
  CANCELED = 'CANCELED', // Intent canceled
}

export enum PaymentTransactionStatus {
  PENDING = 'PENDING', // Transaction initiated
  PROCESSING = 'PROCESSING', // Being processed by gateway
  SUCCEEDED = 'SUCCEEDED', // Transaction successful
  FAILED = 'FAILED', // Transaction failed
  CANCELED = 'CANCELED', // Transaction canceled
  DISPUTED = 'DISPUTED', // Transaction disputed/chargeback
}

export enum PaymentAttemptStatus {
  INITIATED = 'INITIATED', // Attempt started
  PROCESSING = 'PROCESSING', // Being processed
  SUCCEEDED = 'SUCCEEDED', // Attempt successful
  FAILED = 'FAILED', // Attempt failed
  ABANDONED = 'ABANDONED', // Attempt abandoned
}

export enum PaymentRefundStatus {
  PENDING = 'PENDING', // Refund requested
  PROCESSING = 'PROCESSING', // Being processed
  SUCCEEDED = 'SUCCEEDED', // Refund successful
  FAILED = 'FAILED', // Refund failed
  CANCELED = 'CANCELED', // Refund canceled
}

export enum PaymentWebhookStatus {
  RECEIVED = 'RECEIVED', // Webhook received
  PROCESSING = 'PROCESSING', // Being processed
  PROCESSED = 'PROCESSED', // Successfully processed
  FAILED = 'FAILED', // Processing failed
  IGNORED = 'IGNORED', // Webhook ignored (duplicate/irrelevant)
}

export enum PaymentMethod {
  CARD = 'CARD', // Credit/Debit card
  BANK_TRANSFER = 'BANK_TRANSFER', // Bank transfer
  WALLET = 'WALLET', // Digital wallet
  UPI = 'UPI', // UPI (India)
  NET_BANKING = 'NET_BANKING', // Net banking
  EMI = 'EMI', // EMI payments
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY', // COD
}

export enum PaymentGatewayProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  PAYPAL = 'PAYPAL',
  SQUARE = 'SQUARE',
  BRAINTREE = 'BRAINTREE',
}

// Payment Intent State Machine
export const PaymentIntentStatusTransitions: Record<
  PaymentIntentStatus,
  PaymentIntentStatus[]
> = {
  [PaymentIntentStatus.CREATED]: [
    PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
    PaymentIntentStatus.REQUIRES_CONFIRMATION,
    PaymentIntentStatus.CANCELED,
  ],
  [PaymentIntentStatus.REQUIRES_PAYMENT_METHOD]: [
    PaymentIntentStatus.REQUIRES_CONFIRMATION,
    PaymentIntentStatus.REQUIRES_ACTION,
    PaymentIntentStatus.CANCELED,
  ],
  [PaymentIntentStatus.REQUIRES_CONFIRMATION]: [
    PaymentIntentStatus.REQUIRES_ACTION,
    PaymentIntentStatus.PROCESSING,
    PaymentIntentStatus.CANCELED,
  ],
  [PaymentIntentStatus.REQUIRES_ACTION]: [
    PaymentIntentStatus.PROCESSING,
    PaymentIntentStatus.REQUIRES_CONFIRMATION,
    PaymentIntentStatus.CANCELED,
  ],
  [PaymentIntentStatus.PROCESSING]: [
    PaymentIntentStatus.SUCCEEDED,
    PaymentIntentStatus.REQUIRES_ACTION,
    PaymentIntentStatus.CANCELED,
  ],
  [PaymentIntentStatus.SUCCEEDED]: [], // Terminal state
  [PaymentIntentStatus.CANCELED]: [], // Terminal state
};

// Payment Transaction State Machine
export const PaymentTransactionStatusTransitions: Record<
  PaymentTransactionStatus,
  PaymentTransactionStatus[]
> = {
  [PaymentTransactionStatus.PENDING]: [
    PaymentTransactionStatus.PROCESSING,
    PaymentTransactionStatus.FAILED,
    PaymentTransactionStatus.CANCELED,
  ],
  [PaymentTransactionStatus.PROCESSING]: [
    PaymentTransactionStatus.SUCCEEDED,
    PaymentTransactionStatus.FAILED,
    PaymentTransactionStatus.CANCELED,
  ],
  [PaymentTransactionStatus.SUCCEEDED]: [PaymentTransactionStatus.DISPUTED],
  [PaymentTransactionStatus.FAILED]: [
    PaymentTransactionStatus.PENDING, // Allow retry
  ],
  [PaymentTransactionStatus.CANCELED]: [], // Terminal state
  [PaymentTransactionStatus.DISPUTED]: [], // Terminal state (requires manual resolution)
};

// Validation Functions
export function canTransitionPaymentIntentStatus(
  from: PaymentIntentStatus,
  to: PaymentIntentStatus,
): boolean {
  return PaymentIntentStatusTransitions[from].includes(to);
}

export function canTransitionPaymentTransactionStatus(
  from: PaymentTransactionStatus,
  to: PaymentTransactionStatus,
): boolean {
  return PaymentTransactionStatusTransitions[from].includes(to);
}

export function getValidPaymentIntentTransitions(
  status: PaymentIntentStatus,
): PaymentIntentStatus[] {
  return PaymentIntentStatusTransitions[status];
}

export function getValidPaymentTransactionTransitions(
  status: PaymentTransactionStatus,
): PaymentTransactionStatus[] {
  return PaymentTransactionStatusTransitions[status];
}

// Status Checks
export function isPaymentIntentTerminal(status: PaymentIntentStatus): boolean {
  return [PaymentIntentStatus.SUCCEEDED, PaymentIntentStatus.CANCELED].includes(
    status,
  );
}

export function isPaymentTransactionTerminal(
  status: PaymentTransactionStatus,
): boolean {
  return [
    PaymentTransactionStatus.SUCCEEDED,
    PaymentTransactionStatus.CANCELED,
    PaymentTransactionStatus.DISPUTED,
  ].includes(status);
}

export function isPaymentIntentActive(status: PaymentIntentStatus): boolean {
  return [
    PaymentIntentStatus.CREATED,
    PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
    PaymentIntentStatus.REQUIRES_CONFIRMATION,
    PaymentIntentStatus.REQUIRES_ACTION,
    PaymentIntentStatus.PROCESSING,
  ].includes(status);
}

export function isPaymentSuccessful(
  status: PaymentIntentStatus | PaymentTransactionStatus,
): boolean {
  return (
    status === PaymentIntentStatus.SUCCEEDED ||
    status === PaymentTransactionStatus.SUCCEEDED
  );
}

export function requiresUserAction(status: PaymentIntentStatus): boolean {
  return [
    PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
    PaymentIntentStatus.REQUIRES_CONFIRMATION,
    PaymentIntentStatus.REQUIRES_ACTION,
  ].includes(status);
}

// Error Types
export enum PaymentErrorType {
  CARD_ERROR = 'CARD_ERROR', // Card-related errors
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR', // Rate limiting
  INVALID_REQUEST_ERROR = 'INVALID_REQUEST_ERROR', // Invalid request
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // Auth errors
  API_CONNECTION_ERROR = 'API_CONNECTION_ERROR', // Connection errors
  API_ERROR = 'API_ERROR', // Generic API errors
  IDEMPOTENCY_ERROR = 'IDEMPOTENCY_ERROR', // Idempotency key errors
}

// Refund Reasons
export enum PaymentRefundReason {
  DUPLICATE = 'DUPLICATE', // Duplicate payment
  FRAUDULENT = 'FRAUDULENT', // Fraudulent transaction
  REQUESTED_BY_CUSTOMER = 'REQUESTED_BY_CUSTOMER', // Customer request
  EXPIRED_UNCAPTURED = 'EXPIRED_UNCAPTURED', // Expired authorization
  FAILED_CHARGE = 'FAILED_CHARGE', // Failed charge
}

// Dispute Reasons
export enum PaymentDisputeReason {
  FRAUDULENT = 'FRAUDULENT', // Fraudulent transaction
  UNRECOGNIZED = 'UNRECOGNIZED', // Customer doesn't recognize
  DUPLICATE = 'DUPLICATE', // Duplicate charge
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED', // Subscription issues
  PRODUCT_UNACCEPTABLE = 'PRODUCT_UNACCEPTABLE', // Product issues
  PRODUCT_NOT_RECEIVED = 'PRODUCT_NOT_RECEIVED', // Product not received
  PROCESSING_ERROR = 'PROCESSING_ERROR', // Processing error
  CREDIT_NOT_PROCESSED = 'CREDIT_NOT_PROCESSED', // Credit not processed
  GENERAL = 'GENERAL', // General dispute
}
