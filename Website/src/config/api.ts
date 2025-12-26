// API Configuration
const getApiBaseUrl = () => {
  // In development, use relative URLs to leverage Vite proxy
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    
    // If accessing via network IP, use the same IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3000/api/v1`;
    }
    
    // Use relative URL for localhost to leverage Vite proxy
    return '/api/v1';
  }
  
  // In production, use relative URLs or environment variable
  return import.meta.env.VITE_API_URL || '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  SELLER_REGISTRATION: {
    REGISTER: `${API_BASE_URL}/seller-registration/register`,
    VERIFY_OTP: `${API_BASE_URL}/seller-registration/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/seller-registration/resend-otp`,
    LOGIN: `${API_BASE_URL}/seller-registration/login`,
    REFRESH_TOKEN: `${API_BASE_URL}/seller-registration/refresh-token`,
    FORGOT_PASSWORD: `${API_BASE_URL}/seller-registration/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/seller-registration/reset-password`,
    VERIFY_RESET_OTP: `${API_BASE_URL}/seller-registration/verify-reset-otp`,
  },
  SMS: {
    SEND_OTP: `${API_BASE_URL}/sms/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/sms/verify-otp`,
    SEND_NOTIFICATION: `${API_BASE_URL}/sms/send-notification`,
  },
  HEALTH: `${API_BASE_URL.replace('/api/v1', '')}/health`,
} as const;