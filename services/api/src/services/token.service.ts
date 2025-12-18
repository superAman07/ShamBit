import jwt from 'jsonwebtoken';
import { getDatabase } from '@shambit/database';

interface TokenPayload {
  sub: string;
  email: string;
  type: 'seller' | 'admin' | 'user';
  status?: string;
  iat?: number;
  exp?: number;
}

class TokenService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '1h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Generate access and refresh tokens
   */
  generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): { accessToken: string; refreshToken: string; expiresIn: number } {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Check if token is blacklisted
    if (await this.isTokenBlacklisted(refreshToken)) {
      throw new Error('Token has been revoked');
    }

    const payload = this.verifyRefreshToken(refreshToken);
    
    // Generate new access token with same payload (excluding iat, exp)
    const newPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
      status: payload.status,
    };

    const accessToken = jwt.sign(newPayload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      expiresIn: 3600,
    };
  }

  /**
   * Blacklist a token (for logout)
   */
  async blacklistToken(token: string): Promise<void> {
    const db = getDatabase();
    
    try {
      // Decode token to get expiry (don't verify as it might be expired)
      const decoded = jwt.decode(token) as TokenPayload;
      
      if (!decoded || !decoded.exp) {
        return; // Invalid token format
      }

      const expiresAt = new Date(decoded.exp * 1000);
      
      // Only store if not already expired
      if (expiresAt > new Date()) {
        await db('blacklisted_tokens').insert({
          token_hash: this.hashToken(token),
          expires_at: expiresAt,
          created_at: new Date(),
        });
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
      // Don't throw error as logout should succeed even if blacklisting fails
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const db = getDatabase();
    
    try {
      const tokenHash = this.hashToken(token);
      
      const record = await db('blacklisted_tokens')
        .where('token_hash', tokenHash)
        .where('expires_at', '>', new Date())
        .first();
      
      return !!record;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false; // Assume not blacklisted if check fails
    }
  }

  /**
   * Clean up expired blacklisted tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const db = getDatabase();
    
    const result = await db('blacklisted_tokens')
      .where('expires_at', '<', new Date())
      .delete();
    
    return result;
  }

  /**
   * Hash token for storage (to avoid storing actual tokens)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Generate API key for external integrations
   */
  generateApiKey(sellerId: string): string {
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    
    return `sk_${Buffer.from(`${sellerId}:${timestamp}:${randomBytes}`).toString('base64')}`;
  }

  /**
   * Verify API key
   */
  verifyApiKey(apiKey: string): { sellerId: string; timestamp: number } | null {
    try {
      if (!apiKey.startsWith('sk_')) {
        return null;
      }
      
      const decoded = Buffer.from(apiKey.substring(3), 'base64').toString('utf-8');
      const [sellerId, timestamp] = decoded.split(':');
      
      if (!sellerId || !timestamp) {
        return null;
      }
      
      return {
        sellerId,
        timestamp: parseInt(timestamp),
      };
    } catch (error) {
      return null;
    }
  }
}

export const tokenService = new TokenService();