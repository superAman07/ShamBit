import express, { Application } from 'express';
import cors from 'cors';

import { getConfig } from '@shambit/config';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  getCorsOptions,
} from './middleware';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { performanceMonitor } from './middleware/performanceMonitor';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import simpleRoutes from './routes/simple-routes';
import v1Routes from './routes/v1';
import sellerRoutes from './routes/seller.routes';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();
  const config = getConfig();

  // Trust proxy (for rate limiting and IP detection behind load balancers)
  app.set('trust proxy', 1);

  // CORS with enhanced configuration
  app.use(cors(getCorsOptions()));

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Performance monitoring
  app.use(performanceMonitor);

  // Rate limiting
  app.use(defaultRateLimiter());

  // Static file serving for uploads with CORS headers
  app.use('/uploads', (req, res, next) => {
    // Allow cross-origin access for images
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    next();
  }, express.static('uploads'));

  // Health check routes (no versioning)
  app.use('/health', healthRoutes);

  // API routes
  app.use(`/api/${config.API_VERSION}`, routes);

  // Seller routes (mounted under /api/v1 for consistency)
  app.use('/api/v1/seller', sellerRoutes);

  // Legacy profile endpoint for backward compatibility
  app.get('/profile', async (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Redirect to the proper seller profile endpoint
    try {
      const token = authHeader.substring(7);
      const response = await fetch(`http://localhost:${config.PORT}/api/v1/seller/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Seller registration routes (legacy)
  app.use('/api/v1', simpleRoutes);
  
  // V1 API routes (new structure)
  app.use('/api/v1', v1Routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
