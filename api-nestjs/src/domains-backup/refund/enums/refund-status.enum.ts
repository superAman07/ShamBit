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
  DEFECTIVE_PRODUCT = 'DEFECTIVE_PRODUCT',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED_SHIPPING = 'DAMAGED_SHIPPING',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  LATE_DELIVERY = 'LATE_DELIVERY',
  SELLER_CANCELLATION = 'SELLER_CANCELLATION',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  SYSTEM_INITIATED = 'SYSTEM_INITIATED',
  MERCHANT_INITIATED = 'MERCHANT_INITIATED',
  OTHER = 'OTHER',
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
  MERCHANT_ERROR = 'MERCHANT_ERROR',
  FRAUDULENT_TRANSACTION = 'FRAUDULENT_TRANSACTION',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  CHANGED_MIND = 'CHANGED_MIND',
  FOUND_BETTER_PRICE = 'FOUND_BETTER_PRICE',
  OTHER = 'OTHER',
}

export enum RefundReasonCode {
  // Customer-initiated
  CUST_001 = 'CUST_001', // Changed mind
  CUST_002 = 'CUST_002', // Found better price
  CUST_003 = 'CUST_003', // No longer needed
  CUST_004 = 'CUST_004', // Size/fit issue
  
  // Product issues
  PROD_001 = 'PROD_001', // Defective product
  PROD_002 = 'PROD_002', // Wrong item received
  PROD_003 = 'PROD_003', // Not as described
  PROD_004 = 'PROD_004', // Quality issue
  PROD_005 = 'PROD_005', // Damaged in shipping
  
  // Service issues
  SERV_001 = 'SERV_001', // Late delivery
  SERV_002 = 'SERV_002', // Poor customer service
  SERV_003 = 'SERV_003', // Merchant error
  
  // Payment issues
  PAY_001 = 'PAY_001', // Payment dispute
  PAY_002 = 'PAY_002', // Duplicate charge
  PAY_003 = 'PAY_003', // Fraudulent transaction
  
  // Other
  OTHER_001 = 'OTHER_001', // Other reason
}

export enum ItemCondition {
  NEW = 'NEW',
  USED = 'USED',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  OPENED = 'OPENED',
  MISSING_PARTS = 'MISSING_PARTS',
}

export enum RefundAuditAction {
  CREATE = 'CREATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PROCESS = 'PROCESS',
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  CANCEL = 'CANCEL',
  UPDATE = 'UPDATE',
}

export enum WebhookProcessingStatus {
  IGNORED = 'IGNORED',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum RefundJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
}

export enum RefundLedgerEntryType {
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',
  FEE_DEDUCTED = 'FEE_DEDUCTED',
  GATEWAY_FEE = 'GATEWAY_FEE',
  ADJUSTMENT_APPLIED = 'ADJUSTMENT_APPLIED',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  ADJUSTMENT = 'ADJUSTMENT',
  FEE = 'FEE',
  REVERSAL = 'REVERSAL',
}

export enum RefundAccountType {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  PLATFORM = 'PLATFORM',
  GATEWAY = 'GATEWAY',
  ESCROW = 'ESCROW',
}

export enum RefundJobType {
  PROCESS_REFUND = 'PROCESS_REFUND',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  SYNC_GATEWAY = 'SYNC_GATEWAY',
  RESTOCK_INVENTORY = 'RESTOCK_INVENTORY',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  CALCULATE_FEES = 'CALCULATE_FEES',
  GENERATE_CREDIT_NOTE = 'GENERATE_CREDIT_NOTE',
}

export enum RefundErrorCode {
  INVALID_ORDER = 'INVALID_ORDER',
  INSUFFICIENT_PAYMENT = 'INSUFFICIENT_PAYMENT',
  REFUND_WINDOW_EXPIRED = 'REFUND_WINDOW_EXPIRED',
  ALREADY_REFUNDED = 'ALREADY_REFUNDED',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export function getRefundErrorMessage(code: RefundErrorCode): string {
  const messages: Record<RefundErrorCode, string> = {
    [RefundErrorCode.INVALID_ORDER]: 'Order is not valid for refund',
    [RefundErrorCode.INSUFFICIENT_PAYMENT]: 'Insufficient payment amount for refund',
    [RefundErrorCode.REFUND_WINDOW_EXPIRED]: 'Refund window has expired',
    [RefundErrorCode.ALREADY_REFUNDED]: 'Order has already been refunded',
    [RefundErrorCode.GATEWAY_ERROR]: 'Payment gateway error',
    [RefundErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for refund',
    [RefundErrorCode.INVALID_AMOUNT]: 'Invalid refund amount',
    [RefundErrorCode.PROCESSING_ERROR]: 'Error processing refund',
    [RefundErrorCode.NETWORK_ERROR]: 'Network connection error',
    [RefundErrorCode.TIMEOUT_ERROR]: 'Request timeout error',
    [RefundErrorCode.UNKNOWN_ERROR]: 'Unknown error occurred',
  };

  return messages[code] || 'Unknown error';
}

export function getRefundPriority(refundType: RefundType, refundAmount: number): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  // Urgent priority for high-value refunds
  if (refundAmount > 10000) {
    return 'URGENT';
  }

  // High priority for full refunds or high amounts
  if (refundType === RefundType.FULL || refundAmount > 5000) {
    return 'HIGH';
  }

  // Normal priority for partial refunds
  if (refundType === RefundType.PARTIAL) {
    return 'NORMAL';
  }

  return 'LOW';
}

export function canTransitionRefundStatus(from: RefundStatus, to: RefundStatus): boolean {
  const transitions: Record<RefundStatus, RefundStatus[]> = {
    [RefundStatus.PENDING]: [RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.CANCELLED],
    [RefundStatus.APPROVED]: [RefundStatus.PROCESSING, RefundStatus.CANCELLED],
    [RefundStatus.REJECTED]: [],
    [RefundStatus.PROCESSING]: [RefundStatus.COMPLETED, RefundStatus.FAILED],
    [RefundStatus.COMPLETED]: [],
    [RefundStatus.FAILED]: [RefundStatus.PROCESSING],
    [RefundStatus.CANCELLED]: [],
  };

  return transitions[from]?.includes(to) || false;
}

export function shouldRequireApproval(
  refundAmount: number,
  refundReason: RefundReason,
  refundType: RefundType,
  autoApprovalLimit?: number
): boolean {
  // Default auto-approval limit (in paise/cents)
  const defaultLimit = autoApprovalLimit || 500000; // 5000 INR or $50

  // High-risk reasons always require approval
  const highRiskReasons = [
    RefundReason.FRAUDULENT_TRANSACTION,
    RefundReason.PAYMENT_DISPUTE,
    RefundReason.DUPLICATE_ORDER,
  ];

  if (highRiskReasons.includes(refundReason)) {
    return true;
  }

  // Full refunds above limit require approval
  if (refundType === RefundType.FULL && refundAmount > defaultLimit) {
    return true;
  }

  // Large partial refunds require approval
  if (refundType === RefundType.PARTIAL && refundAmount > defaultLimit * 0.8) {
    return true;
  }

  return false;
}