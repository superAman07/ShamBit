import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface RateLimitRule {
  channel: NotificationChannel;
  scope: 'GLOBAL' | 'TENANT' | 'USER';
  maxPerMinute?: number;
  maxPerHour?: number;
  maxPerDay?: number;
  burstLimit?: number;
}

export interface RateLimitConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultRules: RateLimitRule[];
}

@Injectable()
export class NotificationRateLimitService {
  private redis: Redis;
  private config: RateLimitConfig;
  private rateLimitRules: Map<string, RateLimitRule> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<RateLimitConfig>('rateLimit') || {
      redis: {
        host: 'localhost',
        port: 6379,
      },
      defaultRules: this.getDefaultRules(),
    };

    this.initializeRedis();
    this.loadRateLimitRules();
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  async checkRateLimit(
    key: string,
    channel: NotificationChannel,
    scope: 'GLOBAL' | 'TENANT' | 'USER' = 'USER'
  ): Promise<boolean> {
    try {
      const rule = this.getRateLimitRule(channel, scope);
      if (!rule) {
        return true; // No rate limit configured
      }

      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const hour = Math.floor(now / 3600000);
      const day = Math.floor(now / 86400000);

      // Check burst limit first
      if (rule.burstLimit) {
        const burstKey = `rate_limit:burst:${key}:${channel}`;
        const burstCount = await this.incrementCounter(burstKey, 60); // 1 minute window
        
        if (burstCount > rule.burstLimit) {
          this.logger.warn('Burst rate limit exceeded', {
            key,
            channel,
            count: burstCount,
            limit: rule.burstLimit,
          });
          return false;
        }
      }

      // Check per-minute limit
      if (rule.maxPerMinute) {
        const minuteKey = `rate_limit:minute:${key}:${channel}:${minute}`;
        const minuteCount = await this.incrementCounter(minuteKey, 60);
        
        if (minuteCount > rule.maxPerMinute) {
          this.logger.warn('Per-minute rate limit exceeded', {
            key,
            channel,
            count: minuteCount,
            limit: rule.maxPerMinute,
          });
          return false;
        }
      }

      // Check per-hour limit
      if (rule.maxPerHour) {
        const hourKey = `rate_limit:hour:${key}:${channel}:${hour}`;
        const hourCount = await this.incrementCounter(hourKey, 3600);
        
        if (hourCount > rule.maxPerHour) {
          this.logger.warn('Per-hour rate limit exceeded', {
            key,
            channel,
            count: hourCount,
            limit: rule.maxPerHour,
          });
          return false;
        }
      }

      // Check per-day limit
      if (rule.maxPerDay) {
        const dayKey = `rate_limit:day:${key}:${channel}:${day}`;
        const dayCount = await this.incrementCounter(dayKey, 86400);
        
        if (dayCount > rule.maxPerDay) {
          this.logger.warn('Per-day rate limit exceeded', {
            key,
            channel,
            count: dayCount,
            limit: rule.maxPerDay,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed', error.stack, { key, channel });
      return true; // Allow on error to avoid blocking notifications
    }
  }

  async getRateLimitStatus(
    key: string,
    channel: NotificationChannel
  ): Promise<{
    allowed: boolean;
    limits: {
      minute?: { current: number; max: number; resetAt: Date };
      hour?: { current: number; max: number; resetAt: Date };
      day?: { current: number; max: number; resetAt: Date };
      burst?: { current: number; max: number; resetAt: Date };
    };
  }> {
    const rule = this.getRateLimitRule(channel, 'USER');
    if (!rule) {
      return { allowed: true, limits: {} };
    }

    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    const limits: any = {};

    // Get current counts
    if (rule.maxPerMinute) {
      const minuteKey = `rate_limit:minute:${key}:${channel}:${minute}`;
      const current = await this.getCounter(minuteKey);
      limits.minute = {
        current,
        max: rule.maxPerMinute,
        resetAt: new Date((minute + 1) * 60000),
      };
    }

    if (rule.maxPerHour) {
      const hourKey = `rate_limit:hour:${key}:${channel}:${hour}`;
      const current = await this.getCounter(hourKey);
      limits.hour = {
        current,
        max: rule.maxPerHour,
        resetAt: new Date((hour + 1) * 3600000),
      };
    }

    if (rule.maxPerDay) {
      const dayKey = `rate_limit:day:${key}:${channel}:${day}`;
      const current = await this.getCounter(dayKey);
      limits.day = {
        current,
        max: rule.maxPerDay,
        resetAt: new Date((day + 1) * 86400000),
      };
    }

    if (rule.burstLimit) {
      const burstKey = `rate_limit:burst:${key}:${channel}`;
      const current = await this.getCounter(burstKey);
      limits.burst = {
        current,
        max: rule.burstLimit,
        resetAt: new Date(now + 60000), // 1 minute from now
      };
    }

    // Check if any limit is exceeded
    const allowed = !Object.values(limits).some((limit: any) => limit.current >= limit.max);

    return { allowed, limits };
  }

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  async setRateLimitRule(
    channel: NotificationChannel,
    scope: 'GLOBAL' | 'TENANT' | 'USER',
    rule: Omit<RateLimitRule, 'channel' | 'scope'>
  ): Promise<void> {
    const ruleKey = `${channel}:${scope}`;
    const fullRule: RateLimitRule = { channel, scope, ...rule };
    
    this.rateLimitRules.set(ruleKey, fullRule);
    
    // Persist to Redis
    await this.redis.hset(
      'rate_limit_rules',
      ruleKey,
      JSON.stringify(fullRule)
    );

    this.logger.log('Rate limit rule updated', { channel, scope, rule });
  }

  async removeRateLimitRule(
    channel: NotificationChannel,
    scope: 'GLOBAL' | 'TENANT' | 'USER'
  ): Promise<void> {
    const ruleKey = `${channel}:${scope}`;
    
    this.rateLimitRules.delete(ruleKey);
    await this.redis.hdel('rate_limit_rules', ruleKey);

    this.logger.log('Rate limit rule removed', { channel, scope });
  }

  async getAllRateLimitRules(): Promise<RateLimitRule[]> {
    return Array.from(this.rateLimitRules.values());
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getRateLimitMetrics(
    timeRange: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    totalRequests: number;
    blockedRequests: number;
    blockRate: number;
    topBlockedChannels: Array<{ channel: string; count: number }>;
  }> {
    // This would typically be implemented with proper metrics collection
    // For now, return mock data
    return {
      totalRequests: 0,
      blockedRequests: 0,
      blockRate: 0,
      topBlockedChannels: [],
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for rate limiting');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error.stack);
    });
  }

  private async loadRateLimitRules(): Promise<void> {
    try {
      // Load rules from Redis
      const rules = await this.redis.hgetall('rate_limit_rules');
      
      for (const [key, ruleJson] of Object.entries(rules)) {
        try {
          const rule = JSON.parse(ruleJson);
          this.rateLimitRules.set(key, rule);
        } catch (error) {
          this.logger.error('Failed to parse rate limit rule', error.stack, { key });
        }
      }

      // Load default rules if none exist
      if (this.rateLimitRules.size === 0) {
        for (const rule of this.config.defaultRules) {
          const key = `${rule.channel}:${rule.scope}`;
          this.rateLimitRules.set(key, rule);
        }
      }

      this.logger.log('Rate limit rules loaded', {
        count: this.rateLimitRules.size,
      });
    } catch (error) {
      this.logger.error('Failed to load rate limit rules', error.stack);
    }
  }

  public getRateLimitRule(
    channel: NotificationChannel,
    scope: 'GLOBAL' | 'TENANT' | 'USER'
  ): RateLimitRule | null {
    // Try specific scope first, then fall back to global
    const specificKey = `${channel}:${scope}`;
    const globalKey = `${channel}:GLOBAL`;
    
    return this.rateLimitRules.get(specificKey) || 
           this.rateLimitRules.get(globalKey) || 
           null;
  }

  public hasRateLimitRule(
    channel: NotificationChannel,
    scope: 'GLOBAL' | 'TENANT' | 'USER'
  ): boolean {
    return this.getRateLimitRule(channel, scope) !== null;
  }

  private async incrementCounter(key: string, ttl: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  private async getCounter(key: string): Promise<number> {
    const value = await this.redis.get(key);
    return parseInt(value || '0', 10);
  }

  private getDefaultRules(): RateLimitRule[] {
    return [
      // Email limits
      {
        channel: NotificationChannel.EMAIL,
        scope: 'USER',
        maxPerMinute: 5,
        maxPerHour: 50,
        maxPerDay: 200,
        burstLimit: 10,
      },
      // SMS limits (more restrictive)
      {
        channel: NotificationChannel.SMS,
        scope: 'USER',
        maxPerMinute: 2,
        maxPerHour: 10,
        maxPerDay: 50,
        burstLimit: 3,
      },
      // Push notification limits
      {
        channel: NotificationChannel.PUSH,
        scope: 'USER',
        maxPerMinute: 10,
        maxPerHour: 100,
        maxPerDay: 500,
        burstLimit: 20,
      },
      // In-app limits (less restrictive)
      {
        channel: NotificationChannel.IN_APP,
        scope: 'USER',
        maxPerMinute: 20,
        maxPerHour: 200,
        maxPerDay: 1000,
        burstLimit: 50,
      },
      // Webhook limits
      {
        channel: NotificationChannel.WEBHOOK,
        scope: 'USER',
        maxPerMinute: 30,
        maxPerHour: 300,
        maxPerDay: 2000,
        burstLimit: 60,
      },
    ];
  }
}