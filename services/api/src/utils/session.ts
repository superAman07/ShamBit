import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getDatabase } from '@shambit/database';
import { ERROR_CODES } from '../constants/seller';

export interface PendingRegistration {
  sessionId: string;
  sessionHash: string; // Hashed session ID for security
  fullName: string;
  mobile: string;
  email: string;
  password: string; // Bcrypt hash (not plaintext or encrypted)
  createdAt: Date;
  otpSent: boolean;
  otpVerified: boolean; // Prevent replay attacks
  otpExpiresAt?: Date; // OTP expiry timestamp
}

export const createRegistrationSessionWithoutHash = async (data: {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}): Promise<string> => {
  const db = getDatabase();
  const sessionId = crypto.randomBytes(parseInt(process.env.SESSION_ID_BYTES || '32')).toString('hex');
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  // Hash password IMMEDIATELY - never store plaintext even temporarily
  const bcryptCost = process.env.BCRYPT_COST ? parseInt(process.env.BCRYPT_COST) : 12;
  const hashedPassword = await bcrypt.hash(data.password, bcryptCost);
  
  const sessionTTL = parseInt(process.env.SESSION_TTL || '1800'); // 30 minutes default
  const expiresAt = new Date(Date.now() + sessionTTL * 1000);
  
  await db('registration_sessions').insert({
    session_hash: sessionHash,
    full_name: data.fullName,
    mobile: data.mobile,
    email: data.email,
    encrypted_password: hashedPassword, // Store bcrypt hash, not encrypted plaintext
    otp_sent: false,
    otp_verified: false,
    expires_at: expiresAt
  });
  
  return sessionId; // Return unhashed ID to client
};

export const createRegistrationSession = async (data: {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}): Promise<string> => {
  // This function is deprecated - use createRegistrationSessionWithoutHash instead
  // Kept for backward compatibility
  return createRegistrationSessionWithoutHash(data);
};

export const getRegistrationByMobile = async (mobile: string): Promise<PendingRegistration | null> => {
  const db = getDatabase();
  
  // Clean up expired sessions first
  await cleanupExpiredSessions();
  
  const session = await db('registration_sessions')
    .where('mobile', mobile)
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();
    
  if (!session) return null;
  
  return {
    sessionId: '', // We don't store the original session ID
    sessionHash: session.session_hash,
    fullName: session.full_name,
    mobile: session.mobile,
    email: session.email,
    password: session.encrypted_password, // This is now a bcrypt hash
    createdAt: session.created_at,
    otpSent: session.otp_sent,
    otpVerified: session.otp_verified,
    otpExpiresAt: session.otp_expires_at
  };
};

export const getRegistrationBySession = async (sessionId: string): Promise<PendingRegistration | null> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  // Clean up expired sessions first
  await cleanupExpiredSessions();
  
  const session = await db('registration_sessions')
    .where('session_hash', sessionHash)
    .where('expires_at', '>', new Date())
    .first();
    
  if (!session) return null;
  
  return {
    sessionId,
    sessionHash: session.session_hash,
    fullName: session.full_name,
    mobile: session.mobile,
    email: session.email,
    password: session.encrypted_password, // This is now a bcrypt hash, not encrypted plaintext
    createdAt: session.created_at,
    otpSent: session.otp_sent,
    otpVerified: session.otp_verified,
    otpExpiresAt: session.otp_expires_at
  };
};

export const updateRegistrationOTPStatus = async (sessionId: string, otpSent: boolean, otpExpiresAt?: Date): Promise<void> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  const updateData: any = { otp_sent: otpSent };
  if (otpExpiresAt) {
    updateData.otp_expires_at = otpExpiresAt;
  }
  
  await db('registration_sessions')
    .where('session_hash', sessionHash)
    .update(updateData);
};

export const clearRegistrationSession = async (sessionId: string): Promise<void> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  await db('registration_sessions')
    .where('session_hash', sessionHash)
    .del();
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  const db = getDatabase();
  
  const deletedCount = await db('registration_sessions')
    .where('expires_at', '<', new Date())
    .del();
    
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} expired registration sessions`);
  }
};

export const markSessionVerified = async (sessionId: string): Promise<void> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  await db('registration_sessions')
    .where('session_hash', sessionHash)
    .update({ otp_verified: true });
};

export const isSessionVerified = async (sessionId: string): Promise<boolean> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  const session = await db('registration_sessions')
    .where('session_hash', sessionHash)
    .where('expires_at', '>', new Date())
    .first();
    
  return session?.otp_verified || false;
};

// Validate OTP expiry
export const isOTPExpired = async (sessionId: string): Promise<boolean> => {
  const db = getDatabase();
  const sessionHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  
  const session = await db('registration_sessions')
    .where('session_hash', sessionHash)
    .first();
    
  if (!session || !session.otp_expires_at) return true;
  
  return new Date() > session.otp_expires_at;
};