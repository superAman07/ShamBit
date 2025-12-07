import { AppError, NotFoundError, BadRequestError, ConflictError, ValidationError } from '@shambit/shared';
import { createLogger } from '@shambit/shared';
import { ErrorCodes } from './errorCodes';

const logger = createLogger('error-helpers');

/**
 * Error helper functions for consistent error creation and handling
 */

/**
 * Create a standardized not found error
 */
export function createNotFoundError(resource: string, identifier?: string, code?: string): NotFoundError {
  const message = identifier 
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;
  
  return new NotFoundError(message, code || ErrorCodes.PRODUCT_NOT_FOUND);
}

/**
 * Create a standardized validation error
 */
export function createValidationError(field: string, value: any, reason: string, code?: string): ValidationError {
  const message = `Invalid ${field}: ${reason}`;
  const details = { field, value, reason };
  
  return new ValidationError(message, code || ErrorCodes.INVALID_FORMAT, details);
}

/**
 * Create a standardized conflict error
 */
export function createConflictError(resource: string, field: string, value: any, code?: string): ConflictError {
  const message = `${resource} with ${field} '${value}' already exists`;
  const details = { resource, field, value };
  
  return new ConflictError(message, code || ErrorCodes.RESOURCE_CONFLICT, details);
}

/**
 * Create a standardized business rule violation error
 */
export function createBusinessRuleError(rule: string, details?: Record<string, any>, code?: string): BadRequestError {
  const message = `Business rule violation: ${rule}`;
  
  return new BadRequestError(message, code || ErrorCodes.BUSINESS_RULE_VIOLATION, details);
}

/**
 * Create a standardized insufficient stock error
 */
export function createInsufficientStockError(productId: string, requested: number, available: number): BadRequestError {
  const message = `Insufficient stock for product. Requested: ${requested}, Available: ${available}`;
  const details = { productId, requested, available };
  
  return new BadRequestError(message, ErrorCodes.INSUFFICIENT_STOCK, details);
}

/**
 * Validate required fields and throw error if missing
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      ErrorCodes.REQUIRED_FIELD_MISSING,
      { missingFields }
    );
  }
}

/**
 * Validate field format using regex
 */
export function validateFieldFormat(field: string, value: string, pattern: RegExp, errorMessage: string): void {
  if (!pattern.test(value)) {
    throw createValidationError(field, value, errorMessage, ErrorCodes.INVALID_FORMAT);
  }
}

/**
 * Validate numeric range
 */
export function validateNumericRange(field: string, value: number, min?: number, max?: number): void {
  if (min !== undefined && value < min) {
    throw createValidationError(field, value, `must be at least ${min}`, ErrorCodes.VALUE_OUT_OF_RANGE);
  }
  
  if (max !== undefined && value > max) {
    throw createValidationError(field, value, `must be at most ${max}`, ErrorCodes.VALUE_OUT_OF_RANGE);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(field: string, value: string, minLength?: number, maxLength?: number): void {
  if (minLength !== undefined && value.length < minLength) {
    throw createValidationError(field, value, `must be at least ${minLength} characters long`, ErrorCodes.VALUE_TOO_SHORT);
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw createValidationError(field, value, `must be at most ${maxLength} characters long`, ErrorCodes.VALUE_TOO_LONG);
  }
}

/**
 * Validate enum value
 */
export function validateEnumValue<T>(field: string, value: T, allowedValues: T[], enumName: string): void {
  if (!allowedValues.includes(value)) {
    throw createValidationError(
      field, 
      value, 
      `must be one of: ${allowedValues.join(', ')}`, 
      ErrorCodes.INVALID_ENUM_VALUE
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError('email', email, 'invalid email format', ErrorCodes.INVALID_EMAIL);
  }
}

/**
 * Validate phone number format (Indian format)
 */
export function validatePhoneNumber(phone: string): void {
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw createValidationError('phone', phone, 'invalid phone number format', ErrorCodes.INVALID_PHONE);
  }
}

/**
 * Validate date format and range
 */
export function validateDate(field: string, dateValue: string | Date, minDate?: Date, maxDate?: Date): Date {
  let date: Date;
  
  try {
    date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    throw createValidationError(field, dateValue, 'invalid date format', ErrorCodes.INVALID_DATE);
  }
  
  if (minDate && date < minDate) {
    throw createValidationError(field, dateValue, `must be after ${minDate.toISOString()}`, ErrorCodes.VALUE_OUT_OF_RANGE);
  }
  
  if (maxDate && date > maxDate) {
    throw createValidationError(field, dateValue, `must be before ${maxDate.toISOString()}`, ErrorCodes.VALUE_OUT_OF_RANGE);
  }
  
  return date;
}

/**
 * Log error with context for debugging
 */
export function logErrorWithContext(error: Error, context: Record<string, any>): void {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wrap async functions to handle errors consistently
 */
export function asyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Log the error with context
      logErrorWithContext(error as Error, { functionName: fn.name, arguments: args });
      
      // Re-throw the error to be handled by the global error handler
      throw error;
    }
  };
}

/**
 * Create a database error from a raw database error
 */
export function createDatabaseError(error: any, operation: string): AppError {
  logger.error('Database error occurred', {
    operation,
    error: error.message,
    code: error.code,
    detail: error.detail,
  });

  // Handle specific database errors
  if (error.code === '23505') { // Unique constraint violation
    return new ConflictError(
      'Resource already exists',
      ErrorCodes.CONSTRAINT_VIOLATION,
      { operation, constraint: error.constraint }
    );
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return new BadRequestError(
      'Referenced resource does not exist',
      ErrorCodes.CONSTRAINT_VIOLATION,
      { operation, constraint: error.constraint }
    );
  }
  
  if (error.code === '23514') { // Check constraint violation
    return new BadRequestError(
      'Data violates business rules',
      ErrorCodes.CONSTRAINT_VIOLATION,
      { operation, constraint: error.constraint }
    );
  }

  // Generic database error
  return new AppError(
    'Database operation failed',
    500,
    ErrorCodes.QUERY_ERROR,
    false,
    { operation, originalError: error.message }
  );
}