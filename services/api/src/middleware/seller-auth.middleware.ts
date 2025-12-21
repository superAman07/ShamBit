import { Request, Response, NextFunction } from 'express';
import { sellerAuthService } from '../services/seller-auth.service';
import { UnauthorizedError } from '@shambit/shared';

export interface AuthenticatedRequest extends Request {
  seller?: {
    id: string;
    mobile: string;
    email: string;
    verified: boolean;
  };
}

/**
 * Middleware to authenticate seller requests using JWT tokens
 */
export const authenticateSeller = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          details: { suggestion: 'Include Bearer token in Authorization header' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the access token
    const decoded = sellerAuthService.verifyAccessToken(token);
    
    // Add seller information to request object
    req.seller = {
      id: decoded.id,
      mobile: decoded.mobile,
      email: decoded.email,
      verified: decoded.verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        success: false,
        error: {
          code: error.code || 'AUTHENTICATION_FAILED',
          message: error.message,
          details: { suggestion: 'Please login again or refresh your token' },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
        details: error instanceof Error ? { message: error.message } : {},
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};

/**
 * Middleware to optionally authenticate seller requests
 * Sets req.seller if token is valid, but doesn't fail if token is missing
 */
export const optionalSellerAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = sellerAuthService.verifyAccessToken(token);
        req.seller = {
          id: decoded.id,
          mobile: decoded.mobile,
          email: decoded.email,
          verified: decoded.verified
        };
      } catch (error) {
        // Ignore token errors for optional auth
        console.warn('Optional auth token invalid:', error);
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    console.warn('Optional authentication error:', error);
    next();
  }
};

/**
 * Middleware to require verified sellers only
 */
export const requireVerifiedSeller = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.seller) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        details: { suggestion: 'Please login first' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }

  if (!req.seller.verified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Mobile number verification is required',
        details: { suggestion: 'Please verify your mobile number first' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }

  next();
};