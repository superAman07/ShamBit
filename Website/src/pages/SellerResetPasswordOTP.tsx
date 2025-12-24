import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const SellerResetPasswordOTP: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return errors;
  };

  const handlePasswordChange = (password: string) => {
    setNewPassword(password);
    setValidationErrors(validatePassword(password));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mobile || !otp || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError('Please fix the password requirements');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.VERIFY_RESET_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier: mobile,
          otp,
          newPassword 
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" style={{ margin: 0, padding: '1rem', minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center" style={{ margin: 0 }}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          
          <button
            onClick={() => window.location.href = '/seller/login'}
            className="w-full bg-[#FF6F61] text-white py-3 px-4 rounded-lg hover:bg-[#E55A4F] transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" style={{ margin: 0, padding: '1rem', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full" style={{ margin: 0 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] p-6 text-white text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="text-2xl font-bold leading-none">
              <span className="bg-gradient-to-r from-orange-200 via-yellow-200 to-amber-200 bg-clip-text text-transparent">Sham</span>
              <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent">Bit</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset Password with OTP</h1>
          <p className="text-orange-100">Enter the OTP sent to your mobile and set a new password</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors"
                  placeholder="Enter your mobile number"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the mobile number where you received the OTP
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit OTP sent to your mobile
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</h4>
                  <div className="space-y-1">
                    {[
                      { test: newPassword.length >= 8, text: 'At least 8 characters' },
                      { test: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
                      { test: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
                      { test: /\d/.test(newPassword), text: 'One number' },
                      { test: /[@$!%*?&]/.test(newPassword), text: 'One special character (@$!%*?&)' }
                    ].map((req, index) => (
                      <div key={index} className="flex items-center text-xs">
                        <div className={`w-2 h-2 rounded-full mr-2 ${req.test ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={req.test ? 'text-green-700' : 'text-gray-500'}>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword && (
                <p className="text-green-500 text-xs mt-1">Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !mobile || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword || validationErrors.length > 0}
              className="w-full bg-[#FF6F61] text-white py-3 px-4 rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="flex items-center justify-center space-x-4 text-sm">
              <a 
                href="/seller/login" 
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="/seller/forgot-password" 
                className="text-[#FF6F61] hover:text-[#E55A4F] font-medium"
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
        </div>
      </motion.div>
    </div>
  );
};

export default SellerResetPasswordOTP;