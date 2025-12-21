import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Eye, EyeOff, Shield, Smartphone, Mail, User, Lock, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

interface RegistrationFormData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}

interface ValidationErrors {
  fullName?: string;
  mobile?: string;
  email?: string;
  password?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
  label: string;
}

interface SellerFormProps {
  onRegistrationSuccess: (data: {
    tokens: { accessToken: string; refreshToken: string };
    seller: any;
  }) => void;
  onRegistrationError: (error: any) => void;
  onSwitchToLogin: () => void;
}

export const SellerForm: React.FC<SellerFormProps> = ({
  onRegistrationSuccess,
  onRegistrationError,
  onSwitchToLogin
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'otp_verification'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    mobile: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'bg-gray-200',
    label: 'Enter password'
  });
  const [otpData, setOtpData] = useState<{ mobile: string; sellerId: string } | null>(null);

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.length < 2) return 'Full name must be at least 2 characters';
        if (value.length > 100) return 'Full name cannot exceed 100 characters';
        if (!/^[a-zA-Z\s.'-]+$/.test(value)) return 'Full name can only contain letters, spaces, dots, hyphens, and apostrophes';
        return undefined;
      
      case 'mobile':
        if (!value.trim()) return 'Mobile number is required';
        if (!/^[6-9]\d{9}$/.test(value)) return 'Enter valid 10-digit mobile number starting with 6-9';
        return undefined;
      
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        if (value.length > 255) return 'Email cannot exceed 255 characters';
        return undefined;
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
          return 'Password must contain uppercase, lowercase, number, and special character';
        }
        return undefined;
      
      default:
        return undefined;
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) {
      return { score: 0, feedback: [], color: 'bg-gray-200', label: 'Enter password' };
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('One uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('One lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('One number');

    // Special character check
    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('One special character (@$!%*?&)');

    let color = 'bg-red-400';
    let label = 'Weak';

    if (score >= 4) {
      color = 'bg-green-500';
      label = 'Strong';
    } else if (score >= 3) {
      color = 'bg-yellow-500';
      label = 'Medium';
    } else if (score >= 1) {
      color = 'bg-orange-500';
      label = 'Weak';
    }

    return { score, feedback, color, label };
  };

  // Handle input changes with real-time validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    
    // Update password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrors({});

    // Validate all fields
    const newErrors: ValidationErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) newErrors[key as keyof ValidationErrors] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatus('error');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          deviceFingerprint: navigator.userAgent,
          ipAddress: 'client-side', // Will be set by server
          userAgent: navigator.userAgent
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpData({ mobile: formData.mobile, sellerId: data.data.sellerId });
        setStatus('otp_verification');
      } else {
        // Check for duplicate account error
        if (data.error?.code === 'DUPLICATE_ACCOUNT') {
          onRegistrationError(data.error);
        }
        setErrors({ general: data.error?.message || 'Registration failed. Please try again.' });
        setStatus('error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 my-10">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Welcome to ShamBit!</h2>
        <p className="text-gray-600 mt-2">Your account has been created successfully. You can now access your seller dashboard.</p>
        <button 
          onClick={() => window.location.href = '/seller/dashboard'}
          className="mt-6 px-8 py-3 bg-[#FB6F92] text-white rounded-full font-bold hover:bg-[#F43F6E] transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (status === 'otp_verification' && otpData) {
    return <OTPVerification mobile={otpData.mobile} sellerId={otpData.sellerId} onSuccess={onRegistrationSuccess} />;
  }

  return (
    <section id="become-seller" className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="bg-[#FB6F92]/10 text-[#FB6F92] px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
            Join ShamBit
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#333] mt-3">Start Selling in Minutes</h2>
          <p className="text-gray-600 mt-2">Create your seller account with just 4 simple fields. No lengthy forms, no waiting for approval.</p>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center items-center gap-6 mb-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Secure & Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Instant Access</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-500" />
            <span>Mobile Optimized</span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl overflow-hidden p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Registration Failed</p>
                  <p className="text-red-600 text-sm mt-1">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Rajesh Kumar"
                className={`w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
                  errors.fullName 
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92]'
                }`}
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fullName}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">Enter your full name as per official documents</p>
            </div>

            {/* Mobile Number Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Smartphone className="w-4 h-4 inline mr-2" />
                Mobile Number
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">+91</span>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors outline-none ${
                    errors.mobile 
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92]'
                  }`}
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
              {errors.mobile && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.mobile}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">We'll send an OTP to verify your number</p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="rajesh@example.com"
                className={`w-full px-4 py-3 rounded-xl border transition-colors outline-none ${
                  errors.email 
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92]'
                }`}
                autoComplete="email"
                inputMode="email"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">For important account notifications</p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border transition-colors outline-none ${
                    errors.password 
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92]'
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{passwordStrength.label}</span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <p className="mb-1">Password needs:</p>
                      <ul className="space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {errors.password && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full px-8 py-4 bg-[#FB6F92] text-white rounded-xl font-bold hover:bg-[#F43F6E] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
              {status === 'loading' ? 'Creating Account...' : 'Create Seller Account'}
            </button>

            {/* Terms and Privacy */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-[#FB6F92] hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="text-[#FB6F92] hover:underline">Privacy Policy</a>.
              Your data is encrypted and secure.
            </p>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[#FB6F92] hover:text-[#F43F6E] font-medium"
                disabled={status === 'loading'}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Why sellers choose ShamBit:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/50 rounded-xl p-4">
              <div className="text-[#FB6F92] font-bold">Zero Commission</div>
              <div className="text-gray-600">First 6 months free</div>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <div className="text-[#FB6F92] font-bold">Instant Payouts</div>
              <div className="text-gray-600">Get paid within 24 hours</div>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <div className="text-[#FB6F92] font-bold">24/7 Support</div>
              <div className="text-gray-600">Dedicated seller support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// OTP Verification Component
interface OTPVerificationProps {
  mobile: string;
  sellerId: string;
  onSuccess: (data: {
    tokens: { accessToken: string; refreshToken: string };
    seller: any;
  }) => void;
}

const OTPVerification = ({ mobile, onSuccess }: OTPVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [resendMethod, setResendMethod] = useState<'sms' | 'whatsapp'>('sms');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string) => {
    if (/^\d{0,6}$/.test(value)) {
      setOtp(value);
      setError('');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile,
          otp,
          deviceFingerprint: navigator.userAgent
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data.verified) {
        // Store tokens for authentication
        if (data.data.tokens) {
          localStorage.setItem('accessToken', data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        }
        onSuccess({
          tokens: data.data.tokens,
          seller: data.data.seller
        });
      } else {
        setError(data.error?.message || 'Invalid OTP. Please try again.');
        setStatus('idle');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error. Please try again.');
      setStatus('idle');
    }
  };

  const handleResendOtp = async () => {
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.SELLER_REGISTRATION.RESEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile,
          method: resendMethod
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTimeRemaining(300);
        setOtp('');
        setStatus('idle');
      } else {
        setError(data.error?.message || 'Failed to resend OTP. Please try again.');
        setStatus('idle');
      }
    } catch (error) {
      console.error('OTP resend error:', error);
      setError('Network error. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white">
      <div className="text-center mb-6">
        <Smartphone className="w-12 h-12 text-[#FB6F92] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Verify Your Mobile</h2>
        <p className="text-gray-600 mt-2">
          We've sent a 6-digit OTP to<br />
          <span className="font-medium">+91 {mobile}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => handleOtpChange(e.target.value)}
            placeholder="123456"
            className="w-full px-4 py-3 text-center text-2xl font-mono rounded-xl border border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92] outline-none"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={status === 'loading' || otp.length !== 6}
          className="w-full px-8 py-3 bg-[#FB6F92] text-white rounded-xl font-bold hover:bg-[#F43F6E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === 'loading' ? 'Verifying...' : 'Verify OTP'}
        </button>

        <div className="text-center">
          {timeRemaining > 0 ? (
            <p className="text-gray-600 text-sm">
              Resend OTP in <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-600 text-sm">Didn't receive the OTP?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setResendMethod('sms');
                    handleResendOtp();
                  }}
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2 text-[#FB6F92] border border-[#FB6F92] rounded-lg hover:bg-[#FB6F92] hover:text-white transition-colors disabled:opacity-50"
                >
                  Resend SMS
                </button>
                <button
                  onClick={() => {
                    setResendMethod('whatsapp');
                    handleResendOtp();
                  }}
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
                >
                  Try WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
