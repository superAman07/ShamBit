// Payment Domain Events - Following strict naming convention

export class PaymentIntentCreatedEvent {
  static readonly eventName = 'payment.intent.created';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly gatewayProvider: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentUpdatedEvent {
  static readonly eventName = 'payment.intent.updated';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentConfirmedEvent {
  static readonly eventName = 'payment.intent.confirmed';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paymentMethod: string,
    public readonly confirmedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentSucceededEvent {
  static readonly eventName = 'payment.intent.succeeded';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly transactionId?: string,
    public readonly processedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentFailedEvent {
  static readonly eventName = 'payment.intent.failed';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly attemptNumber?: number,
    public readonly failedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentCanceledEvent {
  static readonly eventName = 'payment.intent.canceled';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly reason: string,
    public readonly canceledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentIntentExpiredEvent {
  static readonly eventName = 'payment.intent.expired';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly expiredAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentTransactionCreatedEvent {
  static readonly eventName = 'payment.transaction.created';

  constructor(
    public readonly transactionId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly type: string,
    public readonly gatewayProvider: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentTransactionSucceededEvent {
  static readonly eventName = 'payment.transaction.succeeded';

  constructor(
    public readonly transactionId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly gatewayTransactionId: string,
    public readonly processedAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentTransactionFailedEvent {
  static readonly eventName = 'payment.transaction.failed';

  constructor(
    public readonly transactionId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRefundCreatedEvent {
  static readonly eventName = 'payment.refund.created';

  constructor(
    public readonly refundId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRefundSucceededEvent {
  static readonly eventName = 'payment.refund.succeeded';

  constructor(
    public readonly refundId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly gatewayRefundId: string,
    public readonly processedAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRefundFailedEvent {
  static readonly eventName = 'payment.refund.failed';

  constructor(
    public readonly refundId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentDisputeCreatedEvent {
  static readonly eventName = 'payment.dispute.created';

  constructor(
    public readonly disputeId: string,
    public readonly transactionId: string,
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly evidenceDueBy?: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentMethodAttachedEvent {
  static readonly eventName = 'payment.method.attached';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly paymentMethodType: string,
    public readonly paymentMethodId: string,
    public readonly customerId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRetryInitiatedEvent {
  static readonly eventName = 'payment.retry.initiated';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly attemptNumber: number,
    public readonly previousFailureReason: string,
    public readonly retryStrategy: string,
    public readonly scheduledAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRetrySucceededEvent {
  static readonly eventName = 'payment.retry.succeeded';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly attemptNumber: number,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentRetryFailedEvent {
  static readonly eventName = 'payment.retry.failed';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly attemptNumber: number,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly willRetryAgain: boolean,
    public readonly nextRetryAt?: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentWebhookReceivedEvent {
  static readonly eventName = 'payment.webhook.received';

  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly paymentIntentId?: string,
    public readonly verified: boolean = false,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentWebhookProcessedEvent {
  static readonly eventName = 'payment.webhook.processed';

  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly processingResult: 'SUCCESS' | 'FAILURE' | 'IGNORED',
    public readonly paymentIntentId?: string,
    public readonly processingMessage?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentReconciliationEvent {
  static readonly eventName = 'payment.reconciliation';

  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly totalTransactions: number,
    public readonly totalAmount: number,
    public readonly discrepancies: Array<{
      transactionId: string;
      expectedAmount: number;
      actualAmount: number;
      difference: number;
    }>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentGatewayErrorEvent {
  static readonly eventName = 'payment.gateway.error';

  constructor(
    public readonly gatewayProvider: string,
    public readonly errorType: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly paymentIntentId?: string,
    public readonly orderId?: string,
    public readonly retryable: boolean = false,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentFraudDetectedEvent {
  static readonly eventName = 'payment.fraud.detected';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly fraudScore: number,
    public readonly fraudReasons: string[],
    public readonly action: 'BLOCK' | 'REVIEW' | 'ALLOW',
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentLimitExceededEvent {
  static readonly eventName = 'payment.limit.exceeded';

  constructor(
    public readonly paymentIntentId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly limitType: 'DAILY' | 'MONTHLY' | 'TRANSACTION' | 'VELOCITY',
    public readonly currentAmount: number,
    public readonly limitAmount: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
