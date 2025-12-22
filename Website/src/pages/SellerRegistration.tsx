import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Phone, 
  Mail, 
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface RegistrationFormData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  otp: string;
  deviceFingerprint?: string;
}

interface OTPState {
  sent: boolean;
  verified: boolean;
  timeRemaining: number;
  attemptsRemaining: number;
  cooldownActive: boolean;
}

const SellerRegistration: React.FC = () => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpState, setOtpState] = useState<OTPState>({
    sent: false,
    verified: false,
    timeRemaining: 0,
    attemptsRemaining: 3,
    cooldownActive: false
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Validation patterns
  const validationPatterns = {
    name: /^[a-zA-Z\s.'-]+$/,
    mobile: /^[6-9]\d{9}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  };

  // Real-time validation
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.length < 2) return 'Full name must be at least 2 characters';
        if (value.length > 100) return 'Full name cannot exceed 100 characters';
        if (!validationPatterns.name.test(value)) return 'Full name can only contain letters, spaces, dots, hyphens, and apostrophes';
        return '';
      
      case 'mobile':
        if (!value.trim()) return 'Mobile number is required';
        if (!validationPatterns.mobile.test(value)) return 'Please enter a valid 10-digit mobile number starting with 6-9';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (value.length > 255) return 'Email cannot exceed 255 characters';
        if (!validationPatterns.email.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (!validationPatterns.password.test(value)) return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      
      case 'otp':
        if (!value.trim()) return 'OTP is required';
        if (!/^\d{6}$/.test(value)) return 'OTP must be exactly 6 digits';
        return '';
      
      default:
        return '';
    }
  };

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    // Format input based on field type
    let formattedValue = value;
    
    if (field === 'mobile') {
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'email') {
      formattedValue = value.toLowerCase().trim();
    } else if (field === 'otp') {
      formattedValue = value.replace(/\D/g, '').slice(0, 6);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate registration form
      newErrors.fullName = validateField('fullName', formData.fullName);
      newErrors.mobile = validateField('mobile', formData.mobile);
      newErrors.email = validateField('email', formData.email);
      newErrors.password = validateField('password', formData.password);
      newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);
    } else if (step === 2) {
      // Validate OTP
      newErrors.otp = validateField('otp', formData.otp);
    }

    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateStep(1)) return;

    setIsSubmitting(true);
    try {
      const registrationData = {
        fullName: formData.fullName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        password: formData.password,
        deviceFingerprint: formData.deviceFingerprint,
        ipAddress: 'unknown', // Will be set by server
        userAgent: navigator.userAgent
      };

      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOtpState(prev => ({
          ...prev,
          sent: true,
          timeRemaining: result.data.expiresIn || 300,
          attemptsRemaining: result.data.rateLimitInfo?.remaining || 3
        }));
        setCurrentStep(2);
        startOtpTimer(result.data.expiresIn || 300);
      } else {
        if (response.status === 409) {
          // Handle duplicate account
          setErrors({ 
            submit: result.error.message,
            suggestion: result.error.details?.suggestions?.[0] || 'Try logging in instead'
          });
        } else {
          setErrors({ submit: result.error?.message || 'Registration failed' });
        }
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateStep(2)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          otp: formData.otp,
          deviceFingerprint: formData.deviceFingerprint
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.data.verified) {
        setOtpState(prev => ({ ...prev, verified: true }));
        setRegistrationSuccess(true);
        
        // Store tokens for future use
        if (result.data.tokens) {
          localStorage.setItem('accessToken', result.data.tokens.accessToken);
          localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
        }
      } else {
        setErrors({ otp: result.error?.message || 'Invalid OTP. Please try again.' });
        setOtpState(prev => ({
          ...prev,
          attemptsRemaining: Math.max(0, prev.attemptsRemaining - 1)
        }));
      }
    } catch (error) {
      setErrors({ otp: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpState.cooldownActive) return;

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.RESEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          method: 'sms'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOtpState(prev => ({
          ...prev,
          timeRemaining: result.data.expiresIn || 300,
          attemptsRemaining: result.data.attemptsRemaining || 3
        }));
        startOtpTimer(result.data.expiresIn || 300);
        setErrors(prev => ({ ...prev, otp: '' }));
      } else {
        if (result.error?.cooldownSeconds) {
          setOtpState(prev => ({ ...prev, cooldownActive: true }));
          setTimeout(() => {
            setOtpState(prev => ({ ...prev, cooldownActive: false }));
          }, result.error.cooldownSeconds * 1000);
        }
        setErrors({ otp: result.error?.message || 'Failed to resend OTP' });
      }
    } catch (error) {
      setErrors({ otp: 'Network error. Please try again.' });
    }
  };

  const handleResendWhatsAppOTP = async () => {
    if (otpState.cooldownActive) return;

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.RESEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          method: 'whatsapp'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOtpState(prev => ({
          ...prev,
          timeRemaining: result.data.expiresIn || 300,
          attemptsRemaining: result.data.attemptsRemaining || 3
        }));
        startOtpTimer(result.data.expiresIn || 300);
        setErrors(prev => ({ ...prev, otp: '' }));
      } else {
        if (result.error?.cooldownSeconds) {
          setOtpState(prev => ({ ...prev, cooldownActive: true }));
          setTimeout(() => {
            setOtpState(prev => ({ ...prev, cooldownActive: false }));
          }, result.error.cooldownSeconds * 1000);
        }
        setErrors({ otp: result.error?.message || 'Failed to send WhatsApp OTP' });
      }
    } catch (error) {
      setErrors({ otp: 'Network error. Please try again.' });
    }
  };

  const startOtpTimer = (_expiresIn: number) => {
    const timer = setInterval(() => {
      setOtpState(prev => {
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Success screen
  if (registrationSuccess) {
    return (
      <div className="auth-page h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center"
        >
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Welcome to ShamBit! Your seller account has been created successfully.
          </p>
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/seller/dashboard'}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-md h-fit max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="text-xl font-bold leading-none">
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Sham</span>
              <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent">Bit</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create Your Seller Account</h1>
          <p className="text-gray-600 text-sm">Join thousands of successful sellers on ShamBit</p>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className={`ml-2 font-medium text-xs ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                Registration
              </span>
            </div>
            <div className="flex-1 mx-3 h-1 bg-gray-200 rounded">
              <div 
                className="h-1 bg-blue-600 rounded transition-all duration-300"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className={`ml-2 font-medium text-xs ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                Verification
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Registration Form */}
            {currentStep === 1 && (
              <motion.div
                key="registration"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Account Information</h2>
                  <p className="text-gray-600 text-xs">Please provide your details to create your seller account</p>
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 text-xs">{errors.submit}</p>
                        {errors.suggestion && (
                          <p className="text-red-600 text-xs mt-1">{errors.suggestion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                        errors.fullName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                        errors.mobile ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                    />
                  </div>
                  {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Must contain uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <button
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>

                <div className="text-center text-xs text-gray-600">
                  Already have an account?{' '}
                  <a href="/seller/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in
                  </a>
                </div>
              </motion.div>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 2 && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify Your Mobile Number</h2>
                  <p className="text-gray-600 text-xs">
                    We've sent a 6-digit verification code to <strong>{formData.mobile}</strong>
                  </p>
                  <div className="mt-1 text-xs text-gray-500">
                    Please check your SMS messages
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Enter OTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.otp}
                    onChange={(e) => handleInputChange('otp', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-lg tracking-widest ${
                      errors.otp ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp}</p>}
                </div>

                {otpState.timeRemaining > 0 && (
                  <div className="text-center text-xs text-gray-600">
                    Code expires in <strong>{formatTime(otpState.timeRemaining)}</strong>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleResendOTP}
                    disabled={otpState.cooldownActive || otpState.timeRemaining > 0}
                    className="text-blue-600 hover:text-blue-700 font-medium text-xs disabled:text-gray-400 disabled:cursor-not-allowed mr-3"
                  >
                    {otpState.cooldownActive ? 'Please wait...' : 'Resend SMS'}
                  </button>
                  <button
                    onClick={handleResendWhatsAppOTP}
                    disabled={otpState.cooldownActive || otpState.timeRemaining > 0}
                    className="text-green-600 hover:text-green-700 font-medium text-xs disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Send via WhatsApp
                  </button>
                </div>

                {otpState.attemptsRemaining < 3 && (
                  <div className="text-center text-xs text-amber-600">
                    {otpState.attemptsRemaining} attempts remaining
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;