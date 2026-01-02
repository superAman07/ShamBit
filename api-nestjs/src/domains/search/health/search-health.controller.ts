import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchHealthService } from './search-health.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Public } from '../../../common/decorators';
import { UserRole } from '../../../common/types';

@ApiTags('Search Health')
@Controller('search/health')
export class SearchHealthController {
  constructor(private readonly searchHealthService: SearchHealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get overall search system health' })
  @ApiResponse({ status: 200, description: 'Search system health status' })
  async getOverallHealth() {
    return this.searchHealthService.checkOverallHealth();
  }

  @Public()
  @Get('elasticsearch')
  @ApiOperation({ summary: 'Get Elasticsearch cluster health' })
  @ApiResponse({ status: 200, description: 'Elasticsearch health status' })
  async getElasticsearchHealth() {
    return this.searchHealthService.checkElasticsearchHealth();
  }

  @Public()
  @Get('redis')
  @ApiOperation({ summary: 'Get Redis cache health' })
  @ApiResponse({ status: 200, description: 'Redis health status' })
  async getRedisHealth() {
    return this.searchHealthService.checkRedisHealth();
  }

  @Get('index')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search index health' })
  @ApiResponse({ status: 200, description: 'Search index health status' })
  async getIndexHealth() {
    return this.searchHealthService.checkIndexHealth();
  }

  @Get('performance')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search performance metrics' })
  @ApiResponse({ status: 200, description: 'Search performance status' })
  async getPerformanceHealth() {
    return this.searchHealthService.checkSearchPerformance();
  }
}