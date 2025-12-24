/**
 * Input Validation and Sanitization Utilities
 * Provides security functions for user input handling
 */

import DOMPurify from 'dompurify'

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param input - Raw HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize text input (removes all HTML)
 * @param input - Raw text input
 * @returns Sanitized text string
 */
export const sanitizeText = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim()
}

/**
 * Validate and sanitize file upload
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export interface FileValidationOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedName?: string
}

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = [],
    allowedExtensions = [],
  } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
    }
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    }
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed`,
      }
    }
  }

  // Sanitize filename (remove special characters)
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  return {
    valid: true,
    sanitizedName,
  }
}

/**
 * Validate image file
 * @param file - Image file to validate
 * @returns Validation result
 */
export const validateImageFile = (file: File): FileValidationResult => {
  return validateFile(file, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  })
}

/**
 * Validate CSV file
 * @param file - CSV file to validate
 * @returns Validation result
 */
export const validateCsvFile = (file: File): FileValidationResult => {
  return validateFile(file, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/csv', 'application/vnd.ms-excel'],
    allowedExtensions: ['csv'],
  })
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate mobile number (Indian format)
 * @param mobile - Mobile number to validate
 * @returns True if valid mobile number
 */
export const isValidMobileNumber = (mobile: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/
  return mobileRegex.test(mobile.replace(/\s+/g, ''))
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with strength indicator
 */
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Calculate strength
  if (errors.length === 0) {
    strength = 'strong'
  } else if (errors.length <= 2) {
    strength = 'medium'
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Sanitize and validate price input
 * @param price - Price value to validate
 * @returns Validation result
 */
export const validatePrice = (price: number): { valid: boolean; error?: string } => {
  if (isNaN(price) || price < 0) {
    return { valid: false, error: 'Price must be a positive number' }
  }

  if (price > 100000) {
    return { valid: false, error: 'Price cannot exceed ₹1,00,000' }
  }

  return { valid: true }
}

/**
 * Sanitize and validate quantity input
 * @param quantity - Quantity value to validate
 * @returns Validation result
 */
export const validateQuantity = (quantity: number): { valid: boolean; error?: string } => {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { valid: false, error: 'Quantity must be a positive integer' }
  }

  if (quantity > 10000) {
    return { valid: false, error: 'Quantity cannot exceed 10,000' }
  }

  return { valid: true }
}
