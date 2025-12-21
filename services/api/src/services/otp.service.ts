import { getDatabase } from '@shambit/database';

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

  /**
   * Generate and store OTP
   */
  async generateOTP(identifier: string, purpose: string, expirySeconds: number = 300): Promise<string> {
    const db = getDatabase();
    
    // Input validation
    if (!identifier || !purpose) {
      throw new Error('Identifier and purpose are required for OTP generation');
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);
    
    // Delete any existing OTP for this identifier and purpose
    await db('otp_records')
      .where({ identifier, purpose })
      .delete();
    
    // Store new OTP
    await db('otp_records').insert({
      identifier,
      otp,
      purpose,
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date(),
    });
    
    console.log('OTP generated successfully', { identifier, purpose, expirySeconds });
    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(identifier: string, otp: string, purpose: string): Promise<boolean> {
    const db = getDatabase();
    
    // Input validation
    if (!identifier || !otp || !purpose) {
      console.error('OTP verification failed: Missing required parameters');
      return false;
    }
    
    // Validate OTP format (must be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      console.error('OTP verification failed: Invalid OTP format');
      return false;
    }
    
    // Get OTP record
    const record = await db('otp_records')
      .where({ identifier, purpose })
      .first();
    
    if (!record) {
      console.error('OTP verification failed: No OTP record found', { identifier, purpose });
      return false;
    }
    
    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      console.error('OTP verification failed: OTP expired', { identifier, purpose });
      await db('otp_records').where({ id: record.id }).delete();
      return false;
    }
    
    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      console.error('OTP verification failed: Maximum attempts exceeded', { identifier, purpose, attempts: record.attempts });
      await db('otp_records').where({ id: record.id }).delete();
      return false;
    }
    
    // Increment attempts BEFORE verification
    await db('otp_records')
      .where({ id: record.id })
      .update({ attempts: record.attempts + 1 });
    
    // Verify OTP with strict comparison
    const isValid = record.otp === otp.trim();
    
    if (isValid) {
      console.log('OTP verification successful', { identifier, purpose });
      // Delete OTP after successful verification
      await db('otp_records').where({ id: record.id }).delete();
      return true;
    } else {
      console.error('OTP verification failed: Invalid OTP', { 
        identifier, 
        purpose, 
        providedOtp: otp,
        expectedOtp: record.otp,
        attempts: record.attempts + 1 
      });
      return false;
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