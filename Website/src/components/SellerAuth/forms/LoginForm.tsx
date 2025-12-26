import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '../layout/AuthLayout';
import AuthCard from '../layout/AuthCard';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import { useAuthForm } from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { LoginFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';

const LoginForm: React.FC = () => {
  const { formState, updateField, setFormError, clearFormError, handleSubmit } = useAuthForm<LoginFormData>({
    initialData: {
      identifier: '',
      password: '',
      rememberMe: false
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
      },
      password: {
        required: true
      }
    },
    onSubmit: async (data) => {
      clearFormError();
      
      try {
        const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: data.identifier.trim(),
            password: data.password,
            deviceFingerprint: 'web_' + Date.now(),
            ipAddress: 'unknown'
          }),
        });

        const result: AuthResponse = await response.json();

        if (response.ok && result.success) {
          // Store tokens
          if (result.data?.tokens) {
            localStorage.setItem('accessToken', result.data.tokens.accessToken);
            localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
          }
          
          // Redirect to dashboard
          window.location.href = '/seller/dashboard';
        } else {
          handleLoginError(response.status, result);
        }
      } catch (error) {
        setFormError('Network error. Please check your connection and try again.');
      }
    }
  });

  const handleLoginError = (status: number, result: AuthResponse) => {
    switch (status) {
      case 401:
        setFormError('Invalid email/mobile or password');
        break;
      case 404:
        setFormError('Account not found with this email/mobile');
        break;
      case 423:
        setFormError('Account temporarily locked due to multiple failed attempts');
        break;
      case 429:
        setFormError('Too many login attempts. Please try again later.');
        break;
      default:
        setFormError(result.error?.message || 'Login failed. Please try again.');
    }
  };

  const isEmail = VALIDATION_PATTERNS.email.test(formState.data.identifier);

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
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm">
              Sign in to your seller account
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
              placeholder="Enter email or mobile number"
              required
              icon={isEmail ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              autoComplete="username"
              inputMode={isEmail ? 'email' : 'tel'}
            />

            {/* Password Field */}
            <PasswordField
              label="Password"
              name="password"
              value={formState.data.password}
              onChange={(value) => updateField('password', value)}
              error={formState.errors.password}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formState.data.rememberMe}
                  onChange={(e) => updateField('rememberMe', e.target.checked)}
                  className="rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61] focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="/seller/forgot-password" 
                className="text-sm text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={formState.isSubmitting}
              disabled={!formState.data.identifier || !formState.data.password}
              className="w-full"
              size="lg"
            >
              Sign In
            </LoadingButton>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a 
                  href="/seller/register" 
                  className="text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
                >
                  Register now
                </a>
              </p>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Login Help</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Use your registered email or mobile number</li>
              <li>• Password is case-sensitive</li>
              <li>• Account gets locked after 5 failed attempts</li>
              <li>• Contact support if you need help</li>
            </ul>
          </div>
        </AuthCard>
      </motion.div>
    </AuthLayout>
  );
};

export default LoginForm;