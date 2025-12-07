/**
 * Request Deduplication Utility
 * Prevents duplicate API calls by caching in-flight requests
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly maxAge: number = 5000; // 5 seconds

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Deduplicate a request
   * If the same request is already in flight, return the existing promise
   * Otherwise, execute the request and cache it
   */
  async deduplicate<T>(
    url: string,
    requestFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    this.cleanup();

    const key = this.generateKey(url, params);
    const existing = this.pendingRequests.get(key);

    if (existing) {
      console.log(`[RequestDedup] Reusing in-flight request: ${key}`);
      return existing.promise;
    }

    console.log(`[RequestDedup] New request: ${key}`);
    const promise = requestFn()
      .then((result) => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

export const requestDeduplicator = new RequestDeduplicator();
