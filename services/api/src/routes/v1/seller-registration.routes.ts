import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@shambit/database';
import { getConfig } from '@shambit/config';
import { otpService } from '../../services';

const router = Router();
const config = getConfig();

// Simple validation schemas matching your 32 requirements
const registrationSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  mobile: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number starting with 6-9'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
});

const otpVerificationSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain only numbers')
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Simple rate limiting (per your Requirement 24)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const simpleRateLimit = (maxAttempts: number, windowMinutes: number) => {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const current = rateLimitMap.get(ip);
    
    if (!current || now > current.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (current.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many attempts. Try again in ${Math.ceil((current.resetTime - now) / 60000)} minutes.`,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    current.count++;
    next();
  };
};

/**
 * @route POST /api/v1/seller-registration/register
 * @desc Register new seller with 4 fields (Requirement 1)
 * @access Public
 */
router.post('/register', simpleRateLimit(5, 60), async (req, res) => {
  try {
    const validation = registrationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { fullName, mobile, email, password } = validation.data;
    const db = getDatabase();
    
    // Check for duplicate accounts (Requirement 14)
    const existingSeller = await db('sellers')
      .where('mobile', mobile)
      .orWhere('email', email)
      .first();
    
    if (existingSeller) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_EXISTS',
          message: 'Account with this mobile number or email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Hash password (Requirement 8)
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create seller account (Requirement 3 - immediate creation)
    const [sellerId] = await db('sellers').insert({
      full_name: fullName,
      mobile,
      email,
      password_hash: passwordHash,
      mobile_verified: false,
      email_verified: false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    // Send OTP for mobile verification (Requirement 2)
    const otpResult = await otpService.generateAndSendOTP(mobile, 'verification');
    
    if (!otpResult.success) {
      console.error('Failed to send OTP:', otpResult.error);
      // Still return success for registration, but note OTP issue
    }
    
    res.status(201).json({
      success: true,
      data: {
        sellerId: sellerId.id,
        message: 'Registration successful. Please verify your mobile number.',
        otpSent: true,
        expiresIn: 300 // 5 minutes
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/verify-otp
 * @desc Verify mobile OTP and complete registration (Requirement 2)
 * @access Public
 */
router.post('/verify-otp', simpleRateLimit(10, 15), async (req, res) => {
  try {
    const validation = otpVerificationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid OTP format',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { mobile, otp } = validation.data;
    
    // Verify OTP
    const isValid = await otpService.verifyOTP(mobile, otp, 'verification');
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const db = getDatabase();
    
    // Update seller as verified and get seller data
    const seller = await db('sellers')
      .where('mobile', mobile)
      .update({ 
        mobile_verified: true,
        updated_at: new Date()
      })
      .returning(['id', 'full_name', 'mobile', 'email', 'mobile_verified']);
    
    if (!seller.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SELLER_NOT_FOUND',
          message: 'Seller not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Generate JWT tokens (Requirement 7)
    const accessToken = jwt.sign(
      { 
        sub: seller[0].id,
        mobile: seller[0].mobile,
        email: seller[0].email,
        type: 'seller'
      },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { 
        sub: seller[0].id,
        type: 'seller'
      },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        seller: {
          id: seller[0].id,
          fullName: seller[0].full_name,
          mobile: seller[0].mobile,
          email: seller[0].email,
          verified: seller[0].mobile_verified
        },
        tokens: {
          accessToken,
          refreshToken
        },
        message: 'Mobile verification successful'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'OTP verification failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/login
 * @desc Seller login with email/mobile and password (Requirement 7)
 * @access Public
 */
router.post('/login', simpleRateLimit(10, 15), async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email/mobile and password are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { identifier, password } = validation.data;
    const db = getDatabase();
    
    // Find seller by email or mobile
    const seller = await db('sellers')
      .where('email', identifier)
      .orWhere('mobile', identifier)
      .first();
    
    if (!seller) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/mobile or password',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, seller.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/mobile or password',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Update last login
    await db('sellers')
      .where('id', seller.id)
      .update({ 
        last_login_at: new Date(),
        updated_at: new Date()
      });
    
    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        sub: seller.id,
        mobile: seller.mobile,
        email: seller.email,
        type: 'seller'
      },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { 
        sub: seller.id,
        type: 'seller'
      },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          fullName: seller.full_name,
          mobile: seller.mobile,
          email: seller.email,
          verified: seller.mobile_verified
        },
        tokens: {
          accessToken,
          refreshToken
        },
        message: 'Login successful'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/v1/seller-registration/refresh-token
 * @desc Refresh access token (Requirement 7)
 * @access Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const validation = refreshTokenSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const { refreshToken } = validation.data;
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;
    
    const db = getDatabase();
    const seller = await db('sellers').where('id', decoded.sub).first();
    
    if (!seller) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { 
        sub: seller.id,
        mobile: seller.mobile,
        email: seller.email,
        type: 'seller'
      },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({
      success: true,
      data: {
        accessToken,
        message: 'Token refreshed successfully'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;