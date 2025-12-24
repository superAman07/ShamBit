import { getDatabase } from '@shambit/database';
import { smsService } from './sms.service';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

interface OTPRecord {
  identifier: string;
  otp: string;
  purpose: string;
  expiresAt: Date;
  attempts: number;
}

class OTPService {
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_LENGTH = 6;
  private readonly SALT_ROUNDS = 10;

  /**
   * Generate and send OTP
   */
  async generateAndSendOTP(identifier: string, purpose: string, expirySeconds: number = 300): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      const otp = await this.generateOTP(identifier, purpose, expirySeconds);
      
      // Send OTP via SMS if identifier looks like a phone number
      if (this.isPhoneNumber(identifier)) {
        await smsService.sendOTP({
          to: identifier,
          otp,
          purpose
        });
      }
      
      return { success: true, otp };
    } catch (error) {
      console.error('Generate and send OTP failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate OTP' 
      };
    }
  }
  /**
   * Generate and store OTP
   */
  async generateOTP(identifier: string, purpose: string, expirySeconds: number = 300): Promise<string> {
    const db = getDatabase();
    
    // Input validation
    if (!identifier || !purpose) {
      throw new Error('Identifier and purpose are required for OTP generation');
    }
    
    // Validate expiry seconds to prevent NaN timestamps
    const validExpirySeconds = Number.isFinite(expirySeconds) && expirySeconds > 0 
      ? expirySeconds 
      : 300; // 5 minutes default
    
    if (!Number.isFinite(validExpirySeconds)) {
      throw new Error('Invalid expiry seconds provided for OTP generation');
    }
    
    // Check rate limiting - prevent too many OTP requests
    const existingRecord = await db('otp_records')
      .where({ identifier, purpose })
      .first();
    
    if (existingRecord) {
      const timeSinceCreation = (new Date().getTime() - new Date(existingRecord.created_at).getTime()) / 1000;
      if (timeSinceCreation < 60) { // 60 seconds cooldown
        throw new Error('Please wait before requesting a new OTP');
      }
    }
    
    // Generate cryptographically secure 6-digit OTP
    const otp = this.generateSecureOTP();
    const otpHash = await bcrypt.hash(otp, this.SALT_ROUNDS);
    
    // Calculate expiry time with validation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (validExpirySeconds * 1000));
    
    // Validate the calculated expiry date
    if (isNaN(expiresAt.getTime())) {
      throw new Error('Failed to calculate valid expiry timestamp for OTP');
    }
    
    // Delete any existing OTP for this identifier and purpose
    await db('otp_records')
      .where({ identifier, purpose })
      .delete();
    
    // Store new OTP with hash (if supported) or plain text (for backward compatibility)
    const otpData: any = {
      identifier,
      purpose,
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date(),
    };

    // Try to use hashed OTP first, fallback to plain text
    try {
      // Check if otp_hash column exists by attempting to insert with it
      otpData.otp_hash = otpHash;
      await db('otp_records').insert(otpData);
    } catch (error: any) {
      if (error.code === '42703') { // Column doesn't exist
        // Fallback to plain text OTP for backward compatibility
        console.log('Using plain text OTP (otp_hash column not found)');
        delete otpData.otp_hash;
        otpData.otp = otp;
        await db('otp_records').insert(otpData);
      } else {
        throw error;
      }
    }
    
    console.log('OTP generated successfully', { identifier, purpose, expirySeconds });
    return otp;
  }

  /**
   * Verify OTP with enhanced parameters
   */
  async verifyOTP(params: {
    mobile: string;
    otp: string;
    purpose: string;
    sessionId?: string;
    ipAddress?: string;
  }): Promise<{ verified: boolean; error?: string }> {
    const db = getDatabase();
    const { mobile, otp, purpose, sessionId, ipAddress } = params;
    
    // Input validation
    if (!mobile || !otp || !purpose) {
      console.error('OTP verification failed: Missing required parameters');
      return { verified: false, error: 'Missing required parameters' };
    }
    
    // Validate OTP format (must be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      console.error('OTP verification failed: Invalid OTP format');
      return { verified: false, error: 'Invalid OTP format' };
    }
    
    // Get OTP record
    const record = await db('otp_records')
      .where({ identifier: mobile, purpose })
      .first();
    
    if (!record) {
      console.error('OTP verification failed: No OTP record found', { mobile, purpose });
      return { verified: false, error: 'OTP not found or expired' };
    }
    
    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      console.error('OTP verification failed: OTP expired', { mobile, purpose });
      await db('otp_records').where({ id: record.id }).delete();
      return { verified: false, error: 'OTP has expired' };
    }
    
    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      console.error('OTP verification failed: Maximum attempts exceeded', { mobile, purpose, attempts: record.attempts });
      await db('otp_records').where({ id: record.id }).delete();
      return { verified: false, error: 'Maximum attempts exceeded' };
    }
    
    // Increment attempts BEFORE verification
    await db('otp_records')
      .where({ id: record.id })
      .update({ attempts: record.attempts + 1 });
    
    // Verify OTP using bcrypt for hashed OTPs, direct comparison for plain text
    let isValid = false;
    if (record.otp_hash) {
      // New hashed OTP
      isValid = await bcrypt.compare(otp.trim(), record.otp_hash);
    } else if (record.otp) {
      // Legacy plain text OTP
      isValid = record.otp === otp.trim();
    }
    
    if (isValid) {
      console.log('OTP verification successful', { mobile, purpose, sessionId, ipAddress });
      // Delete OTP after successful verification
      await db('otp_records').where({ id: record.id }).delete();
      return { verified: true };
    } else {
      console.error('OTP verification failed: Invalid OTP', { 
        mobile, 
        purpose, 
        attempts: record.attempts + 1 
      });
      return { verified: false, error: 'Invalid OTP' };
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use verifyOTP with object parameters instead
   */
  async verifyOTPLegacy(identifier: string, otp: string, purpose: string): Promise<boolean> {
    const result = await this.verifyOTP({
      mobile: identifier,
      otp,
      purpose
    });
    return result.verified;
  }

  /**
   * Resend OTP with method fallback
   */
  async resendOTP(
    identifier: string,
    method: 'sms' | 'whatsapp' = 'sms',
    ipAddress?: string,
    purpose: string = 'registration',
    sessionId?: string
  ): Promise<{
    success: boolean;
    expiresIn: number;
    attemptsRemaining: number;
    cooldownSeconds?: number;
    method: 'sms' | 'whatsapp';
  }> {
    try {
      // Check if resend is allowed (rate limiting)
      const canResend = await this.canResendOTP(identifier, purpose);
      if (!canResend) {
        return {
          success: false,
          expiresIn: 0,
          attemptsRemaining: 0,
          cooldownSeconds: 60,
          method
        };
      }

      // Generate and send new OTP
      const result = await this.generateAndSendOTP(identifier, purpose, 300);
      
      if (result.success) {
        return {
          success: true,
          expiresIn: 300, // 5 minutes
          attemptsRemaining: this.MAX_ATTEMPTS,
          method
        };
      } else {
        return {
          success: false,
          expiresIn: 0,
          attemptsRemaining: 0,
          method
        };
      }
    } catch (error) {
      console.error('Resend OTP failed:', error);
      return {
        success: false,
        expiresIn: 0,
        attemptsRemaining: 0,
        method
      };
    }
  }

  /**
   * Check if OTP can be resent (rate limiting)
   */
  async canResendOTP(identifier: string, purpose: string): Promise<boolean> {
    const db = getDatabase();
    
    const record = await db('otp_records')
      .where({ identifier, purpose })
      .first();
    
    if (!record) {
      return true;
    }
    
    // Allow resend only after 60 seconds
    const createdAt = new Date(record.created_at);
    const now = new Date();
    const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;
    
    return secondsSinceCreation >= 60;
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const db = getDatabase();
    
    const result = await db('otp_records')
      .where('expires_at', '<', new Date())
      .delete();
    
    return result;
  }

  /**
   * Generate cryptographically secure OTP
   */
  private generateSecureOTP(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);
    return (num % 900000 + 100000).toString();
  }

  /**
   * Check if identifier is a phone number
   */
  private isPhoneNumber(identifier: string): boolean {
    return /^[6-9]\d{9}$/.test(identifier.replace(/^\+91/, ''));
  }

  /**
   * Get remaining attempts for an OTP
   */
  async getRemainingAttempts(identifier: string, purpose: string): Promise<number> {
    const db = getDatabase();
    
    const record = await db('otp_records')
      .where({ identifier, purpose })
      .first();
    
    if (!record) {
      return 0;
    }
    
    return Math.max(0, this.MAX_ATTEMPTS - record.attempts);
  }
}

export const otpService = new OTPService();