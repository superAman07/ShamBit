import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const SellerForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<'email' | 'otp'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError('Please enter your email or mobile number');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call the actual forgot password API
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (method === 'otp') {
          // Redirect to OTP reset page for mobile users
          window.location.href = '/seller/reset-password-otp';
        } else {
          setSuccess(true);
        }
      } else {
        setError(result.error?.message || 'Failed to send reset instructions. Please try again.');
      }
    } catch (error) {
      setError('Failed to send reset instructions. Please try again.');
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your {method === 'email' ? 'Email' : 'Phone'}</h2>
          <p className="text-gray-600 mb-6">
            We've sent password reset instructions to <strong>{identifier}</strong>
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/seller/login'}
              className="w-full bg-[#FF6F61] text-white py-3 px-4 rounded-lg hover:bg-[#E55A4F] transition-colors"
            >
              Back to Login
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setIdentifier('');
              }}
              className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Different Account
            </button>
          </div>
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
          <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
          <p className="text-orange-100">We'll help you get back into your account</p>
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
                Email or Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {identifier.includes('@') ? (
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                ) : (
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                    // Auto-detect method based on input
                    setMethod(e.target.value.includes('@') ? 'email' : 'otp');
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors"
                  placeholder="Enter your email or mobile number"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                We'll send reset instructions to this {method === 'email' ? 'email address' : 'mobile number'}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Reset Methods Available:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Email link (for email addresses)</li>
                <li>• OTP via SMS (for mobile numbers)</li>
                <li>• Both methods are secure and instant</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !identifier.trim()}
              className="w-full bg-[#FF6F61] text-white py-3 px-4 rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending Instructions...
                </>
              ) : (
                `Send Reset ${method === 'email' ? 'Link' : 'OTP'}`
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
                href="/seller/register" 
                className="text-[#FF6F61] hover:text-[#E55A4F] font-medium"
              >
                Create Account
              </a>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Make sure you enter the email/mobile used during registration</li>
              <li>• Check your spam folder for email instructions</li>
              <li>• SMS may take a few minutes to arrive</li>
              <li>• Contact support if you don't receive instructions</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SellerForgotPassword;