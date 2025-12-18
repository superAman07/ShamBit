import { Router, Request, Response } from 'express';
import { sellerService } from '../services/seller.service';
import { productService } from '../services/product.service';
import { inventoryService } from '../services/inventory.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, sanitizeInput } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware';
import { AppError } from '@shambit/shared';
import { CreateProductDto, UpdateProductDto } from '../types/product.types';

// Extend Request interface to include seller
declare global {
  namespace Express {
    interface Request {
      seller?: any;
    }
  }
}

const router = Router();

// Middleware to ensure seller is authenticated and approved
const authenticateSeller = async (req: Request, res: Response, next: any) => {
  await authenticate(req, res, async (error: any) => {
    if (error) return next(error);
    
    // Verify seller exists and is approved
    const seller = await sellerService.getSellerById(req.user!.sub);
    if (!seller) {
      throw new AppError('Seller not found', 404, 'SELLER_NOT_FOUND');
    }
    
    if (seller.status !== 'approved') {
      throw new AppError('Seller account not approved', 403, 'SELLER_NOT_APPROVED');
    }
    
    req.seller = seller;
    next();
  });
};

/**
 * @route GET /api/v1/seller-portal/dashboard
 * @desc Get seller dashboard data
 * @access Private (Seller)
 */
router.get(
  '/dashboard',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    
    const dashboardData = await sellerService.getSellerDashboard(sellerId);

    res.status(200).json({
      success: true,
      data: dashboardData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/products
 * @desc Get seller's products with pagination and filters
 * @access Private (Seller)
 */
router.get(
  '/products',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string; // pending, approved, rejected, hold
    const isActive = req.query.isActive as string;

    const result = await productService.getSellerProducts(sellerId, {
      page,
      pageSize,
      search,
      verificationStatus: status,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-portal/products
 * @desc Create a new product (seller)
 * @access Private (Seller)
 */
router.post(
  '/products',
  authenticateSeller,
  sanitizeInput,
  validate({
    body: [
      { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 255 },
      { field: 'description', type: 'string', maxLength: 2000 },
      { field: 'categoryId', required: true, type: 'string' },
      { field: 'brandId', type: 'string' },
      { field: 'mrp', required: true, type: 'number', min: 0.01 },
      { field: 'sellingPrice', required: true, type: 'number', min: 0.01 },
      { field: 'weight', type: 'number', min: 0 },
      { field: 'unit', type: 'string' },
      { field: 'sku', type: 'string' },
      { field: 'barcode', type: 'string' },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const data: CreateProductDto = {
      ...req.body,
      sellerId, // Associate product with seller
      verificationStatus: 'pending', // All seller products start as pending
      isActive: false, // Inactive until approved
      isSellable: false, // Not sellable until approved
    };

    // Validate selling price vs MRP
    if (data.sellingPrice > data.mrp) {
      throw new AppError(
        'Selling price cannot be greater than MRP',
        400,
        'INVALID_PRICE'
      );
    }

    const product = await productService.createProduct(data);

    // Create initial inventory record with 0 stock
    await inventoryService.createInventory({
      productId: product.id,
      totalStock: 0,
      thresholdStock: 10,
    }, sellerId);

    res.status(201).json({
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/products/:id
 * @desc Get seller's product by ID
 * @access Private (Seller)
 */
router.get(
  '/products/:id',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const productId = req.params.id;

    const product = await productService.getSellerProduct(sellerId, productId);

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route PUT /api/v1/seller-portal/products/:id
 * @desc Update seller's product
 * @access Private (Seller)
 */
router.put(
  '/products/:id',
  authenticateSeller,
  sanitizeInput,
  validate({
    body: [
      { field: 'name', type: 'string', minLength: 2, maxLength: 255 },
      { field: 'description', type: 'string', maxLength: 2000 },
      { field: 'mrp', type: 'number', min: 0.01 },
      { field: 'sellingPrice', type: 'number', min: 0.01 },
      { field: 'weight', type: 'number', min: 0 },
      { field: 'unit', type: 'string' },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const productId = req.params.id;
    const data: UpdateProductDto = req.body;

    // Verify product belongs to seller
    const existingProduct = await productService.getSellerProduct(sellerId, productId);
    if (!existingProduct) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validate selling price vs MRP if both are provided
    if (data.sellingPrice && data.mrp && data.sellingPrice > data.mrp) {
      throw new AppError(
        'Selling price cannot be greater than MRP',
        400,
        'INVALID_PRICE'
      );
    }

    // If product was rejected/hold, reset to pending on update
    if (existingProduct.verificationStatus === 'rejected' || existingProduct.verificationStatus === 'hold') {
      data.verificationStatus = 'pending';
      data.verificationNotes = undefined; // Clear previous notes
    }

    const product = await productService.updateProduct(productId, data);

    res.status(200).json({
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-portal/products/:id/images
 * @desc Upload product images
 * @access Private (Seller)
 */
router.post(
  '/products/:id/images',
  authenticateSeller,
  validate({
    body: [
      { field: 'imageUrls', required: true, type: 'array' },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const productId = req.params.id;
    const { imageUrls } = req.body;

    // Verify product belongs to seller
    const product = await productService.getSellerProduct(sellerId, productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validate image URLs
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new AppError('At least one image URL is required', 400, 'INVALID_IMAGES');
    }

    const updatedProduct = await productService.addProductImages(productId, imageUrls);

    res.status(200).json({
      success: true,
      data: updatedProduct,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/inventory
 * @desc Get seller's inventory
 * @access Private (Seller)
 */
router.get(
  '/inventory',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const stockLevel = req.query.stockLevel as string;

    const result = await inventoryService.getSellerInventory(sellerId, {
      page,
      pageSize,
      search,
      stockLevel: stockLevel as 'Normal' | 'Low' | 'Out',
    });

    res.status(200).json({
      success: true,
      data: result.inventory,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route PUT /api/v1/seller-portal/inventory/:productId
 * @desc Update product inventory (seller can only update their own products)
 * @access Private (Seller)
 */
router.put(
  '/inventory/:productId',
  authenticateSeller,
  validate({
    body: [
      { field: 'totalStock', type: 'number', min: 0 },
      { field: 'thresholdStock', type: 'number', min: 0 },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const productId = req.params.productId;
    const { totalStock, thresholdStock } = req.body;

    // Verify product belongs to seller
    const product = await productService.getSellerProduct(sellerId, productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const inventory = await inventoryService.updateInventory(
      productId,
      { totalStock, thresholdStock },
      sellerId
    );

    res.status(200).json({
      success: true,
      data: inventory,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/categories
 * @desc Get available categories (read-only for sellers)
 * @access Private (Seller)
 */
router.get(
  '/categories',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryService } = await import('../services/category.service');
    
    const result = await categoryService.getCategories({
      isActive: true,
      page: 1,
      pageSize: 100,
    });

    res.status(200).json({
      success: true,
      data: result.categories,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/brands
 * @desc Get available brands (read-only for sellers)
 * @access Private (Seller)
 */
router.get(
  '/brands',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const { brandService } = await import('../services/brand.service');
    
    const result = await brandService.getBrands({
      isActive: true,
      page: 1,
      pageSize: 100,
    });

    res.status(200).json({
      success: true,
      data: result.brands,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-portal/category-request
 * @desc Request new category creation (admin approval required)
 * @access Private (Seller)
 */
router.post(
  '/category-request',
  authenticateSeller,
  validate({
    body: [
      { field: 'categoryName', required: true, type: 'string', minLength: 2 },
      { field: 'description', type: 'string' },
      { field: 'reason', required: true, type: 'string', minLength: 10 },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const { categoryName, description, reason } = req.body;

    const request = await sellerService.createCategoryRequest(sellerId, {
      categoryName,
      description,
      reason,
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'Category request submitted. Admin will review and respond.',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route POST /api/v1/seller-portal/brand-request
 * @desc Request new brand creation (admin approval required)
 * @access Private (Seller)
 */
router.post(
  '/brand-request',
  authenticateSeller,
  validate({
    body: [
      { field: 'brandName', required: true, type: 'string', minLength: 2 },
      { field: 'description', type: 'string' },
      { field: 'reason', required: true, type: 'string', minLength: 10 },
    ]
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const { brandName, description, reason } = req.body;

    const request = await sellerService.createBrandRequest(sellerId, {
      brandName,
      description,
      reason,
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'Brand request submitted. Admin will review and respond.',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/requests
 * @desc Get seller's category/brand requests
 * @access Private (Seller)
 */
router.get(
  '/requests',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const type = req.query.type as string; // 'category' | 'brand'

    const requests = await sellerService.getSellerRequests(sellerId, type);

    res.status(200).json({
      success: true,
      data: requests,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route GET /api/v1/seller-portal/notifications
 * @desc Get seller notifications (verification updates, etc.)
 * @access Private (Seller)
 */
router.get(
  '/notifications',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await sellerService.getSellerNotifications(sellerId, {
      page,
      pageSize,
      unreadOnly,
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

/**
 * @route PUT /api/v1/seller-portal/notifications/:id/read
 * @desc Mark notification as read
 * @access Private (Seller)
 */
router.put(
  '/notifications/:id/read',
  authenticateSeller,
  asyncHandler(async (req: Request, res: Response) => {
    const sellerId = req.user!.sub;
    const notificationId = req.params.id;

    await sellerService.markNotificationAsRead(sellerId, notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
      },
    });
  })
);

export default router;