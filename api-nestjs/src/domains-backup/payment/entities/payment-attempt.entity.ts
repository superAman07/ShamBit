export interface PaymentAttempt {
  id: string;
  paymentIntentId: string;
  attemptNumber: number;
  idempotencyKey: string;
  gatewayProvider: string;
  gatewayAttemptId?: string;
  status: string; // INITIATED, PROCESSING, SUCCEEDED, FAILED, ABANDONED
  errorCode?: string;
  errorMessage?: string;
  errorType?: string; // CARD_ERROR, RATE_LIMIT_ERROR, INVALID_REQUEST_ERROR, etc.
  isRetry: boolean;
  retryAfter?: Date;
  startedAt: Date;
  completedAt?: Date;
  gatewayResponse: any; // JSON object
  metadata: any; // JSON object
  createdBy: string;
  createdAt: Date;
}

export class PaymentAttemptEntity implements PaymentAttempt {
  id: string;
  paymentIntentId: string;
  attemptNumber: number;
  idempotencyKey: string;
  gatewayProvider: string;
  gatewayAttemptId?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  errorType?: string;
  isRetry: boolean;
  retryAfter?: Date;
  startedAt: Date;
  completedAt?: Date;
  gatewayResponse: any;
  metadata: any;
  createdBy: string;
  createdAt: Date;

  constructor(data: PaymentAttempt) {
    Object.assign(this, data);
  }

  isSuccessful(): boolean {
    return this.status === 'SUCCEEDED';
  }

  isFailed(): boolean {
    return this.status === 'FAILED';
  }

  isPending(): boolean {
    return this.status === 'INITIATED' || this.status === 'PROCESSING';
  }

  canBeRetried(): boolean {
    return this.isFailed() && this.errorType !== 'CARD_ERROR';
  }

  getDurationMs(): number | null {
    if (!this.completedAt) {
      return null;
    }
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  getErrorSummary(): string {
    if (!this.errorCode && !this.errorMessage) {
      return 'No error';
    }
    return `${this.errorCode || 'UNKNOWN'}: ${this.errorMessage || 'Unknown error'}`;
  }
}