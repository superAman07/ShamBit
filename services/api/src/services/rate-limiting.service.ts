import { getDatabase } from '@shambit/database';
import { createLogger } from '@shambit/shared';
import { Knex } from 'knex';

const logger = createLogger('rate-limiting-service');

export interface RateLimitConfig {
  identifier: string;
  action: string;
  maxAttempts: number;
  windowMinutes: number;
  cooldownMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  cooldownUntil?: Date;
  totalAttempts: number;
}

export interface AbuseDetectionResult {
  isAbusive: boolean;
  riskScore: number;
  flags: string[];
  blockDuration?: number;
}

export class RateLimitingService {
  private db: Knex | null = null;

  private getDb(): Knex {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  /**
   * Check and enforce rate limits for a specific action
   */
  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (config.windowMinutes * 60 * 1000));
    const windowEnd = new Date(now.getTime() + (config.windowMinutes * 60 * 1000));

    try {
      // Start transaction for atomic operations
      return await this.getDb().transaction(async (trx) => {
        // Clean up expired rate limit records
        await this.cleanupExpiredRecords(trx, now);

        // Get current rate limit record
        const existingRecord = await trx('rate_limits')
          .where({
            identifier: config.identifier,
            action: config.action
          })
          .where('window_end', '>', now)
          .first();

        if (!existingRecord) {
          // Create new rate limit record
          await trx('rate_limits').insert({
            identifier: config.identifier,
            action: config.action,
            count: 1,
            window_start: now,
            window_end: windowEnd,
            created_at: now,
            updated_at: now
          });

          logger.info('Rate limit initialized', {
            identifier: config.identifier,
            action: config.action,
            count: 1,
            maxAttempts: config.maxAttempts
          });

          return {
            allowed: true,
            remaining: config.maxAttempts - 1,
            resetTime: windowEnd,
            totalAttempts: 1
          };
        }

        // Check if rate limit exceeded
        if (existingRecord.count >= config.maxAttempts) {
          logger.warn('Rate limit exceeded', {
            identifier: config.identifier,
            action: config.action,
            count: existingRecord.count,
            maxAttempts: config.maxAttempts,
            windowEnd: existingRecord.window_end
          });

          const cooldownUntil = config.cooldownMinutes 
            ? new Date(existingRecord.window_end.getTime() + (config.cooldownMinutes * 60 * 1000))
            : undefined;

          return {
            allowed: false,
            remaining: 0,
            resetTime: new Date(existingRecord.window_end),
            cooldownUntil,
            totalAttempts: existingRecord.count
          };
        }

        // Increment counter
        const newCount = existingRecord.count + 1;
        await trx('rate_limits')
          .where('id', existingRecord.id)
          .update({
            count: newCount,
            updated_at: now
          });

        logger.info('Rate limit updated', {
          identifier: config.identifier,
          action: config.action,
          count: newCount,
          maxAttempts: config.maxAttempts
        });

        return {
          allowed: true,
          remaining: config.maxAttempts - newCount,
          resetTime: new Date(existingRecord.window_end),
          totalAttempts: newCount
        };
      });
    } catch (error) {
      logger.error('Rate limit check failed', {
        identifier: config.identifier,
        action: config.action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: windowEnd,
        totalAttempts: 1
      };
    }
  }

  /**
   * Check for OTP request rate limiting with cooldown
   */
  async checkOTPRateLimit(mobile: string, ipAddress: string): Promise<RateLimitResult> {
    // Check mobile-based rate limiting (3 attempts per 10 minutes)
    const mobileResult = await this.checkRateLimit({
      identifier: mobile,
      action: 'otp_request',
      maxAttempts: 3,
      windowMinutes: 10,
      cooldownMinutes: 30
    });

    if (!mobileResult.allowed) {
      return mobileResult;
    }

    // Check IP-based rate limiting (10 attempts per 10 minutes)
    const ipResult = await this.checkRateLimit({
      identifier: ipAddress,
      action: 'otp_request_ip',
      maxAttempts: 10,
      windowMinutes: 10,
      cooldownMinutes: 60
    });

    // Return the more restrictive result
    return {
      allowed: mobileResult.allowed && ipResult.allowed,
      remaining: Math.min(mobileResult.remaining, ipResult.remaining),
      resetTime: mobileResult.resetTime > ipResult.resetTime ? mobileResult.resetTime : ipResult.resetTime,
      cooldownUntil: mobileResult.cooldownUntil || ipResult.cooldownUntil,
      totalAttempts: Math.max(mobileResult.totalAttempts, ipResult.totalAttempts)
    };
  }

  /**
   * Check registration rate limiting
   */
  async checkRegistrationRateLimit(ipAddress: string, email?: string): Promise<RateLimitResult> {
    // Check IP-based rate limiting (5 attempts per hour)
    const ipResult = await this.checkRateLimit({
      identifier: ipAddress,
      action: 'registration',
      maxAttempts: 5,
      windowMinutes: 60,
      cooldownMinutes: 60
    });

    if (!ipResult.allowed || !email) {
      return ipResult;
    }

    // Check email-based rate limiting (3 attempts per hour)
    const emailResult = await this.checkRateLimit({
      identifier: email,
      action: 'registration_email',
      maxAttempts: 3,
      windowMinutes: 60,
      cooldownMinutes: 120
    });

    return {
      allowed: ipResult.allowed && emailResult.allowed,
      remaining: Math.min(ipResult.remaining, emailResult.remaining),
      resetTime: ipResult.resetTime > emailResult.resetTime ? ipResult.resetTime : emailResult.resetTime,
      cooldownUntil: ipResult.cooldownUntil || emailResult.cooldownUntil,
      totalAttempts: Math.max(ipResult.totalAttempts, emailResult.totalAttempts)
    };
  }

  /**
   * Check login rate limiting with progressive delays
   */
  async checkLoginRateLimit(identifier: string, ipAddress: string): Promise<RateLimitResult> {
    // Check identifier-based rate limiting (10 attempts per 15 minutes)
    const identifierResult = await this.checkRateLimit({
      identifier: identifier,
      action: 'login',
      maxAttempts: 10,
      windowMinutes: 15,
      cooldownMinutes: 30
    });

    if (!identifierResult.allowed) {
      return identifierResult;
    }

    // Check IP-based rate limiting (50 attempts per 15 minutes)
    const ipResult = await this.checkRateLimit({
      identifier: ipAddress,
      action: 'login_ip',
      maxAttempts: 50,
      windowMinutes: 15,
      cooldownMinutes: 60
    });

    return {
      allowed: identifierResult.allowed && ipResult.allowed,
      remaining: Math.min(identifierResult.remaining, ipResult.remaining),
      resetTime: identifierResult.resetTime > ipResult.resetTime ? identifierResult.resetTime : ipResult.resetTime,
      cooldownUntil: identifierResult.cooldownUntil || ipResult.cooldownUntil,
      totalAttempts: Math.max(identifierResult.totalAttempts, ipResult.totalAttempts)
    };
  }

  /**
   * Detect IP-based abuse patterns
   */
  async detectIPAbuse(ipAddress: string): Promise<AbuseDetectionResult> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Get all rate limit records for this IP in the last 24 hours
      const records = await this.getDb()('rate_limits')
        .where('identifier', ipAddress)
        .where('created_at', '>', last24Hours)
        .select('action', 'count', 'window_start', 'window_end');

      let riskScore = 0;
      const flags: string[] = [];

      // Check for high volume across multiple actions
      const totalRequests = records.reduce((sum, record) => sum + record.count, 0);
      if (totalRequests > 100) {
        riskScore += 30;
        flags.push('high_volume_requests');
      }

      // Check for rapid registration attempts
      const registrationAttempts = records
        .filter(r => r.action === 'registration')
        .reduce((sum, record) => sum + record.count, 0);
      if (registrationAttempts > 10) {
        riskScore += 40;
        flags.push('excessive_registration_attempts');
      }

      // Check for OTP abuse
      const otpAttempts = records
        .filter(r => r.action.includes('otp'))
        .reduce((sum, record) => sum + record.count, 0);
      if (otpAttempts > 20) {
        riskScore += 35;
        flags.push('otp_abuse');
      }

      // Check for login brute force
      const loginAttempts = records
        .filter(r => r.action.includes('login'))
        .reduce((sum, record) => sum + record.count, 0);
      if (loginAttempts > 50) {
        riskScore += 45;
        flags.push('login_brute_force');
      }

      // Check for distributed pattern (multiple actions in short time)
      const uniqueActions = new Set(records.map(r => r.action)).size;
      if (uniqueActions > 5 && totalRequests > 50) {
        riskScore += 25;
        flags.push('distributed_attack_pattern');
      }

      const isAbusive = riskScore >= 50;
      let blockDuration: number | undefined;

      if (isAbusive) {
        // Progressive blocking based on risk score
        if (riskScore >= 80) {
          blockDuration = 24 * 60; // 24 hours
        } else if (riskScore >= 70) {
          blockDuration = 4 * 60; // 4 hours
        } else {
          blockDuration = 60; // 1 hour
        }

        logger.warn('IP abuse detected', {
          ipAddress,
          riskScore,
          flags,
          blockDuration,
          totalRequests,
          uniqueActions
        });
      }

      return {
        isAbusive,
        riskScore,
        flags,
        blockDuration
      };
    } catch (error) {
      logger.error('Abuse detection failed', {
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isAbusive: false,
        riskScore: 0,
        flags: []
      };
    }
  }

  /**
   * Block an IP address for a specific duration
   */
  async blockIP(ipAddress: string, durationMinutes: number, reason: string): Promise<void> {
    try {
      const now = new Date();
      const blockUntil = new Date(now.getTime() + (durationMinutes * 60 * 1000));

      await this.getDb()('rate_limits').insert({
        identifier: ipAddress,
        action: 'ip_blocked',
        count: 1,
        window_start: now,
        window_end: blockUntil,
        created_at: now,
        updated_at: now
      });

      logger.warn('IP blocked', {
        ipAddress,
        durationMinutes,
        reason,
        blockUntil
      });
    } catch (error) {
      logger.error('Failed to block IP', {
        ipAddress,
        durationMinutes,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if an IP is currently blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const now = new Date();
      
      const blockRecord = await this.getDb()('rate_limits')
        .where({
          identifier: ipAddress,
          action: 'ip_blocked'
        })
        .where('window_end', '>', now)
        .first();

      return !!blockRecord;
    } catch (error) {
      logger.error('Failed to check IP block status', {
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get rate limit status for monitoring
   */
  async getRateLimitStatus(identifier: string, action: string): Promise<RateLimitResult | null> {
    try {
      const now = new Date();
      
      const record = await this.getDb()('rate_limits')
        .where({
          identifier,
          action
        })
        .where('window_end', '>', now)
        .first();

      if (!record) {
        return null;
      }

      return {
        allowed: true, // This is just status, not enforcement
        remaining: 0, // Would need config to calculate
        resetTime: new Date(record.window_end),
        totalAttempts: record.count
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', {
        identifier,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Clean up expired rate limit records
   */
  private async cleanupExpiredRecords(trx: Knex.Transaction, now: Date): Promise<void> {
    try {
      const deleted = await trx('rate_limits')
        .where('window_end', '<', now)
        .del();

      if (deleted > 0) {
        logger.debug('Cleaned up expired rate limit records', { deleted });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired records', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset rate limits for a specific identifier and action (admin function)
   */
  async resetRateLimit(identifier: string, action?: string): Promise<void> {
    try {
      const query = this.getDb()('rate_limits').where('identifier', identifier);
      
      if (action) {
        query.where('action', action);
      }

      const deleted = await query.del();

      logger.info('Rate limits reset', {
        identifier,
        action: action || 'all',
        recordsDeleted: deleted
      });
    } catch (error) {
      logger.error('Failed to reset rate limits', {
        identifier,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Export singleton instance
export const rateLimitingService = new RateLimitingService();