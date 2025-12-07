import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { BadRequestError, ValidationError } from '@shambit/shared';
import { ErrorCodes } from '../utils/errorCodes';
import { createLogger } from '@shambit/shared';

const logger = createLogger('security-middleware');

/**
 * Security headers middleware using helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API
});

/**
 * SQL injection prevention middleware
 */
export function sqlInjectionPrevention(req: Request, res: Response, next: NextFunction): void {
  try {
    const suspiciousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/gi,
      /(\b(XP_|SP_)\w+)/gi,
    ];

    const checkForSqlInjection = (obj: any, path = ''): void => {
      if (typeof obj === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj)) {
            logger.warn('Potential SQL injection attempt detected', {
              path: path || 'unknown',
              value: obj,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              timestamp: new Date().toISOString(),
            });

            throw new BadRequestError(
              'Invalid input detected',
              ErrorCodes.INVALID_FORMAT,
              { field: path, reason: 'Potentially malicious content' }
            );
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          checkForSqlInjection(value, path ? `${path}.${key}` : key);
        }
      }
    };

    // Check query parameters
    if (req.query) {
      checkForSqlInjection(req.query, 'query');
    }

    // Check request body
    if (req.body) {
      checkForSqlInjection(req.body, 'body');
    }

    // Check route parameters
    if (req.params) {
      checkForSqlInjection(req.params, 'params');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * XSS prevention middleware
 */
export function xssPrevention(req: Request, res: Response, next: NextFunction): void {
  try {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[^>]*>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ];

    const sanitizeValue = (value: string): string => {
      let sanitized = value;
      
      // Remove potentially dangerous patterns
      for (const pattern of xssPatterns) {
        sanitized = sanitized.replace(pattern, '');
      }
      
      // Encode HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      
      return sanitized;
    };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeValue(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      } else if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Input size limitation middleware
 */
export function inputSizeLimiter(maxSize: number = 1024 * 1024) { // Default 1MB
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const bodySize = JSON.stringify(req.body || {}).length;
      
      if (bodySize > maxSize) {
        throw new BadRequestError(
          `Request body too large. Maximum size is ${maxSize} bytes`,
          ErrorCodes.VALUE_OUT_OF_RANGE,
          { currentSize: bodySize, maxSize }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Request method validation middleware
 */
export function validateRequestMethod(allowedMethods: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedMethods.includes(req.method)) {
      throw new BadRequestError(
        `Method ${req.method} not allowed`,
        ErrorCodes.OPERATION_NOT_ALLOWED,
        { method: req.method, allowedMethods }
      );
    }
    next();
  };
}

/**
 * Content type validation middleware
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    // Skip validation for GET, DELETE, and OPTIONS (CORS preflight) requests
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'OPTIONS') {
      if (!contentType) {
        throw new BadRequestError(
          'Content-Type header is required',
          ErrorCodes.REQUIRED_FIELD_MISSING
        );
      }

      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        throw new BadRequestError(
          `Content-Type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          ErrorCodes.INVALID_FORMAT,
          { contentType, allowedTypes }
        );
      }
    }

    next();
  };
}

/**
 * Request ID middleware for tracing
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || generateRequestId();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simplified security middleware stack
 * Removed: IP whitelist, user agent validation (overkill for startup scale)
 * Kept: Essential security headers and input validation
 */
export const securityMiddleware = [
  requestId,
  securityHeaders,
  inputSizeLimiter(),
  validateContentType(['application/json', 'multipart/form-data']),
  sqlInjectionPrevention,
  xssPrevention,
];