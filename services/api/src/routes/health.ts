import { Router, Request, Response } from 'express';

import { checkDatabaseHealth } from '@shambit/database';

import { asyncHandler } from '../middleware';

const router = Router();

/**
 * Health check endpoint
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const dbHealthy = await checkDatabaseHealth();

    const isHealthy = dbHealthy;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'up' : 'down',
        },
      },
    });
  })
);

/**
 * Readiness check endpoint
 */
router.get(
  '/ready',
  asyncHandler(async (_req: Request, res: Response) => {
    const dbHealthy = await checkDatabaseHealth();

    const isReady = dbHealthy;

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        ready: isReady,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * Liveness check endpoint
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      alive: true,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
