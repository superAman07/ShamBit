import { BadRequestException, ConflictException } from '@nestjs/common';
import { 
  SettlementStatus,
  SellerAccountStatus,
  KycStatus,
  SettlementFrequency,
  WalletTransactionType,
  WalletTransactionCategory,
  canTransitionSettlementStatus,
} from './enums/settlement-status.enum';
import { Settlement } from './entities/settlement.entity';
import { SellerAccount } from './entities/seller-account.entity';
import { SellerWallet } from './entities/seller-wallet.entity';

export class SettlementValidators {
  // ============================================================================
  // SETTLEMENT VALIDATION
  // ============================================================================

  static validateSettlementCreation(data: any): void {
    const errors: string[] = [];

    // Required fields
    if (!data.sellerId) {
      errors.push('Seller ID is required');
    }

    if (!data.sellerAccountId) {
      errors.push('Seller account ID is required');
    }

    if (!data.periodStart) {
      errors.push('Period start date is required');
    }

    if (!data.periodEnd) {
      errors.push('Period end date is required');
    }

    // Date validation
    if (data.periodStart && data.periodEnd) {
      const start = new Date(data.periodStart);
      const end = new Date(data.periodEnd);

      if (start >= end) {
        errors.push('Period start must be before period end');
      }

      // Check if period is in the future
      const now = new Date();
      if (end > now) {
        errors.push('Period end cannot be in the future');
      }

      // Check minimum period (1 day)
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (periodDays < 1) {
        errors.push('Settlement period must be at least 1 day');
      }

      // Check maximum period (90 days)
      if (periodDays > 90) {
        errors.push('Settlement period cannot exceed 90 days');
      }
    }

    // Currency validation
    if (data.currency && !this.isValidCurrency(data.currency)) {
      errors.push('Invalid currency code');
    }

    // Settlement date validation
    if (data.settlementDate) {
      const settlementDate = new Date(data.settlementDate);
      const now = new Date();
      
      // Settlement date cannot be more than 30 days in the future
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 30);
      
      if (settlementDate > maxFutureDate) {
        errors.push('Settlement date cannot be more than 30 days in the future');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSettlementProcessing(settlement: Settlement): void {
    const errors: string[] = [];

    if (!settlement.isProcessable()) {
      errors.push(`Settlement cannot be processed in status: ${settlement.status}`);
    }

    if (settlement.isLocked()) {
      errors.push(`Settlement is locked by: ${settlement.lockedBy}`);
    }

    if (settlement.netAmount <= 0) {
      errors.push('Net settlement amount must be positive');
    }

    // Validate amount breakdown
    try {
      settlement.validateAmounts();
    } catch (error) {
      errors.push(error.message);
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement processing validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSettlementStatusTransition(
    currentStatus: SettlementStatus,
    newStatus: SettlementStatus
  ): void {
    if (!canTransitionSettlementStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid settlement status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  static validateSettlementAmounts(data: any): void {
    const errors: string[] = [];

    // Validate individual amounts
    if (data.grossAmount !== undefined) {
      this.validateAmount(data.grossAmount, 'Gross amount');
    }

    if (data.commissionAmount !== undefined) {
      this.validateAmount(data.commissionAmount, 'Commission amount');
    }

    if (data.platformFeeAmount !== undefined) {
      this.validateAmount(data.platformFeeAmount, 'Platform fee amount');
    }

    if (data.taxAmount !== undefined) {
      this.validateAmount(data.taxAmount, 'Tax amount');
    }

    if (data.netAmount !== undefined) {
      this.validateAmount(data.netAmount, 'Net amount');
    }

    // Validate amount relationships
    if (data.grossAmount !== undefined && data.netAmount !== undefined) {
      const calculatedNet = (data.grossAmount || 0) - 
                           (data.commissionAmount || 0) - 
                           (data.platformFeeAmount || 0) - 
                           (data.taxAmount || 0) + 
                           (data.adjustmentAmount || 0);

      if (Math.abs(calculatedNet - data.netAmount) > 0.01) {
        errors.push(`Net amount mismatch: calculated ${calculatedNet}, provided ${data.netAmount}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement amount validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSettlementLocking(settlement: Settlement, userId: string): void {
    if (settlement.isLocked() && settlement.lockedBy !== userId) {
      throw new ConflictException(`Settlement is locked by another user: ${settlement.lockedBy}`);
    }
  }

  // ============================================================================
  // SELLER ACCOUNT VALIDATION
  // ============================================================================

  static validateSellerAccountCreation(data: any): void {
    const errors: string[] = [];

    // Required fields
    if (!data.sellerId) {
      errors.push('Seller ID is required');
    }

    if (!data.accountHolderName?.trim()) {
      errors.push('Account holder name is required');
    }

    if (!data.accountNumber?.trim()) {
      errors.push('Account number is required');
    }

    if (!data.ifscCode?.trim()) {
      errors.push('IFSC code is required');
    }

    if (!data.bankName?.trim()) {
      errors.push('Bank name is required');
    }

    // Validate IFSC code format
    if (data.ifscCode && !this.isValidIfscCode(data.ifscCode)) {
      errors.push('Invalid IFSC code format');
    }

    // Validate account number
    if (data.accountNumber && !this.isValidAccountNumber(data.accountNumber)) {
      errors.push('Invalid account number format');
    }

    // Validate account type
    if (data.accountType && !['SAVINGS', 'CURRENT'].includes(data.accountType)) {
      errors.push('Account type must be SAVINGS or CURRENT');
    }

    // Validate UPI ID if provided
    if (data.upiId && !this.isValidUpiId(data.upiId)) {
      errors.push('Invalid UPI ID format');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Seller account validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSellerAccountVerification(account: SellerAccount): void {
    const errors: string[] = [];

    if (account.kycStatus !== KycStatus.SUBMITTED) {
      errors.push(`Cannot verify account with KYC status: ${account.kycStatus}`);
    }

    if (!account.kycDocuments) {
      errors.push('KYC documents are required for verification');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Account verification validation failed: ${errors.join(', ')}`);
    }
  }

  static validateBusinessDetails(data: any): void {
    const errors: string[] = [];

    if (data.businessType && data.businessType !== 'INDIVIDUAL') {
      if (!data.businessName?.trim()) {
        errors.push('Business name is required for business accounts');
      }

      if (!data.gstNumber?.trim()) {
        errors.push('GST number is required for business accounts');
      }

      if (data.gstNumber && !this.isValidGstNumber(data.gstNumber)) {
        errors.push('Invalid GST number format');
      }
    }

    if (data.panNumber && !this.isValidPanNumber(data.panNumber)) {
      errors.push('Invalid PAN number format');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Business details validation failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // WALLET VALIDATION
  // ============================================================================

  static validateWalletTransaction(data: any): void {
    const errors: string[] = [];

    // Required fields
    if (!data.walletId) {
      errors.push('Wallet ID is required');
    }

    if (!data.transactionId) {
      errors.push('Transaction ID is required');
    }

    if (!data.type || !Object.values(WalletTransactionType).includes(data.type)) {
      errors.push('Valid transaction type is required');
    }

    if (!data.category || !Object.values(WalletTransactionCategory).includes(data.category)) {
      errors.push('Valid transaction category is required');
    }

    if (!data.description?.trim()) {
      errors.push('Transaction description is required');
    }

    // Amount validation
    this.validateAmount(data.amount, 'Transaction amount');

    // Balance validation
    if (data.balanceBefore !== undefined) {
      this.validateAmount(data.balanceBefore, 'Balance before', true);
    }

    if (data.balanceAfter !== undefined) {
      this.validateAmount(data.balanceAfter, 'Balance after', true);
    }

    // Currency validation
    if (data.currency && !this.isValidCurrency(data.currency)) {
      errors.push('Invalid currency code');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Wallet transaction validation failed: ${errors.join(', ')}`);
    }
  }

  static validateWalletBalance(wallet: SellerWallet): void {
    try {
      wallet.validateBalances();
    } catch (error) {
      throw new BadRequestException(`Wallet balance validation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // SETTLEMENT SCHEDULE VALIDATION
  // ============================================================================

  static validateSettlementSchedule(data: any): void {
    const errors: string[] = [];

    // Required fields
    if (!data.sellerId) {
      errors.push('Seller ID is required');
    }

    if (!data.sellerAccountId) {
      errors.push('Seller account ID is required');
    }

    if (!data.frequency || !Object.values(SettlementFrequency).includes(data.frequency)) {
      errors.push('Valid settlement frequency is required');
    }

    // Frequency-specific validation
    if (data.frequency === SettlementFrequency.WEEKLY) {
      if (!data.dayOfWeek || data.dayOfWeek < 1 || data.dayOfWeek > 7) {
        errors.push('Day of week must be between 1 (Monday) and 7 (Sunday) for weekly frequency');
      }
    }

    if (data.frequency === SettlementFrequency.MONTHLY) {
      if (!data.dayOfMonth || data.dayOfMonth < 1 || data.dayOfMonth > 31) {
        errors.push('Day of month must be between 1 and 31 for monthly frequency');
      }
    }

    // Time validation
    if (data.timeOfDay && !this.isValidTimeFormat(data.timeOfDay)) {
      errors.push('Time of day must be in HH:MM format');
    }

    // Minimum amount validation
    if (data.minimumAmount !== undefined) {
      this.validateAmount(data.minimumAmount, 'Minimum settlement amount');
      
      if (data.minimumAmount < 1) {
        errors.push('Minimum settlement amount must be at least 1');
      }
    }

    // Hold period validation
    if (data.holdPeriodDays !== undefined) {
      if (!Number.isInteger(data.holdPeriodDays) || data.holdPeriodDays < 0) {
        errors.push('Hold period days must be a non-negative integer');
      }

      if (data.holdPeriodDays > 365) {
        errors.push('Hold period cannot exceed 365 days');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement schedule validation failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // BUSINESS RULE VALIDATION
  // ============================================================================

  static validateSettlementEligibility(
    sellerAccount: SellerAccount,
    wallet: SellerWallet,
    amount: number
  ): void {
    const errors: string[] = [];

    // Account must be active and verified
    if (!sellerAccount.canReceivePayouts()) {
      errors.push('Seller account is not eligible for payouts');
    }

    // Check minimum settlement amount
    const minimumAmount = 100; // Default minimum
    if (amount < minimumAmount) {
      errors.push(`Settlement amount ${amount} is below minimum ${minimumAmount}`);
    }

    // Check wallet balance
    if (!wallet.canSettle(amount)) {
      errors.push(`Insufficient wallet balance for settlement amount ${amount}`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement eligibility validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSettlementTiming(
    periodEnd: Date,
    holdPeriodDays: number = 7
  ): void {
    const now = new Date();
    const holdPeriodEnd = new Date(periodEnd.getTime() + holdPeriodDays * 24 * 60 * 60 * 1000);

    if (now < holdPeriodEnd) {
      const remainingDays = Math.ceil((holdPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      throw new BadRequestException(
        `Settlement is in hold period. ${remainingDays} days remaining.`
      );
    }
  }

  static validateConcurrentSettlement(existingSettlements: Settlement[]): void {
    const activeSettlements = existingSettlements.filter(s => 
      s.status === SettlementStatus.PENDING || s.status === SettlementStatus.PROCESSING
    );

    if (activeSettlements.length > 0) {
      throw new ConflictException(
        `Cannot create settlement. Active settlement exists: ${activeSettlements[0].settlementId}`
      );
    }
  }

  // ============================================================================
  // HELPER VALIDATION METHODS
  // ============================================================================

  private static validateAmount(amount: any, fieldName: string, allowZero: boolean = false): void {
    if (amount === undefined || amount === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof amount !== 'number') {
      throw new BadRequestException(`${fieldName} must be a number`);
    }

    if (!allowZero && amount <= 0) {
      throw new BadRequestException(`${fieldName} must be positive`);
    }

    if (allowZero && amount < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    if (amount > 99999999.99) {
      throw new BadRequestException(`${fieldName} exceeds maximum allowed value`);
    }

    // Check for reasonable decimal places (2 for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new BadRequestException(`${fieldName} cannot have more than 2 decimal places`);
    }
  }

  private static isValidCurrency(currency: string): boolean {
    const supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'MYR'];
    return supportedCurrencies.includes(currency.toUpperCase());
  }

  private static isValidIfscCode(ifscCode: string): boolean {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifscCode.toUpperCase());
  }

  private static isValidAccountNumber(accountNumber: string): boolean {
    // Remove spaces and check length
    const cleanNumber = accountNumber.replace(/\s/g, '');
    return /^\d{9,18}$/.test(cleanNumber);
  }

  private static isValidUpiId(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(upiId);
  }

  private static isValidGstNumber(gstNumber: string): boolean {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber.toUpperCase());
  }

  private static isValidPanNumber(panNumber: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber.toUpperCase());
  }

  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // ============================================================================
  // IDEMPOTENCY VALIDATION
  // ============================================================================

  static validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new BadRequestException('Idempotency key is required');
    }

    if (key.length < 16 || key.length > 64) {
      throw new BadRequestException('Idempotency key must be between 16 and 64 characters');
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    const validKeyRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validKeyRegex.test(key)) {
      throw new BadRequestException('Idempotency key contains invalid characters');
    }
  }

  // ============================================================================
  // BATCH PROCESSING VALIDATION
  // ============================================================================

  static validateBatchSize(batchSize: number): void {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new BadRequestException('Batch size must be a positive integer');
    }

    if (batchSize > 1000) {
      throw new BadRequestException('Batch size cannot exceed 1000');
    }
  }

  static validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const now = new Date();
    if (endDate > now) {
      throw new BadRequestException('End date cannot be in the future');
    }

    // Check maximum range (1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      throw new BadRequestException('Date range cannot exceed 1 year');
    }
  }
}