import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { reportsService } from '../services/reports.service';
import { reportFiltersSchema } from '../types/reports.types';
import { z } from 'zod';

const router = Router();

/**
 * Middleware to validate report query parameters
 */
const validateReportFilters = (req: Request, res: Response, next: Function) => {
  try {
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      period: req.query.period as string | undefined,
    };

    // Validate with Zod schema
    reportFiltersSchema.parse(filters);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.issues,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * Get sales report
 * GET /api/v1/admin/reports/sales
 */
router.get(
  '/sales',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const report = await reportsService.getSalesReport(filters);

    res.status(200).json({
      success: true,
      data: report,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get revenue report
 * GET /api/v1/admin/reports/revenue
 */
router.get(
  '/revenue',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const report = await reportsService.getRevenueReport(filters);

    res.status(200).json({
      success: true,
      data: report,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Get top products report
 * GET /api/v1/admin/reports/products
 */
router.get(
  '/products',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const report = await reportsService.getTopProductsReport(filters);

    res.status(200).json({
      success: true,
      data: report,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * Export sales report to CSV
 * GET /api/v1/admin/reports/sales/export
 */
router.get(
  '/sales/export',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const csv = await reportsService.exportSalesReportCSV(filters);

    // Generate filename with date range
    const startDate = filters.startDate || new Date().toISOString().split('T')[0];
    const endDate = filters.endDate || new Date().toISOString().split('T')[0];
    const filename = `sales-report-${startDate}-to-${endDate}.csv`;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(csv);
  })
);

/**
 * Export revenue report to CSV
 * GET /api/v1/admin/reports/revenue/export
 */
router.get(
  '/revenue/export',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const csv = await reportsService.exportRevenueReportCSV(filters);

    // Generate filename with date range
    const startDate = filters.startDate || new Date().toISOString().split('T')[0];
    const endDate = filters.endDate || new Date().toISOString().split('T')[0];
    const filename = `revenue-report-${startDate}-to-${endDate}.csv`;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(csv);
  })
);

/**
 * Export products report to CSV
 * GET /api/v1/admin/reports/products/export
 */
router.get(
  '/products/export',
  authenticate,
  authorize('admin'),
  validateReportFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as any,
    };

    const csv = await reportsService.exportProductsReportCSV(filters);

    // Generate filename with date range
    const startDate = filters.startDate || new Date().toISOString().split('T')[0];
    const endDate = filters.endDate || new Date().toISOString().split('T')[0];
    const filename = `products-report-${startDate}-to-${endDate}.csv`;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(csv);
  })
);

export default router;
