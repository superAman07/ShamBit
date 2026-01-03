import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface DeduplicationConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultTtl: number; // seconds
  hashAlgorithm: string;
}

export interface IdempotencyRecord {
  notificationId: string;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class NotificationDeduplicationService {
  private redis: Redis;
  private config: DeduplicationConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.configService.get<DeduplicationConfig>(
      'deduplication',
    ) || {
      redis: {
        host: 'localhost',
        port: 6379,
      },
      defaultTtl: 3600, // 1 hour
      hashAlgorithm: 'sha256',
    };

    this.initializeRedis();
  }

  // ============================================================================
  // IDEMPOTENCY MANAGEMENT
  // ============================================================================

  async checkIdempotency(
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null> {
    try {
      const key = this.buildIdempotencyKey(idempotencyKey);
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const record = JSON.parse(data);
      return {
        notificationId: record.notificationId,
        createdAt: new Date(record.createdAt),
        expiresAt: new Date(record.expiresAt),
      };
    } catch (error) {
      this.logger.error('Failed to check idempotency', error.stack, {
        idempotencyKey,
      });
      return null;
    }
  }

  async storeIdempotency(
    idempotencyKey: string,
    notificationId: string,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = this.buildIdempotencyKey(idempotencyKey);
      const expirationTime = ttl || this.config.defaultTtl;
      const expiresAt = new Date(Date.now() + expirationTime * 1000);

      const record = {
        notificationId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await this.redis.setex(key, expirationTime, JSON.stringify(record));

      this.logger.log('Idempotency key stored', {
        idempotencyKey,
        notificationId,
        expiresAt,
      });
    } catch (error) {
      this.logger.error('Failed to store idempotency', error.stack, {
        idempotencyKey,
        notificationId,
      });
      throw error;
    }
  }

  async removeIdempotency(idempotencyKey: string): Promise<void> {
    try {
      const key = this.buildIdempotencyKey(idempotencyKey);
      await this.redis.del(key);

      this.logger.log('Idempotency key removed', { idempotencyKey });
    } catch (error) {
      this.logger.error('Failed to remove idempotency', error.stack, {
        idempotencyKey,
      });
    }
  }

  // ============================================================================
  // CONTENT DEDUPLICATION
  // ============================================================================

  async checkContentDuplication(
    userId: string,
    content: string,
    timeWindow: number = 300, // 5 minutes
  ): Promise<boolean> {
    try {
      const contentHash = this.generateContentHash(content);
      const key = this.buildContentKey(userId, contentHash);

      const exists = await this.redis.exists(key);

      if (exists) {
        this.logger.log('Duplicate content detected', {
          userId,
          contentHash,
          timeWindow,
        });
        return true;
      }

      // Store content hash with expiration
      await this.redis.setex(key, timeWindow, Date.now().toString());
      return false;
    } catch (error) {
      this.logger.error('Failed to check content duplication', error.stack, {
        userId,
        timeWindow,
      });
      return false; // Allow on error to avoid blocking notifications
    }
  }

  async markContentSent(
    userId: string,
    content: string,
    ttl: number = 300,
  ): Promise<void> {
    try {
      const contentHash = this.generateContentHash(content);
      const key = this.buildContentKey(userId, contentHash);

      await this.redis.setex(key, ttl, Date.now().toString());

      this.logger.log('Content marked as sent', {
        userId,
        contentHash,
        ttl,
      });
    } catch (error) {
      this.logger.error('Failed to mark content as sent', error.stack, {
        userId,
      });
    }
  }

  // ============================================================================
  // RECIPIENT DEDUPLICATION
  // ============================================================================

  async deduplicateRecipients(
    recipients: Array<{ userId?: string; email?: string; phone?: string }>,
    notificationType: string,
  ): Promise<Array<{ userId?: string; email?: string; phone?: string }>> {
    const seen = new Set<string>();
    const deduplicated: Array<{
      userId?: string;
      email?: string;
      phone?: string;
    }> = [];

    for (const recipient of recipients) {
      const key = this.generateRecipientKey(recipient);

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(recipient);
      } else {
        this.logger.log('Duplicate recipient removed', {
          recipient: this.maskRecipient(recipient),
          notificationType,
        });
      }
    }

    return deduplicated;
  }

  async checkRecentDelivery(
    recipient: { userId?: string; email?: string; phone?: string },
    notificationType: string,
    timeWindow: number = 3600, // 1 hour
  ): Promise<boolean> {
    try {
      const recipientKey = this.generateRecipientKey(recipient);
      const key = this.buildRecentDeliveryKey(recipientKey, notificationType);

      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check recent delivery', error.stack, {
        recipient: this.maskRecipient(recipient),
        notificationType,
      });
      return false;
    }
  }

  async markRecentDelivery(
    recipient: { userId?: string; email?: string; phone?: string },
    notificationType: string,
    ttl: number = 3600,
  ): Promise<void> {
    try {
      const recipientKey = this.generateRecipientKey(recipient);
      const key = this.buildRecentDeliveryKey(recipientKey, notificationType);

      await this.redis.setex(key, ttl, Date.now().toString());

      this.logger.log('Recent delivery marked', {
        recipient: this.maskRecipient(recipient),
        notificationType,
        ttl,
      });
    } catch (error) {
      this.logger.error('Failed to mark recent delivery', error.stack, {
        recipient: this.maskRecipient(recipient),
        notificationType,
      });
    }
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  async cleanupExpiredKeys(): Promise<number> {
    try {
      // This would typically be handled by Redis TTL, but we can also do manual cleanup
      const patterns = [
        'notification:idempotency:*',
        'notification:content:*',
        'notification:delivery:*',
      ];

      let deletedCount = 0;

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) {
            // Key exists but has no expiration
            await this.redis.del(key);
            deletedCount++;
          }
        }
      }

      this.logger.log('Expired deduplication keys cleaned up', {
        deletedCount,
      });
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired keys', error.stack);
      return 0;
    }
  }

  async getDeduplicationStats(): Promise<{
    idempotencyKeys: number;
    contentHashes: number;
    recentDeliveries: number;
  }> {
    try {
      const [idempotencyKeys, contentHashes, recentDeliveries] =
        await Promise.all([
          this.countKeys('notification:idempotency:*'),
          this.countKeys('notification:content:*'),
          this.countKeys('notification:delivery:*'),
        ]);

      return {
        idempotencyKeys,
        contentHashes,
        recentDeliveries,
      };
    } catch (error) {
      this.logger.error('Failed to get deduplication stats', error.stack);
      return {
        idempotencyKeys: 0,
        contentHashes: 0,
        recentDeliveries: 0,
      };
    }
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
      this.logger.log('Redis connected for deduplication');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error.stack);
    });
  }

  private buildIdempotencyKey(idempotencyKey: string): string {
    return `notification:idempotency:${idempotencyKey}`;
  }

  private buildContentKey(userId: string, contentHash: string): string {
    return `notification:content:${userId}:${contentHash}`;
  }

  private buildRecentDeliveryKey(
    recipientKey: string,
    notificationType: string,
  ): string {
    return `notification:delivery:${recipientKey}:${notificationType}`;
  }

  private generateContentHash(content: string): string {
    return createHash(this.config.hashAlgorithm)
      .update(content.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for shorter keys
  }

  private generateRecipientKey(recipient: {
    userId?: string;
    email?: string;
    phone?: string;
  }): string {
    if (recipient.userId) {
      return `user:${recipient.userId}`;
    }
    if (recipient.email) {
      return `email:${recipient.email.toLowerCase()}`;
    }
    if (recipient.phone) {
      return `phone:${recipient.phone}`;
    }
    throw new Error('Recipient must have userId, email, or phone');
  }

  private maskRecipient(recipient: {
    userId?: string;
    email?: string;
    phone?: string;
  }): any {
    const masked: any = {};

    if (recipient.userId) {
      masked.userId = recipient.userId;
    }
    if (recipient.email) {
      const [local, domain] = recipient.email.split('@');
      masked.email = `${local.substring(0, 2)}***@${domain}`;
    }
    if (recipient.phone) {
      masked.phone = `***${recipient.phone.slice(-4)}`;
    }

    return masked;
  }

  private async countKeys(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }
}
