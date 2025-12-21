import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PasswordRecoveryProps {
  onBackToLogin: () => void;
  onRecoverySuccess: () => void;
}

interface RecoveryFormData {
  identifier: string; // email or mobile
  method: 'otp' | 'email';
}

interface RecoveryError {
  field?: string;
  message: string;
}

interface OTPVerificationData {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

type RecoveryStep = 'method_selection' | 'otp_verification' | 'email_sent' | 'password_reset';

export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({
  onBackToLogin,
  onRecoverySuccess
}) => {
  const [step, setStep] = useState<RecoveryStep>('method_selection');
  const [formData, setFormData] = useState<RecoveryFormData>({
    identifier: '',
    method: 'otp'
  });
  const [otpData, setOtpData] = useState<OTPVerificationData>({
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<RecoveryError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(true);

  // Detect if identifier is email or mobile
  const getIdentifierType = (identifier: string): 'email' | 'mobile' | 'unknown' => {
    if (identifier.includes('@')) return 'email';
    if (/^[6-9]\d{9}$/.test(identifier)) return 'mobile';
    return 'unknown';
  };

  const validateMethodSelection = (): boolean => {
    const newErrors: RecoveryError[] = [];

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

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const validateOtpVerification = (): boolean => {
    const newErrors: RecoveryError[] = [];

    if (!otpData.otp || otpData.otp.length !== 6) {
      newErrors.push({ field: 'otp', message: 'Please enter the 6-digit OTP' });
    }

    if (!otpData.newPassword) {
      newErrors.push({ field: 'newPassword', message: 'New password is required' });
    } else if (otpData.newPassword.length < 8) {
      newErrors.push({ field: 'newPassword', message: 'Password must be at least 8 characters' });
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(otpData.newPassword)) {
      newErrors.push({ 
        field: 'newPassword', 
        message: 'Password must contain uppercase, lowercase, number, and special character' 
      });
    }

    if (otpData.newPassword !== otpData.confirmPassword) {
      newErrors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateMethodSelection()) return;

    setIsLoading(true);
    setErrors([]);

    try {
      // TODO: Implement forgot password API call
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (formData.method === 'otp') {
        setStep('otp_verification');
        startOtpTimer();
      } else {
        setStep('email_sent');
      }
    } catch (error) {
      console.error('Password recovery error:', error);
      setErrors([{ message: 'Failed to send recovery instructions. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateOtpVerification()) return;

    setIsLoading(true);
    setErrors([]);

    try {
      // TODO: Implement OTP verification and password reset API call
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('password_reset');
      setTimeout(() => {
        onRecoverySuccess();
      }, 2000);
    } catch (error) {
      console.error('OTP verification error:', error);
      setErrors([{ message: 'Invalid OTP or password reset failed. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setIsLoading(true);
    setErrors([]);

    try {
      // TODO: Implement resend OTP API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      startOtpTimer();
      setErrors([]);
    } catch (error) {
      console.error('Resend OTP error:', error);
      setErrors([{ message: 'Failed to resend OTP. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startOtpTimer = () => {
    setOtpTimer(300); // 5 minutes
    setCanResendOtp(false);
    
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          setCanResendOtp(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBackToLogin}
          className="mr-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          disabled={isLoading}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-600">
            {step === 'method_selection' && 'Choose how to recover your account'}
            {step === 'otp_verification' && 'Enter OTP and new password'}
            {step === 'email_sent' && 'Check your email'}
            {step === 'password_reset' && 'Password reset successful'}
          </p>
        </div>
      </div>

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

      {/* Method Selection Step */}
      {step === 'method_selection' && (
        <form onSubmit={handleMethodSubmit} className="space-y-6">
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
                onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('identifier') 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter email or mobile number"
                disabled={isLoading}
              />
            </div>
            {getFieldError('identifier') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('identifier')}</p>
            )}
          </div>

          {/* Recovery Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose recovery method
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="method"
                  value="otp"
                  checked={formData.method === 'otp'}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as 'otp' | 'email' }))}
                  className="mr-3"
                  disabled={isLoading}
                />
                <MessageSquare className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">SMS/WhatsApp OTP</p>
                  <p className="text-sm text-gray-600">Get a verification code via SMS or WhatsApp</p>
                </div>
              </label>
              
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={formData.method === 'email'}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as 'otp' | 'email' }))}
                  className="mr-3"
                  disabled={isLoading}
                />
                <Mail className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Email Reset Link</p>
                  <p className="text-sm text-gray-600">Get a password reset link via email</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              `Send ${formData.method === 'otp' ? 'OTP' : 'Reset Link'}`
            )}
          </button>
        </form>
      )}

      {/* OTP Verification Step */}
      {step === 'otp_verification' && (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-gray-600">
              We sent a 6-digit code to {identifierType === 'email' ? 'your email' : 'your mobile number'}
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formData.identifier}
            </p>
          </div>

          {/* OTP Input */}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              maxLength={6}
              value={otpData.otp}
              onChange={(e) => setOtpData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
              className={`block w-full px-3 py-3 text-center text-2xl font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('otp') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="000000"
              disabled={isLoading}
            />
            {getFieldError('otp') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('otp')}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={otpData.newPassword}
              onChange={(e) => setOtpData(prev => ({ ...prev, newPassword: e.target.value }))}
              className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('newPassword') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter new password"
              disabled={isLoading}
            />
            {getFieldError('newPassword') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('newPassword')}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={otpData.confirmPassword}
              onChange={(e) => setOtpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('confirmPassword') 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Confirm new password"
              disabled={isLoading}
            />
            {getFieldError('confirmPassword') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
            )}
          </div>

          {/* Timer and Resend */}
          <div className="text-center">
            {otpTimer > 0 ? (
              <div className="flex items-center justify-center text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">Resend OTP in {formatTime(otpTimer)}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                disabled={isLoading}
              >
                Didn't receive the code? Resend OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}

      {/* Email Sent Step */}
      {step === 'email_sent' && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{formData.identifier}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            The link will expire in 1 hour. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      )}

      {/* Password Reset Success Step */}
      {step === 'password_reset' && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset Successful</h3>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          <div className="animate-pulse text-blue-600">
            Redirecting to login...
          </div>
        </div>
      )}
    </div>
  );
};