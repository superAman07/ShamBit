import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@shambit/shared';
import { verifyAccessToken } from '../utils/jwt';
import { JWTPayload } from '../types/auth.types';
import { AdminAuthService } from '../services/admin-auth.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided', 'NO_AUTH_HEADER');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format', 'INVALID_AUTH_FORMAT');
    }

    const token = parts[1];
    const payload = verifyAccessToken(token);

    // For admin users, check session validity and update activity
    if (payload.type === 'admin') {
      const adminAuthService = new AdminAuthService();
      const sessionValid = await adminAuthService.isSessionValid(payload.sub);
      
      if (!sessionValid) {
        throw new UnauthorizedError('Session expired. Please login again', 'SESSION_EXPIRED');
      }

      // Update session activity to extend the timeout (sliding window)
      await adminAuthService.updateSessionActivity(payload.sub);
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - checks user type
 */
export const authorize = (...allowedTypes: Array<'customer' | 'admin' | 'delivery'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated', 'NOT_AUTHENTICATED');
      }

      if (!allowedTypes.includes(req.user.type)) {
        throw new ForbiddenError(
          'You do not have permission to access this resource',
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated', 'NOT_AUTHENTICATED');
      }

      if (!req.user.role || !allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(
          'You do not have the required role to access this resource',
          'INSUFFICIENT_ROLE'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const payload = verifyAccessToken(token);
      
      // For admin users, check session validity and update activity
      if (payload.type === 'admin') {
        const adminAuthService = new AdminAuthService();
        const sessionValid = await adminAuthService.isSessionValid(payload.sub);
        
        if (sessionValid) {
          await adminAuthService.updateSessionActivity(payload.sub);
          req.user = payload;
        }
      } else {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Require admin authentication - shorthand for authenticate + authorize admin
 */
export const requireAdmin = [authenticate, authorize('admin')];
