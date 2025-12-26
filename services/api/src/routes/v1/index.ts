import { Router } from 'express';
import testRoutes from './test-routes';
import sellerRoutes from '../seller.routes';

const router = Router();

console.log('V1 routes: Mounting routes...');

// Create a simple test route to verify routing works
router.get('/test-simple', (req, res) => {
  res.json({
    success: true,
    message: 'V1 routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Mount seller routes
try {
  router.use('/seller', sellerRoutes);
  console.log('V1 routes: seller routes mounted successfully');
} catch (error) {
  console.error('V1 routes: Error mounting seller routes:', error);
}

// Try to mount test routes
try {
  if (testRoutes) {
    router.use('/test', testRoutes);
    console.log('V1 routes: test routes mounted successfully');
  } else {
    console.error('V1 routes: testRoutes is null or undefined');
  }
} catch (error) {
  console.error('V1 routes: Error mounting test routes:', error);
}

console.log('V1 routes: Routes mounted successfully');
console.log('V1 routes: router stack length:', router.stack.length);

export default router;