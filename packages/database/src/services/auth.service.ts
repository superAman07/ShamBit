import { Knex } from 'knex';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Seller } from '@shambit/shared';
import { AuthServiceInterface } from '../interfaces/auth-service.interface';

export class AuthService implements AuthServiceInterface {
  constructor(
    private db: Knex,
    private jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key',
    private refreshTokenSecret: string = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret'
  ) {}

  /**
   * Generate token pair with transaction support
   * CRITICAL: Uses the provided transaction for session creation
   */
  async generateTokenPair(
    trx: Knex.Transaction,
    seller: Seller,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresAt: Date;
  }> {
    const tokenFamily = crypto.randomUUID();
    const jti = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    
    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create access token
    const accessToken = jwt.sign(
      {
        sub: seller.id,
        jti,
        mobile: seller.mobile,
        email: seller.email,
        verified: seller.mobileVerified,
        type: 'access'
      },
      this.jwtSecret,
      {
        expiresIn: '15m',
        issuer: 'shambit-auth',
        audience: 'shambit-sellers'
      }
    );

    // Create session record using the transaction
    const sessionData = {
      sellerId: seller.id,
      refreshTokenHash,
      tokenFamily,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      accessTokenJti: jti,
      accessTokenExpiresAt
    };

    // Use simplified session creation with transaction
    const sessionId = await this.createSessionWithTransaction(trx, sessionData);

    return {
      accessToken,
      refreshToken: `${tokenFamily}.${refreshToken}`,
      sessionId,
      expiresAt: refreshTokenExpiresAt
    };
  }

  /**
   * Create session with transaction support using precomputed schema flags
   */
  private async createSessionWithTransaction(trx: Knex.Transaction, sessionData: any): Promise<string> {
    // Base required fields
    const insertData: any = {
      seller_id: sessionData.sellerId,
      refresh_token_hash: sessionData.refreshTokenHash,
      token_family: sessionData.tokenFamily,
      expires_at: sessionData.expiresAt,
      ip_address: sessionData.ipAddress,
      user_agent: sessionData.userAgent
    };

    // Add optional fields if they exist (simplified - no runtime checks)
    if (sessionData.accessTokenJti) {
      insertData.access_token_jti = sessionData.accessTokenJti;
    }
    
    if (sessionData.accessTokenExpiresAt) {
      insertData.access_token_expires_at = sessionData.accessTokenExpiresAt;
    }

    // Default revoked to false if column exists
    insertData.revoked = false;

    try {
      const [session] = await trx('seller_sessions')
        .insert(insertData)
        .returning('id');
      
      return session.id;
    } catch (error: any) {
      // Handle missing columns by retrying with minimal data
      if (error.code === '42703') {
        console.log('Using minimal session schema');
        const minimalData = {
          seller_id: sessionData.sellerId,
          refresh_token_hash: sessionData.refreshTokenHash,
          token_family: sessionData.tokenFamily,
          expires_at: sessionData.expiresAt,
          ip_address: sessionData.ipAddress,
          user_agent: sessionData.userAgent
        };

        const [session] = await trx('seller_sessions')
          .insert(minimalData)
          .returning('id');
        
        return session.id;
      }
      
      throw error;
    }
  }

  /**
   * Verify and refresh tokens
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const [tokenFamily, token] = refreshToken.split('.');
      if (!tokenFamily || !token) {
        return { success: false, error: 'Invalid refresh token format' };
      }

      // Find active session
      const session = await this.db('seller_sessions')
        .where('token_family', tokenFamily)
        .where('revoked', false)
        .where('expires_at', '>', new Date())
        .first();

      if (!session) {
        return { success: false, error: 'Session not found or expired' };
      }

      // Verify refresh token
      const isValid = await bcrypt.compare(token, session.refresh_token_hash);
      if (!isValid) {
        // Revoke session family on token mismatch (security)
        await this.revokeSessionFamily(tokenFamily);
        return { success: false, error: 'Invalid refresh token' };
      }

      // Get seller
      const seller = await this.db('sellers')
        .where('id', session.seller_id)
        .first();

      if (!seller || seller.status !== 'active') {
        return { success: false, error: 'Seller account not active' };
      }

      // Generate new token pair
      return await this.db.transaction(async (trx) => {
        // Revoke old session
        await trx('seller_sessions')
          .where('id', session.id)
          .update({ revoked: true, revoked_at: trx.fn.now() });

        // Create new session
        const newTokenPair = await this.generateTokenPair(
          trx,
          this.mapDbSellerToSeller(seller),
          ipAddress,
          userAgent
        );

        return {
          success: true,
          accessToken: newTokenPair.accessToken,
          refreshToken: newTokenPair.refreshToken
        };
      });

    } catch (error) {
      console.error('Token refresh failed:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Revoke all sessions for a seller
   */
  async revokeAllSessions(sellerId: string): Promise<boolean> {
    try {
      const result = await this.db('seller_sessions')
        .where('seller_id', sellerId)
        .where('revoked', false)
        .update({
          revoked: true,
          revoked_at: this.db.fn.now()
        });

      return result > 0;
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
      return false;
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<{
    valid: boolean;
    seller?: Seller;
    error?: string;
  }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Get seller
      const seller = await this.db('sellers')
        .where('id', decoded.sub)
        .first();

      if (!seller || seller.status !== 'active') {
        return { valid: false, error: 'Seller not found or inactive' };
      }

      // Check if session is still valid
      const session = await this.db('seller_sessions')
        .where('access_token_jti', decoded.jti)
        .where('revoked', false)
        .first();

      if (!session) {
        return { valid: false, error: 'Session revoked or expired' };
      }

      return {
        valid: true,
        seller: this.mapDbSellerToSeller(seller)
      };

    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Revoke session family (security measure)
   */
  private async revokeSessionFamily(tokenFamily: string): Promise<void> {
    await this.db('seller_sessions')
      .where('token_family', tokenFamily)
      .update({
        revoked: true,
        revoked_at: this.db.fn.now()
      });
  }

  /**
   * Map database seller to domain model
   */
  private mapDbSellerToSeller(dbSeller: any): Seller {
    return {
      id: dbSeller.id,
      fullName: dbSeller.full_name,
      mobile: dbSeller.mobile,
      email: dbSeller.email,
      mobileVerified: dbSeller.mobile_verified || false,
      emailVerified: dbSeller.email_verified || false,
      accountStatus: dbSeller.status || 'active',
      status: dbSeller.status,
      verificationStatus: dbSeller.overall_verification_status || 'pending',
      canListProducts: dbSeller.can_list_products || false,
      payoutEnabled: dbSeller.payout_enabled || false,
      deviceFingerprints: dbSeller.device_fingerprints || [],
      featureAccess: dbSeller.feature_access || {
        productListing: false,
        payoutProcessing: false,
        bulkOperations: false,
        advancedAnalytics: false
      },
      slaTracking: dbSeller.sla_tracking || { escalationLevel: 0 },
      createdAt: dbSeller.created_at,
      updatedAt: dbSeller.updated_at,
      lastLoginAt: dbSeller.last_login_at,
      loginAttempts: dbSeller.login_attempts || 0,
      lastFailedLoginAt: dbSeller.last_failed_login_at,
      accountLockedUntil: dbSeller.account_locked_until
    };
  }
}