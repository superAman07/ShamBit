import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Phone
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface LoginFormData {
  identifier: string; // email or mobile
  password: string;
}

const SellerLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Email or mobile number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
          deviceFingerprint: 'web_' + Date.now(),
          ipAddress: 'unknown'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store tokens
        if (result.data.tokens) {
          localStorage.setItem('accessToken', result.data.tokens.accessToken);
          localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
        }
        
        // Redirect to dashboard
        window.location.href = '/seller/dashboard';
      } else {
        if (response.status === 401) {
          setErrors({ submit: 'Invalid email/mobile or password' });
        } else if (response.status === 404) {
          setErrors({ 
            submit: 'Account not found with this email/mobile',
            suggestion: 'New to ShamBit? Create your seller account now!'
          });
        } else if (response.status === 423) {
          setErrors({ submit: 'Account temporarily locked due to multiple failed attempts' });
        } else if (response.status === 429) {
          setErrors({ submit: 'Too many login attempts. Please try again later.' });
        } else {
          setErrors({ submit: result.error?.message || 'Login failed' });
        }
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <div className="auth-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" style={{ margin: 0, padding: '1rem', minHeight: '100vh' }}>
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
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-orange-100">Sign in to your seller account</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 text-sm">{errors.submit}</p>
                    {errors.suggestion && (
                      <div className="mt-2">
                        <p className="text-blue-600 text-xs">{errors.suggestion}</p>
                        <a 
                          href="/seller/register" 
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                        >
                          Create Account →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email or Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {isEmail(formData.identifier) ? (
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                ) : (
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={(e) => handleInputChange('identifier', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                    errors.identifier ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email or mobile number"
                />
              </div>
              {errors.identifier && <p className="text-red-500 text-sm mt-1">{errors.identifier}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="/seller/forgot-password" 
                className="text-sm text-[#FF6F61] hover:text-[#E55A4F] font-medium"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#FF6F61] text-white py-3 px-4 rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/seller/register" className="text-[#FF6F61] hover:text-[#E55A4F] font-medium">
                Register now
              </a>
            </div>
          </form>

          {/* Quick Login Help */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Login Help</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Use your registered email or mobile number</li>
              <li>• Password is case-sensitive</li>
              <li>• Account gets locked after 5 failed attempts</li>
              <li>• Contact support if you need help</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SellerLogin;