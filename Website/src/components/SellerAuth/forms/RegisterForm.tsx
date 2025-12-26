import React, { useState } from 'react';
import { User, Phone, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '../layout/AuthLayout';
import AuthCard from '../layout/AuthCard';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import ProgressIndicator from '../components/ProgressIndicator';
import OTPVerificationForm from './OTPVerificationForm';
import { useAuthForm } from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { RegisterFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';

type RegistrationStep = 'register' | 'verify-otp' | 'success';

const RegisterForm: React.FC = () => {
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
    { id: 'register', label: 'Registration', completed: currentStep !== 'register', active: currentStep === 'register' },
    { id: 'verify', label: 'Verification', completed: currentStep === 'success', active: currentStep === 'verify-otp' },
    { id: 'success', label: 'Complete', completed: false, active: currentStep === 'success' }
  ];

  if (currentStep === 'success') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <AuthCard>
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
          </AuthCard>
        </motion.div>
      </AuthLayout>
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
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AuthCard>
          {/* Progress Indicator */}
          <ProgressIndicator steps={steps} />

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Your Seller Account
            </h1>
            <p className="text-gray-600 text-sm">
              Join thousands of successful sellers on ShamBit
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
                className="w-full"
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
                    className="text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
                  >
                    Sign in
                  </a>
                </p>
              </div>
            </motion.form>
          </AnimatePresence>

          {/* Terms Notice */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="underline hover:no-underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline hover:no-underline">Privacy Policy</a>
            </p>
          </div>
        </AuthCard>
      </motion.div>
    </AuthLayout>
  );
};

export default RegisterForm;