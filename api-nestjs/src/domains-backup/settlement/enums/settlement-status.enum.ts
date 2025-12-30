// ============================================================================
// SETTLEMENT STATUS ENUMS
// ============================================================================

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
}

export enum SettlementJobType {
  CALCULATE_SETTLEMENT = 'CALCULATE_SETTLEMENT',
  PROCESS_SETTLEMENT = 'PROCESS_SETTLEMENT',
  SYNC_GATEWAY_SETTLEMENTS = 'SYNC_GATEWAY_SETTLEMENTS',
}

export enum SettlementJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

// ============================================================================
// SELLER ACCOUNT STATUS ENUMS
// ============================================================================

export enum SellerAccountStatus {
  CREATED = 'CREATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVATED = 'ACTIVATED',
  NEEDS_CLARIFICATION = 'NEEDS_CLARIFICATION',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum KycStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

// ============================================================================
// SETTLEMENT FREQUENCY ENUMS
// ============================================================================

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// ============================================================================
// BUSINESS TYPE ENUMS
// ============================================================================

export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  PARTNERSHIP = 'PARTNERSHIP',
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  PUBLIC_LIMITED = 'PUBLIC_LIMITED',
  LLP = 'LLP',
  TRUST = 'TRUST',
  SOCIETY = 'SOCIETY',
  NGO = 'NGO',
}

// ============================================================================
// BANK ACCOUNT TYPE ENUMS
// ============================================================================

export enum BankAccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  OVERDRAFT = 'OVERDRAFT',
}

// ============================================================================
// SETTLEMENT AUDIT ACTION ENUMS
// ============================================================================

export enum SettlementAuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  UPDATE_STATUS = 'UPDATE_STATUS',
  PROCESS = 'PROCESS',
  FAIL = 'FAIL',
  RETRY = 'RETRY',
  CANCEL = 'CANCEL',
  CREATE_SELLER_ACCOUNT = 'CREATE_SELLER_ACCOUNT',
  UPDATE_SELLER_ACCOUNT = 'UPDATE_SELLER_ACCOUNT',
  UPDATE_SELLER_ACCOUNT_STATUS = 'UPDATE_SELLER_ACCOUNT_STATUS',
  UPDATE_SETTLEMENT_SCHEDULE = 'UPDATE_SETTLEMENT_SCHEDULE',
}

// ============================================================================
// RISK PROFILE ENUMS
// ============================================================================

export enum RiskProfile {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// ============================================================================
// SELLER TIER ENUMS
// ============================================================================

export enum SellerTier {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

// ============================================================================
// SETTLEMENT ERROR CODES
// ============================================================================

export enum SettlementErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_BANK_ACCOUNT = 'INVALID_BANK_ACCOUNT',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  KYC_VERIFICATION_REQUIRED = 'KYC_VERIFICATION_REQUIRED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  SETTLEMENT_LIMIT_EXCEEDED = 'SETTLEMENT_LIMIT_EXCEEDED',
  HOLD_PERIOD_NOT_MET = 'HOLD_PERIOD_NOT_MET',
  DUPLICATE_SETTLEMENT = 'DUPLICATE_SETTLEMENT',
  INVALID_SETTLEMENT_PERIOD = 'INVALID_SETTLEMENT_PERIOD',
  NO_TRANSACTIONS_FOUND = 'NO_TRANSACTIONS_FOUND',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function canTransitionSettlementStatus(
  currentStatus: SettlementStatus,
  newStatus: SettlementStatus
): boolean {
  const validTransitions: Record<SettlementStatus, SettlementStatus[]> = {
    [SettlementStatus.PENDING]: [
      SettlementStatus.PROCESSING,
      SettlementStatus.FAILED,
    ],
    [SettlementStatus.PROCESSING]: [
      SettlementStatus.SETTLED,
      SettlementStatus.FAILED,
    ],
    [SettlementStatus.SETTLED]: [], // Terminal state
    [SettlementStatus.FAILED]: [
      SettlementStatus.PENDING, // Allow retry
    ],
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function canTransitionSellerAccountStatus(
  currentStatus: SellerAccountStatus,
  newStatus: SellerAccountStatus
): boolean {
  const validTransitions: Record<SellerAccountStatus, SellerAccountStatus[]> = {
    [SellerAccountStatus.CREATED]: [
      SellerAccountStatus.UNDER_REVIEW,
      SellerAccountStatus.NEEDS_CLARIFICATION,
      SellerAccountStatus.REJECTED,
    ],
    [SellerAccountStatus.UNDER_REVIEW]: [
      SellerAccountStatus.ACTIVATED,
      SellerAccountStatus.NEEDS_CLARIFICATION,
      SellerAccountStatus.REJECTED,
    ],
    [SellerAccountStatus.NEEDS_CLARIFICATION]: [
      SellerAccountStatus.UNDER_REVIEW,
      SellerAccountStatus.REJECTED,
    ],
    [SellerAccountStatus.ACTIVATED]: [
      SellerAccountStatus.SUSPENDED,
    ],
    [SellerAccountStatus.SUSPENDED]: [
      SellerAccountStatus.ACTIVATED,
      SellerAccountStatus.REJECTED,
    ],
    [SellerAccountStatus.REJECTED]: [], // Terminal state
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function canTransitionKycStatus(
  currentStatus: KycStatus,
  newStatus: KycStatus
): boolean {
  const validTransitions: Record<KycStatus, KycStatus[]> = {
    [KycStatus.PENDING]: [
      KycStatus.UNDER_REVIEW,
      KycStatus.REJECTED,
    ],
    [KycStatus.UNDER_REVIEW]: [
      KycStatus.VERIFIED,
      KycStatus.REJECTED,
      KycStatus.PENDING, // Back to pending if more info needed
    ],
    [KycStatus.VERIFIED]: [
      KycStatus.UNDER_REVIEW, // For re-verification
    ],
    [KycStatus.REJECTED]: [
      KycStatus.PENDING, // Allow resubmission
    ],
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function getSettlementStatusDisplayName(status: SettlementStatus): string {
  const displayNames: Record<SettlementStatus, string> = {
    [SettlementStatus.PENDING]: 'Pending',
    [SettlementStatus.PROCESSING]: 'Processing',
    [SettlementStatus.SETTLED]: 'Settled',
    [SettlementStatus.FAILED]: 'Failed',
  };

  return displayNames[status] || status;
}

export function getSellerAccountStatusDisplayName(status: SellerAccountStatus): string {
  const displayNames: Record<SellerAccountStatus, string> = {
    [SellerAccountStatus.CREATED]: 'Created',
    [SellerAccountStatus.UNDER_REVIEW]: 'Under Review',
    [SellerAccountStatus.ACTIVATED]: 'Activated',
    [SellerAccountStatus.NEEDS_CLARIFICATION]: 'Needs Clarification',
    [SellerAccountStatus.SUSPENDED]: 'Suspended',
    [SellerAccountStatus.REJECTED]: 'Rejected',
  };

  return displayNames[status] || status;
}

export function getKycStatusDisplayName(status: KycStatus): string {
  const displayNames: Record<KycStatus, string> = {
    [KycStatus.PENDING]: 'Pending',
    [KycStatus.UNDER_REVIEW]: 'Under Review',
    [KycStatus.VERIFIED]: 'Verified',
    [KycStatus.REJECTED]: 'Rejected',
  };

  return displayNames[status] || status;
}

export function isTerminalSettlementStatus(status: SettlementStatus): boolean {
  return status === SettlementStatus.SETTLED;
}

export function isTerminalSellerAccountStatus(status: SellerAccountStatus): boolean {
  return status === SellerAccountStatus.REJECTED;
}

export function isActiveSellerAccountStatus(status: SellerAccountStatus): boolean {
  return status === SellerAccountStatus.ACTIVATED;
}

export function isVerifiedKycStatus(status: KycStatus): boolean {
  return status === KycStatus.VERIFIED;
}

// ============================================================================
// SETTLEMENT PRIORITY ENUMS
// ============================================================================

export enum SettlementPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export function getSettlementPriority(
  amount: number,
  sellerTier: SellerTier,
  isManual: boolean = false
): SettlementPriority {
  // Manual settlements get higher priority
  if (isManual) {
    return SettlementPriority.HIGH;
  }

  // Large amounts get higher priority
  if (amount > 10000000) { // ₹1,00,000
    return SettlementPriority.HIGH;
  }

  if (amount > 5000000) { // ₹50,000
    return SettlementPriority.NORMAL;
  }

  // Enterprise sellers get higher priority
  if (sellerTier === SellerTier.ENTERPRISE) {
    return SettlementPriority.HIGH;
  }

  if (sellerTier === SellerTier.PREMIUM) {
    return SettlementPriority.NORMAL;
  }

  return SettlementPriority.LOW;
}