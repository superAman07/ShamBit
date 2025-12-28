import { BadRequestException } from '@nestjs/common';
import { 
  PaymentIntentStatus, 
  PaymentTransactionStatus,
  PaymentMethod,
  PaymentGatewayProvider,
  canTransitionPaymentIntentStatus,
  canTransitionPaymentTransactionStatus 
} from './enums/payment-status.enum';
import { PaymentIntent } from './entities/payment-intent.entity';

export class PaymentValidators {
  
  // ============================================================================
  // CRITICAL SAFETY INVARIANTS - NEVER BYPASS THESE
  // ============================================================================
  
  /**
   * SAFETY: Payment status transitions must follow state machine
   */
  static validateStatusTransition(
    currentStatus: PaymentIntentStatus, 
    newStatus: PaymentIntentStatus
  ): void {
    if (!canTransitionPaymentIntentStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid payment status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * SAFETY: Transaction status transitions must follow state machine
   */
  static validateTransactionStatusTransition(
    currentStatus: PaymentTransactionStatus,
    newStatus: PaymentTransactionStatus
  ): void {
    if (!canTransitionPaymentTransactionStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid transaction status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * SAFETY: Payment amounts must be positive integers (cents)
   */
  static validatePaymentAmount(amount: number, fieldName: string = 'amount'): void {
    if (!Number.isInteger(amount)) {
      throw new BadRequestException(`${fieldName} must be an integer (cents)`);
    }
    
    if (amount <= 0) {
      throw new BadRequestException(`${fieldName} must be positive`);
    }
    
    if (amount > 99999999) { // $999,999.99
      throw new BadRequestException(`${fieldName} exceeds maximum allowed value`);
    }
  }

  /**
   * SAFETY: Currency must be valid ISO code
   */
  static validateCurrency(currency: string): void {
    if (!currency || currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }
    
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'JPY'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * SAFETY: Payment intent immutability after processing
   */
  static validatePaymentImmutability(paymentIntent: PaymentIntent, updateData: any): void {
    if (paymentIntent.status === PaymentIntentStatus.SUCCEEDED ||
        paymentIntent.status === PaymentIntentStatus.CANCELED) {
      
      // Only allow specific fields to be updated after terminal states
      const allowedFields = ['metadata', 'description', 'updatedBy', 'updatedAt'];
      const attemptedFields = Object.keys(updateData);
      const forbiddenFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (forbiddenFields.length > 0) {
        throw new BadRequestException(
          `Cannot modify ${forbiddenFields.join(', ')} after payment is ${paymentIntent.status.toLowerCase()}`
        );
      }
    }
  }

  /**
   * SAFETY: Idempotency key validation for retry safety
   */
  static validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new BadRequestException('Idempotency key is required');
    }
    
    if (key.length > 255) {
      throw new BadRequestException('Idempotency key too long (max 255 characters)');
    }
    
    // Idempotency key format validation
    const keyPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!keyPattern.test(key)) {
      throw new BadRequestException('Idempotency key must contain only alphanumeric characters, hyphens, and underscores');
    }
  }

  /**
   * SAFETY: Payment method validation
   */
  static validatePaymentMethods(methods: PaymentMethod[]): void {
    if (!methods || methods.length === 0) {
      throw new BadRequestException('At least one payment method must be specified');
    }
    
    if (methods.length > 10) {
      throw new BadRequestException('Too many payment methods (max 10)');
    }
    
    // Check for duplicates
    const uniqueMethods = new Set(methods);
    if (uniqueMethods.size !== methods.length) {
      throw new BadRequestException('Duplicate payment methods not allowed');
    }
    
    // Validate each method
    for (const method of methods) {
      if (!Object.values(PaymentMethod).includes(method)) {
        throw new BadRequestException(`Invalid payment method: ${method}`);
      }
    }
  }

  /**
   * SAFETY: Gateway provider validation
   */
  static validateGatewayProvider(provider: PaymentGatewayProvider): void {
    if (!Object.values(PaymentGatewayProvider).includes(provider)) {
      throw new BadRequestException(`Invalid gateway provider: ${provider}`);
    }
  }

  /**
   * SAFETY: Payment cancellation validation
   */
  static validatePaymentCancellation(paymentIntent: PaymentIntent): void {
    if (!paymentIntent.canBeCanceled()) {
      throw new BadRequestException(`Cannot cancel payment in ${paymentIntent.status} status`);
    }
    
    if (paymentIntent.hasExpired()) {
      throw new BadRequestException('Cannot cancel expired payment');
    }
  }

  /**
   * SAFETY: Payment confirmation validation
   */
  static validatePaymentConfirmation(paymentIntent: PaymentIntent): void {
    if (!paymentIntent.canBeConfirmed()) {
      throw new BadRequestException(`Cannot confirm payment in ${paymentIntent.status} status`);
    }
    
    if (paymentIntent.hasExpired()) {
      throw new BadRequestException('Cannot confirm expired payment');
    }
  }

  /**
   * SAFETY: Refund amount validation
   */
  static validateRefundAmount(
    paymentIntent: PaymentIntent,
    refundAmount?: number
  ): void {
    if (!paymentIntent.isSucceeded()) {
      throw new BadRequestException('Cannot refund unsuccessful payment');
    }
    
    const totalPaid = paymentIntent.getTotalPaid();
    const totalRefunded = paymentIntent.getTotalRefunded();
    const maxRefundable = totalPaid - totalRefunded;
    
    if (refundAmount !== undefined) {
      this.validatePaymentAmount(refundAmount, 'refund amount');
      
      if (refundAmount > maxRefundable) {
        throw new BadRequestException(
          `Refund amount ${refundAmount} exceeds maximum refundable amount ${maxRefundable}`
        );
      }
    }
  }

  /**
   * SAFETY: Application fee validation for multi-seller
   */
  static validateApplicationFee(amount: number, applicationFee?: number): void {
    if (applicationFee !== undefined) {
      this.validatePaymentAmount(applicationFee, 'application fee');
      
      if (applicationFee >= amount) {
        throw new BadRequestException('Application fee cannot exceed payment amount');
      }
      
      // Reasonable fee limit (e.g., 30% of transaction)
      const maxFee = Math.floor(amount * 0.3);
      if (applicationFee > maxFee) {
        throw new BadRequestException(`Application fee too high (max ${maxFee} for this transaction)`);
      }
    }
  }

  /**
   * SAFETY: Transfer validation for multi-seller
   */
  static validateTransfers(
    amount: number,
    transfers?: Array<{ destination: string; amount: number }>,
    applicationFee?: number
  ): void {
    if (transfers && transfers.length > 0) {
      let totalTransferAmount = 0;
      
      for (const transfer of transfers) {
        if (!transfer.destination || transfer.destination.trim().length === 0) {
          throw new BadRequestException('Transfer destination is required');
        }
        
        this.validatePaymentAmount(transfer.amount, 'transfer amount');
        totalTransferAmount += transfer.amount;
      }
      
      // Total transfers + application fee should not exceed payment amount
      const totalDeductions = totalTransferAmount + (applicationFee || 0);
      if (totalDeductions > amount) {
        throw new BadRequestException(
          `Total transfers and fees (${totalDeductions}) exceed payment amount (${amount})`
        );
      }
    }
  }

  /**
   * SAFETY: Payment expiry validation
   */
  static validatePaymentExpiry(paymentIntent: PaymentIntent): void {
    if (paymentIntent.hasExpired() && paymentIntent.isActive()) {
      throw new BadRequestException('Payment has expired and cannot be processed');
    }
  }

  /**
   * SAFETY: Webhook signature validation
   */
  static validateWebhookSignature(signature: string, payload: string): void {
    if (!signature || signature.trim().length === 0) {
      throw new BadRequestException('Webhook signature is required');
    }
    
    if (!payload || payload.trim().length === 0) {
      throw new BadRequestException('Webhook payload is required');
    }
    
    if (payload.length > 1000000) { // 1MB limit
      throw new BadRequestException('Webhook payload too large');
    }
  }

  /**
   * SAFETY: Payment attempt validation
   */
  static validatePaymentAttempt(
    paymentIntent: PaymentIntent,
    attemptNumber: number
  ): void {
    const maxAttempts = 5;
    
    if (attemptNumber > maxAttempts) {
      throw new BadRequestException(`Maximum payment attempts (${maxAttempts}) exceeded`);
    }
    
    if (paymentIntent.isTerminal()) {
      throw new BadRequestException('Cannot attempt payment on terminal payment intent');
    }
    
    if (paymentIntent.hasExpired()) {
      throw new BadRequestException('Cannot attempt payment on expired payment intent');
    }
  }

  /**
   * SAFETY: Retry interval validation
   */
  static validateRetryInterval(lastAttemptAt: Date, minIntervalMinutes: number = 5): void {
    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - lastAttemptAt.getTime();
    const minInterval = minIntervalMinutes * 60 * 1000; // Convert to milliseconds
    
    if (timeSinceLastAttempt < minInterval) {
      const remainingTime = Math.ceil((minInterval - timeSinceLastAttempt) / 1000 / 60);
      throw new BadRequestException(
        `Must wait ${remainingTime} minutes before retrying payment`
      );
    }
  }

  /**
   * SAFETY: Bulk operation validation
   */
  static validateBulkOperation(itemCount: number, maxItems: number = 100): void {
    if (itemCount <= 0) {
      throw new BadRequestException('Bulk operation must include at least one item');
    }
    
    if (itemCount > maxItems) {
      throw new BadRequestException(
        `Bulk operation too large: ${itemCount} items. Maximum: ${maxItems}`
      );
    }
  }

  /**
   * SAFETY: Metadata validation
   */
  static validateMetadata(metadata?: Record<string, any>): void {
    if (metadata) {
      const metadataString = JSON.stringify(metadata);
      if (metadataString.length > 50000) { // 50KB limit
        throw new BadRequestException('Metadata too large - maximum 50KB');
      }
      
      // Validate metadata keys
      for (const key of Object.keys(metadata)) {
        if (key.length > 100) {
          throw new BadRequestException(`Metadata key too long: ${key} (max 100 characters)`);
        }
        
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(key)) {
          throw new BadRequestException(`Invalid metadata key format: ${key}`);
        }
      }
    }
  }

  /**
   * SAFETY: Payment description validation
   */
  static validateDescription(description?: string): void {
    if (description) {
      if (description.length > 1000) {
        throw new BadRequestException('Description too long (max 1000 characters)');
      }
      
      // Basic content validation (no special characters that might cause issues)
      if (/<script|javascript:|data:/i.test(description)) {
        throw new BadRequestException('Description contains invalid content');
      }
    }
  }

  /**
   * SAFETY: Gateway response validation
   */
  static validateGatewayResponse(response: any, operation: string): void {
    if (!response) {
      throw new BadRequestException(`Invalid gateway response for ${operation}`);
    }
    
    if (response.success === false && !response.error) {
      throw new BadRequestException(`Gateway ${operation} failed without error details`);
    }
    
    if (response.success === true && !response.data) {
      throw new BadRequestException(`Gateway ${operation} succeeded without response data`);
    }
  }

  /**
   * SAFETY: Concurrent payment validation
   */
  static validateConcurrentPayment(
    paymentIntent: PaymentIntent,
    currentVersion: number
  ): void {
    if (paymentIntent.version !== currentVersion) {
      throw new BadRequestException(
        'Payment intent has been modified by another process. Please refresh and try again.'
      );
    }
  }

  /**
   * SAFETY: Payment method details validation
   */
  static validatePaymentMethodDetails(paymentMethod: any): void {
    if (!paymentMethod || !paymentMethod.type) {
      throw new BadRequestException('Payment method type is required');
    }
    
    if (paymentMethod.type === PaymentMethod.CARD) {
      if (!paymentMethod.card) {
        throw new BadRequestException('Card details are required for card payments');
      }
      
      const { card } = paymentMethod;
      
      if (!card.number || !/^\d{13,19}$/.test(card.number.replace(/\s/g, ''))) {
        throw new BadRequestException('Invalid card number');
      }
      
      if (!card.expMonth || card.expMonth < 1 || card.expMonth > 12) {
        throw new BadRequestException('Invalid expiry month');
      }
      
      if (!card.expYear || card.expYear < new Date().getFullYear()) {
        throw new BadRequestException('Invalid expiry year');
      }
      
      if (!card.cvc || !/^\d{3,4}$/.test(card.cvc)) {
        throw new BadRequestException('Invalid CVC');
      }
    }
  }
}