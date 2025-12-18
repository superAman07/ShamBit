import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface LoginFormData {
  email: string;
  password: string;
  otp: string;
  captcha: string;
}

interface CaptchaData {
  captchaId: string;
  imageUrl: string;
  expiresIn: number;
}

const SellerLogin: React.FC = () => {
  const [step, setStep] = useState<'credentials' | 'otp' | 'captcha'>('credentials');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    otp: '',
    captcha: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);

  // OTP Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const updateFormData = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateCaptcha = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.CAPTCHA);
      const data = await response.json();
      
      if (response.ok) {
        setCaptchaData(data);
      } else {
        setErrors({ captcha: 'Failed to load CAPTCHA. Please try again.' });
      }
    } catch (error) {
      setErrors({ captcha: 'Failed to load CAPTCHA. Please check your connection.' });
    }
  };

  const handleCredentialsSubmit = async () => {
    if (!validateCredentials()) return;

    setIsLoading(true);
    try {
      // Generate CAPTCHA first
      await generateCaptcha();
      setStep('captcha');
    } catch (error) {
      setErrors({ submit: 'Failed to proceed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaSubmit = async () => {
    if (!formData.captcha.trim()) {
      setErrors({ captcha: 'Please enter the CAPTCHA' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          captcha: formData.captcha,
          captchaId: captchaData?.captchaId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store seller info temporarily
        sessionStorage.setItem('sellerLoginData', JSON.stringify({
          sellerId: result.sellerId,
          mobile: result.mobile
        }));
        
        setStep('otp');
        setOtpTimer(300); // 5 minutes
        setCanResendOTP(false);
      } else {
        setErrors({ submit: result.message || 'Login failed. Please check your credentials.' });
        // Regenerate CAPTCHA on failure
        await generateCaptcha();
        setFormData(prev => ({ ...prev, captcha: '' }));
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async () => {
    if (!formData.otp.trim()) {
      setErrors({ otp: 'Please enter the OTP' });
      return;
    }

    if (formData.otp.length !== 6) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return;
    }

    setIsLoading(true);
    try {
      const loginData = JSON.parse(sessionStorage.getItem('sellerLoginData') || '{}');
      
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: loginData.sellerId,
          otp: formData.otp
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store tokens
        localStorage.setItem('sellerAccessToken', result.tokens.accessToken);
        localStorage.setItem('sellerRefreshToken', result.tokens.refreshToken);
        localStorage.setItem('sellerData', JSON.stringify(result.seller));
        
        // Clear session data
        sessionStorage.removeItem('sellerLoginData');
        
        // Redirect to seller portal
        window.location.href = '/seller/dashboard';
      } else {
        setErrors({ otp: result.message || 'Invalid OTP. Please try again.' });
      }
    } catch (error) {
      setErrors({ otp: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResendOTP) return;

    setIsLoading(true);
    try {
      const loginData = JSON.parse(sessionStorage.getItem('sellerLoginData') || '{}');
      
      const response = await fetch(API_ENDPOINTS.SELLER_AUTH.RESEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: loginData.mobile
        }),
      });

      if (response.ok) {
        setOtpTimer(300);
        setCanResendOTP(false);
        setErrors({ otp: '' });
      } else {
        const result = await response.json();
        setErrors({ otp: result.message || 'Failed to resend OTP' });
      }
    } catch (error) {
      setErrors({ otp: 'Failed to resend OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col"
      style={{ 
        backgroundColor: '#f8fafc',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 1000
      }}
    >
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">
              Access Your{' '}
              <span 
                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.3))'
                }}
              >
                Sham
              </span>
              <span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.3))'
                }}
              >
                Bit
              </span>
              {' '}Portal
            </h1>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-md">


          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-4">
              {/* Step 1: Credentials */}
              {step === 'credentials' && (
                <div className="space-y-6">
                  <div className="text-center pb-3 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Seller Login</h2>
                    <p className="text-gray-600 text-sm">Enter your credentials</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          placeholder="Enter your registered email address"
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.email}
                      </p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          placeholder="Enter your secure password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.password}
                      </p>}
                    </div>

                    <div className="text-right">
                      <a href="/seller/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                        Forgot Password?
                      </a>
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-red-800 font-medium">Authentication Failed</p>
                          <p className="text-red-700 text-sm mt-1">{errors.submit}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCredentialsSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <span className="font-medium">Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Continue to Security Check</span>
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: CAPTCHA */}
              {step === 'captcha' && (
                <div className="space-y-6">
                  <div className="text-center pb-3 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Security Check</h2>
                    <p className="text-gray-600 text-sm">Complete CAPTCHA verification</p>
                  </div>

                  <div className="space-y-4">
                    {captchaData && (
                      <div className="text-center">
                        <div className="inline-block border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                          <img 
                            src={captchaData.imageUrl} 
                            alt="CAPTCHA" 
                            className="mx-auto"
                          />
                        </div>
                        <button
                          onClick={generateCaptcha}
                          className="mt-2 flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all text-sm mx-auto"
                          title="Refresh CAPTCHA"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Refresh</span>
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter CAPTCHA *
                      </label>
                      <input
                        type="text"
                        value={formData.captcha}
                        onChange={(e) => updateFormData('captcha', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center transition-all ${
                          errors.captcha ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter CAPTCHA text"
                      />
                      {errors.captcha && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.captcha}
                      </p>}
                    </div>


                  </div>

                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-red-800 font-medium">Verification Failed</p>
                          <p className="text-red-700 text-sm mt-1">{errors.submit}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      onClick={() => setStep('credentials')}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleCaptchaSubmit}
                      disabled={isLoading}
                      className="flex-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <span className="font-medium">Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Verify & Continue</span>
                          <CheckCircle className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: OTP */}
              {step === 'otp' && (
                <div className="space-y-6">
                  <div className="text-center pb-3 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">OTP Verification</h2>
                    <p className="text-gray-600 text-sm">Enter the code sent to your mobile</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      6-Digit OTP *
                    </label>
                    <input
                      type="text"
                      value={formData.otp}
                      onChange={(e) => updateFormData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono transition-all ${
                        errors.otp ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="000000"
                      maxLength={6}
                    />
                    {errors.otp && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.otp}
                    </p>}
                  </div>

                  <div className="text-center">
                    {otpTimer > 0 ? (
                      <p className="text-gray-600 text-sm">
                        Resend in <span className="font-mono font-medium text-blue-600">{formatTime(otpTimer)}</span>
                      </p>
                    ) : (
                      <button
                        onClick={resendOTP}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 text-sm"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleOTPSubmit}
                    disabled={isLoading || formData.otp.length !== 6}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <span className="font-medium">Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Access Seller Portal</span>
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-sm">
                  Don't have an account?{' '}
                  <a href="/seller/register" className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors">
                    Register as Seller
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-2 text-center">
          <p className="text-xs text-gray-500">© 2025 <span 
                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 5px rgba(255, 140, 0, 0.3))'
                }}
              >
                Sham
              </span>
              <span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 5px rgba(30, 64, 175, 0.3))'
                }}
              >
                Bit
              </span> Commerce. All rights reserved. | <a href="/help" className="text-blue-600 hover:underline">Help</a> | <a href="/privacy" className="text-blue-600 hover:underline">Privacy</a> | <a href="/terms" className="text-blue-600 hover:underline">Terms</a></p>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;