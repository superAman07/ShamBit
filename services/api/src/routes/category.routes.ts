import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { categoryService } from '../services/category.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryListQuery,
} from '../types/category.types';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize filename: remove spaces and special characters
    const sanitizedName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(sanitizedName));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories with hierarchical support (public)
 * @access  Public
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: CategoryListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string, 10)
          : undefined,
        parentId: req.query.parentId as string,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
        isFeatured:
          req.query.isFeatured !== undefined
            ? req.query.isFeatured === 'true'
            : undefined,
        includeSubcategories:
          req.query.includeSubcategories !== undefined
            ? req.query.includeSubcategories === 'true'
            : undefined,
      };

      const result = await categoryService.getCategories(query);

      res.json({
        success: true,
        data: result.categories,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/categories/hierarchy
 * @desc    Get complete category hierarchy (public)
 * @access  Public
 */
router.get(
  '/hierarchy',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hierarchy = await categoryService.getCategoryHierarchy();

      res.json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/categories/featured
 * @desc    Get featured categories (public)
 * @access  Public
 */
router.get(
  '/featured',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const featuredCategories = await categoryService.getFeaturedCategories();

      res.json({
        success: true,
        data: featuredCategories,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID (public)
 * @access  Public
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await categoryService.getCategoryById(req.params.id);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category with enhanced fields
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateCategoryDto = req.body;

      // Clean up empty strings to undefined
      if (data.parentId === '') data.parentId = undefined;
      if (data.description === '') data.description = undefined;
      if (data.imageUrl === '') data.imageUrl = undefined;
      if (data.bannerUrl === '') data.bannerUrl = undefined;
      if (data.iconUrl === '') data.iconUrl = undefined;
      if (data.metaTitle === '') data.metaTitle = undefined;
      if (data.metaDescription === '') data.metaDescription = undefined;

      console.log('[Category Create] Received data:', JSON.stringify(data, null, 2));

      // Validation
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
      }

      if (data.name.length > 100) {
        throw new AppError(
          'Category name must be less than 100 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.metaTitle && data.metaTitle.length > 255) {
        throw new AppError(
          'Meta title must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.metaDescription && data.metaDescription.length > 255) {
        throw new AppError(
          'Meta description must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      const category = await categoryService.createCategory(data);

      console.log('[Category Create] Success:', category.id);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error('[Category Create] Error:', error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update a category with enhanced fields
 * @access  Admin only
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdateCategoryDto = req.body;

      // Validation
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new AppError('Category name cannot be empty', 400, 'VALIDATION_ERROR');
      }

      if (data.name && data.name.length > 100) {
        throw new AppError(
          'Category name must be less than 100 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.metaTitle && data.metaTitle.length > 255) {
        throw new AppError(
          'Meta title must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.metaDescription && data.metaDescription.length > 255) {
        throw new AppError(
          'Meta description must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      const category = await categoryService.updateCategory(req.params.id, data);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete a category
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await categoryService.deleteCategory(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/categories/:id/subcategories
 * @desc    Get subcategories for a category (public)
 * @access  Public
 */
router.get(
  '/:id/subcategories',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subcategories = await categoryService.getSubcategories(req.params.id);

      res.json({
        success: true,
        data: subcategories,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/categories/:id/image
 * @desc    Upload category main image
 * @access  Admin only
 */
router.post(
  '/:id/image',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      
      if (!file) {
        throw new AppError('No image file provided', 400, 'NO_FILE_PROVIDED');
      }

      const imageUrl = `/uploads/${file.filename}`;
      
      const category = await categoryService.updateCategory(req.params.id, {
        imageUrl,
      });

      res.json({
        success: true,
        data: {
          category,
          imageUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/categories/:id/banner
 * @desc    Upload category banner image
 * @access  Admin only
 */
router.post(
  '/:id/banner',
  authenticate,
  authorize('admin'),
  upload.single('banner'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      
      if (!file) {
        throw new AppError('No banner file provided', 400, 'NO_FILE_PROVIDED');
      }

      const bannerUrl = `/uploads/${file.filename}`;
      
      const category = await categoryService.updateCategory(req.params.id, {
        bannerUrl,
      });

      res.json({
        success: true,
        data: {
          category,
          bannerUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/categories/:id/icon
 * @desc    Upload category icon
 * @access  Admin only
 */
router.post(
  '/:id/icon',
  authenticate,
  authorize('admin'),
  upload.single('icon'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      
      if (!file) {
        throw new AppError('No icon file provided', 400, 'NO_FILE_PROVIDED');
      }

      const iconUrl = `/uploads/${file.filename}`;
      
      const category = await categoryService.updateCategory(req.params.id, {
        iconUrl,
      });

      res.json({
        success: true,
        data: {
          category,
          iconUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
