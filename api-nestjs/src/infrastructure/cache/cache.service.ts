import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence: ${key}`, error);
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Cache flushed');
    } catch (error) {
      this.logger.error('Failed to flush cache', error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern: ${pattern}`, error);
      return [];
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.redis.mget(...keys);
    } catch (error) {
      this.logger.error('Failed to get multiple keys', error);
      return [];
    }
  }

  async mset(keyValues: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValues).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to set multiple keys', error);
    }
  }

  async increment(key: string, by = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      this.logger.error(`Failed to increment key: ${key}`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set expiry for key: ${key}`, error);
    }
  }
}