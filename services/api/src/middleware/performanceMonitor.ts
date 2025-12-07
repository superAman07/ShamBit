import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to capture response time
  res.end = function (this: Response, chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log performance metrics
    const performanceData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        ...performanceData,
        severity: 'medium',
        type: 'PERFORMANCE',
      });
    } else if (duration > 500) {
      logger.info('Request completed', {
        ...performanceData,
        type: 'PERFORMANCE',
      });
    } else {
      logger.debug('Request completed', {
        ...performanceData,
        type: 'PERFORMANCE',
      });
    }

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Database query performance tracker
 * Use this to wrap database queries and track their performance
 */
export class QueryPerformanceTracker {
  private queryStartTimes: Map<string, number> = new Map();

  startQuery(queryId: string, query: string): void {
    this.queryStartTimes.set(queryId, Date.now());
    logger.debug('Query started', {
      queryId,
      query: this.sanitizeQuery(query),
      type: 'DATABASE_QUERY',
    });
  }

  endQuery(queryId: string, query: string, rowCount?: number): void {
    const startTime = this.queryStartTimes.get(queryId);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.queryStartTimes.delete(queryId);

    const queryData = {
      queryId,
      query: this.sanitizeQuery(query),
      duration: `${duration}ms`,
      rowCount,
      type: 'DATABASE_QUERY',
    };

    // Log slow queries (> 100ms)
    if (duration > 100) {
      logger.warn('Slow query detected', {
        ...queryData,
        severity: 'medium',
      });
    } else {
      logger.debug('Query completed', queryData);
    }
  }

  private sanitizeQuery(query: string): string {
    // Truncate long queries and remove sensitive data
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .substring(0, 200);
  }
}

export const queryPerformanceTracker = new QueryPerformanceTracker();
