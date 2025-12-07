import { Router, Request, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminService } from '../services/admin.service';
import { asyncHandler } from '../middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AdminLoginRequest, CreateAdminRequest } from '../types/admin.types';
import { RefreshTokenRequest } from '../types/auth.types';

const router = Router();
const adminAuthService = new AdminAuthService();
const adminService = new AdminService();

/**
 * Admin login
 * POST /api/v1/auth/admin/login
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body as AdminLoginRequest;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Username and password are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await adminAuthService.login(username, password, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: result.admin.id,
          username: result.admin.username,
          name: result.admin.name,
          email: result.admin.email,
          role: result.admin.role,
          isActive: result.admin.isActive,
        },
        tokens: result.tokens,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Refresh admin access token
 * POST /api/v1/auth/admin/refresh-token
 */
router.post(
  '/refresh-token',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const tokens = await adminAuthService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        tokens,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Admin logout
 * POST /api/v1/auth/admin/logout
 */
router.post(
  '/logout',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.sub;
    const { refreshToken } = req.body as RefreshTokenRequest;

    await adminAuthService.logout(adminId, refreshToken);

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get current admin profile
 * GET /api/v1/auth/admin/me
 */
router.get(
  '/me',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.sub;
    const admin = await adminService.findById(adminId);

    if (!admin) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          lastLoginAt: admin.lastLoginAt,
          createdAt: admin.createdAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Create new admin (super admin only)
 * POST /api/v1/auth/admin/create
 */
router.post(
  '/create',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is super admin
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super admins can create new admins',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const { username, password, name, email, role } = req.body as CreateAdminRequest;

    if (!username || !password || !name || !email || !role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'All fields are required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const admin = await adminService.createAdmin(username, password, name, email, role);

    // Log admin creation
    await adminService.logAuditAction(
      req.user!.sub,
      'CREATE_ADMIN',
      'admin',
      admin.id,
      { username, name, email, role },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get audit logs with filtering
 * GET /api/v1/auth/admin/audit-logs
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      limit = '100',
      offset = '0',
      adminId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
    } = req.query;

    const filters: any = {};
    if (adminId) filters.adminId = adminId as string;
    if (action) filters.action = action as string;
    if (resourceType) filters.resourceType = resourceType as string;
    if (resourceId) filters.resourceId = resourceId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await adminService.getAuditLogs(
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    const page = Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1;
    const pageSize = parseInt(limit as string);

    res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
      },
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        totalItems: result.total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get audit log by ID
 * GET /api/v1/auth/admin/audit-logs/:id
 */
router.get(
  '/audit-logs/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const log = await adminService.getAuditLogById(req.params.id);

    if (!log) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AUDIT_LOG_NOT_FOUND',
          message: 'Audit log not found',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        log,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

export default router;
