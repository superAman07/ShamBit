import React, { useState } from 'react';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '../layout/AuthLayout';
import AuthCard from '../layout/AuthCard';
import FormField from '../components/FormField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import useAuthForm from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { ForgotPasswordFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';

const ForgotPasswordForm: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'otp'>('email');

  const { formState, updateField, setFormError, clearFormError, handleSubmit } = useAuthForm<ForgotPasswordFormData>({
    initialData: {
      identifier: ''
    },
    validationRules: {
      identifier: {
        required: true,
        customValidator: (value: string) => {
          if (!value.trim()) return 'Email or mobile number is required';
          const isEmail = VALIDATION_PATTERNS.email.test(value);
          const isMobile = VALIDATION_PATTERNS.mobile.test(value);
          if (!isEmail && !isMobile) {
            return 'Please enter a valid email address or 10-digit mobile number';
          }
          return '';
        }
      }
    },
    onSubmit: async (data) => {
      clearFormError();
      
      try {
        const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.FORGOT_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            identifier: data.identifier.trim() 
          }),
        });

        const result: AuthResponse = await response.json();

        if (response.ok && result.success) {
          setSuccess(true);
        } else {
          setFormError(result.error?.message || 'Failed to send reset instructions. Please try again.');
        }
      } catch (error) {
        setFormError('Network error. Please check your connection and try again.');
      }
    }
  });

  // Detect method based on input
  React.useEffect(() => {
    const isEmail = VALIDATION_PATTERNS.email.test(formState.data.identifier);
    setResetMethod(isEmail ? 'email' : 'otp');
  }, [formState.data.identifier]);

  const isEmail = resetMethod === 'email';

  if (success) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <AuthCard>
            <SuccessMessage
              title={`Check Your ${isEmail ? 'Email' : 'Phone'}`}
              message={`We've sent password reset instructions to ${formState.data.identifier}`}
              actions={[
                {
                  label: 'Back to Login',
                  onClick: () => window.location.href = '/seller/login',
                  variant: 'primary'
                },
                {
                  label: 'Try Different Account',
                  onClick: () => {
                    setSuccess(false);
                    updateField('identifier', '');
                  },
                  variant: 'secondary'
                }
              ]}
            />
          </AuthCard>
        </motion.div>
      </AuthLayout>
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Reset Password
            </h1>
            <p className="text-gray-600 text-sm">
              We'll help you get back into your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            <ErrorAlert 
              error={formState.errors.form} 
              onDismiss={clearFormError}
            />

            {/* Identifier Field */}
            <FormField
              label="Email or Mobile Number"
              name="identifier"
              type={isEmail ? 'email' : 'tel'}
              value={formState.data.identifier}
              onChange={(value) => updateField('identifier', value)}
              error={formState.errors.identifier}
              placeholder="Enter your email or mobile number"
              required
              icon={isEmail ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              autoComplete="username"
              inputMode={isEmail ? 'email' : 'tel'}
            />

            {/* Method Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Reset Method:
              </h4>
              <p className="text-sm text-blue-800">
                {isEmail 
                  ? 'We\'ll send a secure reset link to your email address'
                  : 'We\'ll send a verification code to your mobile number'
                }
              </p>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={formState.isSubmitting}
              disabled={!formState.data.identifier.trim()}
              className="w-full"
              size="lg"
            >
              Send Reset {isEmail ? 'Link' : 'Code'}
            </LoadingButton>

            {/* Navigation Links */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <a 
                href="/seller/login" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="/seller/register" 
                className="text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
              >
                Create Account
              </a>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Need Help?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Make sure you enter the email/mobile used during registration</li>
              <li>• Check your spam folder for email instructions</li>
              <li>• SMS may take a few minutes to arrive</li>
              <li>• Reset links expire after 15 minutes</li>
              <li>• Contact support if you don't receive instructions</li>
            </ul>
          </div>
        </AuthCard>
      </motion.div>
    </AuthLayout>
  );
};

export default ForgotPasswordForm;