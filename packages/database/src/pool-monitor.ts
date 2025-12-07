import { Knex } from 'knex';
import { createLogger } from '@shambit/shared';

const logger = createLogger('pool-monitor');

/**
 * Database Connection Pool Monitor
 * 
 * Monitors and logs connection pool statistics to help identify
 * connection leaks and optimize pool configuration
 */
export class PoolMonitor {
  private db: Knex;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(db: Knex, intervalMs: number = 60000) {
    this.db = db;
    this.intervalMs = intervalMs;
  }

  /**
   * Start monitoring the connection pool
   */
  start(): void {
    if (this.monitoringInterval) {
      logger.warn('Pool monitoring already started');
      return;
    }

    logger.info('Starting connection pool monitoring', {
      interval: `${this.intervalMs / 1000}s`,
    });

    this.monitoringInterval = setInterval(() => {
      this.logPoolStats();
    }, this.intervalMs);

    // Log initial stats
    this.logPoolStats();
  }

  /**
   * Stop monitoring the connection pool
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Stopped connection pool monitoring');
    }
  }

  /**
   * Get current pool statistics
   */
  async getPoolStats(): Promise<PoolStats> {
    try {
      const pool = (this.db.client as any).pool;

      if (!pool) {
        return {
          numUsed: 0,
          numFree: 0,
          numPendingAcquires: 0,
          numPendingCreates: 0,
          min: 0,
          max: 0,
        };
      }

      return {
        numUsed: pool.numUsed(),
        numFree: pool.numFree(),
        numPendingAcquires: pool.numPendingAcquires(),
        numPendingCreates: pool.numPendingCreates(),
        min: pool.min,
        max: pool.max,
      };
    } catch (error) {
      logger.error('Failed to get pool stats', { error });
      return {
        numUsed: 0,
        numFree: 0,
        numPendingAcquires: 0,
        numPendingCreates: 0,
        min: 0,
        max: 0,
      };
    }
  }

  /**
   * Log pool statistics
   */
  private async logPoolStats(): Promise<void> {
    const stats = await this.getPoolStats();
    const utilization = stats.max > 0 ? (stats.numUsed / stats.max) * 100 : 0;

    logger.info('Connection pool stats', {
      used: stats.numUsed,
      free: stats.numFree,
      pendingAcquires: stats.numPendingAcquires,
      pendingCreates: stats.numPendingCreates,
      min: stats.min,
      max: stats.max,
      utilization: `${utilization.toFixed(2)}%`,
    });

    // Warn if pool is heavily utilized
    if (utilization > 80) {
      logger.warn('Connection pool utilization is high', {
        utilization: `${utilization.toFixed(2)}%`,
        recommendation: 'Consider increasing pool size',
      });
    }

    // Warn if there are pending acquires
    if (stats.numPendingAcquires > 0) {
      logger.warn('Connections are waiting to be acquired', {
        pending: stats.numPendingAcquires,
        recommendation: 'Check for connection leaks or increase pool size',
      });
    }
  }

  /**
   * Check pool health
   */
  async checkHealth(): Promise<PoolHealth> {
    const stats = await this.getPoolStats();
    const utilization = stats.max > 0 ? (stats.numUsed / stats.max) * 100 : 0;

    const issues: string[] = [];

    if (utilization > 90) {
      issues.push('Pool utilization is critically high (>90%)');
    }

    if (stats.numPendingAcquires > 5) {
      issues.push(`High number of pending acquires (${stats.numPendingAcquires})`);
    }

    if (stats.numUsed === stats.max && stats.numPendingAcquires > 0) {
      issues.push('Pool is exhausted - all connections in use with pending requests');
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats,
      utilization,
    };
  }
}

export interface PoolStats {
  numUsed: number;
  numFree: number;
  numPendingAcquires: number;
  numPendingCreates: number;
  min: number;
  max: number;
}

export interface PoolHealth {
  healthy: boolean;
  issues: string[];
  stats: PoolStats;
  utilization: number;
}

/**
 * Create and start pool monitor
 */
export const createPoolMonitor = (db: Knex, intervalMs?: number): PoolMonitor => {
  const monitor = new PoolMonitor(db, intervalMs);
  monitor.start();
  return monitor;
};
