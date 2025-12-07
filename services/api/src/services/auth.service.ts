import { createLogger, UnauthorizedError, BadRequestError } from '@shambit/shared';
import { UserService } from './user.service';
import { OTPService } from './otp.service';
import { SMSService } from './sms.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { validateMobileNumber, validateOTP } from '../utils/validation';
import { AuthTokens, User } from '../types/auth.types';

const logger = createLogger('auth-service');

/**
 * Authentication Service for handling user authentication
 */
export class AuthService {
  private userService = new UserService();
  private otpService = new OTPService();
  private smsService = new SMSService();

  /**
   * Register new user and send OTP
   */
  async register(mobileNumber: string, acceptedTerms: boolean): Promise<void> {
    // Validate mobile number
    validateMobileNumber(mobileNumber);

    // Check if terms are accepted
    if (!acceptedTerms) {
      throw new BadRequestError(
        'You must accept the Terms of Service and Privacy Policy',
        'TERMS_NOT_ACCEPTED'
      );
    }

    // Check if user already exists
    const existingUser = await this.userService.findByMobileNumber(mobileNumber);
    if (existingUser) {
      throw new BadRequestError(
        'User with this mobile number already exists. Please login instead',
        'USER_ALREADY_EXISTS'
      );
    }

    // Generate and send OTP
    const otp = await this.otpService.generateAndStoreOTP(mobileNumber);
    await this.smsService.sendOTP(mobileNumber, otp);

    logger.info('Registration OTP sent', { mobileNumber });
  }

  /**
   * Send OTP for login
   */
  async sendOTP(mobileNumber: string): Promise<void> {
    // Validate mobile number
    validateMobileNumber(mobileNumber);

    // Generate and send OTP
    const otp = await this.otpService.generateAndStoreOTP(mobileNumber);
    await this.smsService.sendOTP(mobileNumber, otp);

    logger.info('Login OTP sent', { mobileNumber });
  }

  /**
   * Verify OTP and complete registration or login
   */
  async verifyOTP(mobileNumber: string, otp: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Validate inputs
    validateMobileNumber(mobileNumber);
    validateOTP(otp);

    // Verify OTP
    await this.otpService.verifyOTP(mobileNumber, otp);

    // Find or create user
    let user = await this.userService.findByMobileNumber(mobileNumber);
    
    if (!user) {
      // Create new user if doesn't exist
      user = await this.userService.createUser(mobileNumber);
      logger.info('New user registered', { userId: user.id, mobileNumber });
    } else {
      // Update last login
      await this.userService.updateLastLogin(user.id);
      logger.info('User logged in', { userId: user.id, mobileNumber });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive', 'ACCOUNT_INACTIVE');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, 'customer');
    const refreshToken = generateRefreshToken(user.id, 'customer');

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if token is revoked
    const isRevoked = await this.isTokenRevoked(refreshToken);
    if (isRevoked) {
      throw new UnauthorizedError('Refresh token has been revoked', 'TOKEN_REVOKED');
    }

    // Check if user exists and is active
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive', 'ACCOUNT_INACTIVE');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, payload.type, payload.role);
    const newRefreshToken = generateRefreshToken(user.id, payload.type);

    // Revoke old refresh token
    await this.revokeToken(refreshToken);

    logger.info('Access token refreshed', { userId: user.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.revokeToken(refreshToken);
    logger.info('User logged out');
  }

  /**
   * Revoke token (simplified - no longer using Redis)
   * For a startup, token revocation can be handled by short expiry times
   */
  private async revokeToken(token: string): Promise<void> {
    // Token revocation removed - rely on short token expiry instead
    logger.info('Token revocation requested (no-op after Redis removal)', { token: token.substring(0, 10) + '...' });
  }

  /**
   * Check if token is revoked (simplified - always returns false)
   */
  private async isTokenRevoked(token: string): Promise<boolean> {
    // Token revocation check removed - always return false
    return false;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
    logger.info('User account deleted', { userId });
  }
}
