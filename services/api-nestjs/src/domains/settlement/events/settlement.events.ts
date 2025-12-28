// ============================================================================
// SETTLEMENT EVENTS
// ============================================================================
// Settlement Domain Events - Following strict naming convention

export class SettlementCreatedEvent {
  static readonly eventName = 'settlement.created';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementUpdatedEvent {
  static readonly eventName = 'settlement.updated';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementStatusChangedEvent {
  static readonly eventName = 'settlement.status.changed';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementProcessedEvent {
  static readonly eventName = 'settlement.processed';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly gatewayTransferId: string,
    public readonly processedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementSettledEvent {
  static readonly eventName = 'settlement.settled';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly gatewayTransferId: string,
    public readonly utr?: string,
    public readonly settledAt?: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementFailedEvent {
  static readonly eventName = 'settlement.failed';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly failedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementRetriedEvent {
  static readonly eventName = 'settlement.retried';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly attemptNumber: number,
    public readonly previousFailureReason: string,
    public readonly retriedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementCancelledEvent {
  static readonly eventName = 'settlement.cancelled';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SELLER ACCOUNT EVENTS
// ============================================================================

export class SellerAccountCreatedEvent {
  static readonly eventName = 'seller.account.created';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SellerAccountUpdatedEvent {
  static readonly eventName = 'seller.account.updated';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SellerAccountStatusChangedEvent {
  static readonly eventName = 'seller.account.status.changed';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SellerAccountVerifiedEvent {
  static readonly eventName = 'seller.account.verified';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly verifiedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SellerAccountSuspendedEvent {
  static readonly eventName = 'seller.account.suspended';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly reason: string,
    public readonly suspendedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SellerAccountRejectedEvent {
  static readonly eventName = 'seller.account.rejected';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly reason: string,
    public readonly rejectedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// KYC EVENTS
// ============================================================================

export class KycDocumentUploadedEvent {
  static readonly eventName = 'kyc.document.uploaded';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly documentType: string,
    public readonly documentId: string,
    public readonly uploadedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class KycStatusChangedEvent {
  static readonly eventName = 'kyc.status.changed';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class KycVerificationCompletedEvent {
  static readonly eventName = 'kyc.verification.completed';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly verificationResult: 'APPROVED' | 'REJECTED',
    public readonly verificationNotes?: string,
    public readonly verifiedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class KycClarificationRequestedEvent {
  static readonly eventName = 'kyc.clarification.requested';
  
  constructor(
    public readonly sellerAccountId: string,
    public readonly sellerId: string,
    public readonly clarificationFields: string[],
    public readonly requestMessage: string,
    public readonly requestedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT SCHEDULE EVENTS
// ============================================================================

export class SettlementScheduleCreatedEvent {
  static readonly eventName = 'settlement.schedule.created';
  
  constructor(
    public readonly scheduleId: string,
    public readonly sellerId: string,
    public readonly frequency: string,
    public readonly autoSettle: boolean,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementScheduleUpdatedEvent {
  static readonly eventName = 'settlement.schedule.updated';
  
  constructor(
    public readonly scheduleId: string,
    public readonly sellerId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementScheduleActivatedEvent {
  static readonly eventName = 'settlement.schedule.activated';
  
  constructor(
    public readonly scheduleId: string,
    public readonly sellerId: string,
    public readonly activatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementScheduleDeactivatedEvent {
  static readonly eventName = 'settlement.schedule.deactivated';
  
  constructor(
    public readonly scheduleId: string,
    public readonly sellerId: string,
    public readonly reason: string,
    public readonly deactivatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT JOB EVENTS
// ============================================================================

export class SettlementJobCreatedEvent {
  static readonly eventName = 'settlement.job.created';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly settlementId?: string,
    public readonly sellerId?: string,
    public readonly createdBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementJobStartedEvent {
  static readonly eventName = 'settlement.job.started';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly settlementId?: string,
    public readonly sellerId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementJobCompletedEvent {
  static readonly eventName = 'settlement.job.completed';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly settlementId?: string,
    public readonly sellerId?: string,
    public readonly result?: any,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementJobFailedEvent {
  static readonly eventName = 'settlement.job.failed';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly errorMessage: string,
    public readonly settlementId?: string,
    public readonly sellerId?: string,
    public readonly willRetry?: boolean,
    public readonly nextRetryAt?: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementJobRetryEvent {
  static readonly eventName = 'settlement.job.retry';
  
  constructor(
    public readonly jobId: string,
    public readonly jobType: string,
    public readonly attemptNumber: number,
    public readonly previousError: string,
    public readonly settlementId?: string,
    public readonly sellerId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT CALCULATION EVENTS
// ============================================================================

export class SettlementCalculationStartedEvent {
  static readonly eventName = 'settlement.calculation.started';
  
  constructor(
    public readonly sellerId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly calculatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementCalculationCompletedEvent {
  static readonly eventName = 'settlement.calculation.completed';
  
  constructor(
    public readonly sellerId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly grossAmount: number,
    public readonly fees: number,
    public readonly tax: number,
    public readonly netAmount: number,
    public readonly transactionCount: number,
    public readonly calculatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementCalculationFailedEvent {
  static readonly eventName = 'settlement.calculation.failed';
  
  constructor(
    public readonly sellerId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly errorMessage: string,
    public readonly calculatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT RECONCILIATION EVENTS
// ============================================================================

export class SettlementReconciliationStartedEvent {
  static readonly eventName = 'settlement.reconciliation.started';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly startedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementReconciliationCompletedEvent {
  static readonly eventName = 'settlement.reconciliation.completed';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly totalSettlements: number,
    public readonly matchedSettlements: number,
    public readonly unmatchedSettlements: number,
    public readonly discrepancies: Array<{
      settlementId: string;
      expectedAmount: number;
      actualAmount: number;
      difference: number;
    }>,
    public readonly completedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementReconciliationFailedEvent {
  static readonly eventName = 'settlement.reconciliation.failed';
  
  constructor(
    public readonly reconciliationId: string,
    public readonly gatewayProvider: string,
    public readonly reconciliationDate: Date,
    public readonly errorMessage: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT WEBHOOK EVENTS
// ============================================================================

export class SettlementWebhookReceivedEvent {
  static readonly eventName = 'settlement.webhook.received';
  
  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly settlementId?: string,
    public readonly verified: boolean = false,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementWebhookProcessedEvent {
  static readonly eventName = 'settlement.webhook.processed';
  
  constructor(
    public readonly webhookId: string,
    public readonly eventType: string,
    public readonly gatewayProvider: string,
    public readonly settlementId?: string,
    public readonly processingResult: 'SUCCESS' | 'FAILURE' | 'IGNORED',
    public readonly processingMessage?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT AUDIT EVENTS
// ============================================================================

export class SettlementAuditLogCreatedEvent {
  static readonly eventName = 'settlement.audit.created';
  
  constructor(
    public readonly auditLogId: string,
    public readonly settlementId: string,
    public readonly action: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT NOTIFICATION EVENTS
// ============================================================================

export class SettlementNotificationEvent {
  static readonly eventName = 'settlement.notification';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly notificationType: 'SETTLEMENT_PROCESSED' | 'SETTLEMENT_FAILED' | 'SETTLEMENT_DELAYED' | 'KYC_REQUIRED',
    public readonly notificationChannel: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK',
    public readonly message: string,
    public readonly metadata?: Record<string, any>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// SETTLEMENT LIMIT EVENTS
// ============================================================================

export class SettlementLimitExceededEvent {
  static readonly eventName = 'settlement.limit.exceeded';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly limitType: 'DAILY' | 'MONTHLY' | 'TRANSACTION' | 'VELOCITY',
    public readonly currentAmount: number,
    public readonly limitAmount: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementHoldAppliedEvent {
  static readonly eventName = 'settlement.hold.applied';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly holdReason: string,
    public readonly holdDuration: number, // in days
    public readonly appliedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SettlementHoldReleasedEvent {
  static readonly eventName = 'settlement.hold.released';
  
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly holdReason: string,
    public readonly releasedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}