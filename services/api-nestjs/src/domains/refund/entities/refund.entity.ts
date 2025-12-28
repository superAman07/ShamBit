import { RefundStatus, RefundType, RefundCategory, RefundReason, RefundReasonCode } from '../enums/refund-status.enum';

export class Refund {
  id: string;
  refundId: string;
  refundNumber: string;
  
  // Associations
  orderId: string;
  paymentIntentId?: string;
  paymentTransactionId?: string;
  
  // Type & Classification
  refundType: RefundType;
  refundCategory: RefundCategory;
  
  // Amounts (in paise/cents)
  requestedAmount: number;
  approvedAmount: number;
  processedAmount?: number;
  currency: string;
  
  // Reason & Details
  reason: RefundReason;
  reasonCode?: RefundReasonCode;
  description?: string;
  customerNotes?: string;
  merchantNotes?: string;
  
  // Status & Lifecycle
  status: RefundStatus;
  
  // Approval Workflow
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  // Gateway Integration
  gatewayProvider: string;
  gatewayRefundId?: string;
  gatewayResponse: any;
  
  // Processing Details
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // Failure Information
  failureCode?: string;
  failureMessage?: string;
  failureReason?: string;
  
  // Retry Logic
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Idempotency
  idempotencyKey: string;
  
  // Eligibility & Validation
  eligibilityChecked: boolean;
  eligibilityResult?: any;
  
  // Inventory Impact
  restockRequired: boolean;
  restockCompleted: boolean;
  restockJobId?: string;
  
  // Financial Impact
  refundFees: number;
  adjustmentAmount: number;
  
  // Metadata & Context
  metadata: any;
  tags: string[];
  
  // Audit Trail
  auditTrail: any[];
  
  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (populated when needed)
  order?: any;
  paymentIntent?: any;
  paymentTransaction?: any;
  items?: RefundItem[];
  ledgerEntries?: RefundLedgerEntry[];
  auditLogs?: RefundAuditLog[];
  
  constructor(data: Partial<Refund>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // BUSINESS METHODS
  // ============================================================================
  
  isTerminal(): boolean {
    return [RefundStatus.COMPLETED, RefundStatus.CANCELLED].includes(this.status);
  }
  
  isActive(): boolean {
    return [
      RefundStatus.PENDING,
      RefundStatus.APPROVED,
      RefundStatus.PROCESSING,
    ].includes(this.status);
  }
  
  canBeApproved(): boolean {
    return this.status === RefundStatus.PENDING;
  }
  
  canBeRejected(): boolean {
    return this.status === RefundStatus.PENDING;
  }
  
  canBeProcessed(): boolean {
    return this.status === RefundStatus.APPROVED;
  }
  
  canBeRetried(): boolean {
    return this.status === RefundStatus.FAILED && this.retryCount < this.maxRetries;
  }
  
  canBeCancelled(): boolean {
    return [RefundStatus.PENDING, RefundStatus.APPROVED].includes(this.status);
  }
  
  isFullRefund(): boolean {
    return this.refundType === RefundType.FULL;
  }
  
  isPartialRefund(): boolean {
    return this.refundType === RefundType.PARTIAL;
  }
  
  isItemLevelRefund(): boolean {
    return this.refundType === RefundType.ITEM_LEVEL;
  }
  
  getNetRefundAmount(): number {
    return Math.max(0, this.approvedAmount - this.refundFees - this.adjustmentAmount);
  }
  
  getTotalFees(): number {
    return this.refundFees + this.adjustmentAmount;
  }
  
  getProcessingTimeInMinutes(): number | null {
    if (!this.processedAt || !this.createdAt) {
      return null;
    }
    return Math.floor((this.processedAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }
  
  getApprovalTimeInMinutes(): number | null {
    if (!this.approvedAt || !this.createdAt) {
      return null;
    }
    return Math.floor((this.approvedAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }
  
  addAuditEntry(action: string, userId: string, oldValues?: any, newValues?: any, reason?: string): void {
    const auditEntry = {
      action,
      userId,
      oldValues,
      newValues,
      reason,
      timestamp: new Date(),
    };
    
    if (!this.auditTrail) {
      this.auditTrail = [];
    }
    
    this.auditTrail.push(auditEntry);
  }
  
  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }
  
  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }
  
  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }
  
  updateMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }
  
  getMetadata(key: string): any {
    return this.metadata ? this.metadata[key] : undefined;
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validateRefundAmount(maxAmount: number): boolean {
    return this.requestedAmount > 0 && this.requestedAmount <= maxAmount;
  }
  
  validateApprovalAmount(maxAmount: number): boolean {
    return this.approvedAmount > 0 && this.approvedAmount <= maxAmount;
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  toJSON(): any {
    return {
      id: this.id,
      refundId: this.refundId,
      refundNumber: this.refundNumber,
      orderId: this.orderId,
      paymentIntentId: this.paymentIntentId,
      paymentTransactionId: this.paymentTransactionId,
      refundType: this.refundType,
      refundCategory: this.refundCategory,
      requestedAmount: this.requestedAmount,
      approvedAmount: this.approvedAmount,
      processedAmount: this.processedAmount,
      currency: this.currency,
      reason: this.reason,
      reasonCode: this.reasonCode,
      description: this.description,
      customerNotes: this.customerNotes,
      merchantNotes: this.merchantNotes,
      status: this.status,
      requiresApproval: this.requiresApproval,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      rejectedBy: this.rejectedBy,
      rejectedAt: this.rejectedAt,
      rejectionReason: this.rejectionReason,
      gatewayProvider: this.gatewayProvider,
      gatewayRefundId: this.gatewayRefundId,
      processedAt: this.processedAt,
      completedAt: this.completedAt,
      failedAt: this.failedAt,
      failureCode: this.failureCode,
      failureMessage: this.failureMessage,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      nextRetryAt: this.nextRetryAt,
      idempotencyKey: this.idempotencyKey,
      eligibilityChecked: this.eligibilityChecked,
      restockRequired: this.restockRequired,
      restockCompleted: this.restockCompleted,
      refundFees: this.refundFees,
      adjustmentAmount: this.adjustmentAmount,
      netRefundAmount: this.getNetRefundAmount(),
      totalFees: this.getTotalFees(),
      metadata: this.metadata,
      tags: this.tags,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Include relations if populated
      ...(this.order && { order: this.order }),
      ...(this.items && { items: this.items }),
      ...(this.ledgerEntries && { ledgerEntries: this.ledgerEntries }),
    };
  }
}

export class RefundItem {
  id: string;
  refundId: string;
  orderItemId: string;
  
  // Item Details (Snapshot)
  variantId: string;
  productId: string;
  sellerId: string;
  sku: string;
  productName: string;
  variantName?: string;
  
  // Refund Quantity & Amount
  requestedQuantity: number;
  approvedQuantity: number;
  unitPrice: number;
  totalAmount: number;
  
  // Item-specific Reason
  reason?: string;
  reasonCode?: RefundReasonCode;
  condition?: string;
  
  // Inventory Impact
  restockQuantity: number;
  restockStatus: string;
  
  // Item Snapshot
  itemSnapshot: any;
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
  
  constructor(data: Partial<RefundItem>) {
    Object.assign(this, data);
  }
  
  isFullyApproved(): boolean {
    return this.approvedQuantity === this.requestedQuantity;
  }
  
  isPartiallyApproved(): boolean {
    return this.approvedQuantity > 0 && this.approvedQuantity < this.requestedQuantity;
  }
  
  isRestockRequired(): boolean {
    return this.restockQuantity > 0;
  }
  
  isRestockCompleted(): boolean {
    return this.restockStatus === 'COMPLETED';
  }
  
  getApprovalPercentage(): number {
    return this.requestedQuantity > 0 ? (this.approvedQuantity / this.requestedQuantity) * 100 : 0;
  }
}

export class RefundLedgerEntry {
  id: string;
  refundId: string;
  entryType: string;
  amount: number;
  currency: string;
  accountType: string;
  accountId?: string;
  description: string;
  reference?: string;
  runningBalance?: number;
  metadata: any;
  createdBy: string;
  createdAt: Date;
  
  constructor(data: Partial<RefundLedgerEntry>) {
    Object.assign(this, data);
  }
  
  isDebit(): boolean {
    return this.amount < 0;
  }
  
  isCredit(): boolean {
    return this.amount > 0;
  }
  
  getAbsoluteAmount(): number {
    return Math.abs(this.amount);
  }
}

export class RefundAuditLog {
  id: string;
  refundId: string;
  action: string;
  userId: string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  
  constructor(data: Partial<RefundAuditLog>) {
    Object.assign(this, data);
  }
  
  getChanges(): Record<string, { from: any; to: any }> {
    if (!this.oldValues || !this.newValues) {
      return {};
    }
    
    const changes: Record<string, { from: any; to: any }> = {};
    
    for (const key in this.newValues) {
      if (this.oldValues[key] !== this.newValues[key]) {
        changes[key] = {
          from: this.oldValues[key],
          to: this.newValues[key],
        };
      }
    }
    
    return changes;
  }
}