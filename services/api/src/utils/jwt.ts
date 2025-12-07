import jwt from 'jsonwebtoken';
import { getConfig } from '@shambit/config';
import { UnauthorizedError } from '@shambit/shared';
import { JWTPayload } from '../types/auth.types';

/**
 * Generate access token (15 minutes expiry)
 */
export const generateAccessToken = (userId: string, type: 'customer' | 'admin' | 'delivery', role?: string): string => {
  const config = getConfig();
  
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    id: userId, // Include id as alias for convenience
    type,
    ...(role && { role }),
  };
  
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '15m',
  });
};

/**
 * Generate refresh token (30 days expiry for customers)
 */
export const generateRefreshToken = (userId: string, type: 'customer' | 'admin' | 'delivery'): string => {
  const config = getConfig();
  
  const expiresIn = type === 'customer' ? '30d' : '7d';
  
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    id: userId, // Include id as alias for convenience
    type,
  };
  
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn,
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  const config = getConfig();
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token', 'INVALID_TOKEN');
    }
    throw new UnauthorizedError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  const config = getConfig();
  
  try {
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
    throw new UnauthorizedError('Refresh token verification failed', 'REFRESH_TOKEN_VERIFICATION_FAILED');
  }
};
