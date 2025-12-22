import { Router } from 'express';

import healthRoutes from './health';
import authRoutes from './auth.routes';
// import v1Routes from './v1'; // Commented out due to import issues
import adminAuthRoutes from './admin-auth.routes';
import adminRoutes from './admin.routes';
import profileRoutes from './profile.routes';
import categoryRoutes from './category.routes';
import brandRoutes from './brand.routes';
import productRoutes from './product.routes';
import inventoryRoutes from './inventory.routes';
import orderRoutes from './order.routes';
import promotionRoutes from './promotion.routes';
import productOfferRoutes from './product-offer.routes';
import deliveryRoutes from './delivery.routes';
import notificationRoutes from './notification.routes';
import uploadRoutes from './upload.routes';
import homeRoutes from './home.routes';
import locationRoutes from './location.routes';
import dashboardRoutes from './dashboard.routes';
import settingsRoutes from './settings.routes';
import cartRoutes from './cart.routes';
import customerRoutes from './customer.routes';
import reportsRoutes from './reports.routes';
import offerAnalyticsRoutes from './offer-analytics.routes';
// Removed deleted seller routes
import newsletterRoutes from './newsletter.routes';

const router = Router();

console.log('Main routes: Mounting all routes...');

// Mount routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

// V1 API routes - Direct implementation
console.log('Main routes: Creating v1 routes directly...');

const v1Router = Router();

// Create seller registration route directly
v1Router.post('/seller-registration/register', async (req, res) => {
  try {
    console.log('Seller registration endpoint hit:', req.body);
    
    // Basic validation
    const { fullName, mobile, email, password } = req.body;
    
    if (!fullName || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // For now, just return success to test the connection
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration endpoint is working!',
        expiresIn: 300,
        sent: true
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Test route
v1Router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'V1 API is working!',
    timestamp: new Date().toISOString()
  });
});

// Mount v1 routes directly on main router
router.use('/v1', v1Router);
console.log('Main routes: v1 routes created and mounted directly');

// Debug: List all registered routes
console.log('Main routes: Registered routes:');
router.stack.forEach((layer: any, index) => {
  console.log(`  ${index}: ${layer.regexp} - ${layer.keys?.map((k: any) => k.name).join(', ') || 'no keys'}`);
});

console.log('Main routes: v1Router routes:');
v1Router.stack.forEach((layer: any, index) => {
  console.log(`  v1-${index}: ${layer.regexp} - ${layer.keys?.map((k: any) => k.name).join(', ') || 'no keys'} - method: ${layer.route?.methods ? Object.keys(layer.route.methods).join(',') : 'no methods'}`);
});
router.use('/auth/admin', adminAuthRoutes);
router.use('/admins', adminRoutes);
router.use('/profile', profileRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/promotions', promotionRoutes);
router.use('/product-offers', productOfferRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/home', homeRoutes);
router.use('/location', locationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/cart', cartRoutes);
router.use('/admin/customers', customerRoutes);
router.use('/admin/reports', reportsRoutes);
router.use('/offer-analytics', offerAnalyticsRoutes);
// Removed deleted seller route mounts
router.use('/newsletter', newsletterRoutes);

console.log('Main routes: All routes mounted successfully');

// Debug: Check if router is valid
console.log('Main routes: router type:', typeof router);
console.log('Main routes: router is Router?', router instanceof Router);
console.log('Main routes: router stack length:', router.stack.length);

export default router;
