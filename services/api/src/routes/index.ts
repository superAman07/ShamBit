import { Router } from 'express';

import healthRoutes from './health';
import authRoutes from './auth.routes';
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
import sellerRoutes from './seller.routes';

const router = Router();

// Mount routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
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
router.use('/sellers', sellerRoutes);

export default router;
