import { PaymentStatus } from '../enums/order-status.enum';

export interface PaymentMetadata {
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  riskScore?: number;
  fraudCheck?: {
    status: 'PASSED' | 'FAILED' | 'REVIEW';
    score: number;
    rules: string[];
  };
  [key: string]: any;
}

export class OrderPayment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string; // 'CARD', 'BANK_TRANSFER', 'WALLET', 'COD'
  status: PaymentStatus;
  gatewayProvider: string; // 'STRIPE', 'PAYPAL', 'RAZORPAY', etc.
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  metadata: PaymentMetadata;
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  constructor(data: Partial<OrderPayment>) {
    Object.assign(this, data);
  }

  static create(data: {
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    gatewayProvider: string;
    metadata?: PaymentMetadata;
    createdBy: string;
  }): OrderPayment {
    return new OrderPayment({
      ...data,
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: PaymentStatus.PENDING,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get isSuccessful(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get canBeRefunded(): boolean {
    return this.status === PaymentStatus.COMPLETED && !this.refundedAt;
  }

  updateStatus(newStatus: PaymentStatus, updatedBy: string, reason?: string): void {
    this.status = newStatus;
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;

    const now = new Date();

    switch (newStatus) {
      case PaymentStatus.COMPLETED:
        this.processedAt = now;
        break;
      case PaymentStatus.FAILED:
        this.failedAt = now;
        this.failureReason = reason;
        break;
      case PaymentStatus.REFUNDED:
        this.refundedAt = now;
        this.refundReason = reason;
        break;
    }
  }

  processRefund(refundAmount: number, reason: string, updatedBy: string): void {
    if (!this.canBeRefunded) {
      throw new Error('Payment cannot be refunded');
    }

    if (refundAmount > this.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    this.refundAmount = refundAmount;
    this.refundReason = reason;
    this.refundedAt = new Date();
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;

    // If full refund, update status
    if (refundAmount === this.amount) {
      this.status = PaymentStatus.REFUNDED;
    }
  }
}