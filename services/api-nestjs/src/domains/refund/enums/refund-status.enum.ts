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

export enum RefundJobType {
  PROCESS_REFUND = 'PROCESS_REFUND',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  SYNC_GATEWAY = 'SYNC_GATEWAY',
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
  };

  return messages[code] || 'Unknown error';
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