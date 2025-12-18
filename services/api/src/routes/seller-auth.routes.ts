import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sellerService } from '../services/seller.service';
import { asyncHandler } from '../middleware';
import { authRateLimit } from '../middleware/rateLimiting.middleware';
import { validate, sanitizeInput } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';

const router = Router();

// Validation schemas
const sellerLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  captcha: z.string().min(1, 'CAPTCHA is required'),
});

const sendOTPSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format'),
});

const verifyOTPSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * @route POST /api/v1/seller-auth/login
 * @desc Seller login with email, password, OTP, and CAPTCHA
 * @access Public
 */
router.post(
  '/login',
  sanitizeInput,
  authRateLimit,
  validate({
    body: [
      { field: 'email', required: true, type: 'email' },
      { field: 'password', required: true, type: 'string', minLength: 6 },
      { field: 'captcha', required: true, type: 'string', minLength: 1 },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, captcha } = req.body;

    // Verify CAPTCHA first
    const captchaValid = await sellerService.verifyCaptcha(captcha);
    if (!captchaValid) {
      throw new AppError('Invalid CAPTCHA', 400, 'INVALID_CAPTCHA');
    }

    // Authenticate seller
    const result = await sellerService.authenticateSeller(email, password);

    if (!result.seller) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if seller is approved
    if (result.seller.status !== 'approved') {
      throw new AppError(
        `Account ${result.seller.status}. Please contact admin for assistance.`,
        403,
        'ACCOUNT_NOT_APPROVED'
      );
    }

    // Send OTP for two-factor authentication
    await sellerService.sendSellerOTP(result.seller.mobile);

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent to registered mobile number',
        sellerId: result.seller.id,
        requiresOTP: true,
        expiresIn: 300, // 5 minutes
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-auth/verify-otp
 * @desc Verify OTP and complete seller login
 * @access Public
 */
router.post(
  '/verify-otp',
  sanitizeInput,
  authRateLimit,
  validate({
    body: [
      { field: 'sellerId', required: true, type: 'string' },
      { field: 'otp', required: true, type: 'string', pattern: /^\d{6}$/ },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sellerId, otp } = req.body;

    const result = await sellerService.verifySellerOTP(sellerId, otp);

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: result.seller.id,
          fullName: result.seller.fullName,
          email: result.seller.email,
          mobile: result.seller.mobile,
          businessName: result.seller.businessName,
          sellerType: result.seller.sellerType,
          status: result.seller.status,
        },
        tokens: result.tokens,
        portalAccess: true,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-auth/forgot-password
 * @desc Send password reset OTP to seller email
 * @access Public
 */
router.post(
  '/forgot-password',
  sanitizeInput,
  authRateLimit,
  validate({
    body: [
      { field: 'email', required: true, type: 'email' },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await sellerService.sendPasswordResetOTP(email);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset OTP sent to your email',
        expiresIn: 300, // 5 minutes
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-auth/reset-password
 * @desc Reset seller password with OTP
 * @access Public
 */
router.post(
  '/reset-password',
  sanitizeInput,
  authRateLimit,
  validate({
    body: [
      { field: 'email', required: true, type: 'email' },
      { field: 'otp', required: true, type: 'string', pattern: /^\d{6}$/ },
      { field: 'newPassword', required: true, type: 'string', minLength: 6 },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    await sellerService.resetSellerPassword(email, otp, newPassword);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully. Please login with your new password.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-auth/refresh-token
 * @desc Refresh seller access token
 * @access Public
 */
router.post(
  '/refresh-token',
  sanitizeInput,
  validate({
    body: [
      { field: 'refreshToken', required: true, type: 'string', minLength: 1 }
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const tokens = await sellerService.refreshSellerToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        tokens,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-auth/logout
 * @desc Logout seller
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await sellerService.logoutSeller(refreshToken);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-auth/me
 * @desc Get current seller profile
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const seller = await sellerService.getSellerById(sellerId);

    if (!seller) {
      throw new AppError('Seller not found', 404, 'SELLER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          fullName: seller.fullName,
          email: seller.email,
          mobile: seller.mobile,
          businessName: seller.businessName,
          sellerType: seller.sellerType,
          status: seller.status,
          registeredBusinessAddress: seller.registeredBusinessAddress,
          warehouseAddresses: seller.warehouseAddresses,
          businessDetails: {
            businessType: seller.businessType,
            natureOfBusiness: seller.natureOfBusiness,
            yearOfEstablishment: seller.yearOfEstablishment,
            primaryProductCategories: seller.primaryProductCategories,
          },
          createdAt: seller.createdAt,
          approvedAt: seller.approvedAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-auth/captcha
 * @desc Generate CAPTCHA for seller login
 * @access Public
 */
router.get(
  '/captcha',
  asyncHandler(async (req: Request, res: Response) => {
    const captcha = await sellerService.generateCaptcha();

    res.status(200).json({
      success: true,
      data: captcha,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

export default router;