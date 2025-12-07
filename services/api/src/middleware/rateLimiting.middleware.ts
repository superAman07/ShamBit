import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitError } from '@shambit/shared';
import { ErrorCodes } from '../utils/errorCodes';
import { createLogger } from '@shambit/shared';

const logger = createLogger('rate-limiter');

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Create rate limiter with custom configuration
 */
function createRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
    keyGenerator: config.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip || 'unknown';
    }),
    handler: (req: Request, res: Response) => {
      const identifier = req.user?.id || req.ip;
      
      logger.warn('Rate limit exceeded', {
        identifier,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      const error = new RateLimitError(
        config.message || 'Too many requests, please try again later',
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        {
          limit: config.max,
          windowMs: config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000),
        }
      );

      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    },
  });
}

/**
 * General API rate limiter - 1000 requests per 15 minutes
 */
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many API requests, please try again later',
});

/**
 * Authentication rate limiter - 5 attempts per 15 minutes
 */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Use email/phone from request body or IP
    return req.body?.email || req.body?.phone || req.ip || 'unknown';
  },
});

/**
 * Password reset rate limiter - 3 attempts per hour
 */
export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  keyGenerator: (req: Request) => {
    return req.body?.email || req.ip || 'unknown';
  },
});

/**
 * File upload rate limiter - 20 uploads per hour
 */
export const fileUploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later',
});

/**
 * Search rate limiter - 100 searches per 5 minutes
 */
export const searchRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: 'Too many search requests, please try again later',
});

/**
 * Admin operations rate limiter - 200 requests per 15 minutes
 */
export const adminRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many admin requests, please try again later',
});

/**
 * Public API rate limiter - 500 requests per 15 minutes
 */
export const publicRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many requests, please try again later',
  keyGenerator: (req: Request) => req.ip || 'unknown', // Always use IP for public endpoints
});

/**
 * Strict rate limiter for sensitive operations - 10 requests per hour
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sensitive operation requests, please try again later',
});

/**
 * Create custom rate limiter for specific endpoints
 */
export function createCustomRateLimit(
  max: number,
  windowMinutes: number,
  message?: string
) {
  return createRateLimiter({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: message || `Too many requests, limit is ${max} per ${windowMinutes} minutes`,
  });
}