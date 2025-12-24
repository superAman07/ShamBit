import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest, validate, sanitizeInput } from '../middleware/validation';
import { authenticate } from '../middleware/auth.middleware';
import {
  RegisterRequest,
  SendOTPRequest,
  VerifyOTPRequest,
  RefreshTokenRequest,
} from '../types/auth.types';

const router = Router();
const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format'),
  acceptedTerms: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
});

const sendOTPSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format'),
});

const verifyOTPSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Register new user
 * POST /api/v1/auth/register
 */
router.post(
  '/register',
  sanitizeInput,
  authRateLimiter,
  validate({
    body: [
      { field: 'mobileNumber', required: true, type: 'phone' },
      { field: 'acceptedTerms', required: true, type: 'boolean', custom: (val: any) => val === true || 'You must accept terms and conditions' }
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { mobileNumber, acceptedTerms } = req.body as RegisterRequest;

    await authService.register(mobileNumber, acceptedTerms);

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully. Please verify to complete registration',
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
 * Send OTP for login
 * POST /api/v1/auth/send-otp
 */
router.post(
  '/send-otp',
  sanitizeInput,
  authRateLimiter,
  validate({
    body: [
      { field: 'mobileNumber', required: true, type: 'phone' }
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { mobileNumber } = req.body as SendOTPRequest;

    await authService.sendOTP(mobileNumber);

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully',
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
 * Verify OTP and login/register
 * POST /api/v1/auth/verify-otp
 */
router.post(
  '/verify-otp',
  sanitizeInput,
  authRateLimiter,
  validate({
    body: [
      { field: 'mobileNumber', required: true, type: 'phone' },
      { field: 'otp', required: true, type: 'string', pattern: /^\d{6}$/ }
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { mobileNumber, otp } = req.body as VerifyOTPRequest;

    const result = await authService.verifyOTP(mobileNumber, otp);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          mobileNumber: result.user.mobileNumber,
          name: result.user.name,
          email: result.user.email,
          isActive: result.user.isActive,
        },
        tokens: result.tokens,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
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
    const { refreshToken } = req.body as RefreshTokenRequest;

    const tokens = await authService.refreshAccessToken(refreshToken);

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
 * Logout user
 * POST /api/v1/auth/logout
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (refreshToken) {
      await authService.logout(refreshToken);
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
 * Delete user account
 * DELETE /api/v1/auth/account
 */
router.delete(
  '/account',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;

    await authService.deleteAccount(userId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const userService = new (await import('../services/user.service')).UserService();
    const user = await userService.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          mobileNumber: user.mobileNumber,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

export default router;
