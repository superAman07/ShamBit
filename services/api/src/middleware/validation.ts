import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Enhanced validation schemas
export const registrationSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  
  mobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'),
  
  email: z.string()
    .email('Please provide a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
});

export const otpVerificationSchema = z.object({
  mobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'),
  
  otp: z.string()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  
  sessionId: z.string()
    .min(1, 'Session ID is required')
});

export const loginSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address'),
  
  password: z.string()
    .min(1, 'Password is required')
});

export const profileCompletionSchema = z.object({
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const minAge = parseInt(process.env.MIN_SELLER_AGE || '18');
      const maxAge = parseInt(process.env.MAX_SELLER_AGE || '100');
      return age >= minAge && age <= maxAge;
    }, 'Age must be within allowed range'),
  
  gender: z.enum(['male', 'female', 'other']),
  
  panNumber: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number')
    .refine((pan) => {
      // Additional PAN validation - check for common invalid patterns
      const invalidPatterns = [
        /^AAAAA\d{4}A$/, // All A's in name part
        /^[A-Z]{5}0000[A-Z]$/, // All zeros in number part
        /^[A-Z]{5}1111[A-Z]$/, // All ones in number part
        /^[A-Z]{5}1234[A-Z]$/, // Sequential numbers
      ];
      return !invalidPatterns.some(pattern => pattern.test(pan));
    }, 'Please provide a valid PAN number'),
  
  panHolderName: z.string()
    .min(2, 'PAN holder name must be at least 2 characters')
    .max(100, 'PAN holder name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'PAN holder name can only contain letters, spaces, and dots'),
  
  businessAddress: z.object({
    addressLine1: z.string()
      .min(parseInt(process.env.MIN_ADDRESS_LENGTH || '10'), 'Address line 1 must be at least 10 characters')
      .max(parseInt(process.env.MAX_ADDRESS_LENGTH || '200'), 'Address line 1 must be less than 200 characters'),
    addressLine2: z.string()
      .max(parseInt(process.env.MAX_ADDRESS_LENGTH || '200'), 'Address line 2 must be less than 200 characters')
      .optional(),
    city: z.string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be less than 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces'),
    state: z.string()
      .min(2, 'State must be at least 2 characters')
      .max(50, 'State must be less than 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'State can only contain letters and spaces'),
    pinCode: z.string()
      .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits')
      .refine((pin) => {
        // Validate Indian PIN code ranges
        const pinNum = parseInt(pin);
        return pinNum >= parseInt(process.env.MIN_PIN_CODE || '100000') && 
               pinNum <= parseInt(process.env.MAX_PIN_CODE || '999999') && 
               pin !== '000000';
      }, 'Please provide a valid PIN code')
  }),
  
  primaryProductCategories: z.string()
    .min(parseInt(process.env.MIN_CATEGORY_LENGTH || '10'), 'Primary product categories must be at least 10 characters')
    .max(parseInt(process.env.MAX_CATEGORY_LENGTH || '500'), 'Primary product categories must be less than 500 characters')
    .refine((categories) => {
      // Ensure it's not just generic text
      const words = categories.trim().split(/\s+/);
      const minWords = parseInt(process.env.MIN_CATEGORY_WORDS || '3');
      return words.length >= minWords;
    }, 'Please provide detailed product categories')
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutFromAllDevices: z.boolean().optional()
}).refine((data) => {
  // Either refreshToken or logoutFromAllDevices must be provided
  return data.refreshToken || data.logoutFromAllDevices;
}, 'Either refreshToken or logoutFromAllDevices must be provided');

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
});

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate - this also strips unknown fields
      const validatedData = schema.parse(req.body);
      
      // Replace request body with validated/stripped data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            })),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Validation failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };
  
  req.body = sanitize(req.body);
  next();
};