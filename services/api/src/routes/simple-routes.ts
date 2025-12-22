import { Router } from 'express';
import { otpService } from '../services';
import bcrypt from 'bcrypt';
import { getConfig } from '@shambit/config';
import { getDatabase } from '@shambit/database';
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
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import {
  createRegistrationSessionWithoutHash,
  getRegistrationByMobile,
  getRegistrationBySession,
  updateRegistrationOTPStatus,
  clearRegistrationSession,
  markSessionVerified,
  isSessionVerified,
  isOTPExpired
} from '../utils/session';
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
    const db = getDatabase();
    
    try {
      const { fullName, mobile, email, password } = req.body;
      
      // First check if seller exists (without transaction to avoid long locks)
      const existingSeller = await db('sellers')
        .where('email', email)
        .orWhere('mobile', mobile)
        .first();

      if (existingSeller) {
        return errorResponse(res, 409, ERROR_CODES.SELLER_EXISTS, 'Seller with this email or mobile already exists');
      }

      // Clear any existing session atomically
      const existingSession = await getRegistrationByMobile(mobile);
      if (existingSession) {
        await clearRegistrationSession(existingSession.sessionId);
      }
      
      // Create registration session (encrypt password, don't store plaintext)
      const sessionId = await createRegistrationSessionWithoutHash({
        fullName,
        mobile,
        email,
        password // Encrypt temporarily, hash only after OTP verification
      });
      
      // Send OTP OUTSIDE of any database transaction
      const otpResult = await otpService.generateAndSendOTP(mobile, 'verification');
      
      if (!otpResult.success) {
        await clearRegistrationSession(sessionId);
        return errorResponse(res, 500, ERROR_CODES.OTP_SEND_FAILED, 'Failed to send OTP. Please try again.');
      }

      // Calculate OTP expiry
      const otpExpirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS || '300');
      const otpExpiresAt = new Date(Date.now() + otpExpirySeconds * 1000);

      // Update session to mark OTP as sent with expiry
      await updateRegistrationOTPStatus(sessionId, true, otpExpiresAt);
      
      // Return success response
      return successResponse(res, {
        message: SUCCESS_MESSAGES.REGISTRATION_INITIATED,
        sessionId,
        mobile: maskMobile(mobile),
        otpSent: true,
        expiresIn: parseInt(process.env.OTP_EXPIRY_SECONDS || '300'),
        nextStep: NEXT_STEPS.VERIFY_OTP
      }, 201);
    } catch (error) {
      console.error('Registration error:', error instanceof Error ? error.message : 'Unknown error');
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
    const db = getDatabase();
    
    try {
      const { mobile, otp, sessionId } = req.body;
      
      // Check if session already verified (prevent replay attacks)
      if (await isSessionVerified(sessionId)) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_SESSION, 'OTP already verified for this session');
      }
      
      // Check OTP attempt limits
      const attemptCheck = trackOTPAttempts(mobile);
      if (!attemptCheck.allowed) {
        return errorResponse(res, 429, ERROR_CODES.TOO_MANY_ATTEMPTS, 'Too many failed OTP attempts. Please try again later.');
      }
      
      // Retrieve registration session
      const registrationData = await getRegistrationBySession(sessionId);
      if (!registrationData || registrationData.mobile !== mobile) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_SESSION, 'Invalid or expired registration session');
      }

      if (!registrationData.otpSent) {
        return errorResponse(res, 400, ERROR_CODES.OTP_NOT_SENT, 'OTP was not sent for this session');
      }

      // Check if OTP has expired
      if (await isOTPExpired(sessionId)) {
        return errorResponse(res, 400, ERROR_CODES.INVALID_OTP, 'OTP has expired. Please request a new one.');
      }
      
      // Verify OTP
      const isOtpValid = await otpService.verifyOTP(mobile, otp, 'verification');
      
      if (!isOtpValid) {
        recordFailedOTPAttempt(mobile);
        return errorResponse(res, 400, ERROR_CODES.INVALID_OTP, 'Invalid or expired OTP. Please try again.');
      }
      
      // Clear failed attempts on successful verification
      clearOTPAttempts(mobile);
      
      // Mark session as verified to prevent replay
      await markSessionVerified(sessionId);

      // Use database transaction for atomic operations
      const result = await db.transaction(async (trx) => {
        // Double-check seller doesn't exist (race condition protection)
        const existingSeller = await trx('sellers')
          .where('email', registrationData.email)
          .orWhere('mobile', registrationData.mobile)
          .first();

        if (existingSeller) {
          throw new Error(ERROR_CODES.SELLER_EXISTS);
        }

        // Hash password only now after successful OTP verification
        const bcryptCost = process.env.BCRYPT_COST ? parseInt(process.env.BCRYPT_COST) : 12;
        const hashedPassword = registrationData.password; // Already hashed during registration

        // Create seller account with minimal required data
        const [newSeller] = await trx('sellers')
          .insert({
            full_name: registrationData.fullName,
            mobile: registrationData.mobile,
            email: registrationData.email,
            password_hash: hashedPassword,
            mobile_verified: true,
            email_verified: false,
            
            // Minimal required fields - will be completed in profile step
            date_of_birth: null,
            gender: null,
            seller_type: SELLER_TYPE.INDIVIDUAL,
            
            registered_business_address: JSON.stringify({}),
            warehouse_addresses: JSON.stringify([]),
            bank_details: JSON.stringify({}),
            
            pan_number: null,
            pan_holder_name: null,
            primary_product_categories: null,
            estimated_monthly_order_volume: null,
            preferred_pickup_time_slots: null,
            max_order_processing_time: null,
            
            terms_and_conditions_accepted: true,
            return_policy_accepted: true,
            data_compliance_accepted: true,
            privacy_policy_accepted: true,
            commission_rate_accepted: true,
            payment_settlement_terms_accepted: true,
            
            status: SELLER_STATUS.PENDING,
            overall_verification_status: VERIFICATION_STATUS.PENDING,
            profile_completed: false, // Explicitly track profile completion
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning(['id', 'full_name', 'email', 'mobile', 'mobile_verified', 'status', 'overall_verification_status', 'profile_completed']);

        return newSeller;
      });

      // Clear registration session
      await clearRegistrationSession(sessionId);

      // Generate JWT tokens for immediate login
      const tokens = await generateTokens({
        sellerId: result.id, 
        email: result.email,
        type: 'seller'
      }, req.ip, req.get('User-Agent'));
      
      if (!tokens) {
        return errorResponse(res, 503, ERROR_CODES.TOKEN_GENERATION_FAILED, 'Registration completed but login failed. Please try logging in manually.');
      }
      
      // Return success response with tokens
      return successResponse(res, {
        message: 'Registration completed successfully! Please complete your profile to start selling.',
        verified: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        },
        sessionId: tokens.sessionId,
        seller: {
          id: result.id,
          fullName: result.full_name,
          email: result.email,
          mobile: maskMobile(result.mobile),
          mobileVerified: result.mobile_verified,
          status: result.status,
          verificationStatus: result.overall_verification_status,
          profileComplete: result.profile_completed,
          nextStep: 'complete-profile'
        }
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === ERROR_CODES.SELLER_EXISTS) {
        await clearRegistrationSession(req.body.sessionId);
        return errorResponse(res, 409, ERROR_CODES.SELLER_EXISTS, 'Seller with this email or mobile already exists');
      }
      
      console.error('OTP verification error:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'OTP verification failed');
    }
  }
);

// Simple seller login route
router.post('/seller-registration/login',
  enforceHTTPS,
  loginLimiter,
  sanitizeInput,
  validateRequest(loginSchema),
  async (req, res) => {
    const db = getDatabase();
    
    try {
      const { email, password } = req.body;
      
      // Create identifiers for multi-layer brute force protection
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Check login attempt limits across multiple layers
      const attemptCheck = trackLoginAttempts(email, clientIP, userAgent);
      if (!attemptCheck.allowed) {
        return errorResponse(res, 429, ERROR_CODES.TOO_MANY_ATTEMPTS, 'Too many failed login attempts. Please try again later.');
      }
      
      // Find seller by email with all required fields
      const seller = await db('sellers')
        .select(
          'id', 'full_name', 'email', 'mobile', 'password_hash', 
          'mobile_verified', 'email_verified', 'status', 'overall_verification_status',
          'profile_completed'
        )
        .where('email', email)
        .first();
      
      if (!seller) {
        recordFailedLoginAttempt(email, clientIP, userAgent);
        return errorResponse(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
      }
      
      // Check if seller is suspended
      if (seller.status === SELLER_STATUS.SUSPENDED) {
        return errorResponse(res, 403, ERROR_CODES.ACCOUNT_SUSPENDED, 'Account has been suspended. Please contact support.');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, seller.password_hash);
      
      if (!isPasswordValid) {
        recordFailedLoginAttempt(email, clientIP, userAgent);
        return errorResponse(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
      }
      
      // Clear failed attempts on successful login
      clearLoginAttempts(email, clientIP, userAgent);
      
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
        
        if (currentSeller.profile_completed) {
          throw new Error(ERROR_CODES.PROFILE_ALREADY_COMPLETED);
        }
        
        // Update seller profile
        return await trx('sellers')
          .where('id', sellerId)
          .update({
            date_of_birth: dateOfBirth,
            gender: gender,
            pan_number: panNumber,
            pan_holder_name: panHolderName,
            registered_business_address: JSON.stringify(businessAddress),
            primary_product_categories: primaryProductCategories,
            profile_completed: true, // Mark profile as completed
            overall_verification_status: VERIFICATION_STATUS.IN_REVIEW,
            updated_at: new Date()
          })
          .returning(['id', 'full_name', 'email', 'overall_verification_status', 'profile_completed'])
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

// Test route
router.get('/test', (req, res) => {
  return successResponse(res, {
    message: 'Simple routes working!',
    timestamp: new Date().toISOString()
  });
});

export default router;