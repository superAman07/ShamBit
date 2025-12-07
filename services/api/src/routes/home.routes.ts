import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { orderService } from '../services/order.service';

const router = Router();

/**
 * @route   GET /api/v1/home
 * @desc    Get aggregated home screen data
 * @access  Public (some data requires authentication)
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const forceRefresh = req.query.forceRefresh === 'true';
      const mfcId = req.query.mfcId as string; // Micro Fulfillment Center ID
      const userId = req.user?.id; // Optional user context

      // Fetch categories
      const categoriesResult = await categoryService.getCategories({
        isActive: true,
        page: 1,
        pageSize: 10
      });

      // Fetch featured products with MFC context for stock availability
      const featuredProductsResult = await productService.getProducts({
        isActive: true,
        page: 1,
        pageSize: 10,
        mfcId: mfcId, // Pass MFC ID for stock context
        // Only return products that are available in the specified MFC
      });

      // Initialize response data
      const homeData: any = {
        userProfile: null,
        heroBanners: [],
        valuePropositions: [
          {
            id: 'vp1',
            title: 'Live Stock',
            subtitle: 'Real-time inventory tracking',
            imageUrl: null,
            backgroundColor: '#E8F5E8',
            textColor: '#2E7D32',
            actionUrl: null,
            displayOrder: 1,
            isActive: true,
            bannerType: 'value_proposition'
          },
          {
            id: 'vp2',
            title: 'Satyatā Promise',
            subtitle: 'Truth in every transaction',
            imageUrl: null,
            backgroundColor: '#E3F2FD',
            textColor: '#1976D2',
            actionUrl: null,
            displayOrder: 2,
            isActive: true,
            bannerType: 'value_proposition'
          }
        ],
        categories: categoriesResult.categories || [],
        recentOrder: null,
        quickReorderItems: [],
        // Only include products that are available (server-driven stock guarantee)
        featuredProducts: (featuredProductsResult.products || []).filter(product => 
          product.isAvailable !== false // Only show if explicitly available or not specified
        ),
        promotionalBanners: []
      };

      // If user is authenticated, fetch personalized data
      if (userId) {
        try {
          // Get user profile (you'll need to implement this in user service)
          // homeData.userProfile = await userService.getUserProfile(userId);

          // Get recent order
          const recentOrdersResult = await orderService.getUserOrders(userId, 1, 1);

          if (recentOrdersResult.orders && recentOrdersResult.orders.length > 0) {
            const recentOrder = recentOrdersResult.orders[0];
            homeData.recentOrder = {
              orderId: recentOrder.id,
              status: recentOrder.status,
              etaMinutes: 30, // Calculate based on order status
              totalAmount: recentOrder.totalAmount,
              itemCount: recentOrder.items?.length || 0
            };
          }

          // Get quick reorder items (from order history)
          // This would need to be implemented based on your order history
          homeData.quickReorderItems = [];
        } catch (error) {
          // Log error but don't fail the entire request
          console.error('Error fetching personalized home data:', error);
        }
      }

      res.json({
        success: true,
        data: homeData
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;