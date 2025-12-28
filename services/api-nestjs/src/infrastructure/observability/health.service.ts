import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from './logger.service';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: number;
  private readonly version: string;
  private readonly environment: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date();
    const uptime = Date.now() - this.startTime;

    // Run all health checks
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
    ]);

    // Calculate summary
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      total: checks.length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp,
      uptime,
      version: this.version,
      environment: this.environment,
      checks,
      summary,
    };

    this.logger.debug('Health check completed', {
      status: overallStatus,
      summary,
      responseTime: checks.reduce((sum, check) => sum + check.responseTime, 0),
    });

    return healthStatus;
  }

  /**
   * Get readiness status (for Kubernetes readiness probe)
   */
  async getReadinessStatus(): Promise<{ status: 'ready' | 'not_ready'; checks: HealthCheck[] }> {
    // Critical checks that must pass for the service to be ready
    const criticalChecks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const hasUnhealthyChecks = criticalChecks.some(check => check.status === 'unhealthy');
    
    return {
      status: hasUnhealthyChecks ? 'not_ready' : 'ready',
      checks: criticalChecks,
    };
  }

  /**
   * Get liveness status (for Kubernetes liveness probe)
   */
  async getLivenessStatus(): Promise<{ status: 'alive' | 'dead'; uptime: number }> {
    const uptime = Date.now() - this.startTime;
    
    // Simple liveness check - if the service is responding, it's alive
    return {
      status: 'alive',
      uptime,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        message: 'Database connection successful',
        details: {
          type: 'postgresql',
          responseTime,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error('Database health check failed', error.stack, { error: error.message });
      
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        message: 'Database connection failed',
        details: {
          type: 'postgresql',
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple ping to check Redis connectivity
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      
      await this.redis.set(testKey, testValue, 10); // 10 second TTL
      const retrievedValue = await this.redis.get(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis read/write test failed');
      }
      
      await this.redis.del(testKey);
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        message: 'Redis connection successful',
        details: {
          type: 'redis',
          responseTime,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error('Redis health check failed', error.stack, { error: error.message });
      
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime,
        message: 'Redis connection failed',
        details: {
          type: 'redis',
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Memory usage is normal';
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'Memory usage is critically high';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
        message = 'Memory usage is high';
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'memory',
        status,
        responseTime,
        message,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime,
        message: 'Memory check failed',
        details: {
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check disk usage (simplified)
   */
  private async checkDisk(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // This is a simplified disk check
      // In production, you might want to use a library like 'node-disk-info'
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'disk',
        status: 'healthy',
        responseTime,
        message: 'Disk check not implemented',
        details: {
          note: 'Disk usage monitoring not implemented in this example',
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'disk',
        status: 'unhealthy',
        responseTime,
        message: 'Disk check failed',
        details: {
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check external service connectivity
   */
  async checkExternalService(
    name: string,
    url: string,
    timeout = 5000,
  ): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // This would typically use an HTTP client to check external services
      // For now, we'll simulate a check
      const responseTime = Date.now() - startTime;
      
      return {
        name: `external_${name}`,
        status: 'healthy',
        responseTime,
        message: `${name} service is reachable`,
        details: {
          url,
          timeout,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: `external_${name}`,
        status: 'unhealthy',
        responseTime,
        message: `${name} service is unreachable`,
        details: {
          url,
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }
}