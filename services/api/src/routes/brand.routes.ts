import { Router, Request, Response, NextFunction } from 'express';
import { brandService } from '../services/brand.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, BadRequestError } from '@shambit/shared';
import {
  CreateBrandDto,
  UpdateBrandDto,
  BrandListQuery,
} from '../types/brand.types';

const router = Router();

/**
 * @route   GET /api/v1/brands/search
 * @desc    Search brands (public)
 * @access  Public
 */
router.get(
  '/search',
  validate({
    query: [
      { field: 'query', required: true, type: 'string', minLength: 2, maxLength: 100 },
      { field: 'limit', type: 'string', pattern: /^\d+$/ },
      { field: 'isActive', type: 'string', enum: ['true', 'false'] },
    ]
  }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query.query as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const isActive = req.query.isActive === 'true' ? true : undefined;

    const brands = await brandService.searchBrands(query, limit, isActive);

    res.json({
      success: true,
      data: brands,
    });
  })
);

/**
 * @route   GET /api/v1/brands
 * @desc    Get all brands with filtering and pagination (public)
 * @access  Public
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: BrandListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize
          ? Math.min(parseInt(req.query.pageSize as string, 10), 100)
          : undefined,
        search: req.query.search as string,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined,
        country: req.query.country as string,
      };

      const result = await brandService.getBrands(query);

      res.json({
        success: true,
        data: result.brands,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/brands/:id
 * @desc    Get brand by ID (public)
 * @access  Public
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = await brandService.getBrandById(req.params.id);

      res.json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/brands
 * @desc    Create a new brand
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateBrandDto = req.body;

      // Validation
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Brand name is required', 400, 'VALIDATION_ERROR');
      }

      if (data.name.length > 255) {
        throw new AppError(
          'Brand name must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.website && !data.website.match(/^https?:\/\/.+/)) {
        throw new AppError(
          'Website must be a valid URL (starting with http:// or https://)',
          400,
          'VALIDATION_ERROR'
        );
      }

      const brand = await brandService.createBrand(data);

      res.status(201).json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/brands/:id
 * @desc    Update a brand
 * @access  Admin only
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdateBrandDto = req.body;

      // Validation
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new AppError('Brand name cannot be empty', 400, 'VALIDATION_ERROR');
      }

      if (data.name && data.name.length > 255) {
        throw new AppError(
          'Brand name must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.website && !data.website.match(/^https?:\/\/.+/)) {
        throw new AppError(
          'Website must be a valid URL (starting with http:// or https://)',
          400,
          'VALIDATION_ERROR'
        );
      }

      const brand = await brandService.updateBrand(req.params.id, data);

      res.json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/brands/:id
 * @desc    Delete a brand
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await brandService.deleteBrand(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/brands/:id/logo
 * @desc    Upload brand logo
 * @access  Admin only
 */
router.post(
  '/:id/logo',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    
    // Handle file upload
    await new Promise<void>((resolve, reject) => {
      upload.single('logo')(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      throw new BadRequestError('No logo file uploaded');
    }

    const result = await brandService.uploadBrandLogo(req.params.id, req.file.buffer);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   PATCH /api/v1/brands/:id/toggle-active
 * @desc    Toggle brand active status
 * @access  Admin only
 */
router.patch(
  '/:id/toggle-active',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brand = await brandService.getBrandById(req.params.id);
      
      const updatedBrand = await brandService.updateBrand(req.params.id, {
        isActive: !brand.isActive,
      });

      res.json({
        success: true,
        data: updatedBrand,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
