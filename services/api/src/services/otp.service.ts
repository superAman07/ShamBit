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
    
    // Generate 6-digit OTP
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
    
    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(identifier: string, otp: string, purpose: string): Promise<boolean> {
    const db = getDatabase();
    
    // Get OTP record
    const record = await db('otp_records')
      .where({ identifier, purpose })
      .first();
    
    if (!record) {
      return false;
    }
    
    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      await db('otp_records').where({ id: record.id }).delete();
      return false;
    }
    
    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      await db('otp_records').where({ id: record.id }).delete();
      return false;
    }
    
    // Increment attempts
    await db('otp_records')
      .where({ id: record.id })
      .update({ attempts: record.attempts + 1 });
    
    // Verify OTP
    if (record.otp === otp) {
      // Delete OTP after successful verification
      await db('otp_records').where({ id: record.id }).delete();
      return true;
    }
    
    return false;
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