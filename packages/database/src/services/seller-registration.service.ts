import { Knex } from 'knex';
import { 
  Seller, 
  AuditLog, 
  RateLimitRecord, 
  SessionRecord,
  ProfileCompletionStatus,
  RegistrationRequest,
  RegistrationResponse
} from '@shambit/shared';
import { AuthServiceInterface } from '../interfaces/auth-service.interface';

interface RegistrationSession {
  id: string;
  mobile: string;
  email: string;
  fullName: string;
  passwordHash: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskFlags: string[];
  expiresAt: Date;
  createdAt: Date;
}

// Persistence-safe DTO for seller creation - only allows fields that are actually inserted
type SellerCreateInput = {
  fullName: string;
  mobile: string;
  email: string;
  passwordHash: string;
  mobileVerified?: boolean;
  emailVerified?: boolean;
};
import bcrypt from 'bcrypt';

// Note: Enhanced OTP service will be imported from API layer when called
// This service is designed to be used from the API layer, not directly

export class SellerRegistrationService {
  private sessionSchemaFlags: {
    hasAccessTokenJti: boolean;
    hasAccessTokenExpiresAt: boolean;
    hasRevokedColumns: boolean;
  } = {
    hasAccessTokenJti: false,
    hasAccessTokenExpiresAt: false,
    hasRevokedColumns: false
  };

  private sellerSchemaFlags: {
    hasLastLoginAt: boolean;
    hasUpdatedAt: boolean;
  } = {
    hasLastLoginAt: false,
    hasUpdatedAt: false
  };

  constructor(private db: Knex, private otpService?: any) {
    this.initializeSchemaFlags();
  }

  /**
   * Initialize schema flags at startup to avoid hot path queries
   */
  private async initializeSchemaFlags(): Promise<void> {
    try {
      // Check for optional columns once at startup
      await this.db.raw("SELECT access_token_jti FROM seller_sessions LIMIT 0");
      this.sessionSchemaFlags.hasAccessTokenJti = true;
    } catch (error) {
      this.sessionSchemaFlags.hasAccessTokenJti = false;
    }

    try {
      await this.db.raw("SELECT access_token_expires_at FROM seller_sessions LIMIT 0");
      this.sessionSchemaFlags.hasAccessTokenExpiresAt = true;
    } catch (error) {
      this.sessionSchemaFlags.hasAccessTokenExpiresAt = false;
    }

    try {
      await this.db.raw("SELECT revoked FROM seller_sessions LIMIT 0");
      this.sessionSchemaFlags.hasRevokedColumns = true;
    } catch (error) {
      this.sessionSchemaFlags.hasRevokedColumns = false;
    }

    // Check seller table schema flags
    try {
      await this.db.raw("SELECT last_login_at FROM sellers LIMIT 0");
      this.sellerSchemaFlags.hasLastLoginAt = true;
    } catch (error) {
      this.sellerSchemaFlags.hasLastLoginAt = false;
    }

    try {
      await this.db.raw("SELECT updated_at FROM sellers LIMIT 0");
      this.sellerSchemaFlags.hasUpdatedAt = true;
    } catch (error) {
      this.sellerSchemaFlags.hasUpdatedAt = false;
    }
  }

  /**
   * Safely parse JSON with fallback - handles both string and object inputs
   */
  private safeJsonParse<T>(jsonData: string | object | null | undefined, fallback: T): T {
    if (!jsonData) return fallback;
    
    // If it's already an object, return it directly
    if (typeof jsonData === 'object') {
      return jsonData as T;
    }
    
    // If it's a string, try to parse it
    if (typeof jsonData === 'string') {
      try {
        const parsed = JSON.parse(jsonData);
        return parsed !== null && parsed !== undefined ? parsed : fallback;
      } catch (error) {
        console.warn('Failed to parse JSON:', jsonData, error);
        return fallback;
      }
    }
    
    return fallback;
  }

  /**
   * Register a new seller with enhanced OTP verification and duplicate prevention
   * Creates a registration session, NOT a seller account
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

      // Check for high-risk patterns FIRST (fraud overrides UX)
      if (duplicateCheck.riskLevel === 'high') {
        const error = new Error('Registration blocked due to suspicious activity patterns');
        (error as any).code = 'HIGH_RISK_REGISTRATION';
        (error as any).details = {
          riskLevel: duplicateCheck.riskLevel,
          flags: duplicateCheck.flags
        };
        throw error;
      }

      if (duplicateCheck.isDuplicate) {
        // Use the existing account information from the duplicate check
        const basicCheck = await this.checkExistingSeller(registrationData.mobile, registrationData.email);
        
        const error = new Error(`Account already exists. ${basicCheck.message || 'Try logging in with your existing credentials'}`);
        (error as any).code = 'DUPLICATE_ACCOUNT';
        (error as any).details = {
          duplicateType: basicCheck.duplicateType || 'account_exists',
          riskLevel: duplicateCheck.riskLevel,
          flags: duplicateCheck.flags,
          suggestions: basicCheck.message ? [basicCheck.message] : ['Try logging in with your existing credentials', 'Use "Forgot Password" to reset your password'],
          canLogin: basicCheck.accountRecoveryOptions?.canLogin || false,
          canResetPassword: basicCheck.accountRecoveryOptions?.canResetPassword || true
        };
        throw error;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(registrationData.password, 12);

      // Create registration session (NOT seller account)
      const sessionId = await this.createRegistrationSession({
        mobile: registrationData.mobile,
        email: registrationData.email,
        fullName: registrationData.fullName,
        passwordHash,
        deviceFingerprint: registrationData.deviceFingerprint,
        ipAddress,
        riskLevel: duplicateCheck.riskLevel,
        riskFlags: duplicateCheck.flags
      });

      // Generate and send OTP if service is available
      if (!this.otpService) {
        throw new Error('OTP service not configured');
      }

      const otpResult = await this.otpService.generateAndSendOTP(
        registrationData.mobile,
        'registration', // Changed from 'sms' to 'registration' to match verification
        Number(process.env.OTP_EXPIRY_SECONDS) || 300 // Use env config or 5 minutes default
      );

      // Create audit log for registration attempt
      await this.createAuditLog({
        sellerId: null, // No seller created yet
        action: 'registration_attempt',
        entityType: 'registration_session',
        entityId: sessionId,
        newValues: {
          mobile: registrationData.mobile,
          email: registrationData.email,
          fullName: registrationData.fullName,
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
          sessionId,
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
   * Verify OTP and complete registration - creates the actual seller account
   * CRITICAL: OTP verification happens BEFORE session consumption to prevent races
   */
  async verifyRegistrationOTP(
    sessionId: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
    authService?: AuthServiceInterface
  ): Promise<{
    success: boolean;
    verified: boolean;
    seller?: Seller;
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
    error?: string;
    errorCode?: 'OTP_INVALID' | 'SESSION_EXPIRED' | 'AUTH_SERVICE_ERROR' | 'SELLER_CREATION_FAILED' | 'TOKEN_GENERATION_FAILED';
    canRetry?: boolean;
    shouldRedirectToLogin?: boolean;
  }> {
    if (!this.otpService) {
      return {
        success: false,
        verified: false,
        error: 'OTP service not configured',
        errorCode: 'AUTH_SERVICE_ERROR',
        canRetry: false
      };
    }

    if (!authService?.generateTokenPair) {
      return {
        success: false,
        verified: false,
        error: 'Auth service not configured',
        errorCode: 'AUTH_SERVICE_ERROR',
        canRetry: false
      };
    }

    // Step 1: Get session (read-only) to verify OTP context
    const session = await this.getRegistrationSession(sessionId);
    if (!session) {
      return {
        success: false,
        verified: false,
        error: 'Registration session not found, expired, or already used',
        errorCode: 'SESSION_EXPIRED',
        canRetry: false
      };
    }

    // Step 2: Verify OTP BEFORE consuming session (prevents race abuse)
    const otpResult = await this.otpService.verifyOTP({
      mobile: session.mobile,
      otp,
      purpose: 'registration',
      sessionId,
      ipAddress
    });

    if (!otpResult.verified) {
      return {
        success: false,
        verified: false,
        error: otpResult.error || 'Invalid OTP',
        errorCode: 'OTP_INVALID',
        canRetry: true
      };
    }

    // Step 3: ATOMIC transaction - consume session, create seller, generate tokens
    try {
      return await this.db.transaction(async (trx) => {
        // Consume session atomically (one-way operation)
        const consumedSession = await this.consumeRegistrationSession(sessionId, trx);
        if (!consumedSession) {
          throw new Error('Registration session was consumed by another request or expired');
        }

        let sellerId: string;
        let seller: Seller;
        
        try {
          // Create seller account
          sellerId = await this.createSellerWithTransaction(trx, {
            fullName: consumedSession.fullName,
            mobile: consumedSession.mobile,
            email: consumedSession.email,
            passwordHash: consumedSession.passwordHash,
            mobileVerified: true,
            emailVerified: false
          });

          const createdSeller = await this.getSellerByIdWithTransaction(trx, sellerId);
          if (!createdSeller) {
            throw new Error('Failed to retrieve created seller');
          }
          seller = createdSeller;
        } catch (error) {
          console.error('Seller creation failed:', error);
          throw new Error('Failed to create seller account');
        }

        // Generate tokens with transaction support
        let tokens: { accessToken: string; refreshToken: string } | undefined;
        let tokenGenerationFailed = false;
        
        try {
          const tokenPair = await authService.generateTokenPair(trx, seller, ipAddress, userAgent);
          tokens = {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          };
          
          // Only update login timestamp AFTER successful token generation
          await this.updateLastLoginWithTransaction(trx, sellerId);
        } catch (error) {
          console.error('Token generation failed:', error);
          tokenGenerationFailed = true;
          // Do NOT update login timestamps if token generation fails
        }

        await this.createAuditLogWithTransaction(trx, {
          sellerId,
          action: 'seller_registration_completed',
          entityType: 'seller',
          entityId: sellerId,
          newValues: {
            fullName: consumedSession.fullName,
            mobile: consumedSession.mobile,
            email: consumedSession.email,
            mobileVerified: true,
            riskLevel: consumedSession.riskLevel,
            riskFlags: consumedSession.riskFlags,
            tokenGenerationSuccess: !tokenGenerationFailed
          },
          performedBy: 'system',
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'registration-verification',
          riskLevel: consumedSession.riskLevel
        });

        // ALWAYS cleanup registration session (success or partial success)
        await this.deleteRegistrationSessionWithTransaction(trx, sessionId);

        // Handle token generation failure AFTER seller creation
        if (tokenGenerationFailed) {
          return {
            success: true, // Seller was created successfully
            verified: true,
            seller,
            error: 'Account created but login session failed. Please login with your credentials.',
            errorCode: 'TOKEN_GENERATION_FAILED' as const,
            shouldRedirectToLogin: true,
            canRetry: false
          };
        }

        return {
          success: true,
          verified: true,
          seller,
          tokens: tokens! // tokens is guaranteed to be defined here since tokenGenerationFailed is false
        };
      });

    } catch (error) {
      console.error('Registration transaction failed:', error);
      
      // Cleanup session even on transaction failure (best effort, no rollback)
      try {
        await this.deleteRegistrationSession(sessionId);
      } catch (cleanupError) {
        console.error('Failed to cleanup registration session after transaction failure:', cleanupError);
        // Don't throw - cleanup failures should not affect the main error
      }

      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        errorCode: 'SELLER_CREATION_FAILED',
        canRetry: false
      };
    }
  }

  /**
   * Resend OTP with method fallback - requires session ID
   */
  async resendOTP(
    sessionId: string,
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
      // Get registration session
      const session = await this.getRegistrationSession(sessionId);
      if (!session) {
        return {
          success: false,
          sent: false,
          expiresIn: 0,
          attemptsRemaining: 0,
          method
        };
      }

      // Service-layer rate limiting (critical for security)
      const allowed = await this.checkRateLimit(
        session.mobile,
        'otp_resend',
        10, // 10 minutes window
        3   // max 3 resends
      );

      if (!allowed) {
        return {
          success: false,
          sent: false,
          expiresIn: 0,
          attemptsRemaining: 0,
          cooldownSeconds: 600, // 10 minutes
          method
        };
      }

      if (!this.otpService) {
        throw new Error('OTP service not configured');
      }

      const result = await this.otpService.resendOTP(
        session.mobile,
        method,
        ipAddress,
        'registration',
        sessionId
      );

      // Record rate limit attempt after successful send
      if (result.success) {
        await this.recordRateLimitAttempt(session.mobile, 'otp_resend', 10);
      }

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
    const existingMobile = await this.db('sellers')
      .where('mobile', mobile)
      .first();

    const existingEmail = await this.db('sellers')
      .where('email', email)
      .first();

    if (existingMobile && existingEmail && existingMobile.id === existingEmail.id) {
      // Same account with both mobile and email
      return {
        exists: true,
        duplicateType: 'both',
        message: 'An account with this mobile number and email already exists. You can log in directly.',
        accountRecoveryOptions: {
          canLogin: existingMobile.status === 'approved',
          canResetPassword: true,
          isAccountActive: existingMobile.status === 'approved',
          lastLoginAt: existingMobile.last_login_at,
          verificationStatus: existingMobile.overall_verification_status
        }
      };
    }

    if (existingMobile) {
      return {
        exists: true,
        duplicateType: 'mobile',
        message: 'An account with this mobile number already exists. Try logging in or use password recovery.',
        accountRecoveryOptions: {
          canLogin: existingMobile.status === 'approved',
          canResetPassword: true,
          isAccountActive: existingMobile.status === 'approved',
          lastLoginAt: existingMobile.last_login_at,
          verificationStatus: existingMobile.overall_verification_status
        }
      };
    }

    if (existingEmail) {
      return {
        exists: true,
        duplicateType: 'email',
        message: 'An account with this email address already exists. Try logging in or use password recovery.',
        accountRecoveryOptions: {
          canLogin: existingEmail.status === 'approved',
          canResetPassword: true,
          isAccountActive: existingEmail.status === 'approved',
          lastLoginAt: existingEmail.last_login_at,
          verificationStatus: existingEmail.overall_verification_status
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

    // Check basic email/mobile duplicates in sellers table
    const basicCheck = await this.checkExistingSeller(mobile, email);
    if (basicCheck.exists) {
      flags.push('duplicate_credentials');
      suggestions.push('Use existing account login');
      if (basicCheck.accountRecoveryOptions?.canResetPassword) {
        suggestions.push('Try password recovery');
      }
      riskLevel = 'medium';
    }

    // Also check for active registration sessions to prevent duplicate session creation
    if (!basicCheck.exists) {
      const activeSession = await this.db('registration_sessions')
        .where(function() {
          this.where('mobile', mobile).orWhere('email', email);
        })
        .whereNull('consumed_at')
        .where('expires_at', '>', new Date())
        .first();

      if (activeSession) {
        flags.push('active_registration_session');
        suggestions.push('Complete your existing registration by verifying the OTP sent to your mobile');
        suggestions.push('Wait for the current session to expire if you want to start fresh');
        riskLevel = 'medium';
      }
    }

    // Check device fingerprint patterns if available (safe + portable query)
    if (deviceFingerprint) {
      let deviceCount = 0;
      
      try {
        // Try JSONB query first (PostgreSQL)
        const deviceAccounts = await this.db('sellers')
          .whereRaw("device_fingerprints ? ?", [deviceFingerprint])
          .count('* as count')
          .first();
        deviceCount = parseInt(deviceAccounts?.count as string || '0');
      } catch (error) {
        // Fallback to text search (portable across databases)
        console.log('Using fallback device fingerprint query');
        const deviceAccounts = await this.db('sellers')
          .whereRaw("device_fingerprints::text LIKE ?", [`%${deviceFingerprint}%`])
          .count('* as count')
          .first();
        deviceCount = parseInt(deviceAccounts?.count as string || '0');
      }

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
      isDuplicate: basicCheck.exists || flags.includes('active_registration_session'),
      riskLevel,
      flags,
      suggestions
    };
  }

  /**
   * Get account recovery suggestions for duplicate accounts
   * Returns minimal information to prevent account enumeration
   */
  async getAccountRecoverySuggestions(identifier: string): Promise<{
    found: boolean;
    suggestions: string[];
    canLogin: boolean;
    canResetPassword: boolean;
  }> {
    // Check if identifier is email or mobile
    const isEmail = identifier.includes('@');
    const field = isEmail ? 'email' : 'mobile';

    const account = await this.db('sellers')
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
    const canLogin = account.status === 'approved';
    const canResetPassword = account.status !== 'suspended';

    // Generic suggestions without revealing account state
    suggestions.push('Try logging in with your existing credentials');
    
    if (canResetPassword) {
      suggestions.push('Use "Forgot Password" to reset your password');
    }

    // Only add specific suggestions for active accounts
    if (account.status === 'suspended') {
      suggestions.push('Contact support if you need assistance');
    }

    return {
      found: true,
      suggestions,
      canLogin,
      canResetPassword
    };
  }

  /**
   * Create registration session
   */
  private async createRegistrationSession(sessionData: Omit<RegistrationSession, 'id' | 'createdAt' | 'expiresAt'>): Promise<string> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Shortened to 5 minutes for security
    
    const [session] = await this.db('registration_sessions')
      .insert({
        mobile: sessionData.mobile,
        email: sessionData.email,
        full_name: sessionData.fullName,
        password_hash: sessionData.passwordHash, // TODO: Encrypt at rest for defense-in-depth
        device_fingerprint: sessionData.deviceFingerprint,
        ip_address: sessionData.ipAddress,
        risk_level: sessionData.riskLevel,
        risk_flags: sessionData.riskFlags, // JSONB column - pass object directly, not stringified
        expires_at: expiresAt
      })
      .returning('id');
    
    return session.id;
  }

  /**
   * Atomically consume registration session (one-way operation)
   * CRITICAL: Never reverts consumed_at once set
   */
  private async consumeRegistrationSession(sessionId: string, trx: Knex.Transaction): Promise<RegistrationSession | null> {
    // Atomic update to mark session as consumed and return it
    const [session] = await trx('registration_sessions')
      .where('id', sessionId)
      .whereNull('consumed_at') // Only unconsumed sessions
      .where('expires_at', '>', new Date()) // Only non-expired sessions
      .update({ consumed_at: trx.fn.now() })
      .returning('*');
    
    if (!session) return null;
    
    return {
      id: session.id,
      mobile: session.mobile,
      email: session.email,
      fullName: session.full_name,
      passwordHash: session.password_hash,
      deviceFingerprint: session.device_fingerprint,
      ipAddress: session.ip_address,
      riskLevel: session.risk_level,
      riskFlags: this.safeJsonParse<string[]>(session.risk_flags, []),
      expiresAt: session.expires_at,
      createdAt: session.created_at
    };
  }

  /**
   * Get registration session (non-consuming, for read-only operations)
   */
  private async getRegistrationSession(sessionId: string): Promise<RegistrationSession | null> {
    const session = await this.db('registration_sessions')
      .where('id', sessionId)
      .whereNull('consumed_at') // Only unconsumed sessions
      .where('expires_at', '>', new Date()) // Only non-expired sessions
      .first();
    
    if (!session) return null;
    
    return {
      id: session.id,
      mobile: session.mobile,
      email: session.email,
      fullName: session.full_name,
      passwordHash: session.password_hash,
      deviceFingerprint: session.device_fingerprint,
      ipAddress: session.ip_address,
      riskLevel: session.risk_level,
      riskFlags: this.safeJsonParse<string[]>(session.risk_flags, []),
      expiresAt: session.expires_at,
      createdAt: session.created_at
    };
  }

  /**
   * Delete registration session (non-transactional cleanup)
   */
  private async deleteRegistrationSession(sessionId: string): Promise<void> {
    try {
      await this.db('registration_sessions')
        .where('id', sessionId)
        .del();
    } catch (error) {
      console.error('Failed to delete registration session:', error);
      // Don't throw - this is cleanup
    }
  }

  /**
   * Update last login timestamp - schema-safe version
   */
  private async updateLastLogin(sellerId: string): Promise<void> {
    const updateData: any = {};
    
    // Only update columns that exist in the current schema
    if (this.sellerSchemaFlags.hasLastLoginAt) {
      updateData.last_login_at = this.db.fn.now();
    }
    
    if (this.sellerSchemaFlags.hasUpdatedAt) {
      updateData.updated_at = this.db.fn.now();
    }
    
    // Skip update if no updatable fields exist
    if (Object.keys(updateData).length === 0) {
      return;
    }
    
    await this.db('sellers')
      .where('id', sellerId)
      .update(updateData);
  }

  /**
   * Create a new seller record
   */
/**  async createSeller(sellerData: Omit<Seller, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<string> {
    console.log('DEBUG: createSeller (non-transaction) called with data:', JSON.stringify(sellerData, null, 2));
    
    // Create minimal seller record with only essential fields that exist in current schema
    const insertData: any = {
      full_name: sellerData.fullName,
      mobile: sellerData.mobile,
      email: sellerData.email,
      password_hash: sellerData.passwordHash,
      status: 'pending', // Account is active but pending verification
      // Required fields with default values to satisfy NOT NULL constraints
      gender: 'other', // Default value
      date_of_birth: '1990-01-01', // Default date
      seller_type: 'individual', // Default seller type
      registered_business_address: {}, // Default empty object for JSONB
      warehouse_addresses: [], // Default empty array for JSONB
      bank_details: {}, // Default empty object for JSONB
      pan_number: 'TEMP00000A', // Temporary PAN number
      pan_holder_name: sellerData.fullName,
      primary_product_categories: 'General', // Default category
      estimated_monthly_order_volume: '0-50', // Default volume
      preferred_pickup_time_slots: '9 AM - 6 PM', // Default time slots
      max_order_processing_time: 2, // Default processing time
      // Required agreements with default true values
      terms_and_conditions_accepted: true,
      return_policy_accepted: true,
      data_compliance_accepted: true,
      privacy_policy_accepted: true,
      commission_rate_accepted: true,
      payment_settlement_terms_accepted: true,
    };

    // Only add columns if they exist in the current schema
    // This prevents database errors for missing columns
    try {
      // Try to add mobile_verified if it exists
      if (sellerData.mobileVerified !== undefined) {
        insertData.mobile_verified = sellerData.mobileVerified;
      }
      
      // Try to add email_verified if it exists  
      if (sellerData.emailVerified !== undefined) {
        insertData.email_verified = sellerData.emailVerified;
      }

      console.log('DEBUG: About to insert seller data (non-transaction):', JSON.stringify(insertData, null, 2));
      
      const [seller] = await this.db('sellers')
        .insert(insertData)
        .returning('id');
      
      console.log('DEBUG: Successfully inserted seller with ID (non-transaction):', seller.id);
      return seller.id;
    } catch (error: any) {
      // If insertion fails due to missing columns, try with minimal data
      if (error.code === '42703') { // Column doesn't exist error
        console.warn('Some columns do not exist, creating seller with minimal data:', error.message);
        
        const minimalData = {
          full_name: sellerData.fullName,
          mobile: sellerData.mobile,
          email: sellerData.email,
          password_hash: sellerData.passwordHash,
          status: 'pending'
        };

        const [seller] = await this.db('sellers')
          .insert(minimalData)
          .returning('id');
        
        return seller.id;
      }
      throw error;
    }
  }
  **/

  async createSeller(): Promise<never> {
  throw new Error(
    '❌ createSeller() is forbidden. Use createSellerWithTransaction().'
  );
}

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller | null> {
    const seller = await this.db('sellers')
      .where('id', id)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Get seller by mobile number
   */
  async getSellerByMobile(mobile: string): Promise<Seller | null> {
    const seller = await this.db('sellers')
      .where('mobile', mobile)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Get seller by email
   */
  async getSellerByEmail(email: string): Promise<Seller | null> {
    const seller = await this.db('sellers')
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
    const updateData: any = {
      [section]: JSON.stringify(data)
    };
    
    // Only add updated_at if column exists
    if (this.sellerSchemaFlags.hasUpdatedAt) {
      updateData.updated_at = this.db.fn.now();
    }
    
    const result = await this.db('sellers')
      .where('id', sellerId)
      .update(updateData);
    
    return result > 0;
  }

  /**
   * Update seller verification status
   */
  async updateSellerVerificationStatus(
    sellerId: string, 
    status: 'pending' | 'in_review' | 'verified' | 'rejected'
  ): Promise<boolean> {
    const updateData: any = {
      overall_verification_status: status
    };
    
    // Only add updated_at if column exists
    if (this.sellerSchemaFlags.hasUpdatedAt) {
      updateData.updated_at = this.db.fn.now();
    }
    
    const result = await this.db('sellers')
      .where('id', sellerId)
      .update(updateData);
    
    return result > 0;
  }

  /**
   * Verify seller mobile number
   */
  async verifySellerMobile(sellerId: string): Promise<boolean> {
    const updateData: any = {
      mobile_verified: true
    };
    
    // Only add updated_at if column exists
    if (this.sellerSchemaFlags.hasUpdatedAt) {
      updateData.updated_at = this.db.fn.now();
    }
    
    const result = await this.db('sellers')
      .where('id', sellerId)
      .update(updateData);
    
    return result > 0;
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletionStatus(sellerId: string): Promise<ProfileCompletionStatus | null> {
    const seller = await this.db('sellers')
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
   * Create session record using precomputed schema flags (no hot path queries)
   */
  async createSession(sessionData: Omit<SessionRecord, 'id' | 'createdAt'>, trx?: any): Promise<string> {
    const db = trx || this.db;
    
    // Base required fields
    const insertData: any = {
      seller_id: sessionData.sellerId,
      refresh_token_hash: sessionData.refreshTokenHash,
      token_family: sessionData.tokenFamily,
      expires_at: sessionData.expiresAt,
      ip_address: sessionData.ipAddress,
      user_agent: sessionData.userAgent
    };

    // Add optional fields based on precomputed schema flags
    if (this.sessionSchemaFlags.hasAccessTokenJti && sessionData.accessTokenJti) {
      insertData.access_token_jti = sessionData.accessTokenJti;
    }
    
    if (this.sessionSchemaFlags.hasAccessTokenExpiresAt && sessionData.accessTokenExpiresAt) {
      insertData.access_token_expires_at = sessionData.accessTokenExpiresAt;
    }

    if (this.sessionSchemaFlags.hasRevokedColumns) {
      insertData.revoked = false;
    }

    try {
      const [session] = await db('seller_sessions')
        .insert(insertData)
        .returning('id');
      
      return session.id;
    } catch (error: any) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        console.error('Duplicate session detected:', error.message);
        throw new Error('Session already exists');
      }
      
      console.error('Session creation failed:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Revoke session
   */
  // async revokeSession(sessionId: string): Promise<boolean> {
  //   const result = await this.db('seller_sessions')
  //     .where('id', sessionId)
  //     .update({
  //       revoked: true,
  //       revoked_at: this.db.fn.now()
  //     });
    
  //   return result > 0;
  // }

async revokeSession(sessionId: string): Promise<boolean> {
  const updateData: any = {};

  if (this.sessionSchemaFlags.hasRevokedColumns) {
    updateData.revoked = true;
    updateData.revoked_at = this.db.fn.now();
  }

  // If schema does not support revocation, safely no-op
  if (Object.keys(updateData).length === 0) {
    return false;
  }

  const result = await this.db('seller_sessions')
    .where('id', sessionId)
    .update(updateData);

  return result > 0;
}


  /**
   * Clean up expired records (run frequently for security)
   */
  async cleanupExpiredRecords(): Promise<void> {
    const now = new Date();
    
    // Clean up expired registration sessions (critical for password hash security)
    const deletedSessions = await this.db('registration_sessions')
      .where('expires_at', '<', now)
      .del();
    
    if (deletedSessions > 0) {
      console.log(`Cleaned up ${deletedSessions} expired registration sessions`);
    }
    
    // Clean up consumed sessions older than 1 hour (defense-in-depth)
    const deletedConsumed = await this.db('registration_sessions')
      .whereNotNull('consumed_at')
      .where('consumed_at', '<', new Date(Date.now() - 60 * 60 * 1000))
      .del();
    
    if (deletedConsumed > 0) {
      console.log(`Cleaned up ${deletedConsumed} old consumed registration sessions`);
    }
    
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
   * SECURITY: passwordHash is excluded from domain model
   */
  private mapDbSellerToSeller(dbSeller: any): Seller {
    return {
      id: dbSeller.id,
      fullName: dbSeller.full_name,
      mobile: dbSeller.mobile,
      email: dbSeller.email,
      // passwordHash: EXCLUDED for security - only auth services should access
      mobileVerified: dbSeller.mobile_verified,
      emailVerified: dbSeller.email_verified,
      businessDetails: this.safeJsonParse(dbSeller.business_details, undefined),
      addressInfo: this.safeJsonParse(dbSeller.address_info, undefined),
      taxCompliance: this.safeJsonParse(dbSeller.tax_compliance, undefined),
      bankDetails: this.safeJsonParse(dbSeller.bank_details, undefined),
      riskScore: dbSeller.risk_score,
      riskFlags: this.safeJsonParse(dbSeller.risk_flags, undefined),
      lastRiskAssessment: dbSeller.last_risk_assessment,
      deviceFingerprints: this.safeJsonParse(dbSeller.device_fingerprints, []),
      suspiciousActivityFlags: this.safeJsonParse(dbSeller.suspicious_activity_flags, []),
      accountStatus: dbSeller.status, // Use database value as-is, no fallback
      status: dbSeller.status,
      verificationStatus: dbSeller.overall_verification_status,
      canListProducts: dbSeller.can_list_products,
      payoutEnabled: dbSeller.payout_enabled,
      featureAccess: this.safeJsonParse(dbSeller.feature_access, {
        productListing: dbSeller.can_list_products,
        payoutProcessing: dbSeller.payout_enabled,
        bulkOperations: false,
        advancedAnalytics: false
      }),
      slaTracking: this.safeJsonParse(dbSeller.sla_tracking, {
        escalationLevel: 0
      }),
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
    
    if (seller.overall_verification_status === 'verified') {
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

  // Transaction-aware helper methods
  
  /**
   * Create seller with transaction support - schema-safe and production-ready
   */
  async createSellerWithTransaction(trx: any, sellerData: SellerCreateInput): Promise<string> {
    console.log('DEBUG: createSellerWithTransaction called with data:', JSON.stringify(sellerData, null, 2));
    
    // Create minimal seller record with only essential fields that exist in current schema
    const insertData: any = {
      full_name: sellerData.fullName,
      mobile: sellerData.mobile,
      email: sellerData.email,
      password_hash: sellerData.passwordHash,
      status: 'pending', // Account is active but pending verification
      // Required fields with default values to satisfy NOT NULL constraints
      gender: 'other', // Default value
      date_of_birth: '1990-01-01', // Default date
      seller_type: 'individual', // Default seller type
      registered_business_address: {}, // Default empty object for JSONB
      warehouse_addresses: [], // Default empty array for JSONB
      bank_details: {}, // Default empty object for JSONB
      pan_number: 'TEMP00000A', // Temporary PAN number
      pan_holder_name: sellerData.fullName,
      primary_product_categories: 'General', // Default category
      estimated_monthly_order_volume: '0-50', // Default volume
      preferred_pickup_time_slots: '9 AM - 6 PM', // Default time slots
      max_order_processing_time: 2, // Default processing time
      // Required agreements with default true values
      terms_and_conditions_accepted: true,
      return_policy_accepted: true,
      data_compliance_accepted: true,
      privacy_policy_accepted: true,
      commission_rate_accepted: true,
      payment_settlement_terms_accepted: true,
    };

    // Only add columns if they exist in the current schema
    try {
      if (sellerData.mobileVerified !== undefined) {
        insertData.mobile_verified = sellerData.mobileVerified;
      }
      
      if (sellerData.emailVerified !== undefined) {
        insertData.email_verified = sellerData.emailVerified;
      }

      console.log('DEBUG: About to insert seller data:', JSON.stringify(insertData, null, 2));
      
      const query = trx('sellers').insert(insertData).returning('id');
      console.log('DEBUG: Generated SQL:', query.toString());
      
      const [seller] = await query;
      
      console.log('DEBUG: Successfully inserted seller with ID:', seller.id);
      return seller.id;
    } catch (error: any) {
      if (error.code === '42703') { // Column doesn't exist error
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
          // In production, rethrow the error - no silent fallbacks
          console.error('Schema error in production - missing column:', error.message);
          throw error;
        }
        
        // Allow fallback only in development
        console.warn('Development mode: Some columns do not exist, creating seller with minimal data:', error.message);
        
        const minimalData = {
          full_name: sellerData.fullName,
          mobile: sellerData.mobile,
          email: sellerData.email,
          password_hash: sellerData.passwordHash,
          status: 'pending'
        };

        const [seller] = await trx('sellers')
          .insert(minimalData)
          .returning('id');
        
        console.log('DEBUG: Inserted minimal seller data:', JSON.stringify(minimalData, null, 2));
        return seller.id;
      }
      throw error;
    }
  }

  /**
   * Get seller by ID with transaction support
   */
  async getSellerByIdWithTransaction(trx: any, sellerId: string): Promise<Seller | null> {
    const seller = await trx('sellers')
      .where('id', sellerId)
      .first();
    
    if (!seller) return null;
    
    return this.mapDbSellerToSeller(seller);
  }

  /**
   * Delete registration session with transaction support
   */
  async deleteRegistrationSessionWithTransaction(trx: any, sessionId: string): Promise<boolean> {
    const result = await trx('registration_sessions')
      .where('id', sessionId)
      .del();
    
    return result > 0;
  }

  /**
   * Create audit log with transaction support
   */
  async createAuditLogWithTransaction(trx: any, auditData: Omit<AuditLog, 'id' | 'performedAt'>): Promise<string> {
    try {
      const [audit] = await trx('seller_audit_logs')
        .insert({
          seller_id: auditData.sellerId,
          action: auditData.action,
          entity_type: auditData.entityType,
          entity_id: auditData.entityId,
          old_values: auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
          new_values: auditData.newValues ? JSON.stringify(auditData.newValues) : null,
          performed_by: auditData.performedBy,
          ip_address: auditData.ipAddress,
          user_agent: auditData.userAgent,
          risk_level: auditData.riskLevel
        })
        .returning('id');
      
      return audit.id;
    } catch (error: any) {
      // Handle missing columns gracefully
      if (error.code === '42703') {
        console.warn('Audit log table missing columns, using minimal logging');
        
        const minimalData: any = {
          seller_id: auditData.sellerId,
          action: auditData.action,
          performed_by: auditData.performedBy
        };

        // Add only existing columns
        if (auditData.entityType) minimalData.entity_type = auditData.entityType;
        if (auditData.entityId) minimalData.entity_id = auditData.entityId;
        if (auditData.ipAddress) minimalData.ip_address = auditData.ipAddress;

        const [audit] = await trx('seller_audit_logs')
          .insert(minimalData)
          .returning('id');
        
        return audit.id;
      }
      
      console.error('Audit log creation failed:', error);
      throw error;
    }
  }

  /**
   * Update last login with transaction support - schema-safe version
   */
  async updateLastLoginWithTransaction(trx: any, sellerId: string): Promise<void> {
    const updateData: any = {};
    
    // Only update columns that exist in the current schema
    if (this.sellerSchemaFlags.hasLastLoginAt) {
      updateData.last_login_at = trx.fn.now();
    }
    
    if (this.sellerSchemaFlags.hasUpdatedAt) {
      updateData.updated_at = trx.fn.now();
    }
    
    // Skip update if no updatable fields exist
    if (Object.keys(updateData).length === 0) {
      return;
    }
    
    await trx('sellers')
      .where('id', sellerId)
      .update(updateData);
  }
}