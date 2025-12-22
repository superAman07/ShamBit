/**
 * Security utility functions
 */

/**
 * Safely mask mobile number regardless of length
 */
export const maskMobile = (mobile: string): string => {
  if (!mobile || typeof mobile !== 'string') {
    return '****';
  }
  
  const cleanMobile = mobile.replace(/\D/g, ''); // Remove non-digits
  const minLength = parseInt(process.env.MOBILE_MIN_LENGTH || '4');
  const shortLength = parseInt(process.env.MOBILE_SHORT_LENGTH || '6');
  const standardLength = parseInt(process.env.MOBILE_STANDARD_LENGTH || '10');
  
  if (cleanMobile.length < minLength) {
    return '*'.repeat(cleanMobile.length);
  }
  
  if (cleanMobile.length <= shortLength) {
    // For short numbers, show first 2 and mask rest
    return cleanMobile.substring(0, 2) + '*'.repeat(cleanMobile.length - 2);
  }
  
  if (cleanMobile.length === standardLength) {
    // Standard mobile: show first 6, mask last 4
    return cleanMobile.substring(0, 6) + '****';
  }
  
  // For longer numbers, show first 6 and mask remaining
  const visibleDigits = cleanMobile.substring(0, 6);
  const maxMaskedDigits = parseInt(process.env.MAX_MASKED_DIGITS || '6');
  const maskedCount = Math.min(cleanMobile.length - 6, maxMaskedDigits);
  
  return visibleDigits + '*'.repeat(maskedCount);
};

/**
 * Safely mask email address
 */
export const maskEmail = (email: string): string => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '****@****.***';
  }
  
  const [localPart, domain] = email.split('@');
  
  if (!localPart || !domain) {
    return '****@****.***';
  }
  
  const minLocalLength = parseInt(process.env.EMAIL_MIN_LOCAL_LENGTH || '2');
  const shortLocalLength = parseInt(process.env.EMAIL_SHORT_LOCAL_LENGTH || '4');
  const maxMaskedChars = parseInt(process.env.EMAIL_MAX_MASKED_CHARS || '4');
  
  if (localPart.length <= minLocalLength) {
    return '*'.repeat(localPart.length) + '@' + domain;
  }
  
  if (localPart.length <= shortLocalLength) {
    // For short local parts, show first char and mask rest
    return localPart.charAt(0) + '*'.repeat(localPart.length - 1) + '@' + domain;
  }
  
  // For longer local parts, show first 2 chars and mask up to configured chars
  const visibleLocal = localPart.substring(0, 2);
  const maskedCount = Math.min(localPart.length - 2, maxMaskedChars);
  const maskedLocal = '*'.repeat(maskedCount);
  
  return visibleLocal + maskedLocal + '@' + domain;
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = parseInt(process.env.DEFAULT_TOKEN_LENGTH || '32')): string => {
  return require('crypto').randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data for storage
 */
export const hashSensitiveData = (data: string): string => {
  return require('crypto').createHash('sha256').update(data).digest('hex');
};