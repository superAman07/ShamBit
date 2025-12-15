import { Router } from 'express';
import { sellerService } from '../services/seller.service';
import { validate } from '../middleware/validation.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/sellers/register
 * @desc Register a new seller
 * @access Public
 */
router.post('/register', validate({
  body: [
    { field: 'businessName', required: true, type: 'string', minLength: 2 },
    { field: 'businessType', required: true, type: 'string', enum: ['grocery', 'organic', 'packaged', 'other'] },
    { field: 'gstin', type: 'string' },
    { field: 'ownerName', required: true, type: 'string', minLength: 2 },
    { field: 'phone', required: true, type: 'string', pattern: /^[6-9]\d{9}$/ },
    { field: 'email', required: true, type: 'email' },
    { field: 'city', required: true, type: 'string', minLength: 2 },
  ]
}), async (req, res) => {
  try {
    const sellerData = req.body;
    const result = await sellerService.registerSeller(sellerData);
    
    res.status(201).json({
      success: true,
      message: 'Seller registration submitted successfully',
      data: result
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