import { Router, Request, Response } from 'express';
import { logger } from '../config/logger.config';
import { getDatabase } from '@shambit/database';

const router = Router();

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * Main health check endpoint
 * Requirements: 16.1, 16.2, 16.3, 16.6
 * Returns database connection status, API uptime, and application version
 * Ensures response time < 500ms
 */
router.get('/', async (req: Request, res: Response) => {
  const requestStartTime = Date.now();

  try {
    // Check database connection with timeout
    const db = getDatabase();
    const dbCheckStart = Date.now();
    
    // Use a timeout to ensure we respond within 500ms
    const dbCheckPromise = db.raw('SELECT 1 as health_check');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database check timeout')), 400)
    );

    let dbStatus = 'connected';
    let dbResponseTime = 0;

    try {
      await Promise.race([dbCheckPromise, timeoutPromise]);
      dbResponseTime = Date.now() - dbCheckStart;
    } catch (error: any) {
      dbStatus = 'disconnected';
      logger.error('Database health check failed', { 
        error: error.message,
        duration: Date.now() - dbCheckStart 
      });
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000); // uptime in seconds
    const responseTime = Date.now() - requestStartTime;

    const response = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: '1.0.0',
      database: {
        status: dbStatus,
        responseTime: `${dbResponseTime}ms`,
      },
    };

    const statusCode = dbStatus === 'connected' ? 200 : 503;
    
    // Log if response is taking too long
    if (responseTime > 400) {
      logger.warn('Health check response time exceeded threshold', { 
        responseTime: `${responseTime}ms`,
        threshold: '500ms' 
      });
    }

    res.status(statusCode).json(response);
  } catch (error: any) {
    const responseTime = Date.now() - requestStartTime;
    logger.error('Health check endpoint error', { 
      error: error.message,
      responseTime: `${responseTime}ms` 
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
      database: {
        status: 'error',
        error: error.message,
      },
    });
  }
});

/**
 * Liveness probe
 * Checks if the application is alive (for Kubernetes/container orchestration)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe
 * Checks if the application is ready to serve traffic
 * Verifies database connectivity
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {
    database: { status: 'unknown' },
  };

  let isReady = true;

  // Check database connection
  try {
    const db = getDatabase();
    await db.raw('SELECT 1 as health_check');
    checks.database = {
      status: 'healthy',
    };
  } catch (error: any) {
    checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
    isReady = false;
    logger.error('Database health check failed', { error });
  }

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * Detailed health check with all dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {
    service: {
      status: 'healthy',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    database: { status: 'unknown' },
  };

  let overallStatus = 'healthy';

  // Check database
  try {
    const db = getDatabase();
    const dbStartTime = Date.now();
    await db.raw('SELECT 1 as health_check');
    const responseTime = Date.now() - dbStartTime;

    checks.database = {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
    };
  } catch (error: any) {
    checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
    overallStatus = 'degraded';
  }

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  });
});

export default router;
