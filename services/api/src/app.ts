import express, { Application } from 'express';
import cors from 'cors';

import { getConfig } from '@shambit/config';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  getCorsOptions,
} from './middleware';
import { generalRateLimit } from './middleware/rateLimiting.middleware';
import { securityMiddleware } from './middleware/security.middleware';
import { performanceMonitor } from './middleware/performanceMonitor';
import routes from './routes';
import healthRoutes from './routes/health.routes';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();
  const config = getConfig();

  // Trust proxy (for rate limiting and IP detection behind load balancers)
  app.set('trust proxy', 1);

  // Enhanced security middleware stack
  app.use(securityMiddleware);

  // CORS with enhanced configuration
  app.use(cors(getCorsOptions()));

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Performance monitoring
  app.use(performanceMonitor);

  // Enhanced rate limiting
  app.use(generalRateLimit);

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

  // Simple routes for testing
  const simpleRoutes = require('./routes/simple-routes').default;
  app.use('/api/v1', simpleRoutes);

  // Debug: Add a direct test route
  app.get('/api/v1/direct-test', (req, res) => {
    res.json({
      success: true,
      message: 'Direct route works!',
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
