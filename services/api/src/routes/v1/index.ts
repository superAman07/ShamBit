import { Router } from 'express';
import sellerRegistrationRoutes from './seller-registration.routes';
import testRoutes from './test-routes';

const router = Router();

console.log('V1 routes: Mounting seller-registration routes...');
console.log('V1 routes: sellerRegistrationRoutes type:', typeof sellerRegistrationRoutes);
console.log('V1 routes: sellerRegistrationRoutes is Router?', sellerRegistrationRoutes instanceof Router);

// Create a simple test route to verify routing works
router.get('/test-simple', (req, res) => {
  res.json({
    success: true,
    message: 'V1 routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Try to mount the seller registration routes
try {
  if (sellerRegistrationRoutes) {
    router.use('/seller-registration', sellerRegistrationRoutes);
    console.log('V1 routes: seller-registration routes mounted successfully');
  } else {
    console.error('V1 routes: sellerRegistrationRoutes is null or undefined');
  }
} catch (error) {
  console.error('V1 routes: Error mounting seller-registration routes:', error);
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