// ============================================================================
// SETTLEMENT EVENTS
// ============================================================================

export class SettlementCreatedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly metadata?: any
  ) {}
}

export class SettlementProcessingStartedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly processedBy: string,
    public readonly metadata?: any
  ) {}
}

export class SettlementCompletedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly razorpayPayoutId?: string,
    public readonly completedAt?: Date,
    public readonly metadata?: any
  ) {}
}

export class SettlementFailedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly failureReason: string,
    public readonly failureCode?: string,
    public readonly retryCount?: number,
    public readonly metadata?: any
  ) {}
}

export class SettlementCancelledEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly netAmount: number,
    public readonly cancelledBy: string,
    public readonly reason?: string,
    public readonly metadata?: any
  ) {}
}

export class SettlementReconciledEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly reconciledBy: string,
    public readonly reconciledAt: Date,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// WALLET EVENTS
// ============================================================================

export class WalletCreditedEvent {
  constructor(
    public readonly walletId: string,
    public readonly sellerId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly category: string,
    public readonly balanceAfter: number,
    public readonly referenceId?: string,
    public readonly metadata?: any
  ) {}
}

export class WalletDebitedEvent {
  constructor(
    public readonly walletId: string,
    public readonly sellerId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly category: string,
    public readonly balanceAfter: number,
    public readonly referenceId?: string,
    public readonly metadata?: any
  ) {}
}

export class WalletBalanceUpdatedEvent {
  constructor(
    public readonly walletId: string,
    public readonly sellerId: string,
    public readonly previousBalance: number,
    public readonly newBalance: number,
    public readonly changeAmount: number,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// SELLER ACCOUNT EVENTS
// ============================================================================

export class SellerAccountCreatedEvent {
  constructor(
    public readonly accountId: string,
    public readonly sellerId: string,
    public readonly bankName: string,
    public readonly accountType: string,
    public readonly metadata?: any
  ) {}
}

export class SellerAccountVerifiedEvent {
  constructor(
    public readonly accountId: string,
    public readonly sellerId: string,
    public readonly verifiedBy: string,
    public readonly verifiedAt: Date,
    public readonly metadata?: any
  ) {}
}

export class SellerAccountRejectedEvent {
  constructor(
    public readonly accountId: string,
    public readonly sellerId: string,
    public readonly rejectedBy: string,
    public readonly reason: string,
    public readonly metadata?: any
  ) {}
}

export class SellerAccountSuspendedEvent {
  constructor(
    public readonly accountId: string,
    public readonly sellerId: string,
    public readonly suspendedBy: string,
    public readonly reason?: string,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// PAYOUT EVENTS
// ============================================================================

export class PayoutInitiatedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly razorpayPayoutId?: string,
    public readonly metadata?: any
  ) {}
}

export class PayoutProcessedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly razorpayPayoutId: string,
    public readonly status: string,
    public readonly processedAt: Date,
    public readonly metadata?: any
  ) {}
}

export class PayoutFailedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly razorpayPayoutId: string,
    public readonly failureReason: string,
    public readonly failureCode?: string,
    public readonly metadata?: any
  ) {}
}

export class PayoutReversedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly sellerId: string,
    public readonly razorpayPayoutId: string,
    public readonly reversalReason: string,
    public readonly reversedAt: Date,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// COMMISSION EVENTS
// ============================================================================

export class CommissionCalculatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderItemId: string,
    public readonly sellerId: string,
    public readonly grossAmount: number,
    public readonly commissionRate: number,
    public readonly commissionAmount: number,
    public readonly ruleId?: string,
    public readonly metadata?: any
  ) {}
}

export class CommissionRuleCreatedEvent {
  constructor(
    public readonly ruleId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly entityType: string,
    public readonly entityId?: string,
    public readonly rate?: number,
    public readonly metadata?: any
  ) {}
}

export class CommissionRuleUpdatedEvent {
  constructor(
    public readonly ruleId: string,
    public readonly changes: any,
    public readonly updatedBy: string,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// BATCH PROCESSING EVENTS
// ============================================================================

export class SettlementBatchStartedEvent {
  constructor(
    public readonly batchId: string,
    public readonly jobId: string,
    public readonly totalItems: number,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly metadata?: any
  ) {}
}

export class SettlementBatchCompletedEvent {
  constructor(
    public readonly batchId: string,
    public readonly jobId: string,
    public readonly totalItems: number,
    public readonly successfulItems: number,
    public readonly failedItems: number,
    public readonly duration: number,
    public readonly metadata?: any
  ) {}
}

export class SettlementBatchFailedEvent {
  constructor(
    public readonly batchId: string,
    public readonly jobId: string,
    public readonly errorMessage: string,
    public readonly processedItems: number,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// RECONCILIATION EVENTS
// ============================================================================

export class ReconciliationStartedEvent {
  constructor(
    public readonly jobId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly totalSettlements: number,
    public readonly metadata?: any
  ) {}
}

export class ReconciliationCompletedEvent {
  constructor(
    public readonly jobId: string,
    public readonly reconciledCount: number,
    public readonly discrepancyCount: number,
    public readonly duration: number,
    public readonly metadata?: any
  ) {}
}

export class ReconciliationDiscrepancyFoundEvent {
  constructor(
    public readonly settlementId: string,
    public readonly expectedAmount: number,
    public readonly actualAmount: number,
    public readonly discrepancyType: string,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export class SettlementAuditEvent {
  constructor(
    public readonly settlementId: string,
    public readonly action: string,
    public readonly userId?: string,
    public readonly userRole?: string,
    public readonly oldValues?: any,
    public readonly newValues?: any,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly metadata?: any
  ) {}
}

export class WalletAuditEvent {
  constructor(
    public readonly walletId: string,
    public readonly sellerId: string,
    public readonly action: string,
    public readonly transactionId?: string,
    public readonly amount?: number,
    public readonly userId?: string,
    public readonly metadata?: any
  ) {}
}

export class SellerAccountAuditEvent {
  constructor(
    public readonly accountId: string,
    public readonly sellerId: string,
    public readonly action: string,
    public readonly userId?: string,
    public readonly userRole?: string,
    public readonly changes?: any,
    public readonly metadata?: any
  ) {}
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export class SettlementNotificationEvent {
  constructor(
    public readonly type: 'SETTLEMENT_COMPLETED' | 'SETTLEMENT_FAILED' | 'PAYOUT_PROCESSED',
    public readonly sellerId: string,
    public readonly settlementId: string,
    public readonly amount?: number,
    public readonly message?: string,
    public readonly metadata?: any
  ) {}
}

export class WalletNotificationEvent {
  constructor(
    public readonly type: 'WALLET_CREDITED' | 'WALLET_DEBITED' | 'LOW_BALANCE',
    public readonly sellerId: string,
    public readonly walletId: string,
    public readonly amount?: number,
    public readonly balance?: number,
    public readonly message?: string,
    public readonly metadata?: any
  ) {}
}

export class AccountNotificationEvent {
  constructor(
    public readonly type: 'ACCOUNT_VERIFIED' | 'ACCOUNT_REJECTED' | 'KYC_REQUIRED',
    public readonly sellerId: string,
    public readonly accountId: string,
    public readonly message?: string,
    public readonly metadata?: any
  ) {}
}