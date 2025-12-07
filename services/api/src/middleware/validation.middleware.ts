import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shambit/shared';
import { 
  validateRequiredFields, 
  validateFieldFormat, 
  validateNumericRange, 
  validateStringLength,
  validateEnumValue,
  validateEmail,
  validatePhoneNumber,
  validateDate
} from '../utils/errorHelpers';
import { ErrorCodes } from '../utils/errorCodes';

/**
 * Validation rule interface
 */
type ValidationFieldType = 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date' | 'array' | 'object';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: ValidationFieldType;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

/**
 * Validation schema interface
 */
interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

/**
 * Create validation middleware
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        validateObject(req.body, schema.body, 'body');
      }

      // Validate query parameters
      if (schema.query) {
        validateObject(req.query, schema.query, 'query');
      }

      // Validate route parameters
      if (schema.params) {
        validateObject(req.params, schema.params, 'params');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate an object against validation rules
 */
function validateObject(data: any, rules: ValidationRule[], source: string): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(
      `Invalid ${source} data`,
      ErrorCodes.INVALID_FORMAT,
      { source, data }
    );
  }

  // Check required fields
  const requiredFields = rules.filter(rule => rule.required).map(rule => rule.field);
  if (requiredFields.length > 0) {
    validateRequiredFields(data, requiredFields);
  }

  // Validate each field
  for (const rule of rules) {
    const value = data[rule.field];

    // Skip validation if field is not required and not present
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Skip validation if field is empty string and not required
    if (!rule.required && typeof value === 'string' && value.trim() === '') {
      continue;
    }

    validateField(rule.field, value, rule, source);
  }
}

/**
 * Validate a single field
 */
function validateField(fieldName: string, value: any, rule: ValidationRule, source: string): void {
  const fieldPath = `${source}.${fieldName}`;

  // Type validation
  if (rule.type) {
    validateFieldType(fieldPath, value, rule.type);
  }

  // String validations
  if (typeof value === 'string') {
    if (rule.minLength !== undefined || rule.maxLength !== undefined) {
      validateStringLength(fieldPath, value, rule.minLength, rule.maxLength);
    }

    if (rule.pattern) {
      validateFieldFormat(fieldPath, value, rule.pattern, 'does not match required pattern');
    }

    if (rule.type === 'email') {
      validateEmail(value);
    }

    if (rule.type === 'phone') {
      validatePhoneNumber(value);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rule.min !== undefined || rule.max !== undefined) {
      validateNumericRange(fieldPath, value, rule.min, rule.max);
    }
  }

  // Date validation
  if (rule.type === 'date') {
    validateDate(fieldPath, value);
  }

  // Enum validation
  if (rule.enum && rule.enum.length > 0) {
    validateEnumValue(fieldPath, value, rule.enum, 'allowed values');
  }

  // Array validation
  if (rule.type === 'array' && !Array.isArray(value)) {
    throw new ValidationError(
      `${fieldPath} must be an array`,
      ErrorCodes.INVALID_FORMAT,
      { field: fieldPath, value, expectedType: 'array' }
    );
  }

  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      const message = typeof result === 'string' ? result : `${fieldPath} failed custom validation`;
      throw new ValidationError(
        message,
        ErrorCodes.INVALID_FORMAT,
        { field: fieldPath, value }
      );
    }
  }
}

/**
 * Validate field type
 */
function validateFieldType(fieldPath: string, value: any, expectedType: ValidationFieldType): void {
  let isValid = false;
  let actualType: string = typeof value;

  switch (expectedType) {
    case 'string':
      isValid = typeof value === 'string';
      break;
    case 'number':
      isValid = typeof value === 'number' && !isNaN(value);
      break;
    case 'boolean':
      isValid = typeof value === 'boolean';
      break;
    case 'email':
      isValid = typeof value === 'string';
      actualType = 'string (email)';
      break;
    case 'phone':
      isValid = typeof value === 'string';
      actualType = 'string (phone)';
      break;
    case 'date':
      isValid = typeof value === 'string' || value instanceof Date;
      actualType = value instanceof Date ? 'Date' : 'string (date)';
      break;
    case 'array':
      isValid = Array.isArray(value);
      actualType = Array.isArray(value) ? 'array' : typeof value;
      break;
    case 'object':
      isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
      actualType = 'object';
      break;
    default:
      isValid = true; // Unknown type, skip validation
  }

  if (!isValid) {
    throw new ValidationError(
      `${fieldPath} must be of type ${expectedType}`,
      ErrorCodes.INVALID_FORMAT,
      { field: fieldPath, value, expectedType, actualType }
    );
  }
}

/**
 * Common validation schemas
 */
export const commonValidations = {
  // Pagination validation
  pagination: {
    query: [
      { field: 'page', type: 'number' as const, min: 1 },
      { field: 'pageSize', type: 'number' as const, min: 1, max: 100 },
      { field: 'limit', type: 'number' as const, min: 1, max: 100 },
    ],
  },

  // ID parameter validation
  idParam: {
    params: [
      { field: 'id', required: true, type: 'string' as const, minLength: 1 },
    ],
  },

  // Search validation
  search: {
    query: [
      { field: 'search', type: 'string' as const, minLength: 2, maxLength: 100 },
      { field: 'sortBy', type: 'string' as const },
      { field: 'sortOrder', type: 'string' as const, enum: ['asc', 'desc'] },
    ],
  },

  // Date range validation
  dateRange: {
    query: [
      { field: 'startDate', type: 'date' as const },
      { field: 'endDate', type: 'date' as const },
    ],
  },
};

/**
 * Sanitize input data by trimming strings and removing empty values
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize body
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
 * Sanitize an object by trimming strings and removing empty values
 */
function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          sanitized[key] = trimmed;
        }
      } else if (value !== null && value !== undefined) {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  }

  return obj;
}