import { Router } from 'express';
import { z } from 'zod';
import { 
  RegistrationRequest, 
  OTPVerificationRequest,
  ProfileUpdateRequest,
  OTPResendRequest,
  LoginRequest 
} from '@shambit/shared';
import { getDatabase } from '@shambit/database';
import { SellerRegistrationService } from '@shambit/database/src/services/seller-registration.service';
import { 
  registrationRateLimit, 
  otpRateLimit, 
  loginRateLimit, 
  abuseDetectionMiddleware,
  generalRateLimit 
} from '../../middleware/rateLimiting.middleware';
import { enhancedOTPService } from '../../services/enhanced-otp.service';
import { sellerAuthService } from '../../services/seller-auth.service';

const router = Router();

// Apply general rate limiting and abuse detection to all routes
router.use(generalRateLimit);
router.use(abuseDetectionMiddleware);

console.log('Seller registration routes: Router created successfully');

// Initialize service with OTP service dependency
const getSellerRegistrationService = () => {
  const db = getDatabase();
  return new SellerRegistrationService(db, enhancedOTPService);
};

// Validation schemas for simplified registration
const registrationSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name can only contain letters, spaces, dots, hyphens, and apostrophes'),
  mobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number starting with 6-9'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  deviceFingerprint: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

const otpVerificationSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain only numbers'),
  deviceFingerprint: z.string().optional()
});

const otpResendSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  method: z.enum(['sms', 'whatsapp']).default('sms')
});

const profileUpdateSchema = z.object({
  section: z.enum(['business', 'address', 'tax', 'bank']),
  data: z.record(z.string(), z.any()),
  partialSave: z.boolean().default(false)
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
  ipAddress: z.string().optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * @route POST /api/v1/seller-registration/check-account
 * @desc Check if account exists and provide recovery options
 * @access Public
 */
router.post('/check-account', async (req, res) => {
  try {
    const { identifier } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email or mobile number is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }

    const sellerService = getSellerRegistrationService();
    const recoveryInfo = await sellerService.getAccountRecoverySuggestions(identifier);

    res.json({
      success: true,
      data: {
        accountExists: recoveryInfo.found,
        suggestions: recoveryInfo.suggestions,
        recoveryOptions: {
          canLogin: recoveryInfo.canLogin,
          canResetPassword: recoveryInfo.canResetPassword,
          loginUrl: recoveryInfo.canLogin ? '/login' : null,
          passwordResetUrl: recoveryInfo.canResetPassword ? '/forgot-password' : null,
          supportUrl: '/support'
        },
        accountInfo: recoveryInfo.found ? {
          status: recoveryInfo.accountStatus,
          verificationStatus: recoveryInfo.verificationStatus,
          lastLoginAt: recoveryInfo.lastLoginAt
        } : null
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Account check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check account',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route GET /api/v1/seller-registration/test
 * @desc Test route to verify routing is working
 * @access Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Seller registration routes are working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route POST /api/v1/seller-registration/register
 * @desc Register a new seller with minimal 4-field form
 * @access Public
 */
router.post('/register', registrationRateLimit, async (req, res) => {
  try {
    // Validate request body
    const validationResult = registrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const registrationData = {
      ...validationResult.data,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Register seller using enhanced service
    const sellerService = getSellerRegistrationService();
    const result = await sellerService.registerSeller(registrationData, registrationData.ipAddress);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed',
          details: { reason: 'OTP delivery failed or rate limit exceeded' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('already exists') || (error as any).code === 'DUPLICATE_ACCOUNT') {
        const details = (error as any).details || {};
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ACCOUNT',
            message: error.message,
            details: {
              duplicateType: details.duplicateType,
              suggestions: details.suggestions || ['Try logging in instead or use account recovery'],
              canLogin: details.canLogin,
              canResetPassword: details.canResetPassword,
              accountStatus: details.accountStatus,
              verificationStatus: details.verificationStatus,
              recoveryOptions: {
                login: details.canLogin ? '/login' : null,
                passwordReset: details.canResetPassword ? '/forgot-password' : null,
                support: '/support'
              }
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }

      if ((error as any).code === 'HIGH_RISK_REGISTRATION') {
        const details = (error as any).details || {};
        return res.status(403).json({
          success: false,
          error: {
            code: 'HIGH_RISK_REGISTRATION',
            message: error.message,
            details: {
              riskLevel: details.riskLevel,
              flags: details.flags,
              suggestions: details.suggestions || ['Contact support for assistance'],
              supportContact: '/support'
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to register seller',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/verify-otp
 * @desc Verify mobile OTP and complete registration
 * @access Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const validationResult = otpVerificationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid OTP verification data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const { mobile, otp }: OTPVerificationRequest = validationResult.data;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Verify OTP using enhanced service with auth service for token generation
    const sellerService = getSellerRegistrationService();
    const result = await sellerService.verifyRegistrationOTP(mobile, otp, ipAddress, userAgent, sellerAuthService);
    
    if (!result.success || !result.verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OTP_VERIFICATION_FAILED',
          message: result.error || 'Invalid OTP or verification failed',
          details: { 
            verified: false,
            suggestion: 'Please check your OTP and try again, or request a new one'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        verified: true,
        tokens: result.tokens,
        seller: {
          id: result.seller?.id,
          fullName: result.seller?.fullName,
          mobile: result.seller?.mobile,
          email: result.seller?.email,
          mobileVerified: true,
          emailVerified: result.seller?.emailVerified || false,
          status: result.seller?.status,
          verificationStatus: result.seller?.verificationStatus,
          canListProducts: result.seller?.canListProducts || false,
          payoutEnabled: result.seller?.payoutEnabled || false,
          createdAt: result.seller?.createdAt
        },
        welcomeFlow: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify OTP',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/resend-otp
 * @desc Resend OTP to mobile number with WhatsApp fallback
 * @access Public
 */
router.post('/resend-otp', otpRateLimit, async (req, res) => {
  try {
    const validationResult = otpResendSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid resend OTP data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const { mobile, method }: OTPResendRequest = validationResult.data;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Resend OTP using enhanced service
    const sellerService = getSellerRegistrationService();
    const result = await sellerService.resendOTP(mobile, method, ipAddress);
    
    if (!result.success) {
      const statusCode = result.cooldownSeconds ? 429 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.cooldownSeconds ? 'RATE_LIMITED' : 'RESEND_FAILED',
          message: result.cooldownSeconds 
            ? `Please wait ${result.cooldownSeconds} seconds before requesting another OTP`
            : 'Failed to resend OTP',
          details: {
            cooldownSeconds: result.cooldownSeconds,
            attemptsRemaining: result.attemptsRemaining
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        sent: result.sent,
        expiresIn: result.expiresIn,
        attemptsRemaining: result.attemptsRemaining,
        method: result.method,
        deliveryStatus: 'sent'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('OTP resend error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to resend OTP',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/login
 * @desc Login seller with email/mobile and password
 * @access Public
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const loginData = {
      ...validationResult.data,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Login using auth service
    const result = await sellerAuthService.login(loginData);
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific auth errors
    if (error instanceof Error) {
      if (error.message.includes('RATE_LIMITED')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: error.message,
            details: { suggestion: 'Please wait before trying again' },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
      
      if (error.message.includes('ACCOUNT_LOCKED')) {
        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: error.message,
            details: { suggestion: 'Account temporarily locked due to multiple failed attempts' },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
      
      if (error.message.includes('INVALID_CREDENTIALS') || error.message.includes('ACCOUNT_INACTIVE')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid email/mobile or password',
            details: { suggestion: 'Please check your credentials or try account recovery' },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to login',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/refresh-token
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const validationResult = refreshTokenSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid refresh token data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const { refreshToken } = validationResult.data;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Refresh tokens using auth service
    const tokens = await sellerAuthService.refreshTokens(refreshToken, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Handle specific auth errors
    if (error instanceof Error) {
      if (error.message.includes('TOKEN_REUSE_DETECTED')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REUSE_DETECTED',
            message: 'Token reuse detected - all sessions revoked for security',
            details: { suggestion: 'Please login again' },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
      
      if (error.message.includes('REFRESH_TOKEN_EXPIRED') || error.message.includes('INVALID_REFRESH_TOKEN')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token expired or invalid',
            details: { suggestion: 'Please login again' },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to refresh token',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/logout
 * @desc Logout seller and revoke all tokens
 * @access Public
 */
router.post('/logout', async (req, res) => {
  try {
    const validationResult = logoutSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid logout data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const { refreshToken } = validationResult.data;
    
    // Logout using auth service
    await sellerAuthService.logout(refreshToken);
    
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails, we should return success for security
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route PUT /api/v1/seller-registration/profile
 * @desc Update seller profile section (progressive completion)
 * @access Private (requires authentication)
 */
router.put('/profile', async (req, res) => {
  try {
    const validationResult = profileUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile update data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
    
    const { section, data, partialSave }: ProfileUpdateRequest & { partialSave: boolean } = validationResult.data;
    
    // TODO: Implement profile update service
    // const result = await profileService.updateSection(sellerId, section, data, partialSave);
    
    res.json({
      success: true,
      data: {
        updated: true,
        completionStatus: {
          basicInfo: true,
          businessDetails: section === 'business',
          addressInfo: section === 'address',
          taxCompliance: section === 'tax',
          bankDetails: section === 'bank',
          documentVerification: false,
          overallProgress: 25,
          requiredSections: ['business', 'tax', 'bank'],
          optionalSections: ['address'],
          unlockedFeatures: section === 'bank' ? ['payout_processing'] : [],
          nextSteps: ['Complete remaining profile sections', 'Upload required documents']
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update profile',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * @route GET /api/v1/seller-registration/profile/status
 * @desc Get profile completion status with SLA timelines
 * @access Private (requires authentication)
 */
router.get('/profile/status', async (req, res) => {
  try {
    // TODO: Implement profile status service
    // const status = await profileService.getCompletionStatus(sellerId);
    
    res.json({
      success: true,
      data: {
        progress: {
          basicInfo: true,
          businessDetails: false,
          addressInfo: false,
          taxCompliance: false,
          bankDetails: false,
          documentVerification: false,
          overallProgress: 16.67, // 1/6 sections complete
          requiredSections: ['business', 'tax', 'bank', 'documents'],
          optionalSections: ['address'],
          unlockedFeatures: [],
          nextSteps: [
            'Complete business details',
            'Add tax compliance information',
            'Verify bank account details',
            'Upload required documents'
          ]
        },
        slaTimelines: {
          documentReview: '48 hours',
          supportResponse: '24 hours',
          payoutSetup: '24 hours',
          currentProcessingTime: '36 hours',
          queuePosition: 15
        },
        productListingEligible: false,
        payoutEligible: false
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Profile status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get profile status',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

export default router;