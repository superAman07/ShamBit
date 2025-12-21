import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@shambit/shared';
import { ErrorCodes } from '../utils/errorCodes';
import { createLogger } from '@shambit/shared';
import { rateLimitingService } from '../services/rate-limiting.service';

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

/**
 * Enhanced rate limiter with abuse detection for seller registration
 */
export const registrationRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email;

    // Check if IP is blocked
    const isBlocked = await rateLimitingService.isIPBlocked(ipAddress);
    if (isBlocked) {
      logger.warn('Blocked IP attempted registration', { ipAddress });
      return res.status(429).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Your IP address has been temporarily blocked due to suspicious activity',
          details: { suggestion: 'Please contact support if you believe this is an error' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check registration rate limits
    const rateLimitResult = await rateLimitingService.checkRegistrationRateLimit(ipAddress, email);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Registration rate limit exceeded', {
        ipAddress,
        email,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        cooldownUntil: rateLimitResult.cooldownUntil
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration attempts. Please try again later.',
          details: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            cooldownUntil: rateLimitResult.cooldownUntil,
            suggestion: 'Please wait before attempting to register again'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check for IP abuse patterns
    const abuseResult = await rateLimitingService.detectIPAbuse(ipAddress);
    if (abuseResult.isAbusive && abuseResult.blockDuration) {
      // Block the IP
      await rateLimitingService.blockIP(ipAddress, abuseResult.blockDuration, 'Automated abuse detection');
      
      logger.warn('IP blocked due to abuse detection', {
        ipAddress,
        riskScore: abuseResult.riskScore,
        flags: abuseResult.flags,
        blockDuration: abuseResult.blockDuration
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'ABUSE_DETECTED',
          message: 'Suspicious activity detected. Your IP has been temporarily blocked.',
          details: { 
            riskScore: abuseResult.riskScore,
            flags: abuseResult.flags,
            suggestion: 'Please contact support if you believe this is an error'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
    });

    next();
  } catch (error) {
    logger.error('Registration rate limit middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip
    });
    // On error, allow the request to proceed
    next();
  }
};

/**
 * Enhanced rate limiter for OTP requests with cooldown
 */
export const otpRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const mobile = req.body?.mobile;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mobile number is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check if IP is blocked
    const isBlocked = await rateLimitingService.isIPBlocked(ipAddress);
    if (isBlocked) {
      logger.warn('Blocked IP attempted OTP request', { ipAddress, mobile });
      return res.status(429).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Your IP address has been temporarily blocked due to suspicious activity',
          details: { suggestion: 'Please contact support if you believe this is an error' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check OTP rate limits
    const rateLimitResult = await rateLimitingService.checkOTPRateLimit(mobile, ipAddress);
    
    if (!rateLimitResult.allowed) {
      logger.warn('OTP rate limit exceeded', {
        ipAddress,
        mobile,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        cooldownUntil: rateLimitResult.cooldownUntil
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'OTP_RATE_LIMIT_EXCEEDED',
          message: 'Too many OTP requests. Please wait before requesting another OTP.',
          details: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            cooldownUntil: rateLimitResult.cooldownUntil,
            cooldownSeconds: rateLimitResult.cooldownUntil 
              ? Math.ceil((rateLimitResult.cooldownUntil.getTime() - Date.now()) / 1000)
              : undefined,
            suggestion: 'Please wait for the cooldown period to end'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': '3',
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
    });

    next();
  } catch (error) {
    logger.error('OTP rate limit middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip,
      mobile: req.body?.mobile
    });
    // On error, allow the request to proceed
    next();
  }
};

/**
 * Enhanced rate limiter for login attempts with progressive delays
 */
export const loginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const identifier = req.body?.identifier;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email or mobile is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check if IP is blocked
    const isBlocked = await rateLimitingService.isIPBlocked(ipAddress);
    if (isBlocked) {
      logger.warn('Blocked IP attempted login', { ipAddress, identifier });
      return res.status(429).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Your IP address has been temporarily blocked due to suspicious activity',
          details: { suggestion: 'Please contact support if you believe this is an error' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Check login rate limits
    const rateLimitResult = await rateLimitingService.checkLoginRateLimit(identifier, ipAddress);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Login rate limit exceeded', {
        ipAddress,
        identifier,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        cooldownUntil: rateLimitResult.cooldownUntil
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'LOGIN_RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts. Please wait before trying again.',
          details: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            cooldownUntil: rateLimitResult.cooldownUntil,
            lockoutSeconds: rateLimitResult.cooldownUntil 
              ? Math.ceil((rateLimitResult.cooldownUntil.getTime() - Date.now()) / 1000)
              : undefined,
            suggestion: 'Please wait for the lockout period to end or try password recovery'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
    });

    next();
  } catch (error) {
    logger.error('Login rate limit middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip,
      identifier: req.body?.identifier
    });
    // On error, allow the request to proceed
    next();
  }
};

/**
 * IP-based abuse detection middleware
 */
export const abuseDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check for IP abuse patterns
    const abuseResult = await rateLimitingService.detectIPAbuse(ipAddress);
    
    if (abuseResult.isAbusive) {
      logger.warn('Abuse detected', {
        ipAddress,
        riskScore: abuseResult.riskScore,
        flags: abuseResult.flags,
        endpoint: req.path,
        method: req.method
      });

      // Add abuse detection headers for monitoring
      res.set({
        'X-Abuse-Risk-Score': abuseResult.riskScore.toString(),
        'X-Abuse-Flags': abuseResult.flags.join(','),
      });

      // Block if risk score is very high
      if (abuseResult.riskScore >= 80 && abuseResult.blockDuration) {
        await rateLimitingService.blockIP(ipAddress, abuseResult.blockDuration, 'High risk score abuse detection');
        
        return res.status(429).json({
          success: false,
          error: {
            code: 'HIGH_RISK_ABUSE_DETECTED',
            message: 'High risk activity detected. Access temporarily restricted.',
            details: { 
              riskScore: abuseResult.riskScore,
              suggestion: 'Please contact support if you believe this is an error'
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Abuse detection middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip
    });
    // On error, allow the request to proceed
    next();
  }
};