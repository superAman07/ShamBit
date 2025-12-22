import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getConfig } from '@shambit/config';
import { getDatabase } from '@shambit/database';

interface TokenPayload {
  sellerId: number;
  email: string;
  type: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId?: string; // For session tracking
}

interface RefreshTokenData {
  sessionId: string;
  sellerId: number;
  tokenFamily: string;
}

/**
 * Safely generate JWT tokens with proper error handling and session tracking
 */
export const generateTokens = async (
  payload: TokenPayload, 
  ipAddress?: string, 
  userAgent?: string
): Promise<TokenPair | null> => {
  const config = getConfig();
  const db = getDatabase();
  
  try {
    // Verify secrets exist
    if (!config.JWT_SECRET || !config.JWT_REFRESH_SECRET) {
      console.error('JWT secrets not configured');
      return null;
    }
    
    const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';
    
    // Generate token family for rotation tracking
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    
    // Generate JTI for access token tracking
    const accessTokenJti = crypto.randomBytes(16).toString('hex');
    
    // Create access token with JTI for revocation tracking
    const accessTokenPayload = {
      ...payload,
      jti: accessTokenJti
    };
    
    const accessToken = jwt.sign(
      accessTokenPayload,
      config.JWT_SECRET,
      { expiresIn: accessTokenExpiry } as jwt.SignOptions
    );
    
    // Generate refresh token with session tracking
    const refreshTokenPayload = {
      ...payload,
      tokenFamily,
      sessionType: 'refresh'
    };
    
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      config.JWT_REFRESH_SECRET,
      { expiresIn: refreshTokenExpiry } as jwt.SignOptions
    );
    
    // Calculate expiry times
    const accessTokenExpiresAt = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes
    const refreshTokenExpiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    
    // Store refresh token session in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const [session] = await db('seller_sessions')
      .insert({
        seller_id: payload.sellerId,
        refresh_token_hash: refreshTokenHash,
        token_family: tokenFamily,
        access_token_jti: accessTokenJti,
        access_token_expires_at: accessTokenExpiresAt,
        expires_at: refreshTokenExpiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .returning(['id']);
    
    return { 
      accessToken, 
      refreshToken,
      sessionId: session.id 
    };
  } catch (error) {
    console.error('Token generation failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

/**
 * Safely verify JWT token
 */
export const verifyToken = (token: string, secret: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as any;
    
    if (!decoded.sellerId || !decoded.email || decoded.type !== 'seller') {
      return null;
    }
    
    return {
      sellerId: decoded.sellerId,
      email: decoded.email,
      type: decoded.type
    };
  } catch (error) {
    return null;
  }
};

// Legacy functions for backward compatibility
/**
 * @deprecated Use generateTokens instead
 */
export const generateAccessToken = (userId: string, type: string, role?: string): string => {
  const config = getConfig();
  
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  
  return jwt.sign(
    { sub: userId, type, role },
    config.JWT_SECRET,
    { expiresIn: accessTokenExpiry } as jwt.SignOptions
  );
};

/**
 * @deprecated Use generateTokens instead
 */
export const generateRefreshToken = (userId: string, type: string): string => {
  const config = getConfig();
  
  if (!config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';
  
  return jwt.sign(
    { sub: userId, type },
    config.JWT_REFRESH_SECRET,
    { expiresIn: refreshTokenExpiry } as jwt.SignOptions
  );
};

/**
 * @deprecated Use verifyRefreshToken instead
 */
export const verifyAccessToken = (token: string): any => {
  const config = getConfig();
  
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify refresh token and return session data
 */
export const verifyRefreshToken = async (refreshToken: string): Promise<RefreshTokenData | null> => {
  const config = getConfig();
  const db = getDatabase();
  
  try {
    // Verify JWT signature first
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET!) as any;
    
    if (!decoded.sellerId || !decoded.tokenFamily || decoded.sessionType !== 'refresh') {
      return null;
    }
    
    // Check if session exists and is valid
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const session = await db('seller_sessions')
      .where('refresh_token_hash', refreshTokenHash)
      .where('token_family', decoded.tokenFamily)
      .where('seller_id', decoded.sellerId)
      .where('revoked', false)
      .where('expires_at', '>', new Date())
      .first();
    
    if (!session) {
      return null;
    }
    
    return {
      sessionId: session.id,
      sellerId: decoded.sellerId,
      tokenFamily: decoded.tokenFamily
    };
  } catch (error) {
    return null;
  }
};

// Legacy verifyRefreshToken for backward compatibility
export const verifyRefreshTokenLegacy = (refreshToken: string): any => {
  const config = getConfig();
  
  if (!config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  
  try {
    return jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Revoke a specific refresh token session
 */
export const revokeSession = async (sessionId: string): Promise<boolean> => {
  const db = getDatabase();
  
  try {
    // First revoke the access token
    await revokeSessionAccessTokens(sessionId);
    
    // Then revoke the refresh token session
    const result = await db('seller_sessions')
      .where('id', sessionId)
      .update({
        revoked: true,
        revoked_at: new Date()
      });
    
    return result > 0;
  } catch (error) {
    console.error('Session revocation failed:', error);
    return false;
  }
};

/**
 * Revoke all sessions for a seller (logout from all devices)
 */
export const revokeAllSessions = async (sellerId: number): Promise<boolean> => {
  const db = getDatabase();
  
  try {
    // Get all active sessions for the seller
    const sessions = await db('seller_sessions')
      .where('seller_id', sellerId)
      .where('revoked', false);
    
    // Revoke all access tokens
    for (const session of sessions) {
      if (session.access_token_jti) {
        await revokeAccessToken(
          session.access_token_jti,
          session.seller_id,
          session.access_token_expires_at
        );
      }
    }
    
    // Revoke all refresh token sessions
    const result = await db('seller_sessions')
      .where('seller_id', sellerId)
      .where('revoked', false)
      .update({
        revoked: true,
        revoked_at: new Date()
      });
    
    return result >= 0; // Even 0 is success (no active sessions)
  } catch (error) {
    console.error('All sessions revocation failed:', error);
    return false;
  }
};

/**
 * Refresh access token using refresh token (with rotation)
 */
export const refreshAccessToken = async (
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair | null> => {
  const db = getDatabase();
  
  try {
    // Verify refresh token
    const sessionData = await verifyRefreshToken(refreshToken);
    if (!sessionData) {
      return null;
    }
    
    // Get seller data
    const seller = await db('sellers')
      .select('id', 'email')
      .where('id', sessionData.sellerId)
      .first();
    
    if (!seller) {
      return null;
    }
    
    // Revoke old refresh token
    await revokeSession(sessionData.sessionId);
    
    // Generate new token pair (rotation)
    const newTokens = await generateTokens(
      {
        sellerId: seller.id,
        email: seller.email,
        type: 'seller'
      },
      ipAddress,
      userAgent
    );
    
    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

/**
 * Check if access token is revoked
 */
export const isAccessTokenRevoked = async (jti: string): Promise<boolean> => {
  const db = getDatabase();
  
  try {
    const revokedToken = await db('revoked_access_tokens')
      .where('jti', jti)
      .where('expires_at', '>', new Date())
      .first();
    
    return !!revokedToken;
  } catch (error) {
    console.error('Access token revocation check failed:', error);
    return false; // Fail open for availability
  }
};

/**
 * Revoke access token by JTI
 */
export const revokeAccessToken = async (jti: string, sellerId: number, expiresAt: Date): Promise<boolean> => {
  const db = getDatabase();
  
  try {
    await db('revoked_access_tokens')
      .insert({
        jti,
        seller_id: sellerId,
        expires_at: expiresAt
      })
      .onConflict('jti')
      .ignore(); // Ignore if already revoked
    
    return true;
  } catch (error) {
    console.error('Access token revocation failed:', error);
    return false;
  }
};

/**
 * Revoke all access tokens for a session
 */
export const revokeSessionAccessTokens = async (sessionId: string): Promise<boolean> => {
  const db = getDatabase();
  
  try {
    // Get session details
    const session = await db('seller_sessions')
      .where('id', sessionId)
      .first();
    
    if (!session || !session.access_token_jti) {
      return true; // No access token to revoke
    }
    
    // Revoke the access token
    return await revokeAccessToken(
      session.access_token_jti,
      session.seller_id,
      session.access_token_expires_at
    );
  } catch (error) {
    console.error('Session access token revocation failed:', error);
    return false;
  }
};

/**
 * Get current session ID from refresh token
 */
export const getCurrentSessionFromToken = async (refreshToken: string): Promise<string | null> => {
  const sessionData = await verifyRefreshToken(refreshToken);
  return sessionData?.sessionId || null;
};

/**
 * Clean up expired sessions and revoked access tokens
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  const db = getDatabase();
  
  try {
    // Clean up expired seller sessions
    const deletedSessions = await db('seller_sessions')
      .where('expires_at', '<', new Date())
      .del();
    
    // Clean up expired revoked access tokens
    const deletedTokens = await db('revoked_access_tokens')
      .where('expires_at', '<', new Date())
      .del();
    
    if (deletedSessions > 0 || deletedTokens > 0) {
      console.log(`Cleaned up ${deletedSessions} expired sessions and ${deletedTokens} expired revoked tokens`);
    }
  } catch (error) {
    console.error('Session cleanup failed:', error);
  }
};