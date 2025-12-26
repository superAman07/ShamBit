import React from 'react';
import { Mail, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import useAuthForm from '../hooks/useAuthForm';
import { API_ENDPOINTS } from '../../../config/api';
import type { LoginFormData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';
import logo from '../../../assets/logo.png';

const SellerLoginPage: React.FC = () => {
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
                <span className="text-gray-700 font-medium">Seller Login</span>
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm">
              Sign in to your seller account
            </p>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
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
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="/seller/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={formState.isSubmitting}
              disabled={!formState.data.identifier || !formState.data.password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded transition-colors"
              size="lg"
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </LoadingButton>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a 
                  href="/seller/register" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Register now
                </a>
              </p>
            </div>
          </motion.form>

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Login Help</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Use your registered email or mobile number</li>
              <li>• Password is case-sensitive</li>
              <li>• Account gets locked after 5 failed attempts</li>
              <li>• Contact support if you need help</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SellerLoginPage;