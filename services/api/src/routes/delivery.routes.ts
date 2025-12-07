import { Router, Request, Response, NextFunction } from 'express';
import { deliveryService } from '../services/delivery.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { z } from 'zod';
import { createLogger } from '@shambit/shared';

const router = Router();
const logger = createLogger('delivery-routes');

/**
 * GET /api/v1/delivery/status-overview
 * Get delivery status overview (Admin only)
 * NOTE: This must be defined BEFORE /personnel/:id route
 */
router.get(
  '/status-overview',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get delivery statistics
      const overview = await deliveryService.getDeliveryStatusOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Validation schemas
const createDeliveryPersonnelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
    email: z.string().email().optional(),
    vehicleType: z.enum(['bike', 'scooter', 'bicycle']).optional(),
    vehicleNumber: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }),
});

const updateDeliveryPersonnelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    email: z.string().email().optional(),
    vehicleType: z.enum(['bike', 'scooter', 'bicycle']).optional(),
    vehicleNumber: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }),
});

const updateLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

/**
 * POST /api/v1/delivery/personnel
 * Create delivery personnel (Admin only)
 */
router.post(
  '/personnel',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const personnel = await deliveryService.createDeliveryPersonnel(
        req.body,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/personnel
 * Get all delivery personnel (Admin only)
 */
router.get(
  '/personnel',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const isAvailable = req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined;

      const result = await deliveryService.getAllDeliveryPersonnel(
        { isActive, isAvailable },
        page,
        pageSize
      );

      res.json({
        success: true,
        data: result.personnel,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
          totalItems: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/personnel/:id/metrics
 * Get delivery personnel metrics (Admin only)
 * NOTE: This must be defined BEFORE /personnel/:id route
 */
router.get(
  '/personnel/:id/metrics',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await deliveryService.getDeliveryMetrics(req.params.id);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/personnel/:id
 * Get delivery personnel by ID (Admin only)
 */
router.get(
  '/personnel/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const personnel = await deliveryService.getDeliveryPersonnelById(req.params.id);

      res.json({
        success: true,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/delivery/personnel/:id
 * Update delivery personnel (Admin only)
 */
router.put(
  '/personnel/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const personnel = await deliveryService.updateDeliveryPersonnel(
        req.params.id,
        req.body,
        req.user!.id
      );

      res.json({
        success: true,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/delivery/personnel/:id
 * Delete delivery personnel (Admin only)
 */
router.delete(
  '/personnel/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deliveryService.deleteDeliveryPersonnel(req.params.id, req.user!.id);

      res.json({
        success: true,
        message: 'Delivery personnel deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/delivery/personnel/:id/password
 * Reset delivery personnel password (Admin only)
 */
router.put(
  '/personnel/:id/password',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Password is required',
          },
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Password must be at least 6 characters long',
          },
        });
      }

      await deliveryService.resetDeliveryPersonnelPassword(
        req.params.id,
        password,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// REMOVED: Legacy delivery app location tracking routes
// These were part of the separate delivery app that has been removed
// Location tracking is no longer needed for simplified delivery management

/**
 * PUT /api/v1/delivery/personnel/:id/location
 * Update delivery personnel location
 * REMOVED: Part of legacy delivery app
 */
// router.put(
//   '/personnel/:id/location',
//   authenticate,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       // Verify that the user is updating their own location or is an admin
//       if (req.user!.type !== 'admin' && req.user!.id !== req.params.id) {
//         return res.status(403).json({
//           success: false,
//           error: {
//             code: 'FORBIDDEN',
//             message: 'You can only update your own location',
//           },
//         });
//       }

//       await deliveryService.updateLocation(req.params.id, req.body);

//       res.json({
//         success: true,
//         message: 'Location updated successfully',
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

/**
 * GET /api/v1/delivery/personnel/:id/location
 * Get delivery personnel location
 * REMOVED: Part of legacy delivery app
 */
// router.get(
//   '/personnel/:id/location',
//   authenticate,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const location = await deliveryService.getLocation(req.params.id);

//       if (!location) {
//         return res.status(404).json({
//           success: false,
//           error: {
//             code: 'LOCATION_NOT_FOUND',
//             message: 'Location not available',
//           },
//         });
//       }

//       res.json({
//         success: true,
//         data: location,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );



/**
 * POST /api/v1/delivery/assign
 * Assign order to delivery personnel (Admin only)
 */
router.post(
  '/assign',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, deliveryPersonnelId } = req.body;

      if (!orderId || !deliveryPersonnelId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'orderId and deliveryPersonnelId are required',
          },
        });
      }

      const delivery = await deliveryService.assignDelivery(
        { orderId, deliveryPersonnelId },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/active
 * Get all active deliveries (Admin only)
 */
router.get(
  '/active',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deliveries = await deliveryService.getActiveDeliveries();

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery
 * Get all deliveries with filters (Admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: any = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 20,
      };

      if (req.query.status) {
        query.status = req.query.status;
      }

      if (req.query.deliveryPersonnelId) {
        query.deliveryPersonnelId = req.query.deliveryPersonnelId;
      }

      if (req.query.startDate) {
        query.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        query.endDate = new Date(req.query.endDate as string);
      }

      const result = await deliveryService.getAllDeliveries(query);

      res.json({
        success: true,
        data: result.deliveries,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(result.total / query.pageSize),
          totalItems: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/my-deliveries
 * Get deliveries assigned to current delivery personnel
 */
router.get(
  '/my-deliveries',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify user is delivery personnel
      if (req.user!.type !== 'delivery') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery personnel can access this endpoint',
          },
        });
      }

      const status = req.query.status as string | undefined;
      const deliveries = await deliveryService.getDeliveriesByPersonnel(
        req.user!.id,
        status
      );

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/my-stats
 * Get statistics for current delivery personnel
 */
router.get(
  '/my-stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify user is delivery personnel
      if (req.user!.type !== 'delivery') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery personnel can access this endpoint',
          },
        });
      }

      const stats = await deliveryService.getDeliveryPersonnelWithStats(req.user!.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/my-history
 * Get delivery history for current delivery personnel
 */
router.get(
  '/my-history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify user is delivery personnel
      if (req.user!.type !== 'delivery') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery personnel can access this endpoint',
          },
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await deliveryService.getDeliveryHistory(
        req.user!.id,
        page,
        pageSize
      );

      res.json({
        success: true,
        data: result.deliveries,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
          totalItems: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/:id
 * Get delivery by ID
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delivery = await deliveryService.getDeliveryById(req.params.id);

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/delivery/:id/status
 * Update delivery status
 */
router.put(
  '/:id/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'status is required',
          },
        });
      }

      const delivery = await deliveryService.updateDeliveryStatus(
        req.params.id,
        { status },
        req.user!.id,
        req.user!.type as 'admin' | 'delivery'
      );

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/:orderId/track
 * Track delivery by order ID (Customer)
 */
router.get(
  '/:orderId/track',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trackingInfo = await deliveryService.trackDelivery(req.params.orderId);

      res.json({
        success: true,
        data: trackingInfo,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/delivery/:id/reassign
 * Reassign delivery to different personnel (Admin only)
 */
router.put(
  '/:id/reassign',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deliveryPersonnelId } = req.body;

      if (!deliveryPersonnelId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'deliveryPersonnelId is required',
          },
        });
      }

      const delivery = await deliveryService.reassignDelivery(
        req.params.id,
        deliveryPersonnelId,
        req.user!.id
      );

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/delivery/:id/eta
 * Calculate ETA for delivery
 * REMOVED: Part of legacy delivery app with complex routing
 */
// router.get(
//   '/:id/eta',
//   authenticate,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const eta = await deliveryService.calculateETA(req.params.id);

//       res.json({
//         success: true,
//         data: eta,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

export default router;

