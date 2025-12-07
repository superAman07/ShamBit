import { Router } from 'express';
import { inventoryService } from '../services/inventory.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import {
  CreateInventoryRequest,
  UpdateInventoryRequest,
} from '../types/inventory.types';

const router = Router();

/**
 * GET /api/v1/inventory
 * Get all inventory items (Admin only)
 * NOTE: This must be defined BEFORE /:productId route
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const stockStatus = req.query.stockStatus as string;

      const result = await inventoryService.getAllInventory({
        page,
        pageSize: limit,
        search,
        stockLevel: stockStatus as 'Normal' | 'Low' | 'Out',
      });

      res.json({
        success: true,
        data: result.inventory,
        pagination: {
          page,
          pageSize: limit,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/inventory/low-stock
 * Get low stock products (Admin only)
 * NOTE: This must be defined BEFORE /:productId route
 */
router.get(
  '/low-stock',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await inventoryService.getLowStockProducts(limit);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/inventory/:productId
 * Get inventory for a specific product
 */
router.get('/:productId', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await inventoryService.getInventory(productId);

    if (!inventory) {
      throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
    }

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/inventory/:productId/aggregated
 * Get aggregated inventory across all warehouses for a product
 */
router.get('/:productId/aggregated', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.params;

    const aggregation = await inventoryService.getAggregatedInventory(productId);

    if (!aggregation) {
      throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
    }

    res.json({
      success: true,
      data: aggregation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory
 * Create inventory for a product (Admin only)
 */
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const data: CreateInventoryRequest = req.body;

    // Validation
    if (!data.productId) {
      throw new AppError('Product ID is required', 400, 'PRODUCT_ID_REQUIRED');
    }

    if (data.totalStock === undefined || data.totalStock < 0) {
      throw new AppError('Valid total stock is required', 400, 'INVALID_STOCK');
    }

    const inventory = await inventoryService.createInventory(
      data,
      req.user?.sub
    );

    res.status(201).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/inventory/:productId
 * Update inventory for a product (Admin only)
 */
router.put('/:productId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const data: UpdateInventoryRequest = req.body;

    // Validation
    if (data.totalStock !== undefined && data.totalStock < 0) {
      throw new AppError('Total stock cannot be negative', 400, 'INVALID_STOCK');
    }

    if (data.thresholdStock !== undefined && data.thresholdStock < 0) {
      throw new AppError('Low stock threshold cannot be negative', 400, 'INVALID_THRESHOLD');
    }

    const inventory = await inventoryService.updateInventory(
      productId,
      data,
      req.user?.sub
    );

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory/:productId/restock
 * Restock inventory for a product (Admin only)
 */
router.post('/:productId/restock', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, reason } = req.body;

    // Validation
    if (!quantity || quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400, 'INVALID_QUANTITY');
    }

    const inventory = await inventoryService.restockInventory(
      productId,
      quantity,
      req.user?.sub,
      reason || 'Restock'
    );

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
});

// NOTE: /low-stock route moved to top of file to avoid conflict with /:productId

/**
 * GET /api/v1/inventory/:productId/history
 * Get inventory history for a product (Admin only)
 */
router.get(
  '/:productId/history',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await inventoryService.getInventoryHistory(
        productId,
        limit
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/inventory/reserve
 * Reserve inventory for checkout
 */
router.post('/reserve', authenticate, async (req, res, next) => {
  try {
    const { items } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required', 400, 'ITEMS_REQUIRED');
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new AppError(
          'Each item must have productId and positive quantity',
          400,
          'INVALID_ITEM'
        );
      }
    }

    const reservationId = await inventoryService.reserveInventory(
      req.user!.sub,
      items
    );

    res.status(201).json({
      success: true,
      data: {
        reservationId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory/release
 * Release inventory reservation
 */
router.post('/release', authenticate, async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      throw new AppError('Reservation ID is required', 400, 'RESERVATION_ID_REQUIRED');
    }

    await inventoryService.releaseReservation(reservationId);

    res.json({
      success: true,
      message: 'Reservation released successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory/commit
 * Commit inventory reservation (on successful payment)
 */
router.post('/commit', authenticate, async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      throw new AppError('Reservation ID is required', 400, 'RESERVATION_ID_REQUIRED');
    }

    await inventoryService.commitReservation(reservationId);

    res.json({
      success: true,
      message: 'Reservation committed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory/check-availability
 * Check product availability
 */
router.post('/check-availability', authenticate, async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      throw new AppError('Product ID and quantity are required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    const isAvailable = await inventoryService.checkAvailability(
      productId,
      quantity
    );

    res.json({
      success: true,
      data: {
        available: isAvailable,
        productId,
        quantity,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
