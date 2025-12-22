/**
 * Seller-related constants to avoid magic strings
 */

export const SELLER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended', 
  DEACTIVATED: 'deactivated',
  PENDING: 'pending'
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const SELLER_TYPE = {
  INDIVIDUAL: 'individual',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
} as const;

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SELLER_EXISTS: 'SELLER_EXISTS',
  SELLER_NOT_FOUND: 'SELLER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  OTP_SEND_FAILED: 'OTP_SEND_FAILED',
  INVALID_OTP: 'INVALID_OTP',
  INVALID_SESSION: 'INVALID_SESSION',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  TOKEN_GENERATION_FAILED: 'TOKEN_GENERATION_FAILED',
  PROFILE_ALREADY_COMPLETED: 'PROFILE_ALREADY_COMPLETED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INSECURE_CONNECTION: 'INSECURE_CONNECTION',
  OTP_NOT_SENT: 'OTP_NOT_SENT',
  REGISTRATION_EXPIRED: 'REGISTRATION_EXPIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED'
} as const;

export const SUCCESS_MESSAGES = {
  REGISTRATION_INITIATED: 'Registration initiated! OTP sent to your mobile number.',
  REGISTRATION_COMPLETED: 'Registration completed successfully! Please complete your profile to start selling.',
  LOGIN_SUCCESSFUL: 'Login successful',
  PROFILE_COMPLETED: 'Profile completed successfully! Your account is now under review.',
  OTP_SENT: 'OTP sent successfully'
} as const;

export const NEXT_STEPS = {
  VERIFY_OTP: 'verify-otp',
  COMPLETE_PROFILE: 'complete-profile',
  WAIT_FOR_APPROVAL: 'wait-for-approval',
  DASHBOARD: 'dashboard'
} as const;

// Type exports for TypeScript
export type SellerStatus = typeof SELLER_STATUS[keyof typeof SELLER_STATUS];
export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];
export type SellerType = typeof SELLER_TYPE[keyof typeof SELLER_TYPE];
export type Gender = typeof GENDER[keyof typeof GENDER];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type NextStep = typeof NEXT_STEPS[keyof typeof NEXT_STEPS];