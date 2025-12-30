import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  HealthCheckService, 
  HealthCheck, 
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @HealthCheck()
  async getHealthStatus() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.checkDatabase(),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
    ]);
  }

  @HealthCheck()
  async getReadinessStatus() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.checkDatabase(),
    ]);
  }

  getLivenessStatus() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        database: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new Error('Database connection failed');
    }
  }
}