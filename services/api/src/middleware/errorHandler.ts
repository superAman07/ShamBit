import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shambit/shared';
import { ErrorCodes } from '../utils/errorCodes';
import { createDatabaseError } from '../utils/errorHelpers';
import { logger } from '../config/logger.config';

/**
 * Enhanced error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}

/**
 * Global error handling middleware with enhanced logging and standardized responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const userId = req.user?.id || 'anonymous';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Enhanced error logging with context
  const errorContext = {
    requestId,
    userId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    userAgent,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      code: err instanceof AppError ? err.code : undefined,
      statusCode: err instanceof AppError ? err.statusCode : undefined,
    },
  };

  // Log error with appropriate level and structured data
  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn('Client error occurred', {
      ...errorContext,
      errorType: 'CLIENT_ERROR',
      severity: 'low',
    });
  } else if (err instanceof AppError && err.statusCode >= 500) {
    logger.error('Application error occurred', {
      ...errorContext,
      errorType: 'APPLICATION_ERROR',
      severity: 'high',
    });
  } else if (isDatabaseError(err)) {
    logger.error('Database error occurred', {
      ...errorContext,
      errorType: 'DATABASE_ERROR',
      severity: 'critical',
      dbErrorCode: (err as any).code,
    });
  } else {
    logger.error('Unexpected error occurred', {
      ...errorContext,
      errorType: 'UNEXPECTED_ERROR',
      severity: 'critical',
    });
  }

  // Create standardized error response
  const createErrorResponse = (
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ErrorResponse => ({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method,
    },
  });

  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorResponse(err.statusCode, err.code, err.message, err.details)
    );
    return;
  }

  // Handle database errors with enhanced detection
  if (isDatabaseError(err)) {
    const dbError = createDatabaseError(err, `${req.method} ${req.path}`);
    res.status(dbError.statusCode).json(
      createErrorResponse(dbError.statusCode, dbError.code, dbError.message, dbError.details)
    );
    return;
  }

  // Handle validation errors from external libraries
  if (isValidationError(err)) {
    res.status(400).json(
      createErrorResponse(400, ErrorCodes.INVALID_FORMAT, err.message, { validationErrors: err })
    );
    return;
  }

  // Handle file upload errors
  if (isFileUploadError(err)) {
    const { statusCode, code, message } = handleFileUploadError(err);
    res.status(statusCode).json(
      createErrorResponse(statusCode, code, message)
    );
    return;
  }

  // Handle timeout errors
  if (isTimeoutError(err)) {
    res.status(408).json(
      createErrorResponse(408, ErrorCodes.SERVICE_TIMEOUT, 'Request timeout')
    );
    return;
  }

  // Handle unknown errors
  res.status(500).json(
    createErrorResponse(500, ErrorCodes.INTERNAL_SERVER_ERROR, 'An unexpected error occurred')
  );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Check if error is a database error
 */
function isDatabaseError(err: any): boolean {
  return (
    err.code && typeof err.code === 'string' && err.code.match(/^[0-9A-Z]{5}$/) || // PostgreSQL error codes
    err.message && (
      err.message.includes('column') ||
      err.message.includes('relation') ||
      err.message.includes('syntax error') ||
      err.message.includes('constraint') ||
      err.message.includes('duplicate key') ||
      err.message.includes('foreign key') ||
      err.message.includes('check constraint')
    )
  );
}

/**
 * Check if error is a validation error
 */
function isValidationError(err: any): boolean {
  return (
    err.name === 'ValidationError' ||
    err.name === 'CastError' ||
    (err.errors && typeof err.errors === 'object')
  );
}

/**
 * Check if error is a file upload error
 */
function isFileUploadError(err: any): boolean {
  return (
    err.code === 'LIMIT_FILE_SIZE' ||
    err.code === 'LIMIT_FILE_COUNT' ||
    err.code === 'LIMIT_UNEXPECTED_FILE' ||
    err.message?.includes('file') ||
    err.message?.includes('upload')
  );
}

/**
 * Handle file upload errors
 */
function handleFileUploadError(err: any): { statusCode: number; code: string; message: string } {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 413,
        code: ErrorCodes.FILE_TOO_LARGE,
        message: 'File size exceeds the allowed limit',
      };
    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        code: ErrorCodes.QUOTA_EXCEEDED,
        message: 'Too many files uploaded',
      };
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: 'Unexpected file field',
      };
    default:
      return {
        statusCode: 400,
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: 'File upload error',
      };
  }
}

/**
 * Check if error is a timeout error
 */
function isTimeoutError(err: any): boolean {
  return (
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNRESET' ||
    err.message?.includes('timeout') ||
    err.message?.includes('ETIMEDOUT')
  );
}