import { BadRequestException, ConflictException } from '@nestjs/common';
import { 
  SettlementStatus,
  SellerAccountStatus,
  KycStatus,
} from './enums/settlement-status.enum';

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

  static validateSettlementProcessing(settlement: any): void {
    const errors: string[] = [];

    // Check settlement status
    if (settlement.status !== SettlementStatus.PENDING) {
      errors.push(`Settlement must be in PENDING status to process (current: ${settlement.status})`);
    }

    // Check if settlement has transactions
    if (!settlement.transactions || settlement.transactions.length === 0) {
      errors.push('Settlement must have transactions to process');
    }

    // Check net amount
    if (settlement.netAmount <= 0) {
      errors.push('Settlement net amount must be positive');
    }

    // Check seller account
    if (!settlement.sellerAccountId) {
      errors.push('Settlement must have a valid seller account');
    }

    // Check bank account information
    if (!settlement.bankAccount || Object.keys(settlement.bankAccount).length === 0) {
      errors.push('Settlement must have bank account information');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement processing validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSettlementStatusTransition(
    currentStatus: SettlementStatus,
    newStatus: SettlementStatus
  ): void {
    const validTransitions: Record<SettlementStatus, SettlementStatus[]> = {
      [SettlementStatus.PENDING]: [
        SettlementStatus.PROCESSING,
        SettlementStatus.FAILED,
      ],
      [SettlementStatus.PROCESSING]: [
        SettlementStatus.SETTLED,
        SettlementStatus.FAILED,
      ],
      [SettlementStatus.SETTLED]: [], // Terminal state
      [SettlementStatus.FAILED]: [
        SettlementStatus.PENDING, // Allow retry
      ],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
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

    if (!data.businessDetails) {
      errors.push('Business details are required');
    }

    // Validate business details
    if (data.businessDetails) {
      this.validateBusinessDetails(data.businessDetails);
    }

    // Validate bank accounts
    if (data.bankAccounts && Array.isArray(data.bankAccounts)) {
      for (const bankAccount of data.bankAccounts) {
        this.validateBankAccount(bankAccount);
      }
    }

    // Validate primary bank account
    if (data.primaryBankId && data.bankAccounts) {
      const primaryBank = data.bankAccounts.find((bank: any) => bank.id === data.primaryBankId);
      if (!primaryBank) {
        errors.push('Primary bank account must exist in bank accounts list');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Seller account validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSellerAccountForSettlement(sellerAccount: any): void {
    const errors: string[] = [];

    // Check account status
    if (sellerAccount.status !== SellerAccountStatus.ACTIVATED) {
      errors.push(`Seller account must be activated for settlements (current: ${sellerAccount.status})`);
    }

    // Check KYC status
    if (sellerAccount.kycStatus !== KycStatus.VERIFIED) {
      errors.push(`Seller KYC must be verified for settlements (current: ${sellerAccount.kycStatus})`);
    }

    // Check bank accounts
    if (!sellerAccount.bankAccounts || sellerAccount.bankAccounts.length === 0) {
      errors.push('Seller must have at least one bank account for settlements');
    }

    // Check primary bank account
    if (!sellerAccount.primaryBankId) {
      errors.push('Seller must have a primary bank account for settlements');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Seller account settlement validation failed: ${errors.join(', ')}`);
    }
  }

  static validateSellerAccountStatusTransition(
    currentStatus: SellerAccountStatus,
    newStatus: SellerAccountStatus
  ): void {
    const validTransitions: Record<SellerAccountStatus, SellerAccountStatus[]> = {
      [SellerAccountStatus.CREATED]: [
        SellerAccountStatus.UNDER_REVIEW,
        SellerAccountStatus.NEEDS_CLARIFICATION,
        SellerAccountStatus.REJECTED,
      ],
      [SellerAccountStatus.UNDER_REVIEW]: [
        SellerAccountStatus.ACTIVATED,
        SellerAccountStatus.NEEDS_CLARIFICATION,
        SellerAccountStatus.REJECTED,
      ],
      [SellerAccountStatus.NEEDS_CLARIFICATION]: [
        SellerAccountStatus.UNDER_REVIEW,
        SellerAccountStatus.REJECTED,
      ],
      [SellerAccountStatus.ACTIVATED]: [
        SellerAccountStatus.SUSPENDED,
      ],
      [SellerAccountStatus.SUSPENDED]: [
        SellerAccountStatus.ACTIVATED,
        SellerAccountStatus.REJECTED,
      ],
      [SellerAccountStatus.REJECTED]: [], // Terminal state
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid seller account status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  static validateBusinessDetails(businessDetails: any): void {
    const errors: string[] = [];

    // Required business fields
    const requiredFields = [
      'businessName',
      'businessType',
      'registrationNumber',
      'address',
      'contactPerson',
      'contactEmail',
      'contactPhone',
    ];

    for (const field of requiredFields) {
      if (!businessDetails[field]) {
        errors.push(`Business ${field} is required`);
      }
    }

    // Validate email format
    if (businessDetails.contactEmail && !this.isValidEmail(businessDetails.contactEmail)) {
      errors.push('Invalid contact email format');
    }

    // Validate phone format
    if (businessDetails.contactPhone && !this.isValidPhone(businessDetails.contactPhone)) {
      errors.push('Invalid contact phone format');
    }

    // Validate business type
    const validBusinessTypes = [
      'SOLE_PROPRIETORSHIP',
      'PARTNERSHIP',
      'PRIVATE_LIMITED',
      'PUBLIC_LIMITED',
      'LLP',
      'TRUST',
      'SOCIETY',
      'NGO',
    ];

    if (businessDetails.businessType && !validBusinessTypes.includes(businessDetails.businessType)) {
      errors.push('Invalid business type');
    }

    // Validate address
    if (businessDetails.address) {
      const address = businessDetails.address;
      const requiredAddressFields = ['street', 'city', 'state', 'postalCode', 'country'];
      
      for (const field of requiredAddressFields) {
        if (!address[field]) {
          errors.push(`Address ${field} is required`);
        }
      }

      // Validate postal code format (basic validation)
      if (address.postalCode && !/^\d{6}$/.test(address.postalCode)) {
        errors.push('Invalid postal code format (should be 6 digits)');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Business details validation failed: ${errors.join(', ')}`);
    }
  }

  static validateBankAccount(bankAccount: any): void {
    const errors: string[] = [];

    // Required bank account fields
    const requiredFields = [
      'accountNumber',
      'accountHolderName',
      'ifscCode',
      'bankName',
    ];

    for (const field of requiredFields) {
      if (!bankAccount[field]) {
        errors.push(`Bank account ${field} is required`);
      }
    }

    // Validate account number (basic validation)
    if (bankAccount.accountNumber) {
      const accountNumber = bankAccount.accountNumber.toString();
      if (accountNumber.length < 9 || accountNumber.length > 18) {
        errors.push('Account number must be between 9 and 18 digits');
      }
      if (!/^\d+$/.test(accountNumber)) {
        errors.push('Account number must contain only digits');
      }
    }

    // Validate IFSC code format
    if (bankAccount.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankAccount.ifscCode)) {
      errors.push('Invalid IFSC code format');
    }

    // Validate account type
    const validAccountTypes = ['SAVINGS', 'CURRENT', 'OVERDRAFT'];
    if (bankAccount.accountType && !validAccountTypes.includes(bankAccount.accountType)) {
      errors.push('Invalid account type');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Bank account validation failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // SETTLEMENT SCHEDULE VALIDATION
  // ============================================================================

  static validateSettlementSchedule(schedule: any): void {
    const errors: string[] = [];

    // Validate frequency
    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
    if (schedule.frequency && !validFrequencies.includes(schedule.frequency)) {
      errors.push('Invalid settlement frequency');
    }

    // Validate day of week (for weekly frequency)
    if (schedule.frequency === 'WEEKLY') {
      if (!schedule.dayOfWeek || schedule.dayOfWeek < 1 || schedule.dayOfWeek > 7) {
        errors.push('Day of week must be between 1 (Monday) and 7 (Sunday) for weekly frequency');
      }
    }

    // Validate day of month (for monthly frequency)
    if (schedule.frequency === 'MONTHLY') {
      if (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        errors.push('Day of month must be between 1 and 31 for monthly frequency');
      }
    }

    // Validate minimum amount
    if (schedule.minAmount !== undefined) {
      if (schedule.minAmount < 0) {
        errors.push('Minimum settlement amount cannot be negative');
      }
      if (schedule.minAmount > 10000000) { // ₹1,00,000
        errors.push('Minimum settlement amount cannot exceed ₹1,00,000');
      }
    }

    // Validate hold days
    if (schedule.holdDays !== undefined) {
      if (schedule.holdDays < 0) {
        errors.push('Hold days cannot be negative');
      }
      if (schedule.holdDays > 30) {
        errors.push('Hold days cannot exceed 30 days');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement schedule validation failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // AMOUNT VALIDATION
  // ============================================================================

  static validateSettlementAmounts(data: any): void {
    const errors: string[] = [];

    // Validate gross amount
    if (data.grossAmount !== undefined) {
      if (data.grossAmount < 0) {
        errors.push('Gross amount cannot be negative');
      }
    }

    // Validate fees
    if (data.fees !== undefined) {
      if (data.fees < 0) {
        errors.push('Fees cannot be negative');
      }
    }

    // Validate tax
    if (data.tax !== undefined) {
      if (data.tax < 0) {
        errors.push('Tax cannot be negative');
      }
    }

    // Validate net amount
    if (data.netAmount !== undefined) {
      if (data.netAmount < 0) {
        errors.push('Net amount cannot be negative');
      }
    }

    // Validate amount consistency
    if (data.grossAmount !== undefined && data.fees !== undefined && 
        data.tax !== undefined && data.netAmount !== undefined) {
      const calculatedNet = data.grossAmount - data.fees - data.tax;
      if (Math.abs(calculatedNet - data.netAmount) > 1) { // Allow 1 paisa difference for rounding
        errors.push('Net amount does not match gross amount minus fees and tax');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement amount validation failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // UTILITY VALIDATION METHODS
  // ============================================================================

  private static isValidCurrency(currency: string): boolean {
    const validCurrencies = [
      'INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'MYR'
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Indian phone number validation (10 digits, optionally with +91)
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  // ============================================================================
  // BUSINESS RULE VALIDATION
  // ============================================================================

  static validateSettlementBusinessRules(settlement: any, sellerAccount: any): void {
    const errors: string[] = [];

    // Check minimum settlement amount based on seller tier
    const minAmount = this.getMinimumSettlementAmount(sellerAccount);
    if (settlement.netAmount < minAmount) {
      errors.push(`Settlement amount ${settlement.netAmount} is below minimum ${minAmount} for seller tier`);
    }

    // Check settlement frequency limits
    const maxSettlementsPerDay = this.getMaxSettlementsPerDay(sellerAccount);
    // This would require checking existing settlements for the day
    // Implementation would depend on repository access

    // Check hold period compliance
    const requiredHoldDays = this.getRequiredHoldDays(sellerAccount);
    const settlementAge = Math.ceil(
      (new Date().getTime() - settlement.periodEnd.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (settlementAge < requiredHoldDays) {
      errors.push(`Settlement period must be at least ${requiredHoldDays} days old`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Settlement business rule validation failed: ${errors.join(', ')}`);
    }
  }

  private static getMinimumSettlementAmount(sellerAccount: any): number {
    // Minimum settlement amount based on seller tier
    const tierMinimums: Record<string, number> = {
      'STANDARD': 100,    // ₹1.00
      'PREMIUM': 50,      // ₹0.50
      'ENTERPRISE': 10,   // ₹0.10
    };

    const tier = sellerAccount.seller?.tier || 'STANDARD';
    return tierMinimums[tier] || 100;
  }

  private static getMaxSettlementsPerDay(sellerAccount: any): number {
    // Maximum settlements per day based on seller tier
    const tierLimits: Record<string, number> = {
      'STANDARD': 1,
      'PREMIUM': 3,
      'ENTERPRISE': 10,
    };

    const tier = sellerAccount.seller?.tier || 'STANDARD';
    return tierLimits[tier] || 1;
  }

  private static getRequiredHoldDays(sellerAccount: any): number {
    // Required hold days based on seller tier and risk profile
    const tierHoldDays: Record<string, number> = {
      'STANDARD': 7,
      'PREMIUM': 5,
      'ENTERPRISE': 3,
    };

    const tier = sellerAccount.seller?.tier || 'STANDARD';
    let holdDays = tierHoldDays[tier] || 7;

    // Increase hold days for high-risk sellers
    if (sellerAccount.riskProfile === 'HIGH') {
      holdDays += 3;
    }

    return holdDays;
  }
}