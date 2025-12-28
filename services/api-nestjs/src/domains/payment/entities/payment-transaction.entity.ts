export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  transactionId: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  type: string; // PAYMENT, REFUND, PARTIAL_REFUND, CHARGEBACK
  status: string; // PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELED, DISPUTED
  paymentMethod: any; // JSON object with payment method details
  gatewayResponse: any; // JSON object with gateway response
  gatewayFees: number;
  failureCode?: string;
  failureMessage?: string;
  processedAt?: Date;
  settledAt?: Date;
  reconciled: boolean;
  reconciledAt?: Date;
  metadata: any; // JSON object
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentTransactionEntity implements PaymentTransaction {
  id: string;
  paymentIntentId: string;
  transactionId: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  paymentMethod: any;
  gatewayResponse: any;
  gatewayFees: number;
  failureCode?: string;
  failureMessage?: string;
  processedAt?: Date;
  settledAt?: Date;
  reconciled: boolean;
  reconciledAt?: Date;
  metadata: any;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PaymentTransaction) {
    Object.assign(this, data);
  }

  isSuccessful(): boolean {
    return this.status === 'SUCCEEDED';
  }

  isFailed(): boolean {
    return this.status === 'FAILED';
  }

  isPending(): boolean {
    return this.status === 'PENDING' || this.status === 'PROCESSING';
  }

  canBeRefunded(): boolean {
    return this.isSuccessful() && this.type === 'PAYMENT';
  }

  getDisplayAmount(): string {
    return `${(this.amount / 100).toFixed(2)} ${this.currency}`;
  }
}