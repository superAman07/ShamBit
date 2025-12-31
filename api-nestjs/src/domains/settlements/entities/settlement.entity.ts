import {
  SettlementStatus,
  SettlementStatusTransitions,
  canTransitionSettlementStatus,
  isSettlementTerminal,
  isSettlementProcessable,
} from '../enums/settlement-status.enum';

export interface SettlementMetadata {
  batchId?: string;
  jobId?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export interface SettlementAmountBreakdown {
  grossAmount: number;
  commissionAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  adjustmentAmount: number;
  netAmount: number;
}

export interface RazorpaySettlementData {
  payoutId?: string;
  transferId?: string;
  response?: any;
}

export class Settlement {
  id: string;
  settlementId: string;
  sellerId: string;
  sellerAccountId: string;

  // Settlement Period
  periodStart: Date;
  periodEnd: Date;

  // Amount Breakdown
  grossAmount: number;
  commissionAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  currency: string;

  // Status & Lifecycle
  status: SettlementStatus;
  settlementDate?: Date;
  scheduledDate?: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;

  // Razorpay Integration
  razorpayPayoutId?: string;
  razorpayTransferId?: string;
  gatewayResponse?: any;

  // Failure Information
  failureReason?: string;
  failureCode?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;

  // Reconciliation
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: string;

  // Locking & Concurrency
  version: number;
  lockedAt?: Date;
  lockedBy?: string;

  // Metadata
  metadata: SettlementMetadata;
  notes?: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  transactions?: SettlementTransaction[];
  auditLogs?: SettlementAuditLog[];

  constructor(data: Partial<Settlement>) {
    Object.assign(this, data);
    this.metadata = this.metadata || {};
    this.retryCount = this.retryCount || 0;
    this.maxRetries = this.maxRetries || 3;
    this.version = this.version || 1;
    this.isReconciled = this.isReconciled || false;
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  canTransitionTo(newStatus: SettlementStatus): boolean {
    return canTransitionSettlementStatus(this.status, newStatus);
  }

  transitionTo(newStatus: SettlementStatus, userId: string): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid settlement status transition from ${this.status} to ${newStatus}`,
      );
    }

    const oldStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();

    // Update lifecycle timestamps
    switch (newStatus) {
      case SettlementStatus.PROCESSING:
        this.processedAt = new Date();
        break;
      case SettlementStatus.COMPLETED:
        this.completedAt = new Date();
        break;
      case SettlementStatus.FAILED:
        this.failedAt = new Date();
        break;
    }
  }

  // ============================================================================
  // BUSINESS LOGIC
  // ============================================================================

  isTerminal(): boolean {
    return isSettlementTerminal(this.status);
  }

  isProcessable(): boolean {
    return isSettlementProcessable(this.status);
  }

  canRetry(): boolean {
    return (
      this.status === SettlementStatus.FAILED &&
      this.retryCount < this.maxRetries
    );
  }

  shouldRetry(): boolean {
    return (
      this.canRetry() && (!this.nextRetryAt || this.nextRetryAt <= new Date())
    );
  }

  incrementRetryCount(): void {
    this.retryCount += 1;

    // Calculate exponential backoff: 2^retryCount hours
    const backoffHours = Math.pow(2, this.retryCount);
    this.nextRetryAt = new Date(Date.now() + backoffHours * 60 * 60 * 1000);
  }

  // ============================================================================
  // LOCKING MECHANISM
  // ============================================================================

  isLocked(): boolean {
    if (!this.lockedAt || !this.lockedBy) return false;

    // Lock expires after 30 minutes
    const lockExpiry = new Date(this.lockedAt.getTime() + 30 * 60 * 1000);
    return new Date() < lockExpiry;
  }

  lock(userId: string): void {
    if (this.isLocked()) {
      throw new Error(`Settlement is already locked by ${this.lockedBy}`);
    }

    this.lockedAt = new Date();
    this.lockedBy = userId;
    this.version += 1;
  }

  unlock(): void {
    this.lockedAt = undefined;
    this.lockedBy = undefined;
    this.version += 1;
  }

  // ============================================================================
  // AMOUNT CALCULATIONS
  // ============================================================================

  getAmountBreakdown(): SettlementAmountBreakdown {
    return {
      grossAmount: this.grossAmount,
      commissionAmount: this.commissionAmount,
      platformFeeAmount: this.platformFeeAmount,
      taxAmount: this.taxAmount,
      adjustmentAmount: this.adjustmentAmount,
      netAmount: this.netAmount,
    };
  }

  calculateNetAmount(): number {
    return (
      this.grossAmount -
      this.commissionAmount -
      this.platformFeeAmount -
      this.taxAmount +
      this.adjustmentAmount
    );
  }

  validateAmounts(): void {
    const calculatedNet = this.calculateNetAmount();

    if (Math.abs(calculatedNet - this.netAmount) > 0.01) {
      throw new Error(
        `Net amount mismatch: calculated ${calculatedNet}, stored ${this.netAmount}`,
      );
    }

    if (this.netAmount < 0) {
      throw new Error('Net settlement amount cannot be negative');
    }
  }

  // ============================================================================
  // RAZORPAY INTEGRATION
  // ============================================================================

  setRazorpayData(data: RazorpaySettlementData): void {
    this.razorpayPayoutId = data.payoutId;
    this.razorpayTransferId = data.transferId;
    this.gatewayResponse = data.response;
  }

  hasRazorpayData(): boolean {
    return !!(this.razorpayPayoutId || this.razorpayTransferId);
  }

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  markReconciled(userId: string): void {
    if (this.isReconciled) {
      throw new Error('Settlement is already reconciled');
    }

    this.isReconciled = true;
    this.reconciledAt = new Date();
    this.reconciledBy = userId;
  }

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  addTag(tag: string): void {
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }

    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.metadata.tags) {
      this.metadata.tags = this.metadata.tags.filter((t) => t !== tag);
    }
  }

  setCustomField(key: string, value: any): void {
    if (!this.metadata.customFields) {
      this.metadata.customFields = {};
    }

    this.metadata.customFields[key] = value;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate(): void {
    if (!this.sellerId) {
      throw new Error('Seller ID is required');
    }

    if (!this.sellerAccountId) {
      throw new Error('Seller account ID is required');
    }

    if (this.periodStart >= this.periodEnd) {
      throw new Error('Period start must be before period end');
    }

    if (this.grossAmount < 0) {
      throw new Error('Gross amount cannot be negative');
    }

    this.validateAmounts();
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  toJSON(): any {
    return {
      id: this.id,
      settlementId: this.settlementId,
      sellerId: this.sellerId,
      sellerAccountId: this.sellerAccountId,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      amountBreakdown: this.getAmountBreakdown(),
      currency: this.currency,
      status: this.status,
      settlementDate: this.settlementDate,
      scheduledDate: this.scheduledDate,
      processedAt: this.processedAt,
      completedAt: this.completedAt,
      failedAt: this.failedAt,
      razorpayData: {
        payoutId: this.razorpayPayoutId,
        transferId: this.razorpayTransferId,
      },
      failureInfo: {
        reason: this.failureReason,
        code: this.failureCode,
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
        nextRetryAt: this.nextRetryAt,
      },
      reconciliation: {
        isReconciled: this.isReconciled,
        reconciledAt: this.reconciledAt,
        reconciledBy: this.reconciledBy,
      },
      locking: {
        version: this.version,
        lockedAt: this.lockedAt,
        lockedBy: this.lockedBy,
        isLocked: this.isLocked(),
      },
      metadata: this.metadata,
      notes: this.notes,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ============================================================================
// RELATED ENTITIES
// ============================================================================

export interface SettlementTransaction {
  id: string;
  settlementId: string;
  referenceType: string;
  referenceId: string;
  orderId?: string;
  orderItemId?: string;
  paymentId?: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  description: string;
  transactionDate: Date;
  metadata: any;
  createdAt: Date;
}

export interface SettlementAuditLog {
  id: string;
  settlementId: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: any;
  createdAt: Date;
}
