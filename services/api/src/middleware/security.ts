import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import crypto from 'crypto';

// Cache for tracking failed attempts
const failedAttemptsCache = new NodeCache({ 
  stdTTL: parseInt(process.env.FAILED_ATTEMPTS_TTL || '900'), // 15 minutes default
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '300') // 5 minutes default
});

// Rate limiting configurations
export const registrationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.REGISTRATION_RATE_LIMIT || '3'), // 3 attempts default
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpVerificationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.OTP_RATE_LIMIT || '5'), // 5 attempts default
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP verification attempts. Please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.LOGIN_RATE_LIMIT || '5'), // 5 attempts default
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// HTTPS enforcement middleware
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.get('X-Forwarded-Proto') || req.protocol;
    if (proto !== 'https') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSECURE_CONNECTION',
          message: 'HTTPS required',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  next();
};

// OTP attempt tracking
export const trackOTPAttempts = (mobile: string): { allowed: boolean; attemptsLeft: number } => {
  const key = `otp_attempts_${mobile}`;
  const attempts = failedAttemptsCache.get<number>(key) || 0;
  const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || '3');
  
  if (attempts >= maxAttempts) {
    return { allowed: false, attemptsLeft: 0 };
  }
  
  return { allowed: true, attemptsLeft: maxAttempts - attempts };
};

export const recordFailedOTPAttempt = (mobile: string): void => {
  const key = `otp_attempts_${mobile}`;
  const attempts = failedAttemptsCache.get<number>(key) || 0;
  failedAttemptsCache.set(key, attempts + 1);
};

export const clearOTPAttempts = (mobile: string): void => {
  const key = `otp_attempts_${mobile}`;
  failedAttemptsCache.del(key);
};

// Enhanced login attempt tracking with multiple layers
export const trackLoginAttempts = (email: string, ip: string, userAgent: string): { allowed: boolean; reason?: string } => {
  // Layer 1: Per IP
  const ipKey = `login_ip_${ip}`;
  const ipAttempts = failedAttemptsCache.get<number>(ipKey) || 0;
  const maxIpAttempts = parseInt(process.env.MAX_LOGIN_IP_ATTEMPTS || '10');
  
  // Layer 2: Per Email
  const emailKey = `login_email_${email}`;
  const emailAttempts = failedAttemptsCache.get<number>(emailKey) || 0;
  const maxEmailAttempts = parseInt(process.env.MAX_LOGIN_EMAIL_ATTEMPTS || '5');
  
  // Layer 3: Per Device (IP + User-Agent)
  const deviceKey = `login_device_${ip}_${crypto.createHash('md5').update(userAgent).digest('hex')}`;
  const deviceAttempts = failedAttemptsCache.get<number>(deviceKey) || 0;
  const maxDeviceAttempts = parseInt(process.env.MAX_LOGIN_DEVICE_ATTEMPTS || '3');
  
  if (ipAttempts >= maxIpAttempts) {
    return { allowed: false, reason: 'IP blocked' };
  }
  
  if (emailAttempts >= maxEmailAttempts) {
    return { allowed: false, reason: 'Email blocked' };
  }
  
  if (deviceAttempts >= maxDeviceAttempts) {
    return { allowed: false, reason: 'Device blocked' };
  }
  
  return { allowed: true };
};

export const recordFailedLoginAttempt = (email: string, ip: string, userAgent: string): void => {
  const ipKey = `login_ip_${ip}`;
  const emailKey = `login_email_${email}`;
  const deviceKey = `login_device_${ip}_${crypto.createHash('md5').update(userAgent).digest('hex')}`;
  
  const ipAttempts = failedAttemptsCache.get<number>(ipKey) || 0;
  const emailAttempts = failedAttemptsCache.get<number>(emailKey) || 0;
  const deviceAttempts = failedAttemptsCache.get<number>(deviceKey) || 0;
  
  failedAttemptsCache.set(ipKey, ipAttempts + 1);
  failedAttemptsCache.set(emailKey, emailAttempts + 1);
  failedAttemptsCache.set(deviceKey, deviceAttempts + 1);
};

export const clearLoginAttempts = (email: string, ip: string, userAgent: string): void => {
  const ipKey = `login_ip_${ip}`;
  const emailKey = `login_email_${email}`;
  const deviceKey = `login_device_${ip}_${crypto.createHash('md5').update(userAgent).digest('hex')}`;
  
  failedAttemptsCache.del(ipKey);
  failedAttemptsCache.del(emailKey);
  failedAttemptsCache.del(deviceKey);
};