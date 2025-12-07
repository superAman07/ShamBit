import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import { imageOptimizationService } from '../services/image-optimization.service';

const router = Router();

// Configure multer to use memory storage for processing
const storage = multer.memoryStorage();

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
    fileSize: 10 * 1024 * 1024, // 10MB limit (will be optimized)
  },
});

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload and optimize a single image
 * @access  Admin only
 */
router.post(
  '/image',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'NO_FILE');
      }

      // Validate image
      const validation = await imageOptimizationService.validateImage(req.file.buffer);
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid image', 400, 'INVALID_IMAGE');
      }

      // Optimize image
      const optimized = await imageOptimizationService.optimizeImage(
        req.file.buffer,
        req.file.originalname,
        {
          quality: 85,
          format: 'webp',
        }
      );

      res.json({
        success: true,
        data: {
          imageUrl: optimized.url,
          width: optimized.width,
          height: optimized.height,
          format: optimized.format,
          size: optimized.size,
          originalName: req.file.originalname,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload and optimize multiple images
 * @access  Admin only
 */
router.post(
  '/images',
  authenticate,
  authorize('admin'),
  upload.array('images', 10), // Max 10 images
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        throw new AppError('No image files provided', 400, 'NO_FILES');
      }

      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          // Validate image (relaxed validation for product images - min 100x100)
          const validation = await imageOptimizationService.validateImage(file.buffer, {
            minWidth: 100,
            minHeight: 100
          });
          if (!validation.valid) {
            throw new AppError(
              `Invalid image ${file.originalname}: ${validation.error}`,
              400,
              'INVALID_IMAGE'
            );
          }

          // Optimize image
          const optimized = await imageOptimizationService.optimizeImage(
            file.buffer,
            file.originalname,
            {
              quality: 85,
              format: 'webp',
            }
          );

          return {
            imageUrl: optimized.url,
            width: optimized.width,
            height: optimized.height,
            format: optimized.format,
            size: optimized.size,
            originalName: file.originalname,
          };
        })
      );

      res.json({
        success: true,
        data: {
          images: uploadedImages,
          count: uploadedImages.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/banner
 * @desc    Upload and generate banner image variants (desktop, mobile, thumbnail)
 * @access  Admin only
 */
router.post(
  '/banner',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'NO_FILE');
      }

      // Validate image (strict validation for banners - min 400x200)
      const validation = await imageOptimizationService.validateImage(req.file.buffer, {
        minWidth: 400,
        minHeight: 200
      });
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid image', 400, 'INVALID_IMAGE');
      }

      // Generate banner variants
      const variants = await imageOptimizationService.generateBannerVariants(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        success: true,
        data: {
          variants,
          originalName: req.file.originalname,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;