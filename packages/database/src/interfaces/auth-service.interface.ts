import { Knex } from 'knex';
import { Seller } from '@shambit/shared';

export interface AuthServiceInterface {
  /**
   * Generate token pair with transaction support
   * CRITICAL: Must use the provided transaction for session creation
   */
  generateTokenPair(
    trx: Knex.Transaction,
    seller: Seller,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresAt: Date;
  }>;

  /**
   * Verify and refresh tokens
   */
  refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }>;

  /**
   * Revoke all sessions for a seller
   */
  revokeAllSessions(sellerId: string): Promise<boolean>;

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): Promise<{
    valid: boolean;
    seller?: Seller;
    error?: string;
  }>;
}