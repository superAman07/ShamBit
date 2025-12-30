// ============================================================================
// REFUND EVENTS
// ============================================================================
// Refund Domain Events - Following strict naming convention

export class RefundCreatedEvent {
  static readonly eventName = 'refund.created';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly refundType: string,
    public readonly requestedAmount: number,
    public readonly currency: string,
    public readonly reason: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundUpdatedEvent {
  static readonly eventName = 'refund.updated';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundStatusChangedEvent {
  static readonly eventName = 'refund.status.changed';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundApprovedEvent {
  static readonly eventName = 'refund.approved';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly approvedAmount: number,
    public readonly currency: string,
    public readonly approvedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundRejectedEvent {
  static readonly eventName = 'refund.rejected';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly rejectionReason: string,
    public readonly rejectedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundProcessingStartedEvent {
  static readonly eventName = 'refund.processing.started';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly processedAmount: number,
    public readonly currency: string,
    public readonly gatewayProvider: string,
    public readonly processedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundProcessedEvent {
  static readonly eventName = 'refund.processed';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly processedAmount: number,
    public readonly currency: string,
    public readonly gatewayRefundId: string,
    public readonly processedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundCompletedEvent {
  static readonly eventName = 'refund.completed';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly completedAmount: number,
    public readonly currency: string,
    public readonly gatewayRefundId: string,
    public readonly completedAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundFailedEvent {
  static readonly eventName = 'refund.failed';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly failedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundCancelledEvent {
  static readonly eventName = 'refund.cancelled';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundRetriedEvent {
  static readonly eventName = 'refund.retried';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly attemptNumber: number,
    public readonly previousError: string,
    public readonly retriedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND ITEM EVENTS
// ============================================================================

export class RefundItemAddedEvent {
  static readonly eventName = 'refund.item.added';
  
  constructor(
    public readonly refundId: string,
    public readonly refundItemId: string,
    public readonly orderItemId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly amount: number,
    public readonly addedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundItemUpdatedEvent {
  static readonly eventName = 'refund.item.updated';
  
  constructor(
    public readonly refundId: string,
    public readonly refundItemId: string,
    public readonly orderItemId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundItemRestockedEvent {
  static readonly eventName = 'refund.item.restocked';
  
  constructor(
    public readonly refundId: string,
    public readonly refundItemId: string,
    public readonly variantId: string,
    public readonly restockedQuantity: number,
    public readonly restockedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundItemRestockFailedEvent {
  static readonly eventName = 'refund.item.restock.failed';
  
  constructor(
    public readonly refundId: string,
    public readonly refundItemId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly errorMessage: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND LEDGER EVENTS
// ============================================================================

export class RefundLedgerEntryCreatedEvent {
  static readonly eventName = 'refund.ledger.entry.created';
  
  constructor(
    public readonly refundId: string,
    public readonly entryId: string,
    public readonly entryType: string,
    public readonly amount: number,
    public readonly accountType: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND JOB EVENTS
// ============================================================================

export class RefundJobCreatedEvent {
  static readonly eventName = 'refund.job.created';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly refundId?: string,
    public readonly orderId?: string,
    public readonly createdBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundJobStartedEvent {
  static readonly eventName = 'refund.job.started';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly refundId?: string,
    public readonly orderId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundJobCompletedEvent {
  static readonly eventName = 'refund.job.completed';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly refundId?: string,
    public readonly orderId?: string,
    public readonly result?: any,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundJobFailedEvent {
  static readonly eventName = 'refund.job.failed';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly errorMessage: string,
    public readonly refundId?: string,
    public readonly orderId?: string,
    public readonly willRetry?: boolean,
    public readonly nextRetryAt?: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND ELIGIBILITY EVENTS
// ============================================================================

export class RefundEligibilityCheckedEvent {
  static readonly eventName = 'refund.eligibility.checked';
  
  constructor(
    public readonly orderId: string,
    public readonly orderItemId: string | null,
    public readonly isEligible: boolean,
    public readonly reason?: string,
    public readonly maxRefundAmount?: number,
    public readonly checkedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundEligibilityExpiredEvent {
  static readonly eventName = 'refund.eligibility.expired';
  
  constructor(
    public readonly orderId: string,
    public readonly orderItemId: string | null,
    public readonly expiredAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND POLICY EVENTS
// ============================================================================

export class RefundPolicyCreatedEvent {
  static readonly eventName = 'refund.policy.created';
  
  constructor(
    public readonly policyId: string,
    public readonly name: string,
    public readonly sellerId?: string,
    public readonly createdBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundPolicyUpdatedEvent {
  static readonly eventName = 'refund.policy.updated';
  
  constructor(
    public readonly policyId: string,
    public readonly name: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundPolicyActivatedEvent {
  static readonly eventName = 'refund.policy.activated';
  
  constructor(
    public readonly policyId: string,
    public readonly name: string,
    public readonly activatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundPolicyDeactivatedEvent {
  static readonly eventName = 'refund.policy.deactivated';
  
  constructor(
    public readonly policyId: string,
    public readonly name: string,
    public readonly deactivatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND WEBHOOK EVENTS
// ============================================================================

export class RefundWebhookReceivedEvent {
  static readonly eventName = 'refund.webhook.received';
  
  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly refundId?: string,
    public readonly verified: boolean = false,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundWebhookProcessedEvent {
  static readonly eventName = 'refund.webhook.processed';
  
  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly processingResult: 'SUCCESS' | 'FAILURE' | 'IGNORED',
    public readonly refundId?: string,
    public readonly processingMessage?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND NOTIFICATION EVENTS
// ============================================================================

export class RefundNotificationEvent {
  static readonly eventName = 'refund.notification';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly notificationType: 'REFUND_CREATED' | 'REFUND_APPROVED' | 'REFUND_REJECTED' | 'REFUND_PROCESSED' | 'REFUND_COMPLETED' | 'REFUND_FAILED',
    public readonly notificationChannel: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK',
    public readonly recipientId: string,
    public readonly message: string,
    public readonly metadata?: Record<string, any>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND ANALYTICS EVENTS
// ============================================================================

export class RefundAnalyticsEvent {
  static readonly eventName = 'refund.analytics';
  
  constructor(
    public readonly eventType: 'REFUND_RATE_THRESHOLD' | 'REFUND_VOLUME_SPIKE' | 'REFUND_PATTERN_DETECTED',
    public readonly timeframe: {
      start: Date;
      end: Date;
    },
    public readonly metrics: {
      refundRate?: number;
      refundVolume?: number;
      refundAmount?: number;
      threshold?: number;
    },
    public readonly sellerId?: string,
    public readonly categoryId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND FRAUD EVENTS
// ============================================================================

export class RefundFraudDetectedEvent {
  static readonly eventName = 'refund.fraud.detected';
  
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly fraudScore: number,
    public readonly fraudReasons: string[],
    public readonly action: 'BLOCK' | 'REVIEW' | 'ALLOW',
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundAbuseDetectedEvent {
  static readonly eventName = 'refund.abuse.detected';
  
  constructor(
    public readonly customerId: string,
    public readonly abuseType: 'FREQUENT_REFUNDS' | 'HIGH_VALUE_REFUNDS' | 'SUSPICIOUS_PATTERN',
    public readonly refundCount: number,
    public readonly totalRefundAmount: number,
    public readonly timeframe: {
      start: Date;
      end: Date;
    },
    public readonly action: 'FLAG' | 'RESTRICT' | 'BLOCK',
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND RECONCILIATION EVENTS
// ============================================================================

export class RefundReconciliationStartedEvent {
  static readonly eventName = 'refund.reconciliation.started';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly startedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundReconciliationCompletedEvent {
  static readonly eventName = 'refund.reconciliation.completed';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly totalRefunds: number,
    public readonly matchedRefunds: number,
    public readonly unmatchedRefunds: number,
    public readonly discrepancies: Array<{
      refundId: string;
      expectedAmount: number;
      actualAmount: number;
      difference: number;
    }>,
    public readonly completedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RefundReconciliationFailedEvent {
  static readonly eventName = 'refund.reconciliation.failed';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly errorMessage: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND AUDIT EVENTS
// ============================================================================

export class RefundAuditLogCreatedEvent {
  static readonly eventName = 'refund.audit.created';
  
  constructor(
    public readonly auditLogId: string,
    public readonly refundId: string,
    public readonly action: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// REFUND STATISTICS EVENTS
// ============================================================================

export class RefundStatisticsCalculatedEvent {
  static readonly eventName = 'refund.statistics.calculated';
  
  constructor(
    public readonly periodType: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly statistics: {
      totalRefunds: number;
      totalRefundAmount: number;
      refundRate: number;
      avgProcessingTime: number;
    },
    public readonly sellerId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}