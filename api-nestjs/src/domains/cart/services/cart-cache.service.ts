import { Injectable, Logger } from '@nestjs/common';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class CartCacheService {
  private readonly logger = new Logger(CartCacheService.name);
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor() // @Inject('REDIS_CLIENT') private readonly redis: Redis,
  {}

  /**
   * Cache cart data with TTL
   */
  async cacheCart(cart: Cart): Promise<void> {
    try {
      const cacheKey = `cart:${cart.id}`;
      const ttl = cart.userId ? 86400 : 3600; // 24h for users, 1h for guests

      // Using in-memory cache for now, replace with Redis in production
      this.cache.set(cacheKey, {
        data: cart,
        expiry: Date.now() + ttl * 1000,
      });

      this.logger.debug(`Cached cart ${cart.id} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to cache cart ${cart.id}: ${error.message}`);
    }
  }

  /**
   * Get cart from cache
   */
  async getCachedCart(cartId: string): Promise<Cart | null> {
    try {
      const cacheKey = `cart:${cartId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      // Remove expired entry
      if (cached) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached cart ${cartId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Cache promotion eligibility results
   */
  async cachePromotionEligibility(
    cartId: string,
    eligiblePromotions: any[],
  ): Promise<void> {
    try {
      const cacheKey = `cart_promotions:${cartId}`;
      const ttl = 300; // 5 minutes

      this.cache.set(cacheKey, {
        data: eligiblePromotions.map((p) => p.id),
        expiry: Date.now() + ttl * 1000,
      });

      this.logger.debug(`Cached promotion eligibility for cart ${cartId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cache promotion eligibility for cart ${cartId}: ${error.message}`,
      );
    }
  }

  /**
   * Get cached promotion eligibility
   */
  async getCachedPromotionEligibility(
    cartId: string,
  ): Promise<string[] | null> {
    try {
      const cacheKey = `cart_promotions:${cartId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      if (cached) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached promotion eligibility for cart ${cartId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Cache cart pricing calculation
   */
  async cacheCartPricing(cartId: string, pricing: any): Promise<void> {
    try {
      const cacheKey = `cart_pricing:${cartId}`;
      const ttl = 300; // 5 minutes

      this.cache.set(cacheKey, {
        data: pricing,
        expiry: Date.now() + ttl * 1000,
      });

      this.logger.debug(`Cached pricing for cart ${cartId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cache pricing for cart ${cartId}: ${error.message}`,
      );
    }
  }

  /**
   * Get cached cart pricing
   */
  async getCachedCartPricing(cartId: string): Promise<any | null> {
    try {
      const cacheKey = `cart_pricing:${cartId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      if (cached) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached pricing for cart ${cartId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Invalidate cart-related caches
   */
  async invalidateCartCaches(cartId: string): Promise<void> {
    try {
      const keys = [
        `cart:${cartId}`,
        `cart_promotions:${cartId}`,
        `cart_pricing:${cartId}`,
        `cart_availability:${cartId}`,
      ];

      keys.forEach((key) => this.cache.delete(key));

      this.logger.debug(`Invalidated caches for cart ${cartId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate caches for cart ${cartId}: ${error.message}`,
      );
    }
  }

  /**
   * Cache cart availability check results
   */
  async cacheCartAvailability(
    cartId: string,
    availability: any,
  ): Promise<void> {
    try {
      const cacheKey = `cart_availability:${cartId}`;
      const ttl = 60; // 1 minute (short TTL for availability)

      this.cache.set(cacheKey, {
        data: availability,
        expiry: Date.now() + ttl * 1000,
      });

      this.logger.debug(`Cached availability for cart ${cartId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cache availability for cart ${cartId}: ${error.message}`,
      );
    }
  }

  /**
   * Get cached cart availability
   */
  async getCachedCartAvailability(cartId: string): Promise<any | null> {
    try {
      const cacheKey = `cart_availability:${cartId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      if (cached) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached availability for cart ${cartId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Cache user's cart list
   */
  async cacheUserCarts(userId: string, carts: Cart[]): Promise<void> {
    try {
      const cacheKey = `user_carts:${userId}`;
      const ttl = 1800; // 30 minutes

      this.cache.set(cacheKey, {
        data: carts,
        expiry: Date.now() + ttl * 1000,
      });

      this.logger.debug(`Cached carts for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cache carts for user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Get cached user carts
   */
  async getCachedUserCarts(userId: string): Promise<Cart[] | null> {
    try {
      const cacheKey = `user_carts:${userId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      if (cached) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached carts for user ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Invalidate user cart caches
   */
  async invalidateUserCartCaches(userId: string): Promise<void> {
    try {
      const keys = [`user_carts:${userId}`, `user_cart_count:${userId}`];

      keys.forEach((key) => this.cache.delete(key));

      this.logger.debug(`Invalidated user cart caches for ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate user cart caches for ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Set rate limiting for cart operations
   */
  async setRateLimit(
    identifier: string,
    operation: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    try {
      const key = `rate_limit:${operation}:${identifier}`;
      const cached = this.cache.get(key);

      if (cached && cached.expiry > Date.now()) {
        if (cached.data >= limit) {
          return false; // Rate limit exceeded
        }

        // Increment counter
        this.cache.set(key, {
          data: cached.data + 1,
          expiry: cached.expiry,
        });
      } else {
        // Start new window
        this.cache.set(key, {
          data: 1,
          expiry: Date.now() + windowSeconds * 1000,
        });
      }

      return true; // Allow operation
    } catch (error) {
      this.logger.error(
        `Failed to check rate limit for ${identifier}: ${error.message}`,
      );
      return true; // Allow on error
    }
  }

  /**
   * Get current rate limit count
   */
  async getRateLimitCount(
    identifier: string,
    operation: string,
  ): Promise<number> {
    try {
      const key = `rate_limit:${operation}:${identifier}`;
      const cached = this.cache.get(key);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit count for ${identifier}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Clear all caches (useful for testing)
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cleared all caches');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
