import {
  SellerAccountStatus,
  KycStatus,
} from '../enums/settlement-status.enum';

export interface KycDocuments {
  panCard?: {
    number: string;
    imageUrl: string;
    verified?: boolean;
  };
  aadharCard?: {
    number: string;
    imageUrl: string;
    verified?: boolean;
  };
  bankStatement?: {
    imageUrl: string;
    verified?: boolean;
  };
  gstCertificate?: {
    number: string;
    imageUrl: string;
    verified?: boolean;
  };
  incorporationCertificate?: {
    imageUrl: string;
    verified?: boolean;
  };
}

export interface VerificationDetails {
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: Date;
  notes?: string;
}

export interface RazorpayAccountData {
  accountId?: string;
  contactId?: string;
  fundAccountId?: string;
  status?: string;
  activationStatus?: string;
}

export interface BusinessDetails {
  name?: string;
  type?: string; // INDIVIDUAL, PARTNERSHIP, PRIVATE_LIMITED, etc.
  gstNumber?: string;
  panNumber?: string;
  registrationNumber?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

export interface SellerAccountMetadata {
  tags?: string[];
  customFields?: Record<string, any>;
  integrationData?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export class SellerAccount {
  id: string;
  sellerId: string;

  // Bank Account Details
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: string; // SAVINGS, CURRENT
  upiId?: string;

  // KYC & Verification
  kycStatus: KycStatus;
  kycDocuments?: KycDocuments;
  verificationDetails?: VerificationDetails;
  verifiedAt?: Date;

  // Account Status
  status: SellerAccountStatus;
  isVerified: boolean;

  // Razorpay Integration
  razorpayAccountId?: string;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;

  // Business Details
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  panNumber?: string;

  // Metadata
  metadata: SellerAccountMetadata;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<SellerAccount>) {
    Object.assign(this, data);
    this.metadata = this.metadata || {};
    this.kycStatus = this.kycStatus || KycStatus.PENDING;
    this.status = this.status || SellerAccountStatus.ACTIVE;
    this.isVerified = this.isVerified || false;
    this.accountType = this.accountType || 'SAVINGS';
  }

  // ============================================================================
  // KYC MANAGEMENT
  // ============================================================================

  canSubmitKyc(): boolean {
    return (
      this.kycStatus === KycStatus.PENDING ||
      this.kycStatus === KycStatus.REJECTED
    );
  }

  submitKyc(documents: KycDocuments): void {
    if (!this.canSubmitKyc()) {
      throw new Error(`Cannot submit KYC in status: ${this.kycStatus}`);
    }

    this.kycDocuments = documents;
    this.kycStatus = KycStatus.SUBMITTED;
    this.updatedAt = new Date();
  }

  verifyKyc(verifiedBy: string, notes?: string): void {
    if (this.kycStatus !== KycStatus.SUBMITTED) {
      throw new Error(`Cannot verify KYC in status: ${this.kycStatus}`);
    }

    this.kycStatus = KycStatus.VERIFIED;
    this.isVerified = true;
    this.verifiedAt = new Date();

    this.verificationDetails = {
      verifiedBy,
      verifiedAt: new Date(),
      notes,
    };

    this.updatedAt = new Date();
  }

  rejectKyc(rejectedBy: string, reason: string, notes?: string): void {
    if (this.kycStatus !== KycStatus.SUBMITTED) {
      throw new Error(`Cannot reject KYC in status: ${this.kycStatus}`);
    }

    this.kycStatus = KycStatus.REJECTED;
    this.isVerified = false;

    this.verificationDetails = {
      rejectionReason: reason,
      rejectedBy,
      rejectedAt: new Date(),
      notes,
    };

    this.updatedAt = new Date();
  }

  // ============================================================================
  // ACCOUNT STATUS MANAGEMENT
  // ============================================================================

  canActivate(): boolean {
    return this.status === SellerAccountStatus.SUSPENDED;
  }

  canSuspend(): boolean {
    return this.status === SellerAccountStatus.ACTIVE;
  }

  canClose(): boolean {
    return this.status !== SellerAccountStatus.CLOSED;
  }

  activate(): void {
    if (!this.canActivate()) {
      throw new Error(`Cannot activate account in status: ${this.status}`);
    }

    this.status = SellerAccountStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    if (!this.canSuspend()) {
      throw new Error(`Cannot suspend account in status: ${this.status}`);
    }

    this.status = SellerAccountStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  close(): void {
    if (!this.canClose()) {
      throw new Error(`Cannot close account in status: ${this.status}`);
    }

    this.status = SellerAccountStatus.CLOSED;
    this.updatedAt = new Date();
  }

  // ============================================================================
  // RAZORPAY INTEGRATION
  // ============================================================================

  setRazorpayData(data: RazorpayAccountData): void {
    this.razorpayAccountId = data.accountId;
    this.razorpayContactId = data.contactId;
    this.razorpayFundAccountId = data.fundAccountId;
    this.updatedAt = new Date();
  }

  hasRazorpayIntegration(): boolean {
    return !!(
      this.razorpayAccountId &&
      this.razorpayContactId &&
      this.razorpayFundAccountId
    );
  }

  getRazorpayData(): RazorpayAccountData {
    return {
      accountId: this.razorpayAccountId,
      contactId: this.razorpayContactId,
      fundAccountId: this.razorpayFundAccountId,
    };
  }

  // ============================================================================
  // BUSINESS LOGIC
  // ============================================================================

  isActive(): boolean {
    return this.status === SellerAccountStatus.ACTIVE;
  }

  canReceivePayouts(): boolean {
    return (
      this.isActive() &&
      this.isVerified &&
      this.kycStatus === KycStatus.VERIFIED &&
      this.hasRazorpayIntegration()
    );
  }

  getCompletionPercentage(): number {
    let completed = 0;
    let total = 0;

    // Basic details (40%)
    total += 4;
    if (this.accountHolderName) completed++;
    if (this.accountNumber) completed++;
    if (this.ifscCode) completed++;
    if (this.bankName) completed++;

    // KYC documents (40%)
    total += 4;
    if (this.kycDocuments?.panCard?.verified) completed++;
    if (this.kycDocuments?.aadharCard?.verified) completed++;
    if (this.kycDocuments?.bankStatement?.verified) completed++;
    if (
      this.businessType !== 'INDIVIDUAL' &&
      this.kycDocuments?.gstCertificate?.verified
    )
      completed++;

    // Verification (20%)
    total += 2;
    if (this.kycStatus === KycStatus.VERIFIED) completed++;
    if (this.hasRazorpayIntegration()) completed++;

    return Math.round((completed / total) * 100);
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validateBankDetails(): void {
    if (!this.accountHolderName?.trim()) {
      throw new Error('Account holder name is required');
    }

    if (!this.accountNumber?.trim()) {
      throw new Error('Account number is required');
    }

    if (!this.ifscCode?.trim()) {
      throw new Error('IFSC code is required');
    }

    if (!this.bankName?.trim()) {
      throw new Error('Bank name is required');
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(this.ifscCode)) {
      throw new Error('Invalid IFSC code format');
    }

    // Validate account number (basic check)
    if (this.accountNumber.length < 9 || this.accountNumber.length > 18) {
      throw new Error('Account number must be between 9 and 18 digits');
    }
  }

  validateBusinessDetails(): void {
    if (this.businessType && this.businessType !== 'INDIVIDUAL') {
      if (!this.businessName?.trim()) {
        throw new Error('Business name is required for business accounts');
      }

      if (!this.gstNumber?.trim()) {
        throw new Error('GST number is required for business accounts');
      }

      // Validate GST number format
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(this.gstNumber)) {
        throw new Error('Invalid GST number format');
      }
    }

    if (this.panNumber) {
      // Validate PAN number format
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(this.panNumber)) {
        throw new Error('Invalid PAN number format');
      }
    }
  }

  validate(): void {
    if (!this.sellerId) {
      throw new Error('Seller ID is required');
    }

    this.validateBankDetails();
    this.validateBusinessDetails();
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  toJSON(): any {
    return {
      id: this.id,
      sellerId: this.sellerId,
      bankDetails: {
        accountHolderName: this.accountHolderName,
        accountNumber: this.maskAccountNumber(),
        ifscCode: this.ifscCode,
        bankName: this.bankName,
        branchName: this.branchName,
        accountType: this.accountType,
        upiId: this.upiId,
      },
      kyc: {
        status: this.kycStatus,
        isVerified: this.isVerified,
        verifiedAt: this.verifiedAt,
        completionPercentage: this.getCompletionPercentage(),
      },
      status: {
        current: this.status,
        isActive: this.isActive(),
        canReceivePayouts: this.canReceivePayouts(),
      },
      razorpay: {
        hasIntegration: this.hasRazorpayIntegration(),
        accountId: this.razorpayAccountId,
      },
      business: {
        name: this.businessName,
        type: this.businessType,
        gstNumber: this.gstNumber,
        panNumber: this.panNumber,
      },
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toSecureJSON(): any {
    const json = this.toJSON();

    // Remove sensitive information
    delete json.bankDetails.accountNumber;
    delete json.business.gstNumber;
    delete json.business.panNumber;

    return json;
  }

  private maskAccountNumber(): string {
    if (!this.accountNumber) return '';

    const length = this.accountNumber.length;
    if (length <= 4) return this.accountNumber;

    const visibleChars = 4;
    const maskedChars = length - visibleChars;
    const mask = '*'.repeat(maskedChars);

    return mask + this.accountNumber.slice(-visibleChars);
  }
}
