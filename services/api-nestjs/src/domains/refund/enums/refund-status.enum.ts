// ============================================================================
// REFUND STATUS ENUMS
// ============================================================================

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  ITEM_LEVEL = 'ITEM_LEVEL',
}

export enum RefundCategory {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  MERCHANT_INITIATED = 'MERCHANT_INITIATED',
  SYSTEM_INITIATED = 'SYSTEM_INITIATED',
  DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  DEFECTIVE_PRODUCT = 'DEFECTIVE_PRODUCT',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED_IN_SHIPPING = 'DAMAGED_IN_SHIPPING',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  SIZE_FIT_ISSUE = 'SIZE_FIT_ISSUE',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  LATE_DELIVERY = 'LATE_DELIVERY',
  ORDER_CANCELLATION = 'ORDER_CANCELLATION',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  FRAUDULENT_TRANSACTION = 'FRAUDULENT_TRANSACTION',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  MERCHANT_ERROR = 'MERCHANT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  GOODWILL_GESTURE = 'GOODWILL_GESTURE',
  OTHER = 'OTHER',
}

export enum RefundReasonCode {
  // Customer-initiated
  CUST_001 = 'CUST_001', // Changed mind
  CUST_002 = 'CUST_002', // Found better price
  CUST_003 = 'CUST_003', // No longer needed
  CUST_004 = 'CUST_004', // Ordered by mistake
  
  // Product issues
  PROD_001 = 'PROD_001', // Defective/faulty
  PROD_002 = 'PROD_002', // Wrong item sent
  PROD_003 = 'PROD_003', // Damaged in shipping
  PROD_004 = 'PROD_004', // Not as described
  PROD_005 = 'PROD_005', // Size/fit issue
  PROD_006 = 'PROD_006', // Quality below expectations
  PROD_007 = 'PROD_007', // Missing parts/accessories
  PROD_008 = 'PROD_008', // Expired product
  
  // Service issues
  SERV_001 = 'SERV_001', // Late delivery
  SERV_002 = 'SERV_002', // Poor packaging
  SERV_003 = 'SERV_003', // Delivery to wrong address
  SERV_004 = 'SERV_004', // Rude delivery person
  
  // System/Process issues
  SYS_001 = 'SYS_001', // Duplicate order
  SYS_002 = 'SYS_002', // Payment processing error
  SYS_003 = 'SYS_003', // Inventory error
  SYS_004 = 'SYS_004', // System malfunction
  
  // Fraud/Security
  FRAUD_001 = 'FRAUD_001', // Fraudulent transaction
  FRAUD_002 = 'FRAUD_002', // Unauthorized use
  FRAUD_003 = 'FRAUD_003', // Chargeback
  
  // Merchant-initiated
  MERCH_001 = 'MERCH_001', // Out of stock
  MERCH_002 = 'MERCH_002', // Pricing error
  MERCH_003 = 'MERCH_003', // Cannot fulfill
  MERCH_004 = 'MERCH_004', // Goodwill gesture
}

export enum RefundJobType {
  PROCESS_REFUND = 'PROCESS_REFUND',
  RESTOCK_INVENTORY = 'RESTOCK_INVENTORY',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  SYNC_GATEWAY = 'SYNC_GATEWAY',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  CALCULATE_FEES = 'CALCULATE_FEES',
  GENERATE_CREDIT_NOTE = 'GENERATE_CREDIT_NOTE',
}

export enum RefundJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export enum RefundLedgerEntryType {
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',
  FEE_DEDUCTED = 'FEE_DEDUCTED',
  ADJUSTMENT_APPLIED = 'ADJUSTMENT_APPLIED',
  GATEWAY_FEE = 'GATEWAY_FEE',
  RESTOCKING_FEE = 'RESTOCKING_FEE',
}

export enum RefundAccountType {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  PLATFORM = 'PLATFORM',
  GATEWAY = 'GATEWAY',
}

export enum RefundAuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PROCESS = 'PROCESS',
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  RETRY = 'RETRY',
  CANCEL = 'CANCEL',
  RESTOCK = 'RESTOCK',
  NOTIFY = 'NOTIFY',
}

export enum ItemCondition {
  NEW = 'NEW',
  USED = 'USED',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  OPENED = 'OPENED',
  MISSING_PARTS = 'MISSING_PARTS',
}

export enum RestockStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NOT_REQUIRED = 'NOT_REQUIRED',
  PARTIAL = 'PARTIAL',
}

// ============================================================================
// STATE MACHINE DEFINITIONS
// ============================================================================

export const RefundStatusTransitions: Record<RefundStatus, RefundStatus[]> = {
  [RefundStatus.PENDING]: [
    RefundStatus.APPROVED,
    RefundStatus.REJECTED,
    RefundStatus.CANCELLED,
  ],
  [RefundStatus.APPROVED]: [
    RefundStatus.PROCESSING,
    RefundStatus.CANCELLED,
  ],
  [RefundStatus.REJECTED]: [
    RefundStatus.PENDING, // Allow resubmission with changes
  ],
  [RefundStatus.PROCESSING]: [
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
  ],
  [RefundStatus.COMPLETED]: [], // Terminal state
  [RefundStatus.FAILED]: [
    RefundStatus.PROCESSING, // Allow retry
    RefundStatus.CANCELLED,
  ],
  [RefundStatus.CANCELLED]: [], // Terminal state
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function canTransitionRefundStatus(
  currentStatus: RefundStatus,
  newStatus: RefundStatus
): boolean {
  const validTransitions = RefundStatusTransitions[currentStatus] || [];
  return validTransitions.includes(newStatus);
}

export function getValidRefundTransitions(status: RefundStatus): RefundStatus[] {
  return RefundStatusTransitions[status] || [];
}

export function isRefundTerminal(status: RefundStatus): boolean {
  return [RefundStatus.COMPLETED, RefundStatus.CANCELLED].includes(status);
}

export function isRefundActive(status: RefundStatus): boolean {
  return [
    RefundStatus.PENDING,
    RefundStatus.APPROVED,
    RefundStatus.PROCESSING,
  ].includes(status);
}

export function isRefundProcessable(status: RefundStatus): boolean {
  return status === RefundStatus.APPROVED;
}

export function requiresApproval(status: RefundStatus): boolean {
  return status === RefundStatus.PENDING;
}

export function canRetry(status: RefundStatus): boolean {
  return status === RefundStatus.FAILED;
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

export function getRefundStatusDisplayName(status: RefundStatus): string {
  const displayNames: Record<RefundStatus, string> = {
    [RefundStatus.PENDING]: 'Pending Review',
    [RefundStatus.APPROVED]: 'Approved',
    [RefundStatus.REJECTED]: 'Rejected',
    [RefundStatus.PROCESSING]: 'Processing',
    [RefundStatus.COMPLETED]: 'Completed',
    [RefundStatus.FAILED]: 'Failed',
    [RefundStatus.CANCELLED]: 'Cancelled',
  };
  return displayNames[status] || status;
}

export function getRefundReasonDisplayName(reason: RefundReason): string {
  const displayNames: Record<RefundReason, string> = {
    [RefundReason.CUSTOMER_REQUEST]: 'Customer Request',
    [RefundReason.DEFECTIVE_PRODUCT]: 'Defective Product',
    [RefundReason.WRONG_ITEM]: 'Wrong Item Sent',
    [RefundReason.DAMAGED_IN_SHIPPING]: 'Damaged in Shipping',
    [RefundReason.NOT_AS_DESCRIBED]: 'Not as Described',
    [RefundReason.SIZE_FIT_ISSUE]: 'Size/Fit Issue',
    [RefundReason.QUALITY_ISSUE]: 'Quality Issue',
    [RefundReason.LATE_DELIVERY]: 'Late Delivery',
    [RefundReason.ORDER_CANCELLATION]: 'Order Cancellation',
    [RefundReason.DUPLICATE_ORDER]: 'Duplicate Order',
    [RefundReason.FRAUDULENT_TRANSACTION]: 'Fraudulent Transaction',
    [RefundReason.PAYMENT_DISPUTE]: 'Payment Dispute',
    [RefundReason.MERCHANT_ERROR]: 'Merchant Error',
    [RefundReason.SYSTEM_ERROR]: 'System Error',
    [RefundReason.POLICY_VIOLATION]: 'Policy Violation',
    [RefundReason.GOODWILL_GESTURE]: 'Goodwill Gesture',
    [RefundReason.OTHER]: 'Other',
  };
  return displayNames[reason] || reason;
}

// ============================================================================
// BUSINESS RULES
// ============================================================================

export function getRefundPriority(
  refundType: RefundType,
  amount: number,
  reason: RefundReason
): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  // Fraud cases get highest priority
  if (reason === RefundReason.FRAUDULENT_TRANSACTION || reason === RefundReason.PAYMENT_DISPUTE) {
    return 'URGENT';
  }

  // Large amounts get higher priority
  if (amount > 10000000) { // ₹1,00,000
    return 'HIGH';
  }

  // System errors get higher priority
  if (reason === RefundReason.SYSTEM_ERROR || reason === RefundReason.MERCHANT_ERROR) {
    return 'HIGH';
  }

  // Full refunds get normal priority
  if (refundType === RefundType.FULL) {
    return 'NORMAL';
  }

  return 'LOW';
}

export function shouldRequireApproval(
  amount: number,
  reason: RefundReason,
  refundType: RefundType,
  autoApprovalLimit?: number
): boolean {
  // Always require approval for fraud cases
  if (reason === RefundReason.FRAUDULENT_TRANSACTION || reason === RefundReason.PAYMENT_DISPUTE) {
    return true;
  }

  // Check auto-approval limit
  if (autoApprovalLimit && amount <= autoApprovalLimit) {
    return false;
  }

  // Full refunds above certain amount require approval
  if (refundType === RefundType.FULL && amount > 5000000) { // ₹50,000
    return true;
  }

  // System-initiated refunds don't require approval
  if (reason === RefundReason.SYSTEM_ERROR) {
    return false;
  }

  return true;
}

export function calculateRefundFees(
  amount: number,
  feePercent: number = 0,
  feeFixed: number = 0,
  restockingFee: number = 0
): {
  refundFee: number;
  restockingFee: number;
  totalFees: number;
  netRefundAmount: number;
} {
  const refundFee = Math.round((amount * feePercent) / 100) + feeFixed;
  const totalFees = refundFee + restockingFee;
  const netRefundAmount = amount - totalFees;

  return {
    refundFee,
    restockingFee,
    totalFees,
    netRefundAmount: Math.max(0, netRefundAmount),
  };
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum RefundErrorCode {
  REFUND_NOT_ELIGIBLE = 'REFUND_NOT_ELIGIBLE',
  REFUND_WINDOW_EXPIRED = 'REFUND_WINDOW_EXPIRED',
  INSUFFICIENT_PAYMENT = 'INSUFFICIENT_PAYMENT',
  ALREADY_REFUNDED = 'ALREADY_REFUNDED',
  PARTIAL_REFUND_EXCEEDS_PAYMENT = 'PARTIAL_REFUND_EXCEEDS_PAYMENT',
  INVALID_REFUND_AMOUNT = 'INVALID_REFUND_AMOUNT',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  PAYMENT_NOT_CAPTURED = 'PAYMENT_NOT_CAPTURED',
  REFUND_LIMIT_EXCEEDED = 'REFUND_LIMIT_EXCEEDED',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  INVENTORY_RESTOCK_FAILED = 'INVENTORY_RESTOCK_FAILED',
  DUPLICATE_REFUND_REQUEST = 'DUPLICATE_REFUND_REQUEST',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export function getRefundErrorMessage(errorCode: RefundErrorCode): string {
  const errorMessages: Record<RefundErrorCode, string> = {
    [RefundErrorCode.REFUND_NOT_ELIGIBLE]: 'This order is not eligible for refund',
    [RefundErrorCode.REFUND_WINDOW_EXPIRED]: 'Refund window has expired for this order',
    [RefundErrorCode.INSUFFICIENT_PAYMENT]: 'Insufficient payment amount for refund',
    [RefundErrorCode.ALREADY_REFUNDED]: 'This order has already been refunded',
    [RefundErrorCode.PARTIAL_REFUND_EXCEEDS_PAYMENT]: 'Refund amount exceeds available payment',
    [RefundErrorCode.INVALID_REFUND_AMOUNT]: 'Invalid refund amount specified',
    [RefundErrorCode.GATEWAY_ERROR]: 'Payment gateway error occurred',
    [RefundErrorCode.PAYMENT_NOT_CAPTURED]: 'Payment has not been captured yet',
    [RefundErrorCode.REFUND_LIMIT_EXCEEDED]: 'Refund limit exceeded',
    [RefundErrorCode.INVALID_ORDER_STATUS]: 'Order status does not allow refund',
    [RefundErrorCode.INVENTORY_RESTOCK_FAILED]: 'Failed to restock inventory',
    [RefundErrorCode.DUPLICATE_REFUND_REQUEST]: 'Duplicate refund request detected',
    [RefundErrorCode.POLICY_VIOLATION]: 'Refund violates policy rules',
    [RefundErrorCode.APPROVAL_REQUIRED]: 'Refund requires approval',
    [RefundErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this action',
    [RefundErrorCode.NETWORK_ERROR]: 'Network error occurred',
    [RefundErrorCode.TIMEOUT_ERROR]: 'Request timed out',
    [RefundErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
  };
  return errorMessages[errorCode] || 'Unknown error';
}