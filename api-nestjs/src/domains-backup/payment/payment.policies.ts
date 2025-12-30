export class PaymentPolicies {
  /**
   * Check if user can create a payment intent
   */
  static canCreatePaymentIntent(userId: string, userRole: string): boolean {
    // Basic policy: any authenticated user can create payment intents
    return !!userId;
  }

  /**
   * Check if user can view a payment intent
   */
  static canViewPaymentIntent(userId: string, userRole: string, paymentIntent: any): boolean {
    // Users can view payment intents for their own orders
    if (paymentIntent.order?.customerId === userId) {
      return true;
    }

    // Admins and merchants can view any payment intent
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Sellers can view payment intents for orders containing their products
    if (userRole === 'SELLER' && paymentIntent.order?.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can confirm a payment intent
   */
  static canConfirmPaymentIntent(userId: string, userRole: string, paymentIntent: any): boolean {
    // Only the customer who created the order can confirm payment
    if (paymentIntent.order?.customerId === userId) {
      return true;
    }

    // Admins can confirm any payment intent
    if (userRole === 'ADMIN') {
      return true;
    }

    return false;
  }

  /**
   * Check if user can cancel a payment intent
   */
  static canCancelPaymentIntent(userId: string, userRole: string, paymentIntent: any): boolean {
    // Customers can cancel their own payment intents if not yet processed
    if (paymentIntent.order?.customerId === userId && ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION'].includes(paymentIntent.status)) {
      return true;
    }

    // Admins and merchants can cancel any payment intent
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can create a refund
   */
  static canCreateRefund(userId: string, userRole: string, transaction: any): boolean {
    // Only admins, merchants, and sellers can create refunds
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Sellers can create refunds for transactions related to their products
    if (userRole === 'SELLER' && transaction.paymentIntent?.order?.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if payment intent can be modified based on its current status
   */
  static canModifyPaymentIntent(status: string): boolean {
    const modifiableStatuses = ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION'];
    return modifiableStatuses.includes(status);
  }

  /**
   * Check if payment intent can be cancelled based on its current status
   */
  static canCancelPaymentIntentByStatus(status: string): boolean {
    const cancellableStatuses = ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION'];
    return cancellableStatuses.includes(status);
  }

  /**
   * Check if transaction can be refunded based on its current status
   */
  static canRefundTransaction(status: string): boolean {
    const refundableStatuses = ['SUCCEEDED'];
    return refundableStatuses.includes(status);
  }

  /**
   * Get maximum refund window in days
   */
  static getRefundWindowDays(): number {
    return 180; // 6 months refund window for payments
  }

  /**
   * Check if transaction is within refund window
   */
  static isWithinRefundWindow(transactionDate: Date): boolean {
    const windowDays = this.getRefundWindowDays();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    return (now.getTime() - transactionDate.getTime()) <= windowMs;
  }

  /**
   * Get minimum payment amount in cents
   */
  static getMinimumPaymentAmount(): number {
    return 50; // $0.50 minimum
  }

  /**
   * Get maximum payment amount in cents
   */
  static getMaximumPaymentAmount(): number {
    return 100000000; // $1M maximum
  }

  /**
   * Check if payment amount is within limits
   */
  static isValidPaymentAmount(amount: number): boolean {
    return amount >= this.getMinimumPaymentAmount() && amount <= this.getMaximumPaymentAmount();
  }

  /**
   * Get maximum retry attempts for failed payments
   */
  static getMaxRetryAttempts(): number {
    return 3;
  }

  /**
   * Check if payment can be retried
   */
  static canRetryPayment(attemptCount: number, status: string): boolean {
    if (attemptCount >= this.getMaxRetryAttempts()) {
      return false;
    }

    const retryableStatuses = ['REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION'];
    return retryableStatuses.includes(status);
  }

  /**
   * Get supported payment methods
   */
  static getSupportedPaymentMethods(): string[] {
    return ['CARD', 'BANK_TRANSFER', 'WALLET', 'UPI', 'NET_BANKING'];
  }

  /**
   * Check if payment method is supported
   */
  static isPaymentMethodSupported(method: string): boolean {
    return this.getSupportedPaymentMethods().includes(method.toUpperCase());
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
  }

  /**
   * Check if currency is supported
   */
  static isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Check if user can access payment data
   */
  static canAccess(userId: string, userRole: string, resource: any): boolean {
    // Basic access control
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Users can access their own payment data
    if (resource.customerId === userId || resource.userId === userId) {
      return true;
    }

    return false;
  }
}