import { Knex } from 'knex';
import { 
  Seller, 
  Document, 
  AuditLog, 
  OTPRecord, 
  RateLimitRecord, 
  SessionRecord,
  ProfileCompletionStatus,
  RegistrationRequest,
  RegistrationResponse
} from '@shambit/shared';
import bcrypt from 'bcrypt';

// Note: Enhanced OTP service will be imported from API layer when called
// This service is designed to be used from the API layer, not directly

export class SellerRegistrationService {
  constructor(private db: Knex, private otpService?: any) {}

  /**
   * Register a new seller with enhanced OTP verification and duplicate prevention
   */
  async registerSeller(
    registrationData: RegistrationRequest,
    ipAddress?: string
  ): Promise<RegistrationResponse> {
    try {
      // Enhanced duplicate account prevention
      const duplicateCheck = await this.checkDuplicateAccountPatterns(
        registrationData.mobile,
        registrationData.email,
        registrationData.deviceFingerprint,
        ipAddress
      );

      if (duplicateCheck.isDuplicate) {
        // Get specific recovery suggestions
        const recoverySuggestions = await this.getAccountRecoverySuggestions(registrationData.mobile);
        
        const error = new Error(`Account already exists. ${recoverySuggestions.suggestions.join(' ')}`);
        (error as any).code = 'DUPLICATE_ACCOUNT';
        (error as any).details = {
          duplicateType: 'account_exists',
          riskLevel: duplicateCheck.riskLevel,
          flags: duplicateCheck.flags,
          suggestions: recoverySuggestions.suggestions,
          canLogin: recoverySuggestions.canLogin,
          canResetPassword: recoverySuggestions.canResetPassword,
          accountStatus: recoverySuggestions.accountStatus,
          verificationStatus: recoverySuggestions.verificationStatus
        };
        throw error;
      }

      // Check for high-risk patterns
      if (duplicateCheck.riskLevel === 'high') {
        const error = new Error('Registration blocked due to suspicious activity patterns');
        (error as any).code = 'HIGH_RISK_REGISTRATION';
        (error as any).details = {
          riskLevel: duplicateCheck.riskLevel,
          flags: duplicateCheck.flags,
          suggestions: duplicateCheck.suggestions
        };
        throw error;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(registrationData.password, 12);

      // Prepare device fingerprints array
      const deviceFingerprints = registrationData.deviceFingerprint 
        ? [registrationData.deviceFingerprint] 
        : [];

      // Create seller record
      const sellerId = await this.createSeller({
        fullName: registrationData.fullName,
        mobile: registrationData.mobile,
        email: registrationData.email,
        passwordHash,
        mobileVerified: false,
        emailVerified: false,
        accountStatus: 'active',
        status: 'active',
        verificationStatus: 'pending',
        canListProducts: false,
        payoutEnabled: false,
        deviceFingerprints,
        featureAccess: {
          productListing: false,
          payoutProcessing: false,
          bulkOperations: false,
          advancedAnalytics: false
        },
        slaTracking: {
          escalationLevel: 0
        },
        loginAttempts: 0
      });

      // Generate and send OTP if service is available
      let otpResult = {
        success: true,
        expiresIn: 300,
        attemptsRemaining: 3
      };

      if (this.otpService) {
        otpResult = await this.otpService.generateAndSendOTP(
          registrationData.mobile,
          'sms',
          ipAddress
        );
      }

      // Create audit log with risk assessment
      await this.createAuditLog({
        sellerId,
        action: 'seller_registration',
        entityType: 'seller',
        entityId: sellerId,
        newValues: {
          fullName: registrationData.fullName,
          mobile: registrationData.mobile,
          email: registrationData.email,
          mobileVerified: false,
          riskLevel: duplicateCheck.riskLevel,
          riskFlags: duplicateCheck.flags
        },
        performedBy: 'system',
        ipAddress: ipAddress || 'unknown',
        userAgent: 'registration-system',
        riskLevel: duplicateCheck.riskLevel
      });

      return {
        success: otpResult.success,
        data: {
          sellerId,
          otpSent: otpResult.success,
          expiresIn: otpResult.expiresIn,
          riskAssessment: {
            riskLevel: duplicateCheck.riskLevel,
            flags: duplicateCheck.flags
          }
        }
      };

    } catch (error) {
      console.error('Seller registration failed:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and complete registration
   */
  async verifyRegistrationOTP(
    mobile: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
    authService?: any
  ): Promise<{
    success: boolean;
    verified: boolean;
    seller?: Seller;
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
    error?: string;
  }> {
    try {
      // Verify OTP if service is available
      let otpResult = { verified: true, error: undefined };
      
      if (this.otpService) {
        otpResult = await this.otpService.verifyOTP(mobile, otp, ipAddress);
      }

      if (!otpResult.verified) {
        return {
          success: false,
          verified: false,
          error: otpResult.error
        };
      }

      // Get seller by mobile
      const seller = await this.getSellerByMobile(mobile);
      if (!seller) {
        return {
          success: false,
          verified: false,
          error: 'Seller not found'
        };
      }

      // Mark mobile as verified
      await this.verifySellerMobile(seller.id);
      const updatedSeller = { ...seller, mobileVerified: true };

      // Generate tokens using auth service if available
      let tokens;
      if (authService && authService.generateTokenPair) {
        const tokenPair = await authService.generateTokenPair(updatedSeller, ipAddress, userAgent);
        tokens = {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        };
      } else {
        // Fallback to placeholder tokens
        tokens = {
          accessToken: `temp-access-token-${seller.id}`,
          refreshToken: `temp-refresh-token-${seller.id}`
        };
      }

      // Create audit log
      await this.createAuditLog({
        sellerId: seller.id,
        action: 'mobile_verification',
        entityType: 'seller',
        entityId: seller.id,
        oldValues: { mobileVerified: false },
        newValues: { mobileVerified: true },
        performedBy: 'system',
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'mobile-verification'
      });

      // Update last login
      await this.updateLastLogin(seller.id);

      return {
        success: true,
        verified: true,
        seller: updatedSeller,
        tokens
      };

    } catch (error) {
      console.error('OTP verification failed:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Resend OTP with method fallback
   */
  async resendOTP(
    mobile: string,
    method: 'sms' | 'whatsapp' = 'sms',
    ipAddress?: string
  ): Promise<{
    success: boolean;
    sent: boolean;
    expiresIn: number;
    attemptsRemaining: number;
    cooldownSeconds?: number;
    method: 'sms' | 'whatsapp';
  }> {
    try {
      if (!this.otpService) {
        return {
          success: true,
          sent: true,
          expiresIn: 300,
          attemptsRemaining: 3,
          method
        };
      }

      const result = await this.otpService.resendOTP(mobile, method, ipAddress);

      return {
        success: result.success,
        sent: result.success,
        expiresIn: result.expiresIn,
        attemptsRemaining: result.attemptsRemaining,
        cooldownSeconds: result.cooldownSeconds,
        method: result.method
      };

    } catch (error) {
      console.error('OTP resend failed:', error);
      return {
        success: false,
        sent: false,
        expiresIn: 0,
        attemptsRemaining: 0,
        method
      };
    }
  }

  /**
   * Check if seller already exists with enhanced duplicate prevention
   */
  private async checkExistingSeller(mobile: string, email: string): Promise<{
    exists: boolean;
    message?: string;
    duplicateType?: 'mobile' | 'email' | 'both';
    accountRecoveryOptions?: {
      canLogin: boolean;
      canResetPassword: boolean;
      isAccountActive: boolean;
      lastLoginAt?: Date;
      verificationStatus?: string;
    };
  }> {
    const existingMobile = await this.db('simplified_sellers')
      .where('mobile', mobile)
      .first();

    const existingEmail = await this.db('simplified_sellers')
      .where('email', email)
      .first();

    if (existingMobile && existingEmail && existingMobile.id === existingEmail.id) {
      // Same account with both mobile and email
      return {
        exists: true,
        duplicateType: 'both',
        message: 'An account with this mobile number and email already exists. You can log in directly.',
        accountRecoveryOptions: {
          canLogin: existingMobile.account_status === 'active',
          canResetPassword: true,
          isAccountActive: existingMobile.account_status === 'active',
          lastLoginAt: existingMobile.last_login_at,
          verificationStatus: existingMobile.verification_status
        }
      };
    }

    if (existingMobile) {
      return {
        exists: true,
        duplicateType: 'mobile',
        message: 'An account with this mobile number already exists. Try logging in or use password recovery.',
        accountRecoveryOptions: {
          canLogin: existingMobile.account_status === 'active',
          canResetPassword: true,
          isAccountActive: existingMobile.account_status === 'active',
          lastLoginAt: existingMobile.last_login_at,
          verificationStatus: existingMobile.verification_status
        }
      };
    }

    if (existingEmail) {
      return {
        exists: true,
        duplicateType: 'email',
        message: 'An account with this email address already exists. Try logging in or use password recovery.',
        accountRecoveryOptions: {
          canLogin: existingEmail.account_status === 'active',
          canResetPassword: true,
          isAccountActive: existingEmail.account_status === 'active',
          lastLoginAt: existingEmail.last_login_at,
          verificationStatus: existingEmail.verification_status
        }
      };
    }

    return { exists: false };
  }

  /**
   * Enhanced duplicate account prevention with device fingerprinting
   */
  async checkDuplicateAccountPatterns(
    mobile: string,
    email: string,
    deviceFingerprint?: string,
    ipAddress?: string
  ): Promise<{
    isDuplicate: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    flags: string[];
    suggestions: string[];
  }> {
    const flags: string[] = [];
    const suggestions: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check basic email/mobile duplicates
    const basicCheck = await this.checkExistingSeller(mobile, email);
    if (basicCheck.exists) {
      flags.push('duplicate_credentials');
      suggestions.push('Use existing account login');
      if (basicCheck.accountRecoveryOptions?.canResetPassword) {
        suggestions.push('Try password recovery');
      }
      riskLevel = 'medium';
    }

    // Check device fingerprint patterns if available
    if (deviceFingerprint) {
      const deviceAccounts = await this.db('simplified_sellers')
        .whereRaw("device_fingerprints ? ?", [deviceFingerprint])
        .count('* as count')
        .first();

      const deviceCount = parseInt(deviceAccounts?.count as string || '0');
      if (deviceCount > 3) {
        flags.push('multiple_accounts_same_device');
        suggestions.push('Contact support if you need multiple accounts');
        riskLevel = 'high';
      } else if (deviceCount > 1) {
        flags.push('device_reuse');
        riskLevel = 'medium';
      }
    }

    // Check IP-based patterns if available
    if (ipAddress) {
      const recentRegistrations = await this.db('seller_audit_logs')
        .where('action', 'seller_registration')
        .where('ip_address', ipAddress)
        .where('performed_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .count('* as count')
        .first();

      const ipCount = parseInt(recentRegistrations?.count as string || '0');
      if (ipCount > 5) {
        flags.push('excessive_registrations_from_ip');
        suggestions.push('Contact support if you are registering multiple legitimate accounts');
        riskLevel = 'high';
      } else if (ipCount > 2) {
        flags.push('multiple_registrations_from_ip');
        riskLevel = 'medium';
      }
    }

    return {
      isDuplicate: basicCheck.exists,
      riskLevel,
      flags,
      suggestions
    };
  }

  /**
   * Get account recovery suggestions for duplicate accounts
   */
  async getAccountRecoverySuggestions(identifier: string): Promise<{
    found: boolean;
    suggestions: string[];
    canLogin: boolean;
    canResetPassword: boolean;
    accountStatus?: string;
    verificationStatus?: string;
    lastLoginAt?: Date;
  }> {
    // Check if identifier is email or mobile
    const isEmail = identifier.includes('@');
    const field = isEmail ? 'email' : 'mobile';

    const account = await this.db('simplified_sellers')
      .where(field, identifier)
      .first();

    if (!account) {
      return {
        found: false,
        suggestions: ['No account found with this identifier', 'You can register a new account'],
        canLogin: false,
        canResetPassword: false
      };
    }

    const suggestions: string[] = [];
    const canLogin = account.account_status === 'active';
    const canResetPassword = account.account_status !== 'deleted';

    if (canLogin) {
      suggestions.push('You can log in with your existing credentials');
    }

    if (canResetPassword) {
      suggestions.push('Use "Forgot Password" to reset your password');
    }

    if (account.account_status === 'deactivated') {
      suggestions.push('Your account is deactivated. Contact support to reactivate');
    }

    if (account.verification_status === 'pending') {
      suggestions.push('Complete your account verification to unlock all features');
    }

    if (!account.mobile_verified) {
      suggestions.push('Verify your mobile number to secure your account');
    }

    if (!account.email_verified) {
      suggestions.push('Verify your email address to receive important updates');
    }

    return {
      found: true,
      suggestions,
      canLogin,
      canResetPassword,
      accountStatus: account.account_status,
      verificationStatus: account.verification_status,
      lastLoginAt: account.last_login_at
    };
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(sellerId: string): Promise<void> {
    await this.db('simplified_sellers')
      .where('id', sellerId)
      .update({
        last_login_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      });
  }

  /**
   * Create a new seller record
   */
  async createSeller(sellerData: Omit<Seller, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const [seller] = await this.db('simplified_sellers')
      .insert({
        full_name: sellerData.fullName,
        mobile: sellerData.mobile,
        email: sellerData.email,
        password_hash: sellerData.passwordHash,
        mobile_verified: sellerData.mobileVerified,
        email_verified: sellerData.emailVerified,
        business_details: sellerData.businessDetails ? JSON.stringify(sellerData.businessDetails) : null,
        address_info: sellerData.addressInfo ? JSON.stringify(sellerData.addressInfo) : null,
        tax_compliance: sellerData.taxCompliance ? JSON.stringify(sellerData.taxCompliance) : null,
        bank_details: sellerData.bankDetails ? JSON.stringify(sellerData.bankDetails) : null,
        risk_score: sellerData.riskScore,
        risk_flags: sellerData.riskFlags ? JSON.stringify(sellerData.riskFlags) : null,
        last_risk_assessment: sellerData.lastRiskAssessment,
        device_fingerprints: sellerData.deviceFingerprints ? JSON.stringify(sellerData.deviceFingerprints) : null,
        suspicious_activity_flags: sellerData.suspiciousActivityFlags ? JSON.stringify(sellerData.suspiciousActivityFlags) : null,
        account_status: sellerData.accountStatus || 'active',
        status: sellerData.status,
        verification_status: sellerData.verificationStatus,
        can_list_products: sellerData.canListProducts,
        payout_enabled: sellerData.payoutEnabled,
        feature_access: JSON.stringify(sellerData.featureAccess),
        sla_tracking: JSON.stringify(sellerData.slaTracking),
        last_login_at: sellerData.lastLoginAt,
        login_attempts: sellerData.loginAttempts
      })
      .returning('id');
    
    return seller.id;
  }

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller | null> {
    const seller = await this.db('simplified_sellers')
      .where('id', id)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Get seller by mobile number
   */
  async getSellerByMobile(mobile: string): Promise<Seller | null> {
    const seller = await this.db('simplified_sellers')
      .where('mobile', mobile)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Get seller by email
   */
  async getSellerByEmail(email: string): Promise<Seller | null> {
    const seller = await this.db('simplified_sellers')
      .where('email', email)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Update seller profile section
   */
  async updateSellerProfile(
    sellerId: string, 
    section: 'business_details' | 'address_info' | 'tax_compliance' | 'bank_details',
    data: any
  ): Promise<boolean> {
    const result = await this.db('simplified_sellers')
      .where('id', sellerId)
      .update({
        [section]: JSON.stringify(data),
        updated_at: this.db.fn.now()
      });
    
    return result > 0;
  }

  /**
   * Update seller verification status
   */
  async updateSellerVerificationStatus(
    sellerId: string, 
    status: 'pending' | 'in_review' | 'verified' | 'rejected'
  ): Promise<boolean> {
    const result = await this.db('simplified_sellers')
      .where('id', sellerId)
      .update({
        verification_status: status,
        updated_at: this.db.fn.now()
      });
    
    return result > 0;
  }

  /**
   * Verify seller mobile number
   */
  async verifySellerMobile(sellerId: string): Promise<boolean> {
    const result = await this.db('simplified_sellers')
      .where('id', sellerId)
      .update({
        mobile_verified: true,
        updated_at: this.db.fn.now()
      });
    
    return result > 0;
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletionStatus(sellerId: string): Promise<ProfileCompletionStatus | null> {
    const seller = await this.db('simplified_sellers')
      .where('id', sellerId)
      .first();
    
    if (!seller) return null;
    
    const basicInfo = true; // Always true after registration
    const businessDetails = !!seller.business_details;
    const addressInfo = !!seller.address_info;
    const taxCompliance = !!seller.tax_compliance;
    const bankDetails = !!seller.bank_details;
    
    // Check document verification
    const documentCount = await this.db('seller_documents')
      .where('seller_id', sellerId)
      .where('verification_status', 'verified')
      .count('* as count')
      .first();
    
    const documentVerification = Number(documentCount?.count || 0) > 0;
    
    const completedSections = [
      basicInfo,
      businessDetails,
      addressInfo,
      taxCompliance,
      bankDetails,
      documentVerification
    ].filter(Boolean).length;
    
    const overallProgress = (completedSections / 6) * 100;
    
    return {
      basicInfo,
      businessDetails,
      addressInfo,
      taxCompliance,
      bankDetails,
      documentVerification,
      overallProgress,
      requiredSections: ['business', 'tax', 'bank', 'documents'],
      optionalSections: ['address'],
      unlockedFeatures: this.getUnlockedFeatures(seller, documentVerification),
      nextSteps: this.getNextSteps(businessDetails, taxCompliance, bankDetails, documentVerification)
    };
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(auditData: Omit<AuditLog, 'id' | 'performedAt'>): Promise<string> {
    const [audit] = await this.db('seller_audit_logs')
      .insert({
        seller_id: auditData.sellerId,
        action: auditData.action,
        entity_type: auditData.entityType,
        entity_id: auditData.entityId,
        old_values: auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
        new_values: auditData.newValues ? JSON.stringify(auditData.newValues) : null,
        performed_by: auditData.performedBy,
        ip_address: auditData.ipAddress,
        user_agent: auditData.userAgent
      })
      .returning('id');
    
    return audit.id;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(identifier: string, action: string, windowMinutes: number, maxRequests: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const count = await this.db('rate_limits')
      .where('identifier', identifier)
      .where('action', action)
      .where('window_start', '>=', windowStart)
      .sum('count as total')
      .first();
    
    return (count?.total || 0) < maxRequests;
  }

  /**
   * Record rate limit attempt
   */
  async recordRateLimitAttempt(identifier: string, action: string, windowMinutes: number): Promise<void> {
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + windowMinutes * 60 * 1000);
    
    await this.db('rate_limits')
      .insert({
        identifier,
        identifier_type: 'mobile',
        action,
        count: 1,
        window_start: windowStart,
        window_end: windowEnd
      })
      .onConflict(['identifier', 'action', 'window_start'])
      .merge({
        count: this.db.raw('rate_limits.count + 1'),
        updated_at: this.db.fn.now()
      });
  }

  /**
   * Create session record
   */
  async createSession(sessionData: Omit<SessionRecord, 'id' | 'createdAt'>): Promise<string> {
    const [session] = await this.db('seller_sessions')
      .insert({
        seller_id: sessionData.sellerId,
        refresh_token_hash: sessionData.refreshTokenHash,
        token_family: sessionData.tokenFamily,
        expires_at: sessionData.expiresAt,
        ip_address: sessionData.ipAddress,
        user_agent: sessionData.userAgent
      })
      .returning('id');
    
    return session.id;
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.db('seller_sessions')
      .where('id', sessionId)
      .update({
        revoked: true,
        revoked_at: this.db.fn.now()
      });
    
    return result > 0;
  }

  /**
   * Clean up expired records
   */
  async cleanupExpiredRecords(): Promise<void> {
    const now = new Date();
    
    // Clean up expired OTPs (if OTP service is available, use it, otherwise clean directly)
    if (this.otpService && this.otpService.cleanupExpiredOTPs) {
      await this.otpService.cleanupExpiredOTPs();
    } else {
      // Fallback to direct database cleanup
      await this.db('seller_otps')
        .where('expires_at', '<', now)
        .del();
    }
    
    // Clean up expired rate limits
    await this.db('rate_limits')
      .where('window_end', '<', now)
      .del();
    
    // Clean up expired sessions
    await this.db('seller_sessions')
      .where('expires_at', '<', now)
      .del();
  }

  /**
   * Map database seller record to Seller interface
   */
  private mapDbSellerToSeller(dbSeller: any): Seller {
    return {
      id: dbSeller.id,
      fullName: dbSeller.full_name,
      mobile: dbSeller.mobile,
      email: dbSeller.email,
      passwordHash: dbSeller.password_hash,
      mobileVerified: dbSeller.mobile_verified,
      emailVerified: dbSeller.email_verified,
      businessDetails: dbSeller.business_details ? JSON.parse(dbSeller.business_details) : undefined,
      addressInfo: dbSeller.address_info ? JSON.parse(dbSeller.address_info) : undefined,
      taxCompliance: dbSeller.tax_compliance ? JSON.parse(dbSeller.tax_compliance) : undefined,
      bankDetails: dbSeller.bank_details ? JSON.parse(dbSeller.bank_details) : undefined,
      riskScore: dbSeller.risk_score,
      riskFlags: dbSeller.risk_flags ? JSON.parse(dbSeller.risk_flags) : undefined,
      lastRiskAssessment: dbSeller.last_risk_assessment,
      deviceFingerprints: dbSeller.device_fingerprints ? JSON.parse(dbSeller.device_fingerprints) : [],
      suspiciousActivityFlags: dbSeller.suspicious_activity_flags ? JSON.parse(dbSeller.suspicious_activity_flags) : [],
      accountStatus: dbSeller.account_status || 'active',
      status: dbSeller.status,
      verificationStatus: dbSeller.verification_status,
      canListProducts: dbSeller.can_list_products,
      payoutEnabled: dbSeller.payout_enabled,
      featureAccess: dbSeller.feature_access ? JSON.parse(dbSeller.feature_access) : {
        productListing: dbSeller.can_list_products,
        payoutProcessing: dbSeller.payout_enabled,
        bulkOperations: false,
        advancedAnalytics: false
      },
      slaTracking: dbSeller.sla_tracking ? JSON.parse(dbSeller.sla_tracking) : {
        escalationLevel: 0
      },
      createdAt: dbSeller.created_at,
      updatedAt: dbSeller.updated_at,
      lastLoginAt: dbSeller.last_login_at,
      loginAttempts: dbSeller.login_attempts || 0,
      lastFailedLoginAt: dbSeller.last_failed_login_at,
      accountLockedUntil: dbSeller.account_locked_until
    };
  }

  /**
   * Get unlocked features based on completion status
   */
  private getUnlockedFeatures(seller: any, documentVerification: boolean): string[] {
    const features: string[] = [];
    
    if (seller.business_details && seller.tax_compliance) {
      features.push('basic_listing');
    }
    
    if (seller.bank_details && documentVerification) {
      features.push('payout_processing');
    }
    
    if (seller.verification_status === 'verified') {
      features.push('advanced_features');
    }
    
    return features;
  }

  /**
   * Get next steps based on completion status
   */
  private getNextSteps(
    businessDetails: boolean,
    taxCompliance: boolean,
    bankDetails: boolean,
    documentVerification: boolean
  ): string[] {
    const steps: string[] = [];
    
    if (!businessDetails) {
      steps.push('Complete business details');
    }
    
    if (!taxCompliance) {
      steps.push('Add tax compliance information');
    }
    
    if (!bankDetails) {
      steps.push('Verify bank account details');
    }
    
    if (!documentVerification) {
      steps.push('Upload required documents');
    }
    
    if (steps.length === 0) {
      steps.push('Profile complete - await verification');
    }
    
    return steps;
  }
}