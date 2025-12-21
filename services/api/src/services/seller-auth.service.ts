import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Knex } from 'knex';
import { getConfig } from '@shambit/config';
import { getDatabase } from '@shambit/database';
import { UnauthorizedError } from '@shambit/shared';
import { 
  Seller, 
  LoginRequest, 
  LoginResponse
} from '@shambit/shared';

export interface SellerJWTPayload {
  sub: string; // seller ID
  id: string; // alias for sub
  type: 'seller';
  mobile: string;
  email: string;
  verified: boolean;
  iat: number;
  exp: number;
  jti?: string; // JWT ID for token family tracking
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenFamily: string;
}

export class SellerAuthService {
  private db?: Knex;
  private config = getConfig();

  private getDb(): Knex {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  /**
   * Generate access token (15 minutes expiry)
   */
  generateAccessToken(seller: Seller, tokenFamily?: string): string {
    const payload: Omit<SellerJWTPayload, 'iat' | 'exp'> = {
      sub: seller.id,
      id: seller.id,
      type: 'seller',
      mobile: seller.mobile,
      email: seller.email,
      verified: seller.mobileVerified,
      ...(tokenFamily && { jti: tokenFamily })
    };

    return jwt.sign(payload, this.config.JWT_SECRET, {
      expiresIn: '15m',
      issuer: 'shambit-seller-auth',
      algorithm: 'HS256'
    });
  }

  /**
   * Generate refresh token (7 days expiry)
   */
  generateRefreshToken(seller: Seller, tokenFamily: string): string {
    const payload: Omit<SellerJWTPayload, 'iat' | 'exp'> = {
      sub: seller.id,
      id: seller.id,
      type: 'seller',
      mobile: seller.mobile,
      email: seller.email,
      verified: seller.mobileVerified,
      jti: tokenFamily
    };

    return jwt.sign(payload, this.config.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
      issuer: 'shambit-seller-auth',
      algorithm: 'HS256'
    });
  }

  /**
   * Generate token pair with family tracking
   */
  async generateTokenPair(seller: Seller, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Generate unique token family ID
    const tokenFamily = crypto.randomUUID();
    
    // Generate tokens
    const accessToken = this.generateAccessToken(seller, tokenFamily);
    const refreshToken = this.generateRefreshToken(seller, tokenFamily);
    
    // Hash refresh token for storage
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Store session record
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await this.getDb()('seller_sessions').insert({
      seller_id: seller.id,
      refresh_token_hash: refreshTokenHash,
      token_family: tokenFamily,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      revoked: false
    });

    return {
      accessToken,
      refreshToken,
      tokenFamily
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): SellerJWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.JWT_SECRET, {
        issuer: 'shambit-seller-auth',
        algorithms: ['HS256']
      }) as SellerJWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token', 'INVALID_TOKEN');
      }
      throw new UnauthorizedError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): SellerJWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.JWT_REFRESH_SECRET, {
        issuer: 'shambit-seller-auth',
        algorithms: ['HS256']
      }) as SellerJWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }
      throw new UnauthorizedError('Refresh token verification failed', 'REFRESH_TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Refresh token with rotation and reuse detection
   */
  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Hash the provided refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find session record
    const session = await this.getDb()('seller_sessions')
      .where('refresh_token_hash', refreshTokenHash)
      .where('seller_id', decoded.id)
      .where('revoked', false)
      .first();

    if (!session) {
      // Token reuse detected - revoke entire token family
      if (decoded.jti) {
        await this.revokeTokenFamily(decoded.jti);
      }
      throw new UnauthorizedError('Invalid refresh token - possible reuse detected', 'TOKEN_REUSE_DETECTED');
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      await this.revokeSession(session.id);
      throw new UnauthorizedError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Get seller data
    const seller = await this.getDb()('simplified_sellers')
      .where('id', decoded.id)
      .first();

    if (!seller) {
      await this.revokeSession(session.id);
      throw new UnauthorizedError('Seller not found', 'SELLER_NOT_FOUND');
    }

    // Revoke current session
    await this.revokeSession(session.id);

    // Generate new token pair
    const sellerData = this.mapDbSellerToSeller(seller);
    return await this.generateTokenPair(sellerData, ipAddress, userAgent);
  }

  /**
   * Login seller with email/mobile and password
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { identifier, password, ipAddress } = loginData;
    
    // Check rate limiting
    const rateLimitKey = `login:${ipAddress}`;
    const isRateLimited = await this.checkRateLimit(rateLimitKey, 10, 15); // 10 attempts per 15 minutes
    
    if (isRateLimited) {
      throw new UnauthorizedError('Too many login attempts. Please try again later.', 'RATE_LIMITED');
    }

    // Find seller by email or mobile
    let seller;
    if (identifier.includes('@')) {
      seller = await this.getDb()('simplified_sellers')
        .where('email', identifier)
        .first();
    } else {
      seller = await this.getDb()('simplified_sellers')
        .where('mobile', identifier)
        .first();
    }

    if (!seller) {
      await this.recordRateLimitAttempt(rateLimitKey);
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (seller.account_locked_until && new Date() < new Date(seller.account_locked_until)) {
      const lockoutTime = Math.ceil((new Date(seller.account_locked_until).getTime() - Date.now()) / 1000);
      throw new UnauthorizedError(
        `Account temporarily locked. Try again in ${lockoutTime} seconds.`,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, seller.password_hash);
    
    if (!isPasswordValid) {
      await this.recordFailedLogin(seller.id);
      await this.recordRateLimitAttempt(rateLimitKey);
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is active
    if (seller.status !== 'active') {
      throw new UnauthorizedError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(seller.id);

    // Update last login
    await this.getDb()('simplified_sellers')
      .where('id', seller.id)
      .update({
        last_login_at: this.getDb().fn.now(),
        updated_at: this.getDb().fn.now()
      });

    // Generate tokens
    const sellerData = this.mapDbSellerToSeller(seller);
    const tokens = await this.generateTokenPair(sellerData, ipAddress, 'login-request');

    // Get remaining rate limit attempts
    const remaining = await this.getRemainingAttempts(rateLimitKey, 10, 15);

    return {
      success: true,
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        },
        seller: sellerData,
        requiresAdditionalVerification: !sellerData.mobileVerified,
        rateLimitInfo: {
          remaining
        }
      }
    };
  }

  /**
   * Logout seller and revoke tokens
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Revoke entire token family for security
      if (decoded.jti) {
        await this.revokeTokenFamily(decoded.jti);
      }
    } catch (error) {
      // Even if token is invalid, we should not throw error on logout
      console.warn('Logout with invalid token:', error);
    }
  }

  /**
   * Revoke a specific session
   */
  private async revokeSession(sessionId: string): Promise<void> {
    await this.getDb()('seller_sessions')
      .where('id', sessionId)
      .update({
        revoked: true,
        revoked_at: this.getDb().fn.now()
      });
  }

  /**
   * Revoke entire token family (all sessions for a seller)
   */
  private async revokeTokenFamily(tokenFamily: string): Promise<void> {
    await this.getDb()('seller_sessions')
      .where('token_family', tokenFamily)
      .update({
        revoked: true,
        revoked_at: this.getDb().fn.now()
      });
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(sellerId: string): Promise<void> {
    const seller = await this.getDb()('simplified_sellers')
      .where('id', sellerId)
      .first();

    if (!seller) return;

    const loginAttempts = (seller.login_attempts || 0) + 1;
    const updateData: any = {
      login_attempts: loginAttempts,
      last_failed_login_at: this.getDb().fn.now(),
      updated_at: this.getDb().fn.now()
    };

    // Lock account after 5 failed attempts for 30 minutes
    if (loginAttempts >= 5) {
      updateData.account_locked_until = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.getDb()('simplified_sellers')
      .where('id', sellerId)
      .update(updateData);
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedLoginAttempts(sellerId: string): Promise<void> {
    await this.getDb()('simplified_sellers')
      .where('id', sellerId)
      .update({
        login_attempts: 0,
        last_failed_login_at: null,
        account_locked_until: null,
        updated_at: this.getDb().fn.now()
      });
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(key: string, maxAttempts: number, windowMinutes: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const count = await this.getDb()('rate_limits')
      .where('identifier', key)
      .where('identifier_type', 'ip')
      .where('endpoint', 'login')
      .where('window_start', '>=', windowStart)
      .sum('request_count as total')
      .first();
    
    return (count?.total || 0) >= maxAttempts;
  }

  /**
   * Record rate limit attempt
   */
  private async recordRateLimitAttempt(key: string): Promise<void> {
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await this.getDb()('rate_limits')
      .insert({
        identifier: key,
        identifier_type: 'ip',
        endpoint: 'login',
        request_count: 1,
        window_start: windowStart,
        window_end: windowEnd,
        blocked: false
      })
      .onConflict(['identifier', 'endpoint', 'window_start'])
      .merge({
        request_count: this.getDb().raw('rate_limits.request_count + 1'),
        updated_at: this.getDb().fn.now()
      });
  }

  /**
   * Get remaining rate limit attempts
   */
  private async getRemainingAttempts(key: string, maxAttempts: number, windowMinutes: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const count = await this.getDb()('rate_limits')
      .where('identifier', key)
      .where('identifier_type', 'ip')
      .where('endpoint', 'login')
      .where('window_start', '>=', windowStart)
      .sum('request_count as total')
      .first();
    
    const used = count?.total || 0;
    return Math.max(0, maxAttempts - used);
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
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.getDb()('seller_sessions')
      .where('expires_at', '<', new Date())
      .del();
  }
}

// Export singleton instance
export const sellerAuthService = new SellerAuthService();