import { createLogger, RateLimitError, UnauthorizedError } from '@shambit/shared';
import { AdminService } from './admin.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthTokens } from '../types/auth.types';
import { Admin } from '../types/admin.types';

const logger = createLogger('admin-auth-service');

interface LoginAttemptData {
  count: number;
  expiresAt: number;
}

interface SessionData {
  adminId: string;
  expiresAt: number;
}

/**
 * Admin Authentication Service with rate limiting
 * Uses in-memory storage (suitable for single-server startup deployment)
 */
export class AdminAuthService {
  private adminService = new AdminService();
  
  // Static maps to persist across instances
  private static loginAttempts = new Map<string, LoginAttemptData>();
  private static sessions = new Map<string, SessionData>();
  
  private MAX_LOGIN_ATTEMPTS = 5;
  private ATTEMPT_WINDOW = 900000; // 15 minutes in milliseconds
  private LOCKOUT_DURATION = 3600000; // 1 hour in milliseconds
  private SESSION_TIMEOUT = 3600000; // 60 minutes in milliseconds

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Clean login attempts
    for (const [key, data] of AdminAuthService.loginAttempts.entries()) {
      if (data.expiresAt < now) {
        AdminAuthService.loginAttempts.delete(key);
      }
    }
    
    // Clean sessions
    for (const [key, data] of AdminAuthService.sessions.entries()) {
      if (data.expiresAt < now) {
        AdminAuthService.sessions.delete(key);
      }
    }
  }

  /**
   * Check rate limiting for login attempts
   */
  async checkLoginRateLimit(username: string): Promise<void> {
    this.cleanupExpired();
    
    const now = Date.now();
    const attemptData = AdminAuthService.loginAttempts.get(username);

    if (attemptData && attemptData.expiresAt > now && attemptData.count >= this.MAX_LOGIN_ATTEMPTS) {
      throw new RateLimitError(
        'Too many login attempts. Account locked for 1 hour',
        'LOGIN_RATE_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(username: string): Promise<void> {
    const now = Date.now();
    const attemptData = AdminAuthService.loginAttempts.get(username);

    if (attemptData && attemptData.expiresAt > now) {
      attemptData.count++;
      if (attemptData.count >= this.MAX_LOGIN_ATTEMPTS) {
        // Lock account for 1 hour
        attemptData.expiresAt = now + this.LOCKOUT_DURATION;
      }
    } else {
      AdminAuthService.loginAttempts.set(username, {
        count: 1,
        expiresAt: now + this.ATTEMPT_WINDOW,
      });
    }
  }

  /**
   * Clear login attempts on successful login
   */
  async clearLoginAttempts(username: string): Promise<void> {
    AdminAuthService.loginAttempts.delete(username);
  }

  /**
   * Create admin session
   */
  async createSession(adminId: string, accessToken: string): Promise<void> {
    const now = Date.now();
    AdminAuthService.sessions.set(adminId, {
      adminId,
      expiresAt: now + this.SESSION_TIMEOUT,
    });
  }

  /**
   * Update session activity (refresh timeout)
   */
  async updateSessionActivity(adminId: string): Promise<void> {
    const now = Date.now();
    const sessionData = AdminAuthService.sessions.get(adminId);
    
    if (sessionData && sessionData.expiresAt > now) {
      // Refresh the expiry
      sessionData.expiresAt = now + this.SESSION_TIMEOUT;
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(adminId: string): Promise<boolean> {
    this.cleanupExpired();
    const now = Date.now();
    const sessionData = AdminAuthService.sessions.get(adminId);
    return sessionData !== undefined && sessionData.expiresAt > now;
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(adminId: string): Promise<void> {
    AdminAuthService.sessions.delete(adminId);
  }

  /**
   * Admin login
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ admin: Admin; tokens: AuthTokens }> {
    // Check rate limiting
    await this.checkLoginRateLimit(username);

    try {
      // Authenticate admin
      const admin = await this.adminService.authenticate(username, password);

      // Clear login attempts on successful login
      await this.clearLoginAttempts(username);

      // Update last login
      await this.adminService.updateLastLogin(admin.id);

      // Log login action
      await this.adminService.logAuditAction(
        admin.id,
        'LOGIN',
        'admin',
        admin.id,
        undefined,
        ipAddress,
        userAgent
      );

      // Generate tokens
      const accessToken = generateAccessToken(admin.id, 'admin', admin.role);
      const refreshToken = generateRefreshToken(admin.id, 'admin');

      // Create session
      await this.createSession(admin.id, accessToken);

      logger.info('Admin logged in', { adminId: admin.id, username });

      return {
        admin,
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      // Increment login attempts on failure
      await this.incrementLoginAttempts(username);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if token is revoked
    const isRevoked = await this.isTokenRevoked(refreshToken);
    if (isRevoked) {
      throw new UnauthorizedError('Refresh token has been revoked', 'TOKEN_REVOKED');
    }

    // Check if admin exists and is active
    const admin = await this.adminService.findById(payload.sub);
    if (!admin) {
      throw new UnauthorizedError('Admin not found', 'ADMIN_NOT_FOUND');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account is inactive', 'ACCOUNT_INACTIVE');
    }

    // Check if session is still valid
    const sessionValid = await this.isSessionValid(admin.id);
    if (!sessionValid) {
      throw new UnauthorizedError('Session expired. Please login again', 'SESSION_EXPIRED');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(admin.id, 'admin', admin.role);
    const newRefreshToken = generateRefreshToken(admin.id, 'admin');

    // Update session
    await this.createSession(admin.id, newAccessToken);

    // Revoke old refresh token
    await this.revokeToken(refreshToken);

    logger.info('Admin access token refreshed', { adminId: admin.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout admin
   */
  async logout(adminId: string, refreshToken?: string): Promise<void> {
    // Delete session
    await this.deleteSession(adminId);

    // Revoke refresh token if provided
    if (refreshToken) {
      await this.revokeToken(refreshToken);
    }

    // Log logout action
    await this.adminService.logAuditAction(
      adminId,
      'LOGOUT',
      'admin',
      adminId
    );

    logger.info('Admin logged out', { adminId });
  }

  /**
   * Revoke token (simplified - no longer using Redis)
   * For a startup, token revocation can be handled by short expiry times
   */
  private async revokeToken(token: string): Promise<void> {
    // Token revocation removed - rely on short token expiry instead
    logger.info('Admin token revocation requested (no-op after Redis removal)', { token: token.substring(0, 10) + '...' });
  }

  /**
   * Check if token is revoked (simplified - always returns false)
   */
  private async isTokenRevoked(token: string): Promise<boolean> {
    // Token revocation check removed - always return false
    return false;
  }
}
