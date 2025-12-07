import { Router, Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { asyncHandler } from '../middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { CreateAdminRequest } from '../types/admin.types';
import { AdminRole } from '@shambit/shared';

const router = Router();
const adminService = new AdminService();

/**
 * Get all admins (super admin only)
 * GET /api/v1/admins
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is super admin
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super admins can view all admins',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const admins = await adminService.listAdmins(limit, offset);

    res.status(200).json({
      success: true,
      data: {
        admins: admins.map(admin => ({
          id: admin.id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          lastLoginAt: admin.lastLoginAt,
          createdAt: admin.createdAt,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get admin by ID (super admin only)
 * GET /api/v1/admins/:id
 */
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is super admin
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super admins can view admin details',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const admin = await adminService.findById(req.params.id);

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
 * POST /api/v1/admins
 */
router.post(
  '/',
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
 * Update admin (super admin only)
 * PUT /api/v1/admins/:id
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is super admin
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super admins can update admins',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const { name, email, role, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role as AdminRole;
    if (isActive !== undefined) updateData.isActive = isActive;

    const admin = await adminService.updateAdmin(req.params.id, updateData);

    // Log admin update
    await adminService.logAuditAction(
      req.user!.sub,
      'UPDATE_ADMIN',
      'admin',
      admin.id,
      updateData,
      req.ip,
      req.get('user-agent')
    );

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
 * Change admin password (super admin only)
 * PUT /api/v1/admins/:id/password
 */
router.put(
  '/:id/password',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is super admin
    if (req.user!.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super admins can change admin passwords',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PASSWORD',
          message: 'New password is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }

    await adminService.changePassword(req.params.id, newPassword);

    // Log password change
    await adminService.logAuditAction(
      req.user!.sub,
      'CHANGE_ADMIN_PASSWORD',
      'admin',
      req.params.id,
      undefined,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

export default router;
