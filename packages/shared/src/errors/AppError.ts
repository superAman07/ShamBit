/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(message, 400, code, true, details);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: Record<string, unknown>) {
    super(message, 401, code, true, details);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden - Insufficient permissions',
    code = 'FORBIDDEN',
    details?: Record<string, unknown>
  ) {
    super(message, 403, code, true, details);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(message, 404, code, true, details);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, 409, code, true, details);
  }
}

/**
 * 422 Unprocessable Entity
 */
export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message, 422, code, true, details);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(
    message = 'Too many requests',
    code = 'RATE_LIMIT_EXCEEDED',
    details?: Record<string, unknown>
  ) {
    super(message, 429, code, true, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(
    message = 'Internal server error',
    code = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, 500, code, false, details);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service temporarily unavailable',
    code = 'SERVICE_UNAVAILABLE',
    details?: Record<string, unknown>
  ) {
    super(message, 503, code, true, details);
  }
}
