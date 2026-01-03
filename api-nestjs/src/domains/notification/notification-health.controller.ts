import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import Redis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    email: ServiceHealth;
    sms: ServiceHealth;
    push: ServiceHealth;
  };
  metrics: {
    totalNotifications: number;
    pendingNotifications: number;
    failedNotifications: number;
    queueSize: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'not_configured';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

@ApiTags('Health')
@Controller('health/notifications')
export class NotificationHealthController {
  private redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    // Initialize Redis connection for health checks
    const redisConfig = this.configService.get('notification.redis');
    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      db: redisConfig?.db || 0,
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get notification system health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();

    try {
      // Check all services in parallel
      const [database, redis, email, sms, push, metrics] =
        await Promise.allSettled([
          this.checkDatabase(),
          this.checkRedis(),
          this.checkEmailService(),
          this.checkSMSService(),
          this.checkPushService(),
          this.getMetrics(),
        ]);

      const services = {
        database: this.getServiceResult(database),
        redis: this.getServiceResult(redis),
        email: this.getServiceResult(email),
        sms: this.getServiceResult(sms),
        push: this.getServiceResult(push),
      };

      const metricsData =
        metrics.status === 'fulfilled'
          ? metrics.value
          : {
              totalNotifications: 0,
              pendingNotifications: 0,
              failedNotifications: 0,
              queueSize: 0,
            };

      // Determine overall status
      const overallStatus = this.determineOverallStatus(services);

      return {
        status: overallStatus,
        timestamp,
        services,
        metrics: metricsData,
      };
    } catch (error) {
      this.logger.error('Health check failed', error.stack);

      return {
        status: 'unhealthy',
        timestamp,
        services: {
          database: {
            status: 'unhealthy',
            error: 'Health check failed',
            lastCheck: timestamp,
          },
          redis: {
            status: 'unhealthy',
            error: 'Health check failed',
            lastCheck: timestamp,
          },
          email: {
            status: 'unhealthy',
            error: 'Health check failed',
            lastCheck: timestamp,
          },
          sms: {
            status: 'unhealthy',
            error: 'Health check failed',
            lastCheck: timestamp,
          },
          push: {
            status: 'unhealthy',
            error: 'Health check failed',
            lastCheck: timestamp,
          },
        },
        metrics: {
          totalNotifications: 0,
          pendingNotifications: 0,
          failedNotifications: 0,
          queueSize: 0,
        },
      };
    }
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      await this.redis.ping();

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkEmailService(): Promise<ServiceHealth> {
    const emailConfig = this.configService.get('notification.email');

    if (!emailConfig?.provider) {
      return {
        status: 'not_configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Basic configuration check
    const isConfigured = this.isEmailConfigured(emailConfig);

    return {
      status: isConfigured ? 'healthy' : 'unhealthy',
      error: isConfigured ? undefined : 'Email service not properly configured',
      lastCheck: new Date().toISOString(),
    };
  }

  private async checkSMSService(): Promise<ServiceHealth> {
    const smsConfig = this.configService.get('notification.sms');

    if (!smsConfig?.provider) {
      return {
        status: 'not_configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Basic configuration check
    const isConfigured = this.isSMSConfigured(smsConfig);

    return {
      status: isConfigured ? 'healthy' : 'unhealthy',
      error: isConfigured ? undefined : 'SMS service not properly configured',
      lastCheck: new Date().toISOString(),
    };
  }

  private async checkPushService(): Promise<ServiceHealth> {
    const pushConfig = this.configService.get('notification.push');

    if (!pushConfig?.provider) {
      return {
        status: 'not_configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Basic configuration check
    const isConfigured = this.isPushConfigured(pushConfig);

    return {
      status: isConfigured ? 'healthy' : 'unhealthy',
      error: isConfigured ? undefined : 'Push service not properly configured',
      lastCheck: new Date().toISOString(),
    };
  }

  private async getMetrics() {
    const [
      totalNotifications,
      pendingNotifications,
      failedNotifications,
      queueSize,
    ] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { status: 'PENDING' } }),
      this.prisma.notification.count({ where: { status: 'FAILED' } }),
      this.getQueueSize(),
    ]);

    return {
      totalNotifications,
      pendingNotifications,
      failedNotifications,
      queueSize,
    };
  }

  private async getQueueSize(): Promise<number> {
    try {
      // Get queue sizes from Redis
      const keys = await this.redis.keys('bull:notification-processing:*');
      return keys.length;
    } catch (error) {
      this.logger.warn('Failed to get queue size', error.message);
      return 0;
    }
  }

  private isEmailConfigured(config: any): boolean {
    switch (config.provider) {
      case 'smtp':
        return !!(config.smtp?.host && config.smtp?.port);
      case 'ses':
        return !!(config.ses?.region && config.ses?.accessKeyId);
      case 'sendgrid':
        return !!config.sendgrid?.apiKey;
      default:
        return false;
    }
  }

  private isSMSConfigured(config: any): boolean {
    switch (config.provider) {
      case 'twilio':
        return !!(config.twilio?.accountSid && config.twilio?.authToken);
      case 'sns':
        return !!(config.sns?.region && config.sns?.accessKeyId);
      default:
        return false;
    }
  }

  private isPushConfigured(config: any): boolean {
    switch (config.provider) {
      case 'fcm':
        return !!(config.fcm?.projectId && config.fcm?.privateKey);
      case 'apns':
        return !!(config.apns?.keyId && config.apns?.teamId);
      default:
        return false;
    }
  }

  private getServiceResult(
    result: PromiseSettledResult<ServiceHealth>,
  ): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        error: result.reason?.message || 'Unknown error',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private determineOverallStatus(
    services: Record<string, ServiceHealth>,
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(services).map((s) => s.status);

    if (statuses.every((s) => s === 'healthy' || s === 'not_configured')) {
      return 'healthy';
    }

    if (statuses.some((s) => s === 'healthy')) {
      return 'degraded';
    }

    return 'unhealthy';
  }
}
