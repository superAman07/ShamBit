import { Router, Request, Response, NextFunction } from 'express';
import { promotionService } from '../services/promotion.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionListQuery,
  ValidatePromotionRequest,
} from '../types/promotion.types';

const router = Router();

/**
 * @route   POST /api/v1/promotions
 * @desc    Create a new promotion
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreatePromotionDto = req.body;

      // Validation
      if (!data.code || data.code.trim().length === 0) {
        throw new AppError('Promotion code is required', 400, 'VALIDATION_ERROR');
      }

      if (data.code.length > 50) {
        throw new AppError(
          'Promotion code must be less than 50 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!data.discountType || !['percentage', 'fixed'].includes(data.discountType)) {
        throw new AppError(
          'Discount type must be either "percentage" or "fixed"',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.discountValue === undefined || data.discountValue === null) {
        throw new AppError('Discount value is required', 400, 'VALIDATION_ERROR');
      }

      if (!data.startDate || !data.endDate) {
        throw new AppError('Start date and end date are required', 400, 'VALIDATION_ERROR');
      }

      const adminId = req.user!.id;
      const promotion = await promotionService.createPromotion(data, adminId);

      res.status(201).json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/promotions
 * @desc    Get all promotions
 * @access  Admin only
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: PromotionListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string, 10)
          : undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
        includeExpired:
          req.query.includeExpired !== undefined
            ? req.query.includeExpired === 'true'
            : undefined,
      };

      const result = await promotionService.getPromotions(query);

      res.json({
        success: true,
        data: result.promotions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/promotions/:id
 * @desc    Get promotion by ID
 * @access  Admin only
 */
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const promotion = await promotionService.getPromotionById(req.params.id);

      res.json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/promotions/:id
 * @desc    Update a promotion
 * @access  Admin only
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdatePromotionDto = req.body;

      const promotion = await promotionService.updatePromotion(req.params.id, data);

      res.json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/promotions/:id
 * @desc    Delete a promotion
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await promotionService.deletePromotion(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/promotions/available
 * @desc    Get available promotions for customers
 * @access  Public
 */
router.get(
  '/available',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      
      // Get all active promotions that are currently valid
      const result = await promotionService.getPromotions({
        isActive: true,
        includeExpired: false,
      });

      // Filter to only show promotions within date range
      const availablePromotions = result.promotions.filter(promotion => {
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        return startDate <= now && endDate >= now && promotion.isActive;
      });

      // Remove sensitive fields and format for customer display
      const customerPromotions = availablePromotions.map(promotion => ({
        id: promotion.id,
        code: promotion.code,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        minOrderValue: promotion.minOrderValue,
        maxDiscountAmount: promotion.maxDiscountAmount,
        endDate: promotion.endDate,
      }));

      res.json({
        success: true,
        data: customerPromotions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/promotions/validate
 * @desc    Validate a promo code
 * @access  Authenticated users
 */
router.post(
  '/validate',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, orderAmount } = req.body;

      if (!code || !orderAmount) {
        throw new AppError(
          'Promo code and order amount are required',
          400,
          'VALIDATION_ERROR'
        );
      }

      const request: ValidatePromotionRequest = {
        code,
        userId: req.user!.id,
        orderAmount,
      };

      const result = await promotionService.validatePromotion(request);

      res.json({
        success: result.valid,
        data: result.valid
          ? {
              promotion: result.promotion,
              discountAmount: result.discountAmount,
            }
          : null,
        error: result.valid ? undefined : {
          message: result.error,
          code: result.errorCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/promotions/:id/usage
 * @desc    Get promotion usage statistics
 * @access  Admin only
 */
router.get(
  '/:id/usage',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await promotionService.getPromotionUsageStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
