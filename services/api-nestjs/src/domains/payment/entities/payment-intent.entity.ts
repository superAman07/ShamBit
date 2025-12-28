import { 
  PaymentIntentStatus, 
  PaymentMethod, 
  PaymentGatewayProvider,
  isPaymentIntentTerminal,
  isPaymentIntentActive,
  requiresUserAction 
} from '../enums/payment-status.enum';
import { PaymentTransaction } from './payment-transaction.entity';
import { PaymentAttempt } from './payment-attempt.entity';

export interface PaymentIntentMetadata {
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  invoiceId?: string;
  receiptEmail?: string;
  statementDescriptor?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface TransferData {
  destination: string; // Seller account ID
  amount: number;      // Amount to transfer in cents
}

export class PaymentIntent {
  id: string;
  orderId: string;
  
  // Payment Intent Details
  intentId: string;
  clientSecret?: string;
  
  // Amount & Currency (Immutable)
  amount: number; // Amount in cents
  currency: string;
  
  // Gateway Information
  gatewayProvider: PaymentGatewayProvider;
  gatewayIntentId: string;
  
  // Status & Lifecycle
  status: PaymentIntentStatus;
  
  // Payment Methods
  allowedPaymentMethods: PaymentMethod[];
  
  // Confirmation Details
  confirmationMethod: 'AUTOMATIC' | 'MANUAL';
  captureMethod: 'AUTOMATIC' | 'MANUAL';
  
  // Multi-seller Support
  transferGroup?: string;
  applicationFee?: number; // Platform fee in cents
  
  // Metadata & Configuration
  metadata?: PaymentIntentMetadata;
  description?: string;
  
  // Expiry & Timeouts
  expiresAt?: Date;
  
  // Versioning
  version: number;
  
  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
  
  // Relations
  transactions?: PaymentTransaction[];
  attempts?: PaymentAttempt[];
  
  constructor(data: Partial<PaymentIntent>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // STATUS & LIFECYCLE METHODS
  // ============================================================================
  
  isActive(): boolean {
    return isPaymentIntentActive(this.status) && !this.deletedAt;
  }
  
  isTerminal(): boolean {
    return isPaymentIntentTerminal(this.status);
  }
  
  isSucceeded(): boolean {
    return this.status === PaymentIntentStatus.SUCCEEDED;
  }
  
  isCanceled(): boolean {
    return this.status === PaymentIntentStatus.CANCELED;
  }
  
  isProcessing(): boolean {
    return this.status === PaymentIntentStatus.PROCESSING;
  }
  
  requiresPaymentMethod(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_PAYMENT_METHOD;
  }
  
  requiresConfirmation(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_CONFIRMATION;
  }
  
  requiresAction(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_ACTION;
  }
  
  requiresUserAction(): boolean {
    return requiresUserAction(this.status);
  }
  
  canBeCanceled(): boolean {
    return this.isActive() && !this.isProcessing();
  }
  
  canBeConfirmed(): boolean {
    return [
      PaymentIntentStatus.REQUIRES_CONFIRMATION,
      PaymentIntentStatus.REQUIRES_ACTION,
    ].includes(this.status);
  }
  
  hasExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }
  
  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================
  
  supportsPaymentMethod(method: PaymentMethod): boolean {
    return this.allowedPaymentMethods.includes(method);
  }
  
  getPreferredPaymentMethod(): PaymentMethod | undefined {
    return this.allowedPaymentMethods[0];
  }
  
  addPaymentMethod(method: PaymentMethod): void {
    if (!this.supportsPaymentMethod(method)) {
      this.allowedPaymentMethods.push(method);
    }
  }
  
  removePaymentMethod(method: PaymentMethod): void {
    this.allowedPaymentMethods = this.allowedPaymentMethods.filter(m => m !== method);
  }
  
  // ============================================================================
  // TRANSACTION METHODS
  // ============================================================================
  
  getSuccessfulTransaction(): PaymentTransaction | undefined {
    return this.transactions?.find(t => t.isSucceeded());
  }
  
  getLatestTransaction(): PaymentTransaction | undefined {
    return this.transactions?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }
  
  getTotalPaid(): number {
    return this.transactions?.filter(t => t.isSucceeded())
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  }
  
  getTotalRefunded(): number {
    return this.transactions?.filter(t => t.type === 'REFUND' && t.isSucceeded())
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  }
  
  getOutstandingAmount(): number {
    return Math.max(0, this.amount - this.getTotalPaid() + this.getTotalRefunded());
  }
  
  isFullyPaid(): boolean {
    return this.getTotalPaid() >= this.amount;
  }
  
  isPartiallyPaid(): boolean {
    const paid = this.getTotalPaid();
    return paid > 0 && paid < this.amount;
  }
  
  hasRefunds(): boolean {
    return this.getTotalRefunded() > 0;
  }
  
  // ============================================================================
  // ATTEMPT METHODS
  // ============================================================================
  
  getAttemptCount(): number {
    return this.attempts?.length || 0;
  }
  
  getLatestAttempt(): PaymentAttempt | undefined {
    return this.attempts?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }
  
  getFailedAttempts(): PaymentAttempt[] {
    return this.attempts?.filter(a => a.isFailed()) || [];
  }
  
  getSuccessfulAttempt(): PaymentAttempt | undefined {
    return this.attempts?.find(a => a.isSucceeded());
  }
  
  canRetry(): boolean {
    const maxAttempts = 3;
    return this.getAttemptCount() < maxAttempts && !this.isTerminal();
  }
  
  // ============================================================================
  // MULTI-SELLER METHODS
  // ============================================================================
  
  hasTransfers(): boolean {
    return !!this.transferGroup;
  }
  
  getApplicationFeeAmount(): number {
    return this.applicationFee || 0;
  }
  
  getSellerAmount(): number {
    return this.amount - this.getApplicationFeeAmount();
  }
  
  calculatePlatformFee(feePercentage: number): number {
    return Math.round(this.amount * (feePercentage / 100));
  }
  
  // ============================================================================
  // GATEWAY METHODS
  // ============================================================================
  
  isStripe(): boolean {
    return this.gatewayProvider === PaymentGatewayProvider.STRIPE;
  }
  
  isRazorpay(): boolean {
    return this.gatewayProvider === PaymentGatewayProvider.RAZORPAY;
  }
  
  isPayPal(): boolean {
    return this.gatewayProvider === PaymentGatewayProvider.PAYPAL;
  }
  
  getGatewaySpecificData(): Record<string, any> {
    return {
      gatewayProvider: this.gatewayProvider,
      gatewayIntentId: this.gatewayIntentId,
      clientSecret: this.clientSecret,
    };
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required fields
    if (!this.orderId) errors.push('Order ID is required');
    if (!this.intentId) errors.push('Intent ID is required');
    if (!this.gatewayIntentId) errors.push('Gateway intent ID is required');
    if (!this.gatewayProvider) errors.push('Gateway provider is required');
    
    // Validate amount
    if (this.amount <= 0) errors.push('Amount must be positive');
    if (!Number.isInteger(this.amount)) errors.push('Amount must be an integer (cents)');
    if (this.amount > 99999999) errors.push('Amount exceeds maximum allowed');
    
    // Validate currency
    if (!this.currency || this.currency.length !== 3) {
      errors.push('Currency must be a 3-letter ISO code');
    }
    
    // Validate payment methods
    if (!this.allowedPaymentMethods || this.allowedPaymentMethods.length === 0) {
      errors.push('At least one payment method must be allowed');
    }
    
    // Validate application fee
    if (this.applicationFee !== undefined) {
      if (this.applicationFee < 0) errors.push('Application fee cannot be negative');
      if (this.applicationFee >= this.amount) errors.push('Application fee cannot exceed payment amount');
    }
    
    // Validate expiry
    if (this.expiresAt && this.expiresAt <= this.createdAt) {
      errors.push('Expiry date must be after creation date');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  validateStatusTransition(newStatus: PaymentIntentStatus): boolean {
    const validTransitions = PaymentIntentStatusTransitions[this.status] || [];
    return validTransitions.includes(newStatus);
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  updateMetadata(metadata: Partial<PaymentIntentMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  incrementVersion(): void {
    this.version += 1;
  }
  
  getDisplayStatus(): string {
    if (this.hasExpired() && this.isActive()) {
      return 'EXPIRED';
    }
    return this.status;
  }
  
  getFormattedAmount(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount / 100);
  }
  
  getAmountInMajorUnit(): number {
    return this.amount / 100;
  }
  
  getDaysUntilExpiry(): number | null {
    if (!this.expiresAt) return null;
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // ============================================================================
  // FACTORY METHODS
  // ============================================================================
  
  static createForOrder(data: {
    orderId: string;
    amount: number;
    currency: string;
    gatewayProvider: PaymentGatewayProvider;
    allowedPaymentMethods: PaymentMethod[];
    applicationFee?: number;
    transferGroup?: string;
    metadata?: PaymentIntentMetadata;
    createdBy: string;
  }): PaymentIntent {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry
    
    return new PaymentIntent({
      ...data,
      intentId: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gatewayIntentId: '', // Will be set by gateway
      status: PaymentIntentStatus.CREATED,
      confirmationMethod: 'AUTOMATIC',
      captureMethod: 'AUTOMATIC',
      expiresAt,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  static createForMultiSeller(data: {
    orderId: string;
    amount: number;
    currency: string;
    gatewayProvider: PaymentGatewayProvider;
    allowedPaymentMethods: PaymentMethod[];
    transfers: TransferData[];
    platformFeePercentage: number;
    metadata?: PaymentIntentMetadata;
    createdBy: string;
  }): PaymentIntent {
    const applicationFee = Math.round(data.amount * (data.platformFeePercentage / 100));
    const transferGroup = `order_${data.orderId}_${Date.now()}`;
    
    return PaymentIntent.createForOrder({
      ...data,
      applicationFee,
      transferGroup,
    });
  }
}