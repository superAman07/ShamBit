import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

import { logger } from '../config/logger.config';

/**
 * Request logging middleware
 * Logs all HTTP requests with method, path, status, and duration
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Attach request ID to request headers
  req.headers['x-request-id'] = requestId;

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};
