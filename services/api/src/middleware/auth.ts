import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getConfig } from '@shambit/config';
import { isAccessTokenRevoked } from '../utils/jwt';

interface AuthenticatedRequest extends Request {
  seller?: {
    id: string; // Changed from number to string to support UUID
    email: string;
    type: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const config = getConfig();
  
  // Verify JWT secrets exist
  if (!config.JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_CONFIGURATION_ERROR',
        message: 'Authentication service unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required',
        timestamp: new Date().toISOString()
      }
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    if (!decoded.sellerId || !decoded.email || decoded.type !== 'seller') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token format',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check if access token is revoked (if JTI is present)
    if (decoded.jti) {
      const isRevoked = await isAccessTokenRevoked(decoded.jti);
      if (isRevoked) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Access token has been revoked',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    req.seller = {
      id: decoded.sellerId,
      email: decoded.email,
      type: decoded.type
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export { AuthenticatedRequest };