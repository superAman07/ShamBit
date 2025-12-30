// ============================================================================
// SETTLEMENT STATUS ENUMS
// ============================================================================

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SellerAccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum KycStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum SettlementJobType {
  BATCH_SETTLEMENT = 'BATCH_SETTLEMENT',
  INDIVIDUAL_SETTLEMENT = 'INDIVIDUAL_SETTLEMENT',
  RECONCILIATION = 'RECONCILIATION',
}

export enum SettlementJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTransactionCategory {
  SALE = 'SALE',
  COMMISSION = 'COMMISSION',
  FEE = 'FEE',
  TAX = 'TAX',
  REFUND = 'REFUND',
  SETTLEMENT = 'SETTLEMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MANUAL = 'MANUAL',
}

export enum CommissionRuleType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  TIERED = 'TIERED',
}

export enum CommissionEntityType {
  GLOBAL = 'GLOBAL',
  CATEGORY = 'CATEGORY',
  SELLER = 'SELLER',
  PRODUCT = 'PRODUCT',
}

// ============================================================================
// STATUS TRANSITION RULES
// ============================================================================

export const SettlementStatusTransitions: Record<SettlementStatus, SettlementStatus[]> = {
  [SettlementStatus.PENDING]: [
    SettlementStatus.PROCESSING,
    SettlementStatus.CANCELLED,
  ],
  [SettlementStatus.PROCESSING]: [
    SettlementStatus.COMPLETED,
    SettlementStatus.FAILED,
  ],
  [SettlementStatus.COMPLETED]: [], // Terminal state
  [SettlementStatus.FAILED]: [
    SettlementStatus.PROCESSING, // Retry
    SettlementStatus.CANCELLED,
  ],
  [SettlementStatus.CANCELLED]: [], // Terminal state
};

export const SettlementJobStatusTransitions: Record<SettlementJobStatus, SettlementJobStatus[]> = {
  [SettlementJobStatus.PENDING]: [
    SettlementJobStatus.RUNNING,
    SettlementJobStatus.FAILED,
  ],
  [SettlementJobStatus.RUNNING]: [
    SettlementJobStatus.COMPLETED,
    SettlementJobStatus.FAILED,
  ],
  [SettlementJobStatus.COMPLETED]: [], // Terminal state
  [SettlementJobStatus.FAILED]: [], // Terminal state
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function canTransitionSettlementStatus(
  from: SettlementStatus,
  to: SettlementStatus
): boolean {
  return SettlementStatusTransitions[from]?.includes(to) ?? false;
}

export function canTransitionJobStatus(
  from: SettlementJobStatus,
  to: SettlementJobStatus
): boolean {
  return SettlementJobStatusTransitions[from]?.includes(to) ?? false;
}

export function isSettlementTerminal(status: SettlementStatus): boolean {
  return [SettlementStatus.COMPLETED, SettlementStatus.CANCELLED].includes(status);
}

export function isJobTerminal(status: SettlementJobStatus): boolean {
  return [SettlementJobStatus.COMPLETED, SettlementJobStatus.FAILED].includes(status);
}

export function isSettlementProcessable(status: SettlementStatus): boolean {
  return [SettlementStatus.PENDING, SettlementStatus.FAILED].includes(status);
}