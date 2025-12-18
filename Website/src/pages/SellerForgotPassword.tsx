import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface FormData {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

const SellerForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);

  // OTP Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleEmailSubmit = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setStep('otp');
        setOtpTimer(600); // 10 minutes
        setCanResendOTP(false);
      } else {
        setErrors({ email: result.message || 'Failed to send OTP. Please try again.' });
      }
    } catch (error) {
      setErrors({ email: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async () => {
    if (!formData.otp.trim()) {
      setErrors({ otp: 'Please enter the OTP' });
      return;
    }

    if (formData.otp.length !== 6) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return;
    }

    setStep('password');
  };

  const handlePasswordSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.RESET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setStep('success');
      } else {
        setErrors({ submit: result.message || 'Failed to reset password. Please try again.' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResendOTP) return;

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setOtpTimer(600);
        setCanResendOTP(false);
        setErrors({ otp: '' });
      } else {
        const result = await response.json();
        setErrors({ otp: result.message || 'Failed to resend OTP' });
      }
    } catch (error) {
      setErrors({ otp: 'Failed to resend OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'success') {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col"
        style={{ 
          backgroundColor: '#f8fafc',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: 1000
        }}
      >
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-1">
                <span 
                  className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                  style={{ 
                    backgroundSize: '300% 300%',
                    filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.3))'
                  }}
                >
                  Sham
                </span>
                <span 
                  className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                  style={{ 
                    backgroundSize: '300% 300%',
                    filter: 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.3))'
                  }}
                >
                  Bit
                </span>
                {' '}Password Reset
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <button
              onClick={() => window.location.href = '/seller/login'}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="font-medium">Go to Login</span>
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-2 text-center">
            <p className="text-xs text-gray-500">© 2025 <span 
                  className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                  style={{ 
                    backgroundSize: '300% 300%',
                    filter: 'drop-shadow(0 0 5px rgba(255, 140, 0, 0.3))'
                  }}
                >
                  Sham
                </span>
                <span 
                  className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                  style={{ 
                    backgroundSize: '300% 300%',
                    filter: 'drop-shadow(0 0 5px rgba(30, 64, 175, 0.3))'
                  }}
                >
                  Bit
                </span> Commerce. All rights reserved. | <a href="/help" className="text-blue-600 hover:underline">Help</a> | <a href="/privacy" className="text-blue-600 hover:underline">Privacy</a> | <a href="/terms" className="text-blue-600 hover:underline">Terms</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col"
      style={{ 
        backgroundColor: '#f8fafc',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 1000
      }}
    >
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">
              Reset Your{' '}
              <span 
                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.3))'
                }}
              >
                Sham
              </span>
              <span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.3))'
                }}
              >
                Bit
              </span>
              {' '}Password
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-md">

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-4">
              {/* Step 1: Email */}
              {step === 'email' && (
                <div className="space-y-6">
                  <div className="text-center pb-3 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Enter Your Email</h2>
                    <p className="text-gray-600 text-sm">We'll send you an OTP to reset your password</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter your registered email"
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>}
                  </div>

                  <button
                    onClick={handleEmailSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <span className="font-medium">Sending OTP...</span>
                      </>
                    ) : (
                      <span className="font-medium">Send Reset Code</span>
                    )}
                  </button>

                  <div className="text-center">
                    <a href="/seller/login" className="text-blue-600 hover:text-blue-700 hover:underline text-sm flex items-center justify-center transition-colors">
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to Login
                    </a>
                  </div>
                </div>
              )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter OTP</h2>
                <p className="text-gray-600 text-sm mb-4">
                  We've sent a 6-digit OTP to <strong>{formData.email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={formData.otp}
                  onChange={(e) => updateFormData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest ${
                    errors.otp ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="000000"
                  maxLength={6}
                />
                {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
              </div>

              <div className="text-center">
                {otpTimer > 0 ? (
                  <p className="text-gray-600 text-sm">
                    Resend OTP in <span className="font-medium text-blue-600">{formatTime(otpTimer)}</span>
                  </p>
                ) : (
                  <button
                    onClick={resendOTP}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('email')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleOTPSubmit}
                  disabled={formData.otp.length !== 6}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify OTP
                </button>
              </div>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Password</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Choose a strong password for your account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => updateFormData('newPassword', e.target.value)}
                    className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.newPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                <p className="text-gray-500 text-xs mt-1">Must be at least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-700">{errors.submit}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePasswordSubmit}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <CheckCircle className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2 text-center">
          <p className="text-xs text-gray-500">© 2025 <span 
                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 5px rgba(255, 140, 0, 0.3))'
                }}
              >
                Sham
              </span>
              <span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 5px rgba(30, 64, 175, 0.3))'
                }}
              >
                Bit
              </span> Commerce. All rights reserved. | <a href="/help" className="text-blue-600 hover:underline">Help</a> | <a href="/privacy" className="text-blue-600 hover:underline">Privacy</a> | <a href="/terms" className="text-blue-600 hover:underline">Terms</a></p>
        </div>
      </div>
    </div>
  );
};

export default SellerForgotPassword;