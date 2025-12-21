import { Router } from 'express';
import sellerRegistrationRoutes from './seller-registration.routes';
import testRoutes from './test-routes';

const router = Router();

console.log('V1 routes: Mounting seller-registration routes...');
console.log('V1 routes: sellerRegistrationRoutes type:', typeof sellerRegistrationRoutes);
console.log('V1 routes: sellerRegistrationRoutes is Router?', sellerRegistrationRoutes instanceof Router);

console.log('V1 routes: testRoutes type:', typeof testRoutes);
console.log('V1 routes: testRoutes is Router?', testRoutes instanceof Router);

// Mount v1 routes
router.use('/seller-registration', sellerRegistrationRoutes);
router.use('/test', testRoutes);

console.log('V1 routes: Routes mounted successfully');
console.log('V1 routes: router stack length:', router.stack.length);

export default router;