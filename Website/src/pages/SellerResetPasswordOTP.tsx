import React, { useState } from 'react';
import { Phone, Shield } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import {
  AuthLayout,
  FormField,
  PasswordField,
  OTPInput,
  LoadingButton,
  ErrorAlert,
  SuccessMessage,
  useAuthForm
} from '../components/SellerAuth';
import { 
  VALIDATION_PATTERNS
} from '../components/SellerAuth/types';
import type { FieldValidation } from '../components/SellerAuth/types';

interface ResetPasswordOTPFormData {
  mobile: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

const SellerResetPasswordOTP: React.FC = () => {
  const [success, setSuccess] = useState(false);

  const validationRules: Record<keyof ResetPasswordOTPFormData, FieldValidation> = {
    mobile: {
      required: true,
      pattern: VALIDATION_PATTERNS.mobile,
      customValidator: (value: string) => {
        if (!VALIDATION_PATTERNS.mobile.test(value)) {
          return 'Please enter a valid 10-digit mobile number';
        }
        return '';
      }
    },
    otp: {
      required: true,
      pattern: VALIDATION_PATTERNS.otp,
      customValidator: (value: string) => {
        if (!VALIDATION_PATTERNS.otp.test(value)) {
          return 'Please enter a valid 6-digit OTP';
        }
        return '';
      }
    },
    newPassword: {
      required: true,
      pattern: VALIDATION_PATTERNS.password,
      customValidator: (value: string) => {
        if (!VALIDATION_PATTERNS.password.test(value)) {
          return 'Password must contain at least 8 characters with uppercase, lowercase, number and special character';
        }
        return '';
      }
    },
    confirmPassword: {
      required: true,
      customValidator: (value: string, data?: any) => {
        if (value !== data?.newPassword) {
          return 'Passwords do not match';
        }
        return '';
      }
    }
  };

  const {
    formData,
    errors,
    isSubmitting,
    updateField,
    validateForm,
    setError,
    clearError
  } = useAuthForm<ResetPasswordOTPFormData>({
    mobile: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  }, validationRules);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.VERIFY_RESET_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier: formData.mobile,
          otp: formData.otp,
          newPassword: formData.newPassword 
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
      } else {
        setError(result.error?.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    }
  };

  if (success) {
    return (
      <AuthLayout>
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
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password with OTP"
      subtitle="Enter the OTP sent to your mobile and set a new password"
      showBackButton
      onBack={() => window.location.href = '/seller/forgot-password'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <ErrorAlert 
            error={errors.general}
            onDismiss={() => clearError('general')}
          />
        )}

        <FormField
          label="Mobile Number"
          name="mobile"
          type="tel"
          value={formData.mobile}
          onChange={(value: string) => updateField('mobile', value.replace(/\D/g, '').slice(0, 10))}
          error={errors.mobile}
          placeholder="Enter your mobile number"
          icon={<Phone className="w-5 h-5" />}
          maxLength={10}
          inputMode="numeric"
          autoComplete="tel"
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            OTP <span className="text-red-500">*</span>
          </label>
          <OTPInput
            value={formData.otp}
            onChange={(value: string) => updateField('otp', value)}
            error={errors.otp}
            autoFocus
          />
          <p className="text-xs text-gray-500">
            Enter the 6-digit OTP sent to your mobile
          </p>
        </div>

        <PasswordField
          label="New Password"
          name="newPassword"
          value={formData.newPassword}
          onChange={(value: string) => updateField('newPassword', value)}
          error={errors.newPassword}
          placeholder="Enter your new password"
          showStrength
          requirements
          autoComplete="new-password"
          required
        />

        <PasswordField
          label="Confirm New Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={(value: string) => updateField('confirmPassword', value)}
          error={errors.confirmPassword}
          placeholder="Confirm your new password"
          icon={<Shield className="w-5 h-5" />}
          autoComplete="new-password"
          required
        />

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          disabled={!formData.mobile || !formData.otp || !formData.newPassword || !formData.confirmPassword}
          className="w-full"
        >
          {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
        </LoadingButton>

        <div className="flex items-center justify-center space-x-4 text-sm">
          <a 
            href="/seller/login" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Login
          </a>
          <span className="text-gray-300">|</span>
          <a 
            href="/seller/forgot-password" 
            className="text-[#FF6F61] hover:text-[#E55A4F] font-medium transition-colors"
          >
            Request New OTP
          </a>
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• OTP is valid for 5 minutes only</li>
          <li>• Make sure you enter the mobile number correctly</li>
          <li>• Check your SMS for the 6-digit code</li>
          <li>• Contact support if you don't receive the OTP</li>
        </ul>
      </div>
    </AuthLayout>
  );
};

export default SellerResetPasswordOTP;