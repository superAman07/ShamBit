import { getDatabase } from '@shambit/database';
import { smsService } from './sms.service';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

interface OTPRecord {
  id: string;
  mobile: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  ipAddress?: string;
  method: 'sms' | 'whatsapp';
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  retryCount: number;
  lastRetryAt?: Date;
}

interface OTPGenerationResult {
  success: boolean;
  otpId?: string;
  expiresIn: number;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  method: 'sms' | 'whatsapp';
  attemptsRemaining: number;
  cooldownSeconds?: number;
  error?: string;
}

interface OTPVerificationResult {
  success: boolean;
  verified: boolean;
  attemptsRemaining: number;
  cooldownActive: boolean;
  error?: string;
}

interface RateLimitConfig {
  maxOtpRequests: number;
  windowMinutes: number;
  cooldownMinutes: number;
  maxVerificationAttempts: number;
}

class EnhancedOTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly SALT_ROUNDS = 10;
  
  private readonly rateLimitConfig: RateLimitConfig = {
    maxOtpRequests: 3,
    windowMinutes: 10,
    cooldownMinutes: 30,
    maxVerificationAttempts: 3
  };

  /**
   * Generate and send OTP with enhanced reliability and fallback
   */
  async generateAndSendOTP(
    mobile: string, 
    method: 'sms' | 'whatsapp' = 'sms',
    ipAddress?: string
  ): Promise<OTPGenerationResult> {
    const db = getDatabase();
    
    try {
      // Validate mobile number format
      if (!this.validateMobileNumber(mobile)) {
        throw new Error('Invalid mobile number format');
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(mobile, ipAddress);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          expiresIn: 0,
          deliveryStatus: 'failed',
          method,
          attemptsRemaining: rateLimitCheck.attemptsRemaining,
          cooldownSeconds: rateLimitCheck.cooldownSeconds
        };
      }

      // Generate cryptographically secure OTP
      const otp = this.generateSecureOTP();
      const otpHash = await bcrypt.hash(otp, this.SALT_ROUNDS);
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

      // Clean up any existing OTPs for this mobile
      await this.cleanupExistingOTPs(mobile);

      // Store OTP record
      const [otpRecord] = await db('seller_otps')
        .insert({
          mobile,
          otp_hash: otpHash,
          expires_at: expiresAt,
          attempts: 0,
          ip_address: ipAddress,
          method,
          delivery_status: 'pending',
          retry_count: 0,
          created_at: new Date()
        })
        .returning('id');

      // Send OTP with retry logic
      const deliveryResult = await this.sendOTPWithRetry(mobile, otp, method, otpRecord.id);

      // Update delivery status
      await db('seller_otps')
        .where('id', otpRecord.id)
        .update({
          delivery_status: deliveryResult.status,
          retry_count: deliveryResult.retryCount,
          last_retry_at: deliveryResult.lastRetryAt
        });

      // Record rate limit attempt
      await this.recordRateLimitAttempt(mobile, ipAddress);

      return {
        success: deliveryResult.status !== 'failed',
        otpId: otpRecord.id,
        expiresIn: this.OTP_EXPIRY_MINUTES * 60,
        deliveryStatus: deliveryResult.status,
        method: deliveryResult.finalMethod || method,
        attemptsRemaining: rateLimitCheck.attemptsRemaining - 1
      };

    } catch (error) {
      console.error('OTP generation failed:', error);
      return {
        success: false,
        expiresIn: 0,
        deliveryStatus: 'failed',
        method,
        attemptsRemaining: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify OTP with enhanced security
   */
  async verifyOTP(mobile: string, otp: string, ipAddress?: string): Promise<OTPVerificationResult> {
    const db = getDatabase();
    
    try {
      // Validate input
      if (!this.validateMobileNumber(mobile) || !this.validateOTPFormat(otp)) {
        return {
          success: false,
          verified: false,
          attemptsRemaining: 0,
          cooldownActive: false,
          error: 'Invalid mobile number or OTP format'
        };
      }

      // Get active OTP record
      const otpRecord = await db('seller_otps')
        .where('mobile', mobile)
        .where('verified', false)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();

      if (!otpRecord) {
        return {
          success: false,
          verified: false,
          attemptsRemaining: 0,
          cooldownActive: false,
          error: 'No valid OTP found or OTP expired'
        };
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= this.rateLimitConfig.maxVerificationAttempts) {
        await this.invalidateOTP(otpRecord.id);
        return {
          success: false,
          verified: false,
          attemptsRemaining: 0,
          cooldownActive: true,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Increment attempts before verification
      await db('seller_otps')
        .where('id', otpRecord.id)
        .update({ 
          attempts: otpRecord.attempts + 1,
          updated_at: new Date()
        });

      // Verify OTP using bcrypt
      const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);
      const attemptsRemaining = this.rateLimitConfig.maxVerificationAttempts - (otpRecord.attempts + 1);

      if (isValid) {
        // Mark as verified
        await db('seller_otps')
          .where('id', otpRecord.id)
          .update({
            verified: true,
            verified_at: new Date()
          });

        // Log successful verification
        console.log('OTP verification successful', { 
          mobile, 
          otpId: otpRecord.id,
          ipAddress 
        });

        return {
          success: true,
          verified: true,
          attemptsRemaining: 0,
          cooldownActive: false
        };
      } else {
        // Log failed verification
        console.log('OTP verification failed', { 
          mobile, 
          otpId: otpRecord.id,
          attempts: otpRecord.attempts + 1,
          ipAddress 
        });

        return {
          success: false,
          verified: false,
          attemptsRemaining: Math.max(0, attemptsRemaining),
          cooldownActive: attemptsRemaining <= 0,
          error: 'Invalid OTP'
        };
      }

    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        verified: false,
        attemptsRemaining: 0,
        cooldownActive: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Resend OTP with method fallback
   */
  async resendOTP(mobile: string, preferredMethod: 'sms' | 'whatsapp' = 'sms', ipAddress?: string): Promise<OTPGenerationResult> {
    const db = getDatabase();
    
    try {
      // Check if there's an existing active OTP
      const existingOTP = await db('seller_otps')
        .where('mobile', mobile)
        .where('verified', false)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();

      if (existingOTP) {
        // Check if enough time has passed since last OTP (60 seconds cooldown)
        const timeSinceCreation = (new Date().getTime() - new Date(existingOTP.created_at).getTime()) / 1000;
        if (timeSinceCreation < 60) {
          return {
            success: false,
            expiresIn: Math.ceil((new Date(existingOTP.expires_at).getTime() - new Date().getTime()) / 1000),
            deliveryStatus: 'failed',
            method: preferredMethod,
            attemptsRemaining: 0,
            cooldownSeconds: Math.ceil(60 - timeSinceCreation)
          };
        }
      }

      // Generate new OTP
      return await this.generateAndSendOTP(mobile, preferredMethod, ipAddress);

    } catch (error) {
      console.error('OTP resend failed:', error);
      return {
        success: false,
        expiresIn: 0,
        deliveryStatus: 'failed',
        method: preferredMethod,
        attemptsRemaining: 0,
        error: error instanceof Error ? error.message : 'Resend failed'
      };
    }
  }

  /**
   * Send OTP with retry logic and fallback methods
   */
  private async sendOTPWithRetry(
    mobile: string, 
    otp: string, 
    method: 'sms' | 'whatsapp',
    otpId: string
  ): Promise<{
    status: 'sent' | 'delivered' | 'failed';
    retryCount: number;
    lastRetryAt?: Date;
    finalMethod?: 'sms' | 'whatsapp';
  }> {
    const maxRetries = 3;
    let retryCount = 0;
    let currentMethod = method;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        await this.sendOTPViaMethod(mobile, otp, currentMethod);
        
        return {
          status: 'sent',
          retryCount,
          lastRetryAt: retryCount > 0 ? new Date() : undefined,
          finalMethod: currentMethod
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        console.warn(`OTP delivery attempt ${retryCount} failed for ${mobile} via ${currentMethod}:`, error);

        // If SMS fails and we haven't tried WhatsApp, switch to WhatsApp
        if (currentMethod === 'sms' && retryCount === 1) {
          currentMethod = 'whatsapp';
          console.log(`Switching to WhatsApp fallback for ${mobile}`);
        }

        // Wait before retry (exponential backoff)
        if (retryCount < maxRetries) {
          await this.delay(Math.pow(2, retryCount) * 1000);
        }
      }
    }

    console.error(`All OTP delivery attempts failed for ${mobile}:`, lastError);
    return {
      status: 'failed',
      retryCount,
      lastRetryAt: new Date()
    };
  }

  /**
   * Send OTP via specific method
   */
  private async sendOTPViaMethod(mobile: string, otp: string, method: 'sms' | 'whatsapp'): Promise<void> {
    if (method === 'sms') {
      await smsService.sendOTP({
        to: mobile,
        otp,
        purpose: 'registration'
      });
    } else if (method === 'whatsapp') {
      // WhatsApp integration would go here
      // For now, fall back to SMS
      await smsService.sendOTP({
        to: mobile,
        otp,
        purpose: 'registration'
      });
    }
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
   * Validate mobile number format
   */
  private validateMobileNumber(mobile: string): boolean {
    return /^[6-9]\d{9}$/.test(mobile);
  }

  /**
   * Validate OTP format
   */
  private validateOTPFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(mobile: string, ipAddress?: string): Promise<{
    allowed: boolean;
    attemptsRemaining: number;
    cooldownSeconds?: number;
  }> {
    const db = getDatabase();
    const windowStart = new Date(Date.now() - this.rateLimitConfig.windowMinutes * 60 * 1000);

    // Check mobile-based rate limit
    const mobileAttempts = await db('seller_otps')
      .where('mobile', mobile)
      .where('created_at', '>=', windowStart)
      .count('* as count')
      .first();

    const mobileCount = parseInt(mobileAttempts?.count as string) || 0;

    if (mobileCount >= this.rateLimitConfig.maxOtpRequests) {
      // Check if cooldown period has passed
      const lastAttempt = await db('seller_otps')
        .where('mobile', mobile)
        .orderBy('created_at', 'desc')
        .first();

      if (lastAttempt) {
        const timeSinceLastAttempt = (new Date().getTime() - new Date(lastAttempt.created_at).getTime()) / 1000;
        const cooldownSeconds = (this.rateLimitConfig.cooldownMinutes * 60) - timeSinceLastAttempt;

        if (cooldownSeconds > 0) {
          return {
            allowed: false,
            attemptsRemaining: 0,
            cooldownSeconds: Math.ceil(cooldownSeconds)
          };
        }
      }
    }

    // Check IP-based rate limit if provided
    if (ipAddress) {
      const ipAttempts = await db('seller_otps')
        .where('ip_address', ipAddress)
        .where('created_at', '>=', windowStart)
        .count('* as count')
        .first();

      const ipCount = parseInt(ipAttempts?.count as string) || 0;
      
      if (ipCount >= this.rateLimitConfig.maxOtpRequests * 2) { // More lenient for IP
        return {
          allowed: false,
          attemptsRemaining: 0,
          cooldownSeconds: this.rateLimitConfig.cooldownMinutes * 60
        };
      }
    }

    return {
      allowed: true,
      attemptsRemaining: this.rateLimitConfig.maxOtpRequests - mobileCount
    };
  }

  /**
   * Record rate limit attempt
   */
  private async recordRateLimitAttempt(mobile: string, ipAddress?: string): Promise<void> {
    // This is handled by the OTP record insertion
    // Additional rate limiting logic can be added here if needed
  }

  /**
   * Clean up existing OTPs for mobile number
   */
  private async cleanupExistingOTPs(mobile: string): Promise<void> {
    const db = getDatabase();
    
    await db('seller_otps')
      .where('mobile', mobile)
      .where('verified', false)
      .del();
  }

  /**
   * Invalidate OTP
   */
  private async invalidateOTP(otpId: string): Promise<void> {
    const db = getDatabase();
    
    await db('seller_otps')
      .where('id', otpId)
      .del();
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const db = getDatabase();
    
    const result = await db('seller_otps')
      .where('expires_at', '<', new Date())
      .del();

    console.log(`Cleaned up ${result} expired OTPs`);
    return result;
  }

  /**
   * Get OTP status for debugging
   */
  async getOTPStatus(mobile: string): Promise<{
    hasActiveOTP: boolean;
    expiresAt?: Date;
    attempts?: number;
    deliveryStatus?: string;
    method?: string;
  }> {
    const db = getDatabase();
    
    const otpRecord = await db('seller_otps')
      .where('mobile', mobile)
      .where('verified', false)
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!otpRecord) {
      return { hasActiveOTP: false };
    }

    return {
      hasActiveOTP: true,
      expiresAt: otpRecord.expires_at,
      attempts: otpRecord.attempts,
      deliveryStatus: otpRecord.delivery_status,
      method: otpRecord.method
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get delivery statistics for monitoring
   */
  async getDeliveryStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number;
    sent: number;
    failed: number;
    smsCount: number;
    whatsappCount: number;
    successRate: number;
  }> {
    const db = getDatabase();
    
    let timeframeSql: Date;
    switch (timeframe) {
      case 'hour':
        timeframeSql = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case 'week':
        timeframeSql = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeframeSql = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const stats = await db('seller_otps')
      .where('created_at', '>=', timeframeSql)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('SUM(CASE WHEN delivery_status = \'sent\' THEN 1 ELSE 0 END) as sent'),
        db.raw('SUM(CASE WHEN delivery_status = \'failed\' THEN 1 ELSE 0 END) as failed'),
        db.raw('SUM(CASE WHEN method = \'sms\' THEN 1 ELSE 0 END) as sms_count'),
        db.raw('SUM(CASE WHEN method = \'whatsapp\' THEN 1 ELSE 0 END) as whatsapp_count')
      )
      .first();

    const total = parseInt(stats?.total as string) || 0;
    const sent = parseInt(stats?.sent as string) || 0;
    const failed = parseInt(stats?.failed as string) || 0;
    const smsCount = parseInt(stats?.sms_count as string) || 0;
    const whatsappCount = parseInt(stats?.whatsapp_count as string) || 0;

    return {
      total,
      sent,
      failed,
      smsCount,
      whatsappCount,
      successRate: total > 0 ? (sent / total) * 100 : 0
    };
  }
}

export const enhancedOTPService = new EnhancedOTPService();