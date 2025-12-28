import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { TracingService } from './tracing.service';
import { HealthService } from './health.service';

@Global()
@Module({
  providers: [LoggerService, MetricsService, TracingService, HealthService],
  exports: [LoggerService, MetricsService, TracingService, HealthService],
})
export class ObservabilityModule {}