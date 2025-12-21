import { Router } from 'express';
import { sellerService } from '../services/seller.service';
import { 
  sellerRegistrationSchema, 
  documentUploadRequestSchema,
  documentVerificationSchema,
  mobileOtpSchema,
  emailOtpSchema,
  sellerUpdateSchema,
  sellerStatusUpdateSchema
} from '../types/seller.types';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/sellers/register
 * @desc Register a new seller with comprehensive details
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    // Validate request body using Zod schema
    const validationResult = sellerRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    const sellerData = validationResult.data;
    
    // Check if seller already exists
    const existingSeller = await sellerService.findSellerByEmailOrMobile(sellerData.email, sellerData.mobile);
    if (existingSeller) {
      return res.status(409).json({
        success: false,
        message: 'Seller with this email or mobile number already exists'
      });
    }
    
    const result = await sellerService.registerSeller(sellerData);
    
    res.status(201).json({
      success: true,
      message: 'Seller registration submitted successfully. Please verify your mobile and email, then upload required documents.',
      data: {
        sellerId: result.id,
        status: result.status,
        mobileVerified: result.mobileVerified,
        emailVerified: result.emailVerified,
        documentsRequired: [
          'panCard',
          'aadhaarCard',
          result.sellerType === 'business' ? 'businessCertificate' : null,
          result.gstRegistered ? 'gstCertificate' : null,
          'addressProof',
          'photograph',
          'cancelledCheque'
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register seller',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/sellers/verify-mobile
 * @desc Send OTP to mobile number for verification
 * @access Public
 */
router.post('/verify-mobile', async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Valid mobile number is required'
      });
    }
    
    const result = await sellerService.sendMobileOtp(mobile);
    
    res.json({
      success: true,
      message: 'OTP sent to mobile number',
      data: { otpSent: true, expiresIn: 300 } // 5 minutes
    });
  } catch (error) {
    console.error('Mobile OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send mobile OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/sellers/verify-mobile-otp
 * @desc Verify mobile OTP
 * @access Public
 */
router.post('/verify-mobile-otp', async (req, res) => {
  try {
    const validationResult = mobileOtpSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number or OTP format'
      });
    }
    
    const { mobile, otp } = validationResult.data;
    const result = await sellerService.verifyMobileOtp(mobile, otp);
    
    // CRITICAL FIX: Check if verification actually succeeded
    if (result.verified) {
      res.json({
        success: true,
        message: 'Mobile number verified successfully',
        data: result
      });
    } else {
      // Return 400 status for invalid OTP
      res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check your OTP and try again.',
        data: result
      });
    }
  } catch (error) {
    console.error('Mobile OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify mobile OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/sellers/verify-email
 * @desc Send OTP to email for verification
 * @access Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required'
      });
    }
    
    const result = await sellerService.sendEmailOtp(email);
    
    res.json({
      success: true,
      message: 'OTP sent to email address',
      data: { otpSent: true, expiresIn: 300 } // 5 minutes
    });
  } catch (error) {
    console.error('Email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/sellers/verify-email-otp
 * @desc Verify email OTP
 * @access Public
 */
router.post('/verify-email-otp', async (req, res) => {
  try {
    const validationResult = emailOtpSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP format'
      });
    }
    
    const { email, otp } = validationResult.data;
    const result = await sellerService.verifyEmailOtp(email, otp);
    
    res.json({
      success: true,
      message: 'Email address verified successfully',
      data: result
    });
  } catch (error) {
    console.error('Email OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers
 * @desc Get all sellers (admin only)
 * @access Private/Admin
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, search } = req.query;
    const result = await sellerService.getSellers({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as string,
      search: search as string
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sellers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/:id
 * @desc Get seller by ID (admin only)
 * @access Private/Admin
 */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await sellerService.getSellerById(id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }
    
    res.json({
      success: true,
      data: seller
    });
  } catch (error) {
    console.error('Get seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/:id/status
 * @desc Update seller status (admin only)
 * @access Private/Admin
 */
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const result = await sellerService.updateSellerStatus(id, status, notes);
    
    res.json({
      success: true,
      message: 'Seller status updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Update seller status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update seller status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/sellers/:id/documents
 * @desc Upload seller documents
 * @access Public (for seller during registration)
 */
router.post('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    
    const validationResult = documentUploadRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document upload data',
        errors: validationResult.error.issues
      });
    }
    
    const documentData = validationResult.data;
    const result = await sellerService.uploadSellerDocument(id, documentData);
    
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: result
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/:id/documents
 * @desc Get seller document status
 * @access Public (for seller) / Private (for admin)
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await sellerService.getSellerDocuments(id);
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/:id/documents/verify
 * @desc Verify individual seller document (admin only)
 * @access Private/Admin
 */
router.put('/:id/documents/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const validationResult = documentVerificationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification data',
        errors: validationResult.error.issues
      });
    }
    
    const verificationData = validationResult.data;
    const result = await sellerService.verifySellerDocument(id, verificationData);
    
    res.json({
      success: true,
      message: `Document ${verificationData.verified ? 'verified' : 'rejected'} successfully`,
      data: result
    });
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/:id/verify
 * @desc Complete seller verification and approve/reject (admin only)
 * @access Private/Admin
 */
router.put('/:id/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const validationResult = sellerStatusUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification data',
        errors: validationResult.error.issues
      });
    }
    
    const { status, verificationNotes, rejectionReason, adminId } = validationResult.data;
    
    // Check if all required documents are verified before approval
    if (status === 'approved') {
      const documentsStatus = await sellerService.checkDocumentsVerificationStatus(id);
      if (!documentsStatus.allVerified) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve seller: Not all required documents are verified',
          data: {
            missingDocuments: documentsStatus.missingDocuments,
            unverifiedDocuments: documentsStatus.unverifiedDocuments
          }
        });
      }
    }
    
    const result = await sellerService.updateSellerVerificationStatus(id, {
      status,
      verificationNotes,
      rejectionReason,
      adminId
    });
    
    // If approved, generate and send login credentials
    if (status === 'approved') {
      await sellerService.generateAndSendCredentials(id);
    }
    
    res.json({
      success: true,
      message: `Seller ${status} successfully`,
      data: result
    });
  } catch (error) {
    console.error('Seller verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify seller',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/:id
 * @desc Update seller information (seller or admin)
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // Sellers can only update their own data, admins can update any
    if (userRole !== 'admin' && userId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own information'
      });
    }
    
    const validationResult = sellerUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data',
        errors: validationResult.error.issues
      });
    }
    
    const updateData = validationResult.data;
    const result = await sellerService.updateSeller(id, updateData);
    
    res.json({
      success: true,
      message: 'Seller information updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Update seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update seller',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/:id/products
 * @desc Get products by seller (admin only)
 * @access Private/Admin
 */
router.get('/:id/products', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const verificationStatus = req.query.verificationStatus as string;
    
    const { productService } = await import('../services/product.service');
    const result = await productService.getSellerProducts(id, {
      page,
      pageSize,
      verificationStatus,
    });
    
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/products/:productId/verify
 * @desc Verify seller product (admin only)
 * @access Private/Admin
 */
router.put('/products/:productId/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { action, notes, adminId } = req.body; // action: 'approve' | 'reject' | 'hold'
    
    const { productService } = await import('../services/product.service');
    const result = await productService.verifySellerProduct(productId, action, notes, adminId);
    
    res.json({
      success: true,
      message: `Product ${action}d successfully`,
      data: result
    });
  } catch (error) {
    console.error('Product verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/products/pending
 * @desc Get all pending products for verification (admin only)
 * @access Private/Admin
 */
router.get('/products/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const { productService } = await import('../services/product.service');
    const result = await productService.getPendingProducts({
      page,
      pageSize,
    });
    
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/products/:productId/featured
 * @desc Toggle product featured status (admin only)
 * @access Private/Admin
 */
router.put('/products/:productId/featured', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { isFeatured } = req.body;
    
    const { productService } = await import('../services/product.service');
    const result = await productService.updateProduct(productId, { isFeatured });
    
    res.json({
      success: true,
      message: `Product ${isFeatured ? 'marked as featured' : 'removed from featured'}`,
      data: result
    });
  } catch (error) {
    console.error('Update featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/requests/category
 * @desc Get category creation requests (admin only)
 * @access Private/Admin
 */
router.get('/requests/category', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    
    const result = await sellerService.getCategoryRequests({
      page,
      pageSize,
      status,
    });
    
    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get category requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/requests/brand
 * @desc Get brand creation requests (admin only)
 * @access Private/Admin
 */
router.get('/requests/brand', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    
    const result = await sellerService.getBrandRequests({
      page,
      pageSize,
      status,
    });
    
    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get brand requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/sellers/requests/:requestId/respond
 * @desc Respond to category/brand request (admin only)
 * @access Private/Admin
 */
router.put('/requests/:requestId/respond', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, notes, adminId } = req.body; // action: 'approve' | 'reject'
    
    const result = await sellerService.respondToRequest(requestId, action, notes, adminId);
    
    res.json({
      success: true,
      message: `Request ${action}d successfully`,
      data: result
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/sellers/statistics/overview
 * @desc Get seller statistics overview (admin only)
 * @access Private/Admin
 */
router.get('/statistics/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const statistics = await sellerService.getSellerStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get seller statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;