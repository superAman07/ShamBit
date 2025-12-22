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
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);
    
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
      console.log('OTP verification successful', { identifier, purpose });
      // Delete OTP after successful verification
      await db('otp_records').where({ id: record.id }).delete();
      return true;
    } else {
      console.error('OTP verification failed: Invalid OTP', { 
        identifier, 
        purpose, 
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