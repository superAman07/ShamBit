import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenDenylistService {
  constructor(
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Add token to denylist with TTL matching token expiration
   */
  async denyToken(token: string): Promise<void> {
    try {
      // Decode token to get expiration
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      // Calculate TTL (time until token expires)
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl <= 0) {
        // Token already expired, no need to denylist
        return;
      }

      // Create token hash for storage (to avoid storing full token)
      const tokenHash = this.hashToken(token);
      const key = `denied_token:${tokenHash}`;

      // Store in Redis with TTL
      await this.redis.set(key, '1', ttl);
    } catch (error) {
      throw new Error(`Failed to deny token: ${error.message}`);
    }
  }

  /**
   * Check if token is in denylist
   */
  async isTokenDenied(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      const key = `denied_token:${tokenHash}`;
      return await this.redis.exists(key);
    } catch (error) {
      // If we can't check, assume token is valid to avoid blocking legitimate users
      return false;
    }
  }

  /**
   * Create SHA-256 hash of token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Clean up expired entries (Redis handles this automatically with TTL)
   * This method is for manual cleanup if needed
   */
  async cleanupExpiredTokens(): Promise<void> {
    // Redis automatically removes expired keys, but we can implement
    // manual cleanup if needed for monitoring purposes
    // This is optional and mainly for administrative purposes
  }
}
