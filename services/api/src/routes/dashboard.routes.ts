import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import { dashboardService } from '../services/dashboard.service';

interface DateRange {
  startDate: string;
  endDate: string;
}

const router = Router();

/**
 * Get sales metrics
 * GET /api/v1/dashboard/sales-metrics
 * Admin only
 */
router.get('/sales-metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange: DateRange | undefined = req.query.startDate && req.query.endDate 
      ? {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        }
      : undefined;

    const salesMetrics = await dashboardService.getSalesMetrics(dateRange);

    res.json({
      success: true,
      data: salesMetrics,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch sales metrics',
        },
      });
    }
  }
});

/**
 * Get comprehensive product management dashboard data
 * GET /api/v1/dashboard/product-management
 * Admin only
 */
router.get('/product-management', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange: DateRange | undefined = req.query.startDate && req.query.endDate 
      ? {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        }
      : undefined;

    const dashboardData = await dashboardService.getProductManagementDashboard(dateRange);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product management dashboard data',
        },
      });
    }
  }
});

/**
 * Get product management metrics
 * GET /api/v1/dashboard/product-metrics
 * Admin only
 */
router.get('/product-metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = await dashboardService.getProductManagementMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product metrics',
        },
      });
    }
  }
});

/**
 * Get product performance metrics
 * GET /api/v1/dashboard/product-performance
 * Admin only
 */
router.get('/product-performance', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange: DateRange | undefined = req.query.startDate && req.query.endDate 
      ? {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        }
      : undefined;

    const performance = await dashboardService.getProductPerformanceMetrics(dateRange);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product performance metrics',
        },
      });
    }
  }
});

/**
 * Get inventory alerts
 * GET /api/v1/dashboard/inventory-alerts
 * Admin only
 */
router.get('/inventory-alerts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const alerts = await dashboardService.getInventoryAlerts(limit);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory alerts',
        },
      });
    }
  }
});

/**
 * Get bulk operation summary
 * GET /api/v1/dashboard/bulk-operations
 * Admin only
 */
router.get('/bulk-operations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const summary = await dashboardService.getBulkOperationSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bulk operation summary',
        },
      });
    }
  }
});

/**
 * Get recent product activity
 * GET /api/v1/dashboard/product-activity
 * Admin only
 */
router.get('/product-activity', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const activity = await dashboardService.getProductActivity(limit);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product activity',
        },
      });
    }
  }
});

/**
 * Dismiss inventory alert
 * POST /api/v1/dashboard/inventory-alerts/:alertId/dismiss
 * Admin only
 */
router.post('/inventory-alerts/:alertId/dismiss', requireAdmin, async (req: Request, res: Response) => {
  try {
    await dashboardService.dismissInventoryAlert(req.params.alertId);

    res.json({
      success: true,
      data: { message: 'Alert dismissed successfully' },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to dismiss alert',
        },
      });
    }
  }
});

/**
 * Export product performance report
 * GET /api/v1/dashboard/product-performance/export
 * Admin only
 */
router.get('/product-performance/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dateRange: DateRange | undefined = req.query.startDate && req.query.endDate 
      ? {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        }
      : undefined;

    const format = (req.query.format as string) || 'csv';
    
    if (format !== 'csv') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Only CSV format is supported',
        },
      });
      return;
    }

    const csvContent = await dashboardService.exportProductPerformanceReport(dateRange, format);

    // Set headers for CSV download
    const filename = `product-performance-${dateRange?.startDate || 'all'}-${dateRange?.endDate || 'time'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(csvContent);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.constructor.name,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export product performance report',
        },
      });
    }
  }
});

export default router;