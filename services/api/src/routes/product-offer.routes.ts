import { Router, Request, Response, NextFunction } from 'express';
import { productOfferService } from '../services/product-offer.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import {
  CreateProductOfferDto,
  UpdateProductOfferDto,
  ProductOfferListQuery,
  BulkProductOfferOperation,
} from '../types/product-offer.types';

const router = Router();

/**
 * @route   POST /api/v1/product-offers
 * @desc    Create a new product offer
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateProductOfferDto = req.body;

      // Validation
      // Product ID is optional for banners (hero, promotional, etc.)
      // Only validate if provided
      if (data.productId && data.productId.trim().length === 0) {
        throw new AppError('Product ID cannot be empty', 400, 'VALIDATION_ERROR');
      }

      if (!data.offerTitle || data.offerTitle.trim().length === 0) {
        throw new AppError('Offer title is required', 400, 'VALIDATION_ERROR');
      }

      if (data.offerTitle.length > 255) {
        throw new AppError(
          'Offer title must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!data.discountType || !['Flat', 'Percentage'].includes(data.discountType)) {
        throw new AppError(
          'Discount type must be either "Flat" or "Percentage"',
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

      const offer = await productOfferService.createProductOffer(data);

      res.status(201).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/product-offers/bulk
 * @desc    Create bulk product offers
 * @access  Admin only
 */
router.post(
  '/bulk',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const operation: BulkProductOfferOperation = req.body;

      if (!operation.productIds || !Array.isArray(operation.productIds) || operation.productIds.length === 0) {
        throw new AppError('Product IDs array is required', 400, 'VALIDATION_ERROR');
      }

      if (!operation.offerData) {
        throw new AppError('Offer data is required', 400, 'VALIDATION_ERROR');
      }

      const offers = await productOfferService.createBulkProductOffers(operation);

      res.status(201).json({
        success: true,
        data: offers,
        meta: {
          totalRequested: operation.productIds.length,
          totalCreated: offers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers
 * @desc    Get all product offers
 * @access  Admin only
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: ProductOfferListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string, 10)
          : undefined,
        productId: req.query.productId as string,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
        includeExpired:
          req.query.includeExpired !== undefined
            ? req.query.includeExpired === 'true'
            : undefined,
        discountType: req.query.discountType as any,
      };

      const result = await productOfferService.getProductOffers(query);

      res.json({
        success: true,
        data: result.offers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers/expiring
 * @desc    Get expiring offers
 * @access  Admin only
 */
router.get(
  '/expiring',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const daysAhead = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      
      if (daysAhead < 1 || daysAhead > 365) {
        throw new AppError('Days ahead must be between 1 and 365', 400, 'VALIDATION_ERROR');
      }

      const offers = await productOfferService.getExpiringOffers(daysAhead);

      res.json({
        success: true,
        data: offers,
        meta: {
          daysAhead,
          count: offers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers/:id
 * @desc    Get product offer by ID
 * @access  Admin only
 */
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offer = await productOfferService.getProductOfferById(req.params.id);

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/product-offers/:id
 * @desc    Update a product offer
 * @access  Admin only
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdateProductOfferDto = req.body;

      const offer = await productOfferService.updateProductOffer(req.params.id, data);

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/v1/product-offers/:id/toggle
 * @desc    Toggle product offer active status
 * @access  Admin only
 */
router.patch(
  '/:id/toggle',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new AppError('isActive must be a boolean value', 400, 'VALIDATION_ERROR');
      }

      const offer = await productOfferService.toggleOfferStatus(req.params.id, isActive);

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/product-offers/:id
 * @desc    Delete a product offer
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await productOfferService.deleteProductOffer(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:productId/offers
 * @desc    Get active offers for a specific product
 * @access  Public (for customer-facing apps)
 */
router.get(
  '/product/:productId/active',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offers = await productOfferService.getActiveOffersForProduct(req.params.productId);

      res.json({
        success: true,
        data: offers,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/product-offers/validate
 * @desc    Validate a product offer
 * @access  Public (for customer-facing apps)
 */
router.post(
  '/validate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId, offerId } = req.body;

      if (!productId) {
        throw new AppError('Product ID is required', 400, 'VALIDATION_ERROR');
      }

      const result = await productOfferService.validateProductOffer(productId, offerId);

      res.json({
        success: result.isValid,
        data: result.isValid
          ? {
              offer: result.offer,
              discountAmount: result.discountAmount,
              finalPrice: result.finalPrice,
            }
          : null,
        error: result.isValid ? undefined : {
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
 * @route   GET /api/v1/product-offers/banners/active
 * @desc    Get all active banners for customer app
 * @access  Public
 */
router.get(
  '/banners/active',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bannerType = req.query.type as string | undefined;
      const banners = await productOfferService.getActiveBanners(bannerType);

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers/banners/hero
 * @desc    Get hero banners for home screen carousel
 * @access  Public
 */
router.get(
  '/banners/hero',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const banners = await productOfferService.getHeroBanners();

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers/banners/promotional
 * @desc    Get promotional banners
 * @access  Public
 */
router.get(
  '/banners/promotional',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const banners = await productOfferService.getPromotionalBanners();

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/product-offers/banners/category
 * @desc    Get category banners
 * @access  Public
 */
router.get(
  '/banners/category',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const banners = await productOfferService.getCategoryBanners();

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
