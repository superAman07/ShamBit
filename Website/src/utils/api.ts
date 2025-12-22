// API utility functions for seller dashboard

export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Base API configuration
const API_BASE_URL = '/api';

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    
    // Handle authentication errors
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/seller/login';
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data.code
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      'Network error or server unavailable',
      0,
      'NETWORK_ERROR'
    );
  }
}

// Seller API functions
export const sellerApi = {
  // Get seller profile
  getProfile: async () => {
    return apiRequest('/seller/profile');
  },

  // Update business details
  updateBusinessDetails: async (data: any) => {
    return apiRequest('/seller/profile/business', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Update tax information
  updateTaxInformation: async (data: any) => {
    return apiRequest('/seller/profile/tax', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Update bank details
  updateBankDetails: async (data: any) => {
    return apiRequest('/seller/profile/bank', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Upload document
  uploadDocument: async (file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);

    return apiRequest('/seller/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        // Don't set Content-Type for FormData
      },
      body: formData
    });
  },

  // Submit application for review
  submitApplication: async () => {
    return apiRequest('/seller/application/submit', {
      method: 'POST'
    });
  },

  // Get application status
  getApplicationStatus: async () => {
    return apiRequest('/seller/application/status');
  }
};

// Form validation utilities
export const validation = {
  // PAN card validation
  validatePAN: (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  },

  // GST number validation
  validateGST: (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  },

  // Aadhaar validation
  validateAadhaar: (aadhaar: string): boolean => {
    const aadhaarRegex = /^[0-9]{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  },

  // IFSC code validation
  validateIFSC: (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  },

  // Phone number validation
  validatePhone: (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // Email validation
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // PIN code validation
  validatePincode: (pincode: string): boolean => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  }
};

// File upload utilities
export const fileUtils = {
  // Validate file type
  validateFileType: (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(file.type);
  },

  // Validate file size (in MB)
  validateFileSize: (file: File, maxSizeMB: number): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  // Get file extension
  getFileExtension: (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Error handling utilities
export const errorUtils = {
  // Get user-friendly error message
  getErrorMessage: (error: unknown): string => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'VALIDATION_ERROR':
          return 'Please check your input and try again.';
        case 'UNAUTHORIZED':
          return 'Please log in to continue.';
        case 'NETWORK_ERROR':
          return 'Network error. Please check your connection and try again.';
        default:
          return error.message;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  },

  // Check if error is retryable
  isRetryableError: (error: unknown): boolean => {
    if (error instanceof ApiError) {
      return error.status >= 500 || error.code === 'NETWORK_ERROR';
    }
    return false;
  }
};