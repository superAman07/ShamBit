import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Phone, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

interface LoginFormProps {
  onLoginSuccess: (data: {
    tokens: { accessToken: string; refreshToken: string };
    seller: any;
  }) => void;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
}

interface LoginFormData {
  identifier: string; // email or mobile
  password: string;
}

interface LoginError {
  field?: string;
  message: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onForgotPassword,
  onSwitchToRegister
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    lockoutSeconds?: number;
  } | null>(null);

  // Detect if identifier is email or mobile
  const getIdentifierType = (identifier: string): 'email' | 'mobile' | 'unknown' => {
    if (identifier.includes('@')) return 'email';
    if (/^[6-9]\d{9}$/.test(identifier)) return 'mobile';
    return 'unknown';
  };

  const validateForm = (): boolean => {
    const newErrors: LoginError[] = [];

    if (!formData.identifier.trim()) {
      newErrors.push({ field: 'identifier', message: 'Email or mobile number is required' });
    } else {
      const type = getIdentifierType(formData.identifier);
      if (type === 'unknown') {
        newErrors.push({ 
          field: 'identifier', 
          message: 'Please enter a valid email address or 10-digit mobile number' 
        });
      }
    }

    if (!formData.password) {
      newErrors.push({ field: 'password', message: 'Password is required' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
          deviceFingerprint: navigator.userAgent, // Simple device fingerprinting
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.code === 'RATE_LIMITED') {
          setRateLimitInfo({
            remaining: 0,
            lockoutSeconds: 900 // 15 minutes
          });
          setErrors([{ message: result.error.message }]);
        } else if (result.error?.code === 'ACCOUNT_LOCKED') {
          setErrors([{ message: result.error.message }]);
        } else if (result.error?.code === 'AUTHENTICATION_FAILED') {
          setErrors([{ message: 'Invalid email/mobile or password. Please check your credentials.' }]);
          setRateLimitInfo(result.data?.rateLimitInfo || null);
        } else if (result.error?.code === 'VALIDATION_ERROR') {
          const validationErrors = result.error.details?.map((detail: any) => ({
            field: detail.field,
            message: detail.message
          })) || [];
          setErrors(validationErrors);
        } else {
          setErrors([{ message: result.error?.message || 'Login failed. Please try again.' }]);
        }
        return;
      }

      if (result.success && result.data) {
        // Store tokens in localStorage (in production, consider more secure storage)
        localStorage.setItem('seller_access_token', result.data.tokens.accessToken);
        localStorage.setItem('seller_refresh_token', result.data.tokens.refreshToken);
        
        // Update rate limit info
        setRateLimitInfo(result.data.rateLimitInfo);
        
        // Call success callback
        onLoginSuccess(result.data);
      } else {
        setErrors([{ message: 'Login failed. Please try again.' }]);
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors([{ message: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const getGeneralErrors = (): string[] => {
    return errors.filter(error => !error.field).map(error => error.message);
  };

  const identifierType = getIdentifierType(formData.identifier);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
        <p className="text-gray-600">Sign in to your seller account</p>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 3 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              {rateLimitInfo.remaining} login attempts remaining. 
              {rateLimitInfo.lockoutSeconds && ` Account will be locked for ${Math.ceil(rateLimitInfo.lockoutSeconds / 60)} minutes after failed attempts.`}
            </p>
          </div>
        </div>
      )}

      {/* General Errors */}
      {getGeneralErrors().length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          {getGeneralErrors().map((error, index) => (
            <div key={index} className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email/Mobile Input */}
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
            Email or Mobile Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {identifierType === 'email' ? (
                <Mail className="h-5 w-5 text-gray-400" />
              ) : identifierType === 'mobile' ? (
                <Phone className="h-5 w-5 text-gray-400" />
              ) : (
                <Mail className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <input
              id="identifier"
              type="text"
              value={formData.identifier}
              onChange={(e) => handleInputChange('identifier', e.target.value)}
              className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('identifier') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter email or mobile number"
              disabled={isLoading}
            />
            {identifierType === 'email' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
            {identifierType === 'mobile' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
          </div>
          {getFieldError('identifier') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('identifier')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Use the email or mobile number you registered with
          </p>
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('password') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {getFieldError('password') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            Forgot your password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || (rateLimitInfo?.remaining === 0)}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            isLoading || (rateLimitInfo?.remaining === 0)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : rateLimitInfo?.remaining === 0 ? (
            'Account Temporarily Locked'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            Register as a seller
          </button>
        </p>
      </div>

      {/* Duplicate Account Detection */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Account exists?</strong> If you see "account already exists" during registration, 
          use this login form instead. Need help? Contact support.
        </p>
      </div>
    </div>
  );
};