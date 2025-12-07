import { Request } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { getConfig } from '@shambit/config';

/**
 * Default rate limiter for general API requests
 * Simplified - only two rate limiters needed for startup scale
 */
export const defaultRateLimiter = (): RateLimitRequestHandler => {
  const config = getConfig();
  
  return rateLimit({
    windowMs: config.API_RATE_LIMIT_WINDOW,
    max: config.API_RATE_LIMIT_MAX,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health check endpoints
    skip: (req: Request) => req.path === '/health' || req.path === '/api/v1/health',
  });
};

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/OTP endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});
