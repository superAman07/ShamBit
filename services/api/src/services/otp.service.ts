import { createLogger, RateLimitError, UnauthorizedError } from '@shambit/shared';
import { getConfig } from '@shambit/config';

const logger = createLogger('otp-service');

/**
 * Generate a 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

interface OTPData {
  otp: string;
  expiresAt: number;
}

interface AttemptData {
  count: number;
  expiresAt: number;
}

/**
 * OTP Service for managing OTP generation, storage, and verification
 * Uses in-memory storage (suitable for single-server startup deployment)
 */
export class OTPService {
  private otpStore = new Map<string, OTPData>();
  private attemptStore = new Map<string, AttemptData>();
  private OTP_TTL = 300000; // 5 minutes in milliseconds
  private MAX_ATTEMPTS = 3;
  private ATTEMPT_WINDOW = 600000; // 10 minutes in milliseconds

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Clean OTPs
    for (const [key, data] of this.otpStore.entries()) {
      if (data.expiresAt < now) {
        this.otpStore.delete(key);
      }
    }
    
    // Clean attempts
    for (const [key, data] of this.attemptStore.entries()) {
      if (data.expiresAt < now) {
        this.attemptStore.delete(key);
      }
    }
  }

  /**
   * Check rate limiting for OTP requests
   */
  async checkRateLimit(mobileNumber: string): Promise<void> {
    this.cleanupExpired();
    
    const attemptData = this.attemptStore.get(mobileNumber);
    
    if (attemptData && attemptData.count >= this.MAX_ATTEMPTS) {
      throw new RateLimitError(
        'Too many OTP requests. Please try again after 10 minutes',
        'OTP_RATE_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Increment OTP request attempts
   */
  async incrementAttempts(mobileNumber: string): Promise<void> {
    const now = Date.now();
    const attemptData = this.attemptStore.get(mobileNumber);
    
    if (attemptData) {
      attemptData.count++;
    } else {
      this.attemptStore.set(mobileNumber, {
        count: 1,
        expiresAt: now + this.ATTEMPT_WINDOW,
      });
    }
  }

  /**
   * Generate and store OTP
   */
  async generateAndStoreOTP(mobileNumber: string): Promise<string> {
    // Check rate limiting
    await this.checkRateLimit(mobileNumber);
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in memory with expiry
    const now = Date.now();
    this.otpStore.set(mobileNumber, {
      otp,
      expiresAt: now + this.OTP_TTL,
    });
    
    // Increment attempts
    await this.incrementAttempts(mobileNumber);
    
    logger.info('OTP generated and stored', {
      mobileNumber,
      expiresIn: this.OTP_TTL / 1000,
    });
    
    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(mobileNumber: string, otp: string): Promise<boolean> {
    this.cleanupExpired();
    
    const otpData = this.otpStore.get(mobileNumber);
    
    if (!otpData) {
      throw new UnauthorizedError(
        'OTP expired or not found. Please request a new OTP',
        'OTP_EXPIRED'
      );
    }
    
    const now = Date.now();
    if (otpData.expiresAt < now) {
      this.otpStore.delete(mobileNumber);
      throw new UnauthorizedError(
        'OTP expired. Please request a new OTP',
        'OTP_EXPIRED'
      );
    }
    
    if (otpData.otp !== otp) {
      throw new UnauthorizedError('Invalid OTP', 'INVALID_OTP');
    }
    
    // Delete OTP after successful verification
    this.otpStore.delete(mobileNumber);
    
    // Clear rate limit attempts
    this.attemptStore.delete(mobileNumber);
    
    logger.info('OTP verified successfully', { mobileNumber });
    
    return true;
  }

  /**
   * Delete OTP (for cleanup)
   */
  async deleteOTP(mobileNumber: string): Promise<void> {
    this.otpStore.delete(mobileNumber);
  }
}
