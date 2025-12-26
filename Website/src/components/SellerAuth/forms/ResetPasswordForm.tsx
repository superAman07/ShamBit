import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '../layout/AuthLayout';
import AuthCard from '../layout/AuthCard';
import PasswordField from '../components/PasswordField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import useAuthForm from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { ResetPasswordFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';

const ResetPasswordForm: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  const { formState, updateField, setFormError, clearFormError, handleSubmit } = useAuthForm<ResetPasswordFormData>({
    initialData: {
      token: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationRules: {
      newPassword: {
        required: true,
        pattern: VALIDATION_PATTERNS.password
      },
      confirmPassword: {
        required: true,
        customValidator: (value: string, formData?: ResetPasswordFormData) => {
          if (!value) return 'Please confirm your password';
          if (value !== formData?.newPassword) return 'Passwords do not match';
          return '';
        }
      }
    },
    onSubmit: async (data) => {
      clearFormError();
      
      if (!token) {
        setFormError('Invalid reset token');
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.RESET_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token,
            newPassword: data.newPassword 
          }),
        });

        const result: AuthResponse = await response.json();

        if (response.ok && result.success) {
          setSuccess(true);
        } else {
          if (response.status === 400 && result.error?.message?.includes('expired')) {
            setTokenValid(false);
            setFormError('Reset link has expired. Please request a new one.');
          } else {
            setFormError(result.error?.message || 'Failed to reset password. Please try again.');
          }
        }
      } catch (error) {
        setFormError('Network error. Please check your connection and try again.');
      }
    }
  });

  // Extract token from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken) {
      setToken(resetToken);
      updateField('token', resetToken);
    } else {
      setTokenValid(false);
      setFormError('Invalid reset link. Please request a new password reset.');
    }
  }, [updateField, setFormError]);

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
              title="Password Reset Successful"
              message="Your password has been successfully reset. You can now login with your new password."
              actions={[
                {
                  label: 'Go to Login',
                  onClick: () => window.location.href = '/seller/login',
                  variant: 'primary'
                }
              ]}
            />
          </AuthCard>
        </motion.div>
      </AuthLayout>
    );
  }

  if (!tokenValid) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AuthCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Invalid Reset Link
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <div className="space-y-3">
                <LoadingButton
                  onClick={() => window.location.href = '/seller/forgot-password'}
                  className="w-full"
                >
                  Request New Reset Link
                </LoadingButton>
                <LoadingButton
                  onClick={() => window.location.href = '/seller/login'}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Login
                </LoadingButton>
              </div>
            </div>
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
              Set New Password
            </h1>
            <p className="text-gray-600 text-sm">
              Create a strong password for your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            <ErrorAlert 
              error={formState.errors.form} 
              onDismiss={clearFormError}
            />

            {/* New Password */}
            <PasswordField
              label="New Password"
              name="newPassword"
              value={formState.data.newPassword}
              onChange={(value) => updateField('newPassword', value)}
              error={formState.errors.newPassword}
              placeholder="Enter your new password"
              required
              showStrength
              requirements
              autoComplete="new-password"
            />

            {/* Confirm Password */}
            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              value={formState.data.confirmPassword}
              onChange={(value) => updateField('confirmPassword', value)}
              error={formState.errors.confirmPassword}
              placeholder="Confirm your new password"
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
              Reset Password
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
                href="/seller/forgot-password" 
                className="text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
              >
                Request New Link
              </a>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Security Notice</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• This reset link expires in 15 minutes</li>
              <li>• Use a strong, unique password</li>
              <li>• Don't share your password with anyone</li>
              <li>• Consider using a password manager</li>
            </ul>
          </div>
        </AuthCard>
      </motion.div>
    </AuthLayout>
  );
};

export default ResetPasswordForm;