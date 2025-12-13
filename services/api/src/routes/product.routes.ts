import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, commonValidations, sanitizeInput } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError, BadRequestError, createLogger } from '@shambit/shared';
import { ErrorCodes } from '../utils/errorCodes';
import { publicRateLimit } from '../middleware/rateLimiting.middleware';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductListQuery,
} from '../types/product.types';

const router = Router();
const logger = createLogger('product-routes');

/**
 * @route   GET /api/v1/products/barcode/:barcode
 * @desc    Get product by barcode (public)
 * @access  Public
 */
router.get(
  '/barcode/:barcode',
  validate({
    params: [
      { field: 'barcode', required: true, type: 'string', minLength: 1, maxLength: 100 }
    ]
  }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await productService.getProductByBarcode(req.params.barcode);

    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * @route   GET /api/v1/products/sku/:sku
 * @desc    Get product by SKU (public)
 * @access  Public
 */
router.get(
  '/sku/:sku',
  validate({
    params: [
      { field: 'sku', required: true, type: 'string', minLength: 1, maxLength: 100 }
    ]
  }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await productService.getProductBySKU(req.params.sku);

    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * @route   GET /api/v1/products/search
 * @desc    Search products with full-text search (public)
 * @access  Public
 */
router.get(
  '/search',
  sanitizeInput,
  validate({
    query: [
      { field: 'search', required: true, type: 'string', minLength: 2, maxLength: 100 },
      { field: 'q', type: 'string', minLength: 2, maxLength: 100 },
      { field: 'page', type: 'number', min: 1 },
      { field: 'pageSize', type: 'number', min: 1, max: 100 },
      { field: 'categoryId', type: 'string' },
      { field: 'brandId', type: 'string' },
      { field: 'minPrice', type: 'number', min: 0 },
      { field: 'maxPrice', type: 'number', min: 0 },
      { field: 'isActive', type: 'string', enum: ['true', 'false'] },
      { field: 'isFeatured', type: 'string', enum: ['true', 'false'] },
      { field: 'isSellable', type: 'string', enum: ['true', 'false'] },
    ]
  }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: ProductListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined,
      categoryId: req.query.categoryId as string,
      brandId: req.query.brandId as string,
      isActive: req.query.isActive === 'false' ? false : true, // Default to active products
      isFeatured: req.query.isFeatured === 'true' ? true : undefined,
      isSellable: req.query.isSellable === 'false' ? false : undefined,
      search: req.query.q as string || req.query.search as string,
      minPrice: req.query.minPrice
        ? parseFloat(req.query.minPrice as string)
        : undefined,
      maxPrice: req.query.maxPrice
        ? parseFloat(req.query.maxPrice as string)
        : undefined,
      brand: req.query.brand as string,
      sku: req.query.sku as string,
      barcode: req.query.barcode as string,
      tags: req.query.tags as string,
      attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : undefined,
    };

    const result = await productService.getProducts(query);

    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination,
      meta: {
        query: query.search,
          filters: {
            categoryId: query.categoryId,
            brandId: query.brandId,
            brand: query.brand,
            priceRange: {
              min: query.minPrice,
              max: query.maxPrice,
            },
          },
        },
      });
  })
);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with filtering and pagination (public)
 * @access  Public
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: ProductListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize
          ? Math.min(parseInt(req.query.pageSize as string, 10), 100) // Limit max page size
          : undefined,
        categoryId: req.query.categoryId as string,
        brandId: req.query.brandId as string,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
        isFeatured: req.query.isFeatured === 'true' ? true : undefined,
        isSellable: req.query.isSellable === 'false' ? false : undefined,
        search: req.query.search as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        brand: req.query.brand as string,
        sku: req.query.sku as string,
        barcode: req.query.barcode as string,
        tags: req.query.tags as string,
        attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : undefined,
      };

      const result = await productService.getProducts(query);

      // Set cache headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'ETag': `"${Buffer.from(JSON.stringify(query)).toString('base64')}"` // Base64 encoded ETag
      });

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/bulk-upload/template
 * @desc    Download CSV template for bulk upload
 * @access  Admin only
 */
router.get(
  '/bulk-upload/template',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const template = productService.getBulkUploadTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-bulk-upload-template.csv');
    res.send(template);
  })
);

/**
 * @route   POST /api/v1/products/bulk-upload
 * @desc    Bulk upload products via CSV
 * @access  Admin only
 */
router.post(
  '/bulk-upload',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    
    // Handle file upload
    await new Promise<void>((resolve, reject) => {
      upload.single('file')(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const result = await productService.bulkUploadProducts(req.file.buffer);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   GET /api/v1/products/filters
 * @desc    Get available product filters (categories, brands, price ranges)
 * @access  Public
 * @performance Optimized with caching and rate limiting to prevent repeated calls
 */
router.get(
  '/filters',
  publicRateLimit, // PERFORMANCE FIX: Add rate limiting to prevent API spam
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Import services dynamically to avoid circular dependencies
    const { categoryService } = await import('../services/category.service');
    const { brandService } = await import('../services/brand.service');

    // Get active categories
    const categoriesResult = await categoryService.getCategories({
      isActive: true,
      page: 1,
      pageSize: 100,
    });

    // Get active brands
    const brandsResult = await brandService.getBrands({
      isActive: true,
      page: 1,
      pageSize: 100,
    });

    // Get price range from products
    const stats = await productService.getProductStats();

    // PERFORMANCE FIX: Add aggressive caching headers to prevent repeated calls
    res.set({
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // Cache for 30 minutes, serve stale for 1 hour
      'ETag': `"filters-${Date.now()}"`, // Simple ETag for cache validation
      'Vary': 'Accept-Encoding', // Vary by encoding for better caching
    });

    res.json({
      success: true,
      data: {
        categories: categoriesResult.categories,
        brands: brandsResult.brands,
        priceRange: stats.priceRange,
      },
    });
  })
);

/**
 * @route   GET /api/v1/products/feed
 * @desc    Get product feed with cursor pagination and filtering
 * @access  Public
 */
router.get(
  '/feed',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: ProductListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize
          ? Math.min(parseInt(req.query.pageSize as string, 10), 100)
          : 20,
        categoryId: req.query.subcategoryId as string, // Mobile app uses subcategoryId
        brandId: req.query.brandId as string,
        isActive: true, // Only active products in feed
        isFeatured: req.query.isFeatured === 'true' ? true : undefined,
        isSellable: req.query.isSellable === 'false' ? false : undefined,
        search: req.query.search as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        brand: req.query.brand as string,
        sku: req.query.sku as string,
        barcode: req.query.barcode as string,
        tags: req.query.tags as string,
        attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : undefined,
      };

      // Parse filters from mobile app (JSON string)
      let filters = {};
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          // Ignore invalid JSON filters
        }
      }

      // Apply filters to query
      Object.assign(query, filters);

      const result = await productService.getProducts(query);

      // Format response for mobile app compatibility
      res.json({
        success: true,
        data: {
          products: result.products,
          cursor: result.pagination.page < result.pagination.totalPages 
            ? `page_${result.pagination.page + 1}` 
            : null,
          hasMore: result.pagination.page < result.pagination.totalPages,
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID (public)
 * @access  Public
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.getProductById(req.params.id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products
 * @desc    Create a new product
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateProductDto = req.body;

      // Convert string numbers to actual numbers (defensive programming)
      if (typeof data.mrp === 'string') {
        data.mrp = parseFloat(data.mrp);
      }
      if (typeof data.sellingPrice === 'string') {
        data.sellingPrice = parseFloat(data.sellingPrice);
      }
      if (typeof data.taxPercent === 'string') {
        data.taxPercent = parseFloat(data.taxPercent);
      }
      if (typeof data.discountPercent === 'string') {
        data.discountPercent = parseFloat(data.discountPercent);
      }
      if (typeof data.weight === 'string') {
        data.weight = parseFloat(data.weight);
      }
      if (typeof data.shelfLifeDays === 'string') {
        data.shelfLifeDays = parseInt(data.shelfLifeDays, 10);
      }

      // Validation
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Product name is required', 400, 'VALIDATION_ERROR');
      }

      if (data.name.length > 255) {
        throw new AppError(
          'Product name must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!data.sellingPrice || isNaN(data.sellingPrice) || data.sellingPrice <= 0) {
        throw new AppError(
          'Product selling price must be greater than 0',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!data.mrp || isNaN(data.mrp) || data.mrp <= 0) {
        throw new AppError(
          'Product MRP must be greater than 0',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.sellingPrice > data.mrp) {
        throw new AppError(
          'Product selling price cannot be greater than MRP',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate SKU format if provided
      if (data.sku && !/^[A-Z0-9-]+$/.test(data.sku)) {
        throw new AppError(
          'SKU must contain only uppercase letters, numbers, and hyphens',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate barcode format if provided
      if (data.barcode && !/^[0-9]+$/.test(data.barcode)) {
        throw new AppError(
          'Barcode must contain only numbers',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate tax and discount percentages
      if (data.taxPercent !== undefined && (data.taxPercent < 0 || data.taxPercent > 100)) {
        throw new AppError(
          'Tax percentage must be between 0 and 100',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
        throw new AppError(
          'Discount percentage must be between 0 and 100',
          400,
          'VALIDATION_ERROR'
        );
      }

      const product = await productService.createProduct(data);

      // Always create inventory record with 0 stock (stock managed via inventory page)
      try {
        const { inventoryService } = await import('../services/inventory.service');
        
        await inventoryService.createInventory({
          productId: product.id,
          totalStock: 0,
          thresholdStock: 10,
        }, req.user?.id);

        logger.info('Inventory record created for product', {
          productId: product.id,
          initialStock: 0,
        });
      } catch (inventoryError) {
        logger.error('Failed to create inventory record', { error: inventoryError, productId: product.id });
        // Don't fail the product creation if inventory creation fails
      }

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update a product
 * @access  Admin only
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdateProductDto = req.body;

      // Validation
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new AppError('Product name cannot be empty', 400, 'VALIDATION_ERROR');
      }

      if (data.name && data.name.length > 255) {
        throw new AppError(
          'Product name must be less than 255 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.sellingPrice !== undefined && data.sellingPrice <= 0) {
        throw new AppError(
          'Product selling price must be greater than 0',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.mrp !== undefined && data.mrp <= 0) {
        throw new AppError(
          'Product MRP must be greater than 0',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (
        data.sellingPrice !== undefined &&
        data.mrp !== undefined &&
        data.sellingPrice > data.mrp
      ) {
        throw new AppError(
          'Product selling price cannot be greater than MRP',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate SKU format if provided
      if (data.sku && !/^[A-Z0-9-]+$/.test(data.sku)) {
        throw new AppError(
          'SKU must contain only uppercase letters, numbers, and hyphens',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate barcode format if provided
      if (data.barcode && !/^[0-9]+$/.test(data.barcode)) {
        throw new AppError(
          'Barcode must contain only numbers',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate tax and discount percentages
      if (data.taxPercent !== undefined && (data.taxPercent < 0 || data.taxPercent > 100)) {
        throw new AppError(
          'Tax percentage must be between 0 and 100',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
        throw new AppError(
          'Discount percentage must be between 0 and 100',
          400,
          'VALIDATION_ERROR'
        );
      }

      const product = await productService.updateProduct(req.params.id, data);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete a product
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await productService.deleteProduct(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:id/images
 * @desc    Get all images for a product
 * @access  Public
 */
router.get(
  '/:id/images',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const images = await productService.getProductImages(req.params.id);

      res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products/:id/images
 * @desc    Create a new product image or add multiple images (legacy support)
 * @access  Admin only
 */
router.post(
  '/:id/images',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Handle both single image and multiple images (legacy support)
      if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
        // Legacy format: { imageUrls: string[] }
        const { imageUrls } = req.body;
        
        if (imageUrls.length === 0) {
          throw new AppError('imageUrls array cannot be empty', 400, 'VALIDATION_ERROR');
        }

        // Validate URLs
        for (const url of imageUrls) {
          if (typeof url !== 'string' || url.trim().length === 0) {
            throw new AppError('Invalid image URL', 400, 'VALIDATION_ERROR');
          }
        }

        const product = await productService.addProductImages(req.params.id, imageUrls);

        res.status(201).json({
          success: true,
          data: product,
        });
      } else {
        // New format: single image object
        const { imageUrl, altText, displayOrder, isPrimary } = req.body;

        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
          throw new AppError('imageUrl is required', 400, 'VALIDATION_ERROR');
        }

        const image = await productService.createProductImage(req.params.id, {
          imageUrl,
          altText,
          displayOrder,
          isPrimary,
        });

        res.status(201).json({
          success: true,
          data: image,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/products/:id/images/:imageId
 * @desc    Update a product image
 * @access  Admin only
 */
router.put(
  '/:id/images/:imageId',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { altText, displayOrder, isPrimary } = req.body;

      const image = await productService.updateProductImage(
        req.params.id,
        req.params.imageId,
        {
          altText,
          displayOrder,
          isPrimary,
        }
      );

      res.json({
        success: true,
        data: image,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/products/:id/images/:imageId
 * @desc    Delete a product image
 * @access  Admin only
 */
router.delete(
  '/:id/images/:imageId',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await productService.deleteProductImage(req.params.id, req.params.imageId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/products/:id/images/reorder
 * @desc    Reorder product images
 * @access  Admin only
 */
router.put(
  '/:id/images/reorder',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageOrders } = req.body;

      if (!imageOrders || !Array.isArray(imageOrders)) {
        throw new AppError(
          'imageOrders must be an array of {id, displayOrder} objects',
          400,
          'VALIDATION_ERROR'
        );
      }

      const images = await productService.reorderProductImages(
        req.params.id,
        imageOrders
      );

      res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products/:id/images/legacy
 * @desc    Add images to a product (legacy method)
 * @access  Admin only
 */
router.post(
  '/:id/images/legacy',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrls } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new AppError(
          'imageUrls must be a non-empty array',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate URLs
      for (const url of imageUrls) {
        if (typeof url !== 'string' || url.trim().length === 0) {
          throw new AppError('Invalid image URL', 400, 'VALIDATION_ERROR');
        }
      }

      const product = await productService.addProductImages(
        req.params.id,
        imageUrls
      );

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:id/attributes
 * @desc    Get all attributes for a product
 * @access  Public
 */
router.get(
  '/:id/attributes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attributes = await productService.getProductAttributes(req.params.id);

      res.json({
        success: true,
        data: attributes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products/:id/attributes
 * @desc    Create a new product attribute
 * @access  Admin only
 */
router.post(
  '/:id/attributes',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attributeName, attributeValue } = req.body;

      if (!attributeName || typeof attributeName !== 'string' || attributeName.trim().length === 0) {
        throw new AppError('attributeName is required', 400, 'VALIDATION_ERROR');
      }

      if (!attributeValue || typeof attributeValue !== 'string' || attributeValue.trim().length === 0) {
        throw new AppError('attributeValue is required', 400, 'VALIDATION_ERROR');
      }

      const attribute = await productService.createProductAttribute(req.params.id, {
        attributeName: attributeName.trim(),
        attributeValue: attributeValue.trim(),
      });

      res.status(201).json({
        success: true,
        data: attribute,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/products/:id/attributes/:attributeId
 * @desc    Update a product attribute
 * @access  Admin only
 */
router.put(
  '/:id/attributes/:attributeId',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attributeName, attributeValue } = req.body;

      const attribute = await productService.updateProductAttribute(
        req.params.id,
        req.params.attributeId,
        {
          attributeName: attributeName?.trim(),
          attributeValue: attributeValue?.trim(),
        }
      );

      res.json({
        success: true,
        data: attribute,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/products/:id/attributes/:attributeId
 * @desc    Delete a product attribute
 * @access  Admin only
 */
router.delete(
  '/:id/attributes/:attributeId',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await productService.deleteProductAttribute(req.params.id, req.params.attributeId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/by-attribute/:attributeName
 * @desc    Get products by attribute name
 * @access  Public
 */
router.get(
  '/by-attribute/:attributeName',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attributeName } = req.params;
      const { attributeValue } = req.query;

      const products = await productService.getProductsByAttribute(
        attributeName,
        attributeValue as string
      );

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get(
  '/featured',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

      const result = await productService.getProducts({
        page,
        pageSize,
        isFeatured: true,
        isActive: true,
        isSellable: true,
      });

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/v1/products/:id/toggle-featured
 * @desc    Toggle product featured status
 * @access  Admin only
 */
router.patch(
  '/:id/toggle-featured',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.getProductById(req.params.id);
      
      const updatedProduct = await productService.updateProduct(req.params.id, {
        isFeatured: !product.isFeatured,
      });

      res.json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/v1/products/:id/toggle-active
 * @desc    Toggle product active status
 * @access  Admin only
 */
router.patch(
  '/:id/toggle-active',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await productService.getProductById(req.params.id);
      
      const updatedProduct = await productService.updateProduct(req.params.id, {
        isActive: !product.isActive,
      });

      res.json({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/stats
 * @desc    Get product statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await productService.getProductStats();

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
 * @route   PATCH /api/v1/products/bulk-update
 * @desc    Bulk update products
 * @access  Admin only
 */
router.patch(
  '/bulk-update',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productIds, updateData } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new AppError(
          'productIds must be a non-empty array',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new AppError(
          'updateData is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      await productService.bulkUpdateProducts(productIds, updateData);

      res.json({
        success: true,
        message: `Successfully updated ${productIds.length} products`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products/bulk-status
 * @desc    Bulk update product status
 * @access  Admin only
 */
router.post(
  '/bulk-status',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productIds, isActive } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        throw new AppError(
          'productIds must be a non-empty array',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (typeof isActive !== 'boolean') {
        throw new AppError(
          'isActive must be a boolean',
          400,
          'VALIDATION_ERROR'
        );
      }

      const result = await productService.bulkUpdateProductStatus(productIds, isActive);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/products/bulk-prices
 * @desc    Bulk update product prices
 * @access  Admin only
 */
router.post(
  '/bulk-prices',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw new AppError(
          'updates must be a non-empty array',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate each update
      for (const update of updates) {
        if (!update.productId || typeof update.productId !== 'string') {
          throw new AppError(
            'Each update must have a valid productId',
            400,
            'VALIDATION_ERROR'
          );
        }

        if (!update.sellingPrice || typeof update.sellingPrice !== 'number' || update.sellingPrice <= 0) {
          throw new AppError(
            'Each update must have a valid sellingPrice greater than 0',
            400,
            'VALIDATION_ERROR'
          );
        }

        if (update.mrp && (typeof update.mrp !== 'number' || update.mrp <= 0)) {
          throw new AppError(
            'MRP must be a valid number greater than 0',
            400,
            'VALIDATION_ERROR'
          );
        }

        if (update.mrp && update.sellingPrice > update.mrp) {
          throw new AppError(
            'Selling price cannot be greater than MRP',
            400,
            'VALIDATION_ERROR'
          );
        }
      }

      const result = await productService.bulkUpdateProductPrices(updates);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
