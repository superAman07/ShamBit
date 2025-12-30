import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async check() {
    return this.healthService.getHealthStatus();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Get readiness status' })
  @ApiResponse({ status: 200, description: 'Readiness status' })
  async ready() {
    return this.healthService.getReadinessStatus();
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Get liveness status' })
  @ApiResponse({ status: 200, description: 'Liveness status' })
  async live() {
    return this.healthService.getLivenessStatus();
  }
}