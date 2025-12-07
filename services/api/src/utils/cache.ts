import NodeCache from 'node-cache';

/**
 * Cache service for storing report results
 * TTL: 5 minutes (300 seconds)
 * Check period: 60 seconds
 */
class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Don't clone objects for better performance
    });
  }

  /**
   * Generate a cache key for reports
   * Format: "report:{type}:{startDate}:{endDate}"
   */
  getCacheKey(reportType: string, startDate: string, endDate: string): string {
    return `report:${reportType}:${startDate}:${endDate}`;
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL in seconds (defaults to 300)
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 300);
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all cached values
   */
  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const cacheService = new CacheService();
