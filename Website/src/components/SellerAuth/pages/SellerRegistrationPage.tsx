import React, { useState } from 'react';
import { User, Phone, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import ProgressIndicator from '../components/ProgressIndicator';
import OTPVerificationForm from '../forms/OTPVerificationForm';
import useAuthForm from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { RegisterFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';
import logo from '../../../assets/logo.png';

type RegistrationStep = 'register' | 'verify-otp' | 'success';

const SellerRegistrationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('register');
  const [sessionId, setSessionId] = useState<string>('');

  const { formState, updateField, setFormError, clearFormError, handleSubmit } = useAuthForm<RegisterFormData>({
    initialData: {
      fullName: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationRules: {
      fullName: {
        required: true,
        pattern: VALIDATION_PATTERNS.name,
        minLength: 2,
        maxLength: 100
      },
      mobile: {
        required: true,
        pattern: VALIDATION_PATTERNS.mobile
      },
      email: {
        required: true,
        pattern: VALIDATION_PATTERNS.email,
        maxLength: 255
      },
      password: {
        required: true,
        pattern: VALIDATION_PATTERNS.password
      },
      confirmPassword: {
        required: true,
        customValidator: (value: string, formData?: RegisterFormData) => {
          if (!value) return 'Please confirm your password';
          if (value !== formData?.password) return 'Passwords do not match';
          return '';
        }
      }
    },
    onSubmit: async (data) => {
      clearFormError();
      
      try {
        const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: data.fullName.trim(),
            mobile: data.mobile.trim(),
            email: data.email.trim(),
            password: data.password,
            deviceFingerprint: 'web_' + Date.now(),
            ipAddress: 'unknown',
            userAgent: navigator.userAgent
          }),
        });

        const result: AuthResponse = await response.json();

        if (response.ok && result.success) {
          setSessionId(result.data?.sessionId || '');
          setCurrentStep('verify-otp');
        } else {
          handleRegistrationError(response.status, result);
        }
      } catch (error) {
        setFormError('Network error. Please check your connection and try again.');
      }
    }
  });

  const handleRegistrationError = (status: number, result: AuthResponse) => {
    if (status === 409) {
      setFormError(result.error?.message || 'Account already exists with this email or mobile number');
    } else {
      setFormError(result.error?.message || 'Registration failed. Please try again.');
    }
  };

  const handleOTPSuccess = () => {
    setCurrentStep('success');
  };

  const handleBackToRegister = () => {
    setCurrentStep('register');
    setSessionId('');
  };

  const steps = [
    { id: 'register', label: 'Account Details', completed: currentStep !== 'register', active: currentStep === 'register' },
    { id: 'verify', label: 'OTP Verification', completed: currentStep === 'success', active: currentStep === 'verify-otp' },
    { id: 'success', label: 'Complete', completed: false, active: currentStep === 'success' }
  ];

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8"
        >
          <SuccessMessage
            title="Registration Successful!"
            message="Welcome to ShamBit! Your seller account has been created successfully."
            actions={[
              {
                label: 'Go to Dashboard',
                onClick: () => window.location.href = '/seller/dashboard',
                variant: 'primary'
              },
              {
                label: 'Back to Home',
                onClick: () => window.location.href = '/',
                variant: 'secondary'
              }
            ]}
          />
        </motion.div>
      </div>
    );
  }

  if (currentStep === 'verify-otp') {
    return (
      <OTPVerificationForm
        mobile={formState.data.mobile}
        sessionId={sessionId}
        onSuccess={handleOTPSuccess}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <a href="/seller" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-100">
                <img
                  src={logo}
                  alt="ShamBit Logo"
                  className="h-5 w-5 object-contain"
                />
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-lg font-bold">
                  <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-amber-500 bg-clip-text text-transparent">Sham</span>
                  <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">Bit</span>
                </div>
                <div className="text-gray-400">|</div>
                <span className="text-gray-700 font-medium">Seller Registration</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8"
        >
          {/* Progress Indicator */}
          <ProgressIndicator steps={steps} />

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Create Your Seller Account
            </h1>
            <p className="text-gray-600 text-sm">
              Enter your details to get started
            </p>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key="registration"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Error Alert */}
              <ErrorAlert 
                error={formState.errors.form} 
                onDismiss={clearFormError}
              />

              {/* Full Name */}
              <FormField
                label="Full Name"
                name="fullName"
                value={formState.data.fullName}
                onChange={(value) => updateField('fullName', value)}
                error={formState.errors.fullName}
                placeholder="Enter your full name"
                required
                icon={<User className="w-5 h-5" />}
                autoComplete="name"
              />

              {/* Mobile Number */}
              <FormField
                label="Mobile Number"
                name="mobile"
                type="tel"
                value={formState.data.mobile}
                onChange={(value) => updateField('mobile', value)}
                error={formState.errors.mobile}
                placeholder="10-digit mobile number"
                required
                icon={<Phone className="w-5 h-5" />}
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
              />

              {/* Email Address */}
              <FormField
                label="Email Address"
                name="email"
                type="email"
                value={formState.data.email}
                onChange={(value) => updateField('email', value)}
                error={formState.errors.email}
                placeholder="Enter your email"
                required
                icon={<Mail className="w-5 h-5" />}
                autoComplete="email"
                inputMode="email"
              />

              {/* Password */}
              <PasswordField
                label="Password"
                name="password"
                value={formState.data.password}
                onChange={(value) => updateField('password', value)}
                error={formState.errors.password}
                placeholder="Create a strong password"
                required
                showStrength
                requirements
                autoComplete="new-password"
              />

              {/* Confirm Password */}
              <PasswordField
                label="Confirm Password"
                name="confirmPassword"
                value={formState.data.confirmPassword}
                onChange={(value) => updateField('confirmPassword', value)}
                error={formState.errors.confirmPassword}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={formState.isSubmitting}
                disabled={!formState.isValid}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded transition-colors"
                size="lg"
              >
                Create Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </LoadingButton>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <a 
                    href="/seller/login" 
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </a>
                </p>
              </div>
            </motion.form>
          </AnimatePresence>

          {/* Terms Notice */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SellerRegistrationPage;