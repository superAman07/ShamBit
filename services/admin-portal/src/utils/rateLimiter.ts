/**
 * Rate Limiter - Simplified placeholder
 * Client-side rate limiting was removed (handled by API)
 */

export const createRateLimiter = (_options: any) => {
  return {
    check: () => true,
    reset: () => {},
    waitForSlot: async () => {},
    releaseSlot: () => {},
  };
};

export const rateLimiter = createRateLimiter({});
export const apiRateLimiter = rateLimiter;
