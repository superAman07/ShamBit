import React, { useState } from 'react';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '../layout/AuthLayout';
import AuthCard from '../layout/AuthCard';
import OTPInput from '../components/OTPInput';
import LoadingButton from '../components/LoadingButton';
import ErrorAlert from '../components/ErrorAlert';
import ProgressIndicator from '../components/ProgressIndicator';
import useAuthForm from '../hooks/useAuthForm';
import { useOTPTimer } from '../hooks/useOTPTimer';
import { API_ENDPOINTS } from '../../../config/api';
import type { OTPVerificationData, AuthResponse } from '../types';
import { VALIDATION_PATTERNS } from '../types';

interface OTPVerificationFormProps {
  mobile: string;
  sessionId: string;
  onSuccess: () => void;
  onBack: () => void;
}

const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  mobile,
  sessionId,
  onSuccess,
  onBack
}) => {
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(false);

  const { timeRemaining, isExpired, start, formatTime } = useOTPTimer({
    initialTime: 300, // 5 minutes
    onExpire: () => {
      setFormError('OTP has expired. Please request a new one.');
    }
  });

  const { formState, updateField, setFormError, clearFormError, handleSubmit } = useAuthForm<OTPVerificationData>({
    initialData: {
      mobile,
      otp: '',
      sessionId
    },
    validationRules: {
      otp: {
        required: true,
        pattern: VALIDATION_PATTERNS.otp
      }
    },
    onSubmit: async (data) => {
      clearFormError();
      
      try {
        const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.VERIFY_OTP, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: data.mobile,
            otp: data.otp,
            sessionId: data.sessionId
          }),
        });

        const result: AuthResponse = await response.json();

        if (response.ok && result.success && result.data?.verified) {
          // Store tokens if provided
          if (result.data.tokens) {
            localStorage.setItem('accessToken', result.data.tokens.accessToken);
            localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
          }
          
          // Small delay to ensure tokens are stored before redirect
          setTimeout(() => {
            onSuccess();
          }, 100);
        } else {
          handleOTPError(result);
        }
      } catch (error) {
        setFormError('Network error. Please try again.');
      }
    }
  });

  const handleOTPError = (result: AuthResponse) => {
    if (result.error?.code === 'VALIDATION_ERROR') {
      const validationErrors = result.error.details || [];
      const errorMessage = validationErrors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
      setFormError(`Validation error: ${errorMessage}`);
    } else {
      setFormError(result.error?.message || 'Invalid OTP. Please try again.');
    }
    setAttemptsRemaining(prev => Math.max(0, prev - 1));
  };

  const handleResendOTP = async (method: 'sms' | 'whatsapp' = 'sms') => {
    if (resendCooldown) return;

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.RESEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          method
        }),
      });

      const result: AuthResponse = await response.json();

      if (response.ok && result.success) {
        start(result.data?.expiresIn || 300);
        setAttemptsRemaining(result.data?.attemptsRemaining || 3);
        clearFormError();
        updateField('otp', ''); // Clear current OTP
        
        // Set cooldown
        setResendCooldown(true);
        setTimeout(() => setResendCooldown(false), 30000); // 30 seconds cooldown
      } else {
        setFormError(result.error?.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setFormError('Network error. Please try again.');
    }
  };

  // Start timer on mount
  React.useEffect(() => {
    start(300);
  }, [start]);

  const steps = [
    { id: 'register', label: 'Registration', completed: true, active: false },
    { id: 'verify', label: 'Verification', completed: false, active: true },
    { id: 'success', label: 'Complete', completed: false, active: false }
  ];

  return (
    <AuthLayout
      showBackButton
      onBack={onBack}
    >
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
              Verify Your Mobile Number
            </h1>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-gray-900 font-medium text-sm mt-1">
              {mobile}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            <ErrorAlert 
              error={formState.errors.form || formState.errors.otp} 
              onDismiss={clearFormError}
            />

            {/* Timer */}
            {!isExpired && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Code expires in{' '}
                  <span className="font-medium text-[#FF6F61]">
                    {formatTime(timeRemaining)}
                  </span>
                </p>
              </div>
            )}

            {/* OTP Input */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 text-center">
                Enter Verification Code
              </label>
              <OTPInput
                value={formState.data.otp}
                onChange={(value) => updateField('otp', value)}
                error={formState.errors.otp}
                disabled={formState.isSubmitting}
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={formState.isSubmitting}
              disabled={formState.data.otp.length !== 6 || isExpired}
              className="w-full"
              size="lg"
            >
              Verify Code
            </LoadingButton>

            {/* Resend Options */}
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Didn't receive the code?
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <LoadingButton
                    onClick={() => handleResendOTP('sms')}
                    disabled={resendCooldown || !isExpired && timeRemaining > 240} // Allow resend after 1 minute
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend SMS
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => handleResendOTP('whatsapp')}
                    disabled={resendCooldown || !isExpired && timeRemaining > 240}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send via WhatsApp
                  </LoadingButton>
                </div>
              </div>

              {resendCooldown && (
                <p className="text-xs text-gray-500 text-center">
                  Please wait 30 seconds before requesting another code
                </p>
              )}

              {attemptsRemaining < 3 && attemptsRemaining > 0 && (
                <p className="text-xs text-amber-600 text-center">
                  {attemptsRemaining} attempts remaining
                </p>
              )}

              {attemptsRemaining === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm text-center">
                    Maximum attempts exceeded. Please try registering again.
                  </p>
                </div>
              )}
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Check your SMS messages for the 6-digit code</li>
              <li>• Make sure you entered the correct mobile number</li>
              <li>• SMS may take a few minutes to arrive</li>
              <li>• Try WhatsApp if SMS doesn't work</li>
              <li>• Contact support if you continue having issues</li>
            </ul>
          </div>
        </AuthCard>
      </motion.div>
    </AuthLayout>
  );
};

export default OTPVerificationForm;