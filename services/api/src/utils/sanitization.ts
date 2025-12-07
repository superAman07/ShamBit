import { ValidationError } from '@shambit/shared';
import { ErrorCodes } from './errorCodes';

/**
 * Sanitization utilities for user inputs
 */

/**
 * Sanitize string input by removing dangerous characters
 */
export function sanitizeString(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
} = {}): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim whitespace if requested
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove or escape HTML if not allowed
  if (!options.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Enforce maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    throw new ValidationError('Email must be a string', ErrorCodes.INVALID_FORMAT);
  }

  const sanitized = email.toLowerCase().trim();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Invalid email format', ErrorCodes.INVALID_EMAIL);
  }

  return sanitized;
}

/**
 * Sanitize phone number (Indian format)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    throw new ValidationError('Phone number must be a string', ErrorCodes.INVALID_FORMAT);
  }

  // Remove all non-digit characters
  let sanitized = phone.replace(/\D/g, '');

  // Remove country code if present
  if (sanitized.startsWith('91') && sanitized.length === 12) {
    sanitized = sanitized.substring(2);
  }

  // Validate Indian mobile number format
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(sanitized)) {
    throw new ValidationError('Invalid phone number format', ErrorCodes.INVALID_PHONE);
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any, options: {
  min?: number;
  max?: number;
  integer?: boolean;
  allowNegative?: boolean;
} = {}): number {
  let num: number;

  if (typeof input === 'string') {
    num = parseFloat(input);
  } else if (typeof input === 'number') {
    num = input;
  } else {
    throw new ValidationError('Invalid number format', ErrorCodes.INVALID_NUMBER);
  }

  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError('Invalid number format', ErrorCodes.INVALID_NUMBER);
  }

  // Check if negative numbers are allowed
  if (!options.allowNegative && num < 0) {
    throw new ValidationError('Negative numbers not allowed', ErrorCodes.VALUE_OUT_OF_RANGE);
  }

  // Convert to integer if required
  if (options.integer) {
    num = Math.floor(num);
  }

  // Check range
  if (options.min !== undefined && num < options.min) {
    throw new ValidationError(
      `Number must be at least ${options.min}`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  if (options.max !== undefined && num > options.max) {
    throw new ValidationError(
      `Number must be at most ${options.max}`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  throw new ValidationError('Invalid boolean format', ErrorCodes.INVALID_FORMAT);
}

/**
 * Sanitize date input
 */
export function sanitizeDate(input: any, options: {
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
  allowPast?: boolean;
} = {}): Date {
  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' || typeof input === 'number') {
    date = new Date(input);
  } else {
    throw new ValidationError('Invalid date format', ErrorCodes.INVALID_DATE);
  }

  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid date format', ErrorCodes.INVALID_DATE);
  }

  const now = new Date();

  // Check if future dates are allowed
  if (options.allowFuture === false && date > now) {
    throw new ValidationError('Future dates not allowed', ErrorCodes.VALUE_OUT_OF_RANGE);
  }

  // Check if past dates are allowed
  if (options.allowPast === false && date < now) {
    throw new ValidationError('Past dates not allowed', ErrorCodes.VALUE_OUT_OF_RANGE);
  }

  // Check date range
  if (options.minDate && date < options.minDate) {
    throw new ValidationError(
      `Date must be after ${options.minDate.toISOString()}`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  if (options.maxDate && date > options.maxDate) {
    throw new ValidationError(
      `Date must be before ${options.maxDate.toISOString()}`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  return date;
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(
  input: any,
  itemSanitizer: (item: any) => T,
  options: {
    minLength?: number;
    maxLength?: number;
    unique?: boolean;
  } = {}
): T[] {
  if (!Array.isArray(input)) {
    throw new ValidationError('Input must be an array', ErrorCodes.INVALID_FORMAT);
  }

  // Check array length
  if (options.minLength !== undefined && input.length < options.minLength) {
    throw new ValidationError(
      `Array must have at least ${options.minLength} items`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  if (options.maxLength !== undefined && input.length > options.maxLength) {
    throw new ValidationError(
      `Array must have at most ${options.maxLength} items`,
      ErrorCodes.VALUE_OUT_OF_RANGE
    );
  }

  // Sanitize each item
  const sanitized = input.map((item, index) => {
    try {
      return itemSanitizer(item);
    } catch (error) {
      throw new ValidationError(
        `Invalid item at index ${index}: ${(error as Error).message}`,
        ErrorCodes.INVALID_FORMAT
      );
    }
  });

  // Remove duplicates if required
  if (options.unique) {
    const unique = Array.from(new Set(sanitized.map(item => JSON.stringify(item))))
      .map(item => JSON.parse(item));
    return unique;
  }

  return sanitized;
}

/**
 * Sanitize object input
 */
export function sanitizeObject<T>(
  input: any,
  schema: Record<string, (value: any) => any>,
  options: {
    allowExtraFields?: boolean;
    requiredFields?: string[];
  } = {}
): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Input must be an object', ErrorCodes.INVALID_FORMAT);
  }

  const sanitized: any = {};

  // Check required fields
  if (options.requiredFields) {
    for (const field of options.requiredFields) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        throw new ValidationError(
          `Required field '${field}' is missing`,
          ErrorCodes.REQUIRED_FIELD_MISSING
        );
      }
    }
  }

  // Sanitize known fields
  for (const [key, sanitizer] of Object.entries(schema)) {
    if (key in input) {
      try {
        sanitized[key] = sanitizer(input[key]);
      } catch (error) {
        throw new ValidationError(
          `Invalid field '${key}': ${(error as Error).message}`,
          ErrorCodes.INVALID_FORMAT
        );
      }
    }
  }

  // Handle extra fields
  if (!options.allowExtraFields) {
    const extraFields = Object.keys(input).filter(key => !(key in schema));
    if (extraFields.length > 0) {
      throw new ValidationError(
        `Unexpected fields: ${extraFields.join(', ')}`,
        ErrorCodes.INVALID_FORMAT,
        { extraFields }
      );
    }
  } else {
    // Include extra fields as-is (with basic string sanitization)
    for (const [key, value] of Object.entries(input)) {
      if (!(key in schema)) {
        sanitized[key] = typeof value === 'string' ? sanitizeString(value) : value;
      }
    }
  }

  return sanitized as T;
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    throw new ValidationError('File name must be a string', ErrorCodes.INVALID_FORMAT);
  }

  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }

  // Ensure it's not empty
  if (!sanitized.trim()) {
    throw new ValidationError('File name cannot be empty', ErrorCodes.INVALID_FORMAT);
  }

  return sanitized.trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string, options: {
  allowedProtocols?: string[];
  allowedDomains?: string[];
} = {}): string {
  if (typeof url !== 'string') {
    throw new ValidationError('URL must be a string', ErrorCodes.INVALID_FORMAT);
  }

  const sanitized = url.trim();

  try {
    const urlObj = new URL(sanitized);

    // Check allowed protocols
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      throw new ValidationError(
        `Protocol not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`,
        ErrorCodes.INVALID_FORMAT
      );
    }

    // Check allowed domains
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      const isAllowed = options.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        throw new ValidationError(
          `Domain not allowed. Allowed domains: ${options.allowedDomains.join(', ')}`,
          ErrorCodes.INVALID_FORMAT
        );
      }
    }

    return urlObj.toString();
  } catch (error) {
    throw new ValidationError('Invalid URL format', ErrorCodes.INVALID_FORMAT);
  }
}