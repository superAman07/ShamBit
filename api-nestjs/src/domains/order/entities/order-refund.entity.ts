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

export interface RefundItem {
  orderItemId: string;
  quantity: number;
  amount: number;
  reason: string;
}

export interface RefundMetadata {
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, any>;
  adminNotes?: string;
  customerNotes?: string;
  [key: string]: any;
}

export class OrderRefund {
  id: string;
  orderId: string;
  paymentId?: string;
  type: RefundType;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: string;
  items: RefundItem[];
  metadata: RefundMetadata;
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  gatewayRefundId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  constructor(data: Partial<OrderRefund>) {
    Object.assign(this, data);
  }

  static create(data: {
    orderId: string;
    paymentId?: string;
    type: RefundType;
    amount: number;
    currency: string;
    reason: string;
    items?: RefundItem[];
    metadata?: RefundMetadata;
    requestedBy: string;
  }): OrderRefund {
    return new OrderRefund({
      ...data,
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: RefundStatus.PENDING,
      requestedAt: new Date(),
      items: data.items || [],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.requestedBy,
    });
  }

  get isApproved(): boolean {
    return this.status === RefundStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this.status === RefundStatus.REJECTED;
  }

  get isCompleted(): boolean {
    return this.status === RefundStatus.COMPLETED;
  }

  get canBeApproved(): boolean {
    return this.status === RefundStatus.PENDING;
  }

  get canBeRejected(): boolean {
    return this.status === RefundStatus.PENDING;
  }

  approve(approvedBy: string): void {
    if (!this.canBeApproved) {
      throw new Error('Refund cannot be approved in current status');
    }

    this.status = RefundStatus.APPROVED;
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    this.updatedBy = approvedBy;
    this.updatedAt = new Date();
    this.version++;
  }

  reject(rejectedBy: string, reason: string): void {
    if (!this.canBeRejected) {
      throw new Error('Refund cannot be rejected in current status');
    }

    this.status = RefundStatus.REJECTED;
    this.rejectedBy = rejectedBy;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.updatedBy = rejectedBy;
    this.updatedAt = new Date();
    this.version++;
  }

  updateStatus(
    newStatus: RefundStatus,
    updatedBy: string,
    reason?: string,
  ): void {
    this.status = newStatus;
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;

    const now = new Date();

    switch (newStatus) {
      case RefundStatus.PROCESSING:
        this.processedAt = now;
        break;
      case RefundStatus.COMPLETED:
        this.completedAt = now;
        break;
      case RefundStatus.FAILED:
        this.failedAt = now;
        this.failureReason = reason;
        break;
    }
  }
}
