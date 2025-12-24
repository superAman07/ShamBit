import { Router } from 'express';
import { otpService } from '../services';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getConfig } from '@shambit/config';
import { getDatabase } from '@shambit/database';
import { SellerRegistrationService } from '@shambit/database';
import { 
  registrationLimiter, 
  otpVerificationLimiter, 
  loginLimiter, 
  enforceHTTPS,
  trackOTPAttempts,
  recordFailedOTPAttempt,
  clearOTPAttempts,
  trackLoginAttempts,
  recordFailedLoginAttempt,
  clearLoginAttempts
} from '../middleware/security';
import { 
  validateRequest, 
  sanitizeInput,
  registrationSchema,
  otpVerificationSchema,
  loginSchema,
  profileCompletionSchema,
  logoutSchema,
  refreshTokenSchema
} from '../middleware/validation';

// Import password reset schemas separately to avoid potential import issues
import { 
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetOtpSchema
} from '../middleware/validation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { maskMobile, maskEmail } from '../utils/security';
import { generateTokens, revokeSession, revokeAllSessions, refreshAccessToken, getCurrentSessionFromToken } from '../utils/jwt';
import { errorResponse, successResponse } from '../utils/response';
import { 
  SELLER_STATUS, 
  VERIFICATION_STATUS, 
  SELLER_TYPE, 
  ERROR_CODES, 
  SUCCESS_MESSAGES, 
  NEXT_STEPS 
} from '../constants/seller';

const router = Router();
const config = getConfig();

// Lazy-loaded services to avoid database initialization issues
let registrationService: SellerRegistrationService | null = null;
const getRegistrationService = () => {
  if (!registrationService) {
    const db = getDatabase();
    registrationService = new SellerRegistrationService(db, otpService);
  }
  return registrationService;
};

// Verify JWT secrets exist at startup
if (!config.JWT_SECRET || !config.JWT_REFRESH_SECRET) {
  console.error('CRITICAL: JWT secrets not configured');
  process.exit(1);
}

// Step 1: Initiate seller registration and send OTP
router.post('/seller-registration/register', 
  enforceHTTPS,
  registrationLimiter,
  sanitizeInput,
  validateRequest(registrationSchema),
  async (req, res) => {
    try {
      const { fullName, mobile, email, password } = req.body;
      const ipAddress = req.ip || 'unknown';
      
      // Use the secure registration service
      const result = await getRegistrationService().registerSeller({
        fullName,
        mobile,
        email,
        password,
        deviceFingerprint: req.get('X-Device-Fingerprint') // Optional device fingerprinting
      }, ipAddress);
      
      return successResponse(res, {
        message: SUCCESS_MESSAGES.REGISTRATION_INITIATED,
        sessionId: result.data.sessionId,
        mobile: maskMobile(mobile),
        otpSent: result.data.otpSent,
        expiresIn: result.data.expiresIn,
        riskLevel: result.data.riskAssessment?.riskLevel || 'low', // Only expose risk level, not internal flags
        nextStep: NEXT_STEPS.VERIFY_OTP
      }, 201);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'DUPLICATE_ACCOUNT') {
        return errorResponse(res, 409, ERROR_CODES.SELLER_EXISTS, error.message, error.details);
      }
      
      if (error.code === 'HIGH_RISK_REGISTRATION') {
        return errorResponse(res, 403, ERROR_CODES.HIGH_RISK_REGISTRATION, error.message, error.details);
      }
      
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Registration failed');
    }
  }
);

// Step 2: Verify OTP and complete seller registration
router.post('/seller-registration/verify-otp',
  enforceHTTPS,
  otpVerificationLimiter,
  sanitizeInput,
  validateRequest(otpVerificationSchema),
  async (req, res) => {
    try {
      const { sessionId, otp } = req.body;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Session-scoped OTP attempt tracking
      const attemptCheck = trackOTPAttempts(sessionId);
      if (!attemptCheck.allowed) {
        // Auto-invalidate session after too many failed attempts
        await getRegistrationService().cleanupExpiredRecords(); // This will clean up the session
        return errorResponse(res, 429, ERROR_CODES.TOO_MANY_ATTEMPTS, 'Too many failed OTP attempts. Registration session invalidated.');
      }
      
      // Create a simple auth service interface for token generation
      const authService = {
        generateTokenPair: async (seller: any, ip?: string, ua?: string) => {
          const tokens = await generateTokens({
            sellerId: seller.id,
            email: seller.email,
            type: 'seller'
          }, ip, ua);
          
          if (!tokens) {
            throw new Error('Token generation failed');
          }
          
          return tokens;
        }
      };
      
      // Use the secure registration service
      const result = await getRegistrationService().verifyRegistrationOTP(
        sessionId,
        otp,
        ipAddress,
        userAgent,
        authService
      );
      
      if (!result.success || !result.verified) {
        // Record failed attempt for session-scoped tracking
        recordFailedOTPAttempt(sessionId);
        return errorResponse(res, 400, ERROR_CODES.INVALID_OTP, result.error || 'OTP verification failed');
      }
      
      // Clear failed attempts on successful verification
      clearOTPAttempts(sessionId);
      
      // Return success response with tokens and seller info
      return successResponse(res, {
        message: 'Registration completed successfully! Please complete your profile to start selling.',
        verified: true,
        tokens: result.tokens,
        sessionId: result.tokens?.refreshToken ? 'generated' : undefined, // Don't expose actual session ID
        seller: {
          id: result.seller!.id,
          fullName: result.seller!.fullName,
          email: result.seller!.email,
          mobile: maskMobile(result.seller!.mobile),
          mobileVerified: result.seller!.mobileVerified,
          status: result.seller!.status,
          verificationStatus: result.seller!.verificationStatus,
          nextStep: 'complete-profile'
        }
      });
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'OTP verification failed');
    }
  }
);

// Resend OTP route
router.post('/seller-registration/resend-otp',
  enforceHTTPS,
  otpVerificationLimiter,
  sanitizeInput,
  async (req, res) => {
    try {
      const { sessionId, method = 'sms' } = req.body;
      const ipAddress = req.ip || 'unknown';
      
      if (!sessionId) {
        return errorResponse(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Session ID is required');
      }
      
      // Use the secure registration service
      const result = await getRegistrationService().resendOTP(sessionId, method, ipAddress);
      
      if (!result.success) {
        return errorResponse(res, 400, ERROR_CODES.OTP_SEND_FAILED, 'Failed to resend OTP');
      }
      
      return successResponse(res, {
        message: 'OTP resent successfully',
        sent: result.sent,
        expiresIn: result.expiresIn,
        attemptsRemaining: result.attemptsRemaining,
        cooldownSeconds: result.cooldownSeconds,
        method: result.method
      });
      
    } catch (error: any) {
      console.error('OTP resend error:', error);
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to resend OTP');
    }
  }
);

// Simple seller login route
// TODO: Extract to centralized AuthService for consistency with SellerRegistrationService
// Currently bypasses SellerRegistrationService - should be unified in future refactor
router.post('/seller-registration/login',
  enforceHTTPS,
  loginLimiter,
  sanitizeInput,
  validateRequest(loginSchema),
  async (req, res) => {
    const db = getDatabase();
    
    try {
      const { identifier, password } = req.body; // Changed from email to identifier to support both email and mobile
      
      // Create identifiers for multi-layer brute force protection
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Check login attempt limits across multiple layers
      const attemptCheck = trackLoginAttempts(identifier, clientIP, userAgent);
      if (!attemptCheck.allowed) {
        return errorResponse(res, 429, ERROR_CODES.TOO_MANY_ATTEMPTS, 'Too many failed login attempts. Please try again later.');
      }
      
      // Find seller by email or mobile with all required fields
      const db = getDatabase();
      const isEmail = identifier.includes('@');
      const field = isEmail ? 'email' : 'mobile';
      
      const seller = await db('sellers')
        .where(field, identifier)
        .first();
      
      if (!seller) {
        recordFailedLoginAttempt(identifier, clientIP, userAgent);
        return errorResponse(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/mobile or password');
      }
      
      // Check if seller is suspended
      if (seller.status === 'suspended') {
        return errorResponse(res, 403, ERROR_CODES.ACCOUNT_SUSPENDED, 'Account has been suspended. Please contact support.');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, seller.password_hash);
      
      if (!isPasswordValid) {
        recordFailedLoginAttempt(identifier, clientIP, userAgent);
        return errorResponse(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/mobile or password');
      }
      
      // Clear failed attempts on successful login
      clearLoginAttempts(identifier, clientIP, userAgent);
      
      // Update last login timestamp
      await db('sellers')
        .where('id', seller.id)
        .update({ 
          last_login_at: new Date(),
          updated_at: new Date()
        });
      
      // Generate JWT tokens
      const tokens = await generateTokens({
        sellerId: seller.id, 
        email: seller.email,
        type: 'seller'
      }, req.ip, req.get('User-Agent'));
      
      if (!tokens) {
        return errorResponse(res, 503, ERROR_CODES.TOKEN_GENERATION_FAILED, 'Login failed. Please try again.');
      }

      // Use the database field for profile completion status
      const profileComplete = seller.profile_completed;
      
      // Return success response with tokens and seller info
      return successResponse(res, {
        message: 'Login successful',
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        },
        sessionId: tokens.sessionId,
        seller: {
          id: seller.id,
          fullName: seller.full_name,
          email: seller.email,
          mobile: maskMobile(seller.mobile),
          mobileVerified: seller.mobile_verified,
          emailVerified: seller.email_verified,
          status: seller.status,
          verificationStatus: seller.overall_verification_status,
          profileComplete: profileComplete,
          canListProducts: seller.overall_verification_status === VERIFICATION_STATUS.APPROVED,
          payoutEnabled: seller.overall_verification_status === VERIFICATION_STATUS.APPROVED,
          nextStep: profileComplete ? 'dashboard' : 'complete-profile'
        }
      });
      
    } catch (error) {
      console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Login failed');
    }
  }
);

// Complete seller profile route
router.post('/seller-registration/complete-profile',
  enforceHTTPS,
  sanitizeInput,
  authenticateToken,
  validateRequest(profileCompletionSchema),
  async (req: AuthenticatedRequest, res) => {
    const db = getDatabase();
    
    try {
      const sellerId = req.seller!.id;
      const { 
        dateOfBirth, 
        gender, 
        panNumber, 
        panHolderName,
        businessAddress,
        primaryProductCategories 
      } = req.body;
      
      // Use transaction for atomic update
      const [updatedSeller] = await db.transaction(async (trx) => {
        // Verify seller exists and is in correct state
        const currentSeller = await trx('sellers')
          .where('id', sellerId)
          .first();
          
        if (!currentSeller) {
          throw new Error(ERROR_CODES.SELLER_NOT_FOUND);
        }
        
        // Update seller profile with business details
        return await trx('sellers')
          .where('id', sellerId)
          .update({
            date_of_birth: dateOfBirth,
            gender: gender,
            pan_number: panNumber,
            pan_holder_name: panHolderName,
            registered_business_address: JSON.stringify(businessAddress),
            primary_product_categories: primaryProductCategories,
            profile_completed: true,
            overall_verification_status: 'in_review',
            updated_at: new Date()
          })
          .returning(['id', 'full_name', 'email', 'overall_verification_status'])
          .then(rows => rows[0]);
      });
      
      // Return success response
      return successResponse(res, {
        message: 'Profile completed successfully! Your account is now under review.',
        seller: {
          id: updatedSeller.id,
          fullName: updatedSeller.full_name,
          email: updatedSeller.email,
          verificationStatus: updatedSeller.overall_verification_status,
          profileComplete: updatedSeller.profile_completed,
          nextStep: 'wait-for-approval'
        }
      });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === ERROR_CODES.SELLER_NOT_FOUND) {
          return errorResponse(res, 404, ERROR_CODES.SELLER_NOT_FOUND, 'Seller account not found');
        }
        
        if (error.message === ERROR_CODES.PROFILE_ALREADY_COMPLETED) {
          return errorResponse(res, 400, ERROR_CODES.PROFILE_ALREADY_COMPLETED, 'Profile has already been completed');
        }
      }
      
      console.error('Profile completion error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Profile completion failed');
    }
  }
);

// Logout route - revoke refresh token (secure version)
router.post('/seller-registration/logout',
  enforceHTTPS,
  authenticateToken,
  sanitizeInput,
  validateRequest(logoutSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { refreshToken, logoutFromAllDevices } = req.body;
      const sellerId = req.seller!.id;
      
      let success = false;
      
      if (logoutFromAllDevices) {
        // Logout from all devices
        success = await revokeAllSessions(sellerId);
        
        if (success) {
          return successResponse(res, {
            message: 'Successfully logged out from all devices',
            loggedOutFromAllDevices: true
          });
        }
      } else if (refreshToken) {
        // Secure logout: Get sessionId from refresh token, don't trust client
        const sessionId = await getCurrentSessionFromToken(refreshToken);
        
        if (!sessionId) {
          return errorResponse(res, 400, ERROR_CODES.INVALID_TOKEN, 'Invalid refresh token');
        }
        
        // Verify session belongs to authenticated user
        const db = getDatabase();
        const session = await db('seller_sessions')
          .where('id', sessionId)
          .where('seller_id', sellerId)
          .where('revoked', false)
          .first();
          
        if (!session) {
          return errorResponse(res, 403, ERROR_CODES.UNAUTHORIZED, 'Session does not belong to authenticated user');
        }
        
        success = await revokeSession(sessionId);
        
        if (success) {
          return successResponse(res, {
            message: 'Successfully logged out',
            sessionId
          });
        }
      } else {
        return errorResponse(res, 400, ERROR_CODES.VALIDATION_ERROR, 'refreshToken is required for secure logout');
      }
      
      if (!success) {
        return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Logout failed');
      }
      
    } catch (error) {
      console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Logout failed');
    }
  }
);

// Refresh token route - get new access token
router.post('/seller-registration/refresh-token',
  enforceHTTPS,
  sanitizeInput,
  validateRequest(refreshTokenSchema),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return errorResponse(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Refresh token is required');
      }
      
      // Get client info for session tracking
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Refresh tokens (with rotation)
      const newTokens = await refreshAccessToken(refreshToken, clientIP, userAgent);
      
      if (!newTokens) {
        return errorResponse(res, 401, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token');
      }
      
      return successResponse(res, {
        message: 'Tokens refreshed successfully',
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken
        },
        sessionId: newTokens.sessionId
      });
      
    } catch (error) {
      console.error('Token refresh error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Token refresh failed');
    }
  }
);

// Get active sessions route
router.get('/seller-registration/sessions',
  enforceHTTPS,
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const db = getDatabase();
    
    try {
      const sellerId = req.seller!.id;
      
      const sessions = await db('seller_sessions')
        .select('id', 'created_at', 'expires_at', 'ip_address', 'user_agent')
        .where('seller_id', sellerId)
        .where('revoked', false)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc');
      
      return successResponse(res, {
        sessions: sessions.map(session => ({
          id: session.id,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          isCurrent: false // TODO: Determine current session
        }))
      });
      
    } catch (error) {
      console.error('Sessions fetch error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to fetch sessions');
    }
  }
);

// Forgot password route - send password reset instructions via email or SMS
router.post('/seller-registration/forgot-password',
  enforceHTTPS,
  registrationLimiter, // Reuse registration limiter for security
  sanitizeInput,
  validateRequest(forgotPasswordSchema),
  async (req, res) => {
    const db = getDatabase();
    
    try {
      const { identifier } = req.body;
      
      // Find seller by email or mobile
      const seller = await db('sellers')
        .where('email', identifier)
        .orWhere('mobile', identifier)
        .first();
      
      // Always return success to prevent account enumeration (security best practice)
      const successResponseData = {
        message: 'If an account exists with this email/mobile, you will receive reset instructions shortly.',
        method: identifier.includes('@') ? 'email' : 'sms'
      };
      
      if (!seller) {
        // Return success even if seller doesn't exist (security)
        return successResponse(res, successResponseData);
      }
      
      if (identifier.includes('@')) {
        // Email-based reset: Generate JWT token for email reset link
        const resetToken = jwt.sign(
          { 
            sub: seller.id,
            type: 'password_reset',
            identifier: identifier
          },
          config.JWT_SECRET,
          { expiresIn: '15m' } // 15 minutes expiry
        );
        
        // Hash the token before storing (security best practice)
        const tokenHash = await bcrypt.hash(resetToken, 12);
        
        // Store hashed reset token in database with expiry (one per seller)
        await db.transaction(async (trx) => {
          // Delete any existing reset tokens for this seller
          await trx('password_reset_tokens')
            .where('seller_id', seller.id)
            .delete();
          
          // Insert new hashed token
          await trx('password_reset_tokens').insert({
            seller_id: seller.id,
            token_hash: tokenHash,
            identifier: identifier,
            expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            created_at: new Date()
          });
        });
        
        // TODO: Send email reset link
        console.log(`Password reset email would be sent to: ${identifier}`);
        console.log(`Reset token: ${resetToken}`);
      } else {
        // Mobile-based reset: Send OTP via SMS
        const otpResult = await otpService.generateAndSendOTP(identifier, 'password_reset');
        
        if (!otpResult.success) {
          console.error('Failed to send password reset OTP:', otpResult.error);
          // Still return success for security
        }
      }
      
      return successResponse(res, successResponseData);
      
    } catch (error) {
      console.error('Forgot password error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to process password reset request');
    }
  }
);

// Reset password using email token
router.post('/seller-registration/reset-password',
  enforceHTTPS,
  registrationLimiter, // Reuse registration limiter for security
  sanitizeInput,
  validateRequest(resetPasswordSchema),
  async (req, res) => {
    const db = getDatabase();
    
    try {
      const { token, newPassword } = req.body;
      
      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, config.JWT_SECRET) as any;
      } catch (error) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired reset token');
      }
      
      if (decoded.type !== 'password_reset') {
        return errorResponse(res, 400, ERROR_CODES.INVALID_TOKEN, 'Invalid token type');
      }
      
      // Check if token exists in database and is not used
      const resetRecords = await db('password_reset_tokens')
        .where('seller_id', decoded.sub)
        .where('expires_at', '>', new Date())
        .whereNull('used_at');
      
      // Verify the token hash matches one of the stored hashes
      let validRecord = null;
      for (const record of resetRecords) {
        const isValidHash = await bcrypt.compare(token, record.token_hash);
        if (isValidHash) {
          validRecord = record;
          break;
        }
      }
      
      if (!validRecord) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired reset token');
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      // Update seller password and mark token as used
      await db.transaction(async (trx) => {
        await trx('sellers')
          .where('id', decoded.sub)
          .update({
            password_hash: passwordHash,
            updated_at: new Date()
          });
        
        await trx('password_reset_tokens')
          .where('id', validRecord.id)
          .update({
            used_at: new Date()
          });
      });
      
      return successResponse(res, {
        message: 'Password reset successful. You can now login with your new password.'
      });
      
    } catch (error) {
      console.error('Reset password error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to reset password');
    }
  }
);

// Verify OTP and reset password for mobile-based reset
router.post('/seller-registration/verify-reset-otp',
  enforceHTTPS,
  otpVerificationLimiter,
  sanitizeInput,
  validateRequest(verifyResetOtpSchema),
  async (req, res) => {
    const db = getDatabase();
    
    try {
      const { identifier, otp, newPassword } = req.body;
      
      // Verify OTP
      const otpResult = await otpService.verifyOTP({
        mobile: identifier,
        otp,
        purpose: 'password_reset',
        ipAddress: req.ip
      });
      
      if (!otpResult.verified) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_OTP, otpResult.error || 'Invalid or expired OTP');
      }
      
      // Find seller by mobile
      const seller = await db('sellers')
        .where('mobile', identifier)
        .first();
      
      if (!seller) {
        return errorResponse(res, 404, ERROR_CODES.SELLER_NOT_FOUND, 'Seller not found');
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      // Update seller password and clean up any reset tokens
      await db.transaction(async (trx) => {
        await trx('sellers')
          .where('id', seller.id)
          .update({
            password_hash: passwordHash,
            updated_at: new Date()
          });
        
        // Mark any existing reset tokens as used
        await trx('password_reset_tokens')
          .where('seller_id', seller.id)
          .whereNull('used_at')
          .update({
            used_at: new Date()
          });
      });
      
      return successResponse(res, {
        message: 'Password reset successful. You can now login with your new password.'
      });
      
    } catch (error) {
      console.error('Verify reset OTP error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to reset password');
    }
  }
);

// Test route
router.get('/test', (req, res) => {
  return successResponse(res, {
    message: 'Simple routes working!',
    timestamp: new Date().toISOString()
  });
});

export default router;