import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import { customerService } from '../services/customer.service';
import {
  getCustomersQuerySchema,
  blockCustomerSchema,
  unblockCustomerSchema,
  updateVerificationStatusSchema,
  addCustomerNoteSchema,
  getCustomerOrdersQuerySchema,
  customerIdParamSchema,
} from '../types/customer.types';
import { z } from 'zod';
import { logger } from '../config/logger.config';

const router = Router();

/**
 * Helper function to extract IP address from request
 */
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Middleware to validate request with Zod schema
 */
function validateRequest(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Error handler wrapper for async route handlers
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized error handler for customer routes
 */
function handleError(error: unknown, res: Response, defaultMessage: string) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code || error.constructor.name,
        message: error.message,
      },
    });
  } else {
    // Log the actual error for debugging
    logger.error('Customer route error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      defaultMessage,
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: defaultMessage,
      },
    });
  }
}

/**
 * Get customer statistics
 * GET /api/v1/admin/customers/statistics
 * Admin only
 */
router.get(
  '/statistics',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const statistics = await customerService.getCustomerStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      handleError(error, res, 'Failed to fetch customer statistics');
    }
  })
);

export default router;

/**
 * Get paginated list of customers with search and filters
 * GET /api/v1/admin/customers
 * Admin only
 */
router.get(
  '/',
  requireAdmin,
  validateRequest(getCustomersQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        page,
        pageSize,
        search,
        verificationStatus,
        accountStatus,
        sortBy,
        sortOrder,
      } = req.query as any;

      // Build filters
      const filters = {
        search,
        verificationStatus,
        accountStatus,
      };

      // Build pagination
      const pagination = {
        page: page || 1,
        pageSize: pageSize || 20,
      };

      // Build sorting
      const sorting = {
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc',
      };

      // Get customers
      const { customers, pagination: paginationMeta } = await customerService.getCustomers(
        filters,
        pagination,
        sorting
      );

      // Get statistics
      const statistics = await customerService.getCustomerStatistics();

      res.json({
        success: true,
        data: customers,
        pagination: paginationMeta,
        statistics,
      });
    } catch (error) {
      handleError(error, res, 'Failed to fetch customers');
    }
  })
);

/**
 * Get customer details by ID
 * GET /api/v1/admin/customers/:id
 * Admin only
 */
router.get(
  '/:id',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const customerDetails = await customerService.getCustomerById(id);

      res.json({
        success: true,
        data: customerDetails,
      });
    } catch (error) {
      handleError(error, res, 'Failed to fetch customer details');
    }
  })
);

/**
 * Block a customer account
 * PUT /api/v1/admin/customers/:id/block
 * Admin only
 */
router.put(
  '/:id/block',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  validateRequest(blockCustomerSchema, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.sub; // Admin ID from JWT token
      const ipAddress = getIpAddress(req);

      await customerService.blockCustomer(id, adminId, reason, ipAddress);

      res.json({
        success: true,
        message: 'Customer blocked successfully',
        data: {
          id,
          isBlocked: true,
        },
      });
    } catch (error) {
      handleError(error, res, 'Failed to block customer');
    }
  })
);

/**
 * Unblock a customer account
 * PUT /api/v1/admin/customers/:id/unblock
 * Admin only
 */
router.put(
  '/:id/unblock',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  validateRequest(unblockCustomerSchema, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.sub; // Admin ID from JWT token
      const ipAddress = getIpAddress(req);

      await customerService.unblockCustomer(id, adminId, reason, ipAddress);

      res.json({
        success: true,
        message: 'Customer unblocked successfully',
        data: {
          id,
          isBlocked: false,
        },
      });
    } catch (error) {
      handleError(error, res, 'Failed to unblock customer');
    }
  })
);

/**
 * Update customer verification status
 * PUT /api/v1/admin/customers/:id/verification-status
 * Admin only
 */
router.put(
  '/:id/verification-status',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  validateRequest(updateVerificationStatusSchema, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { verificationStatus } = req.body;
      const adminId = req.user!.sub; // Admin ID from JWT token
      const ipAddress = getIpAddress(req);

      await customerService.updateVerificationStatus(id, adminId, verificationStatus, ipAddress);

      res.json({
        success: true,
        message: 'Verification status updated successfully',
        data: {
          id,
          verificationStatus,
        },
      });
    } catch (error) {
      handleError(error, res, 'Failed to update verification status');
    }
  })
);

/**
 * Add a note to customer profile
 * POST /api/v1/admin/customers/:id/notes
 * Admin only
 */
router.post(
  '/:id/notes',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  validateRequest(addCustomerNoteSchema, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { noteText } = req.body;
      const adminId = req.user!.sub; // Admin ID from JWT token

      const note = await customerService.addCustomerNote(id, adminId, noteText);

      res.json({
        success: true,
        message: 'Note added successfully',
        data: note,
      });
    } catch (error) {
      handleError(error, res, 'Failed to add customer note');
    }
  })
);

/**
 * Get customer order history with date filter
 * GET /api/v1/admin/customers/:id/orders
 * Admin only
 */
router.get(
  '/:id/orders',
  requireAdmin,
  validateRequest(customerIdParamSchema, 'params'),
  validateRequest(getCustomerOrdersQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page, pageSize, startDate, endDate } = req.query as any;

      // Build pagination
      const pagination = {
        page: page || 1,
        pageSize: pageSize || 10,
      };

      // Build date filter
      const dateFilter = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const { orders, pagination: paginationMeta } = await customerService.getCustomerOrders(
        id,
        pagination,
        dateFilter
      );

      res.json({
        success: true,
        data: orders,
        pagination: paginationMeta,
      });
    } catch (error) {
      handleError(error, res, 'Failed to fetch customer orders');
    }
  })
);
