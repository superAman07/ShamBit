import { BadRequestError } from '@shambit/shared';

/**
 * Validate mobile number format (Indian format)
 */
export const validateMobileNumber = (mobileNumber: string): void => {
  const mobileRegex = /^[6-9]\d{9}$/;
  
  if (!mobileNumber) {
    throw new BadRequestError('Mobile number is required', 'MOBILE_REQUIRED');
  }
  
  if (!mobileRegex.test(mobileNumber)) {
    throw new BadRequestError(
      'Invalid mobile number format. Must be a 10-digit Indian mobile number',
      'INVALID_MOBILE_FORMAT'
    );
  }
};

/**
 * Validate OTP format
 */
export const validateOTP = (otp: string): void => {
  const otpRegex = /^\d{6}$/;
  
  if (!otp) {
    throw new BadRequestError('OTP is required', 'OTP_REQUIRED');
  }
  
  if (!otpRegex.test(otp)) {
    throw new BadRequestError(
      'Invalid OTP format. Must be a 6-digit number',
      'INVALID_OTP_FORMAT'
    );
  }
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    throw new BadRequestError('Email is required', 'EMAIL_REQUIRED');
  }
  
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format', 'INVALID_EMAIL_FORMAT');
  }
};
