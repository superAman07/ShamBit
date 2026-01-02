import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { SearchService } from './search.service';
import { FilterService } from './filter.service';
import { SearchIndexService } from './search-index.service';
import { AnalyticsService } from './analytics.service';
import { PopularityService } from './popularity.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public } from '../../common/decorators';
import { UserRole } from '../../common/types';
import type { SearchQuery } from './types/search.types';
import { SortOption } from './types/search.types';

@ApiTags('Search & Discovery')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly filterService: FilterService,
    private readonly searchIndexService: SearchIndexService,
    private readonly analyticsService: AnalyticsService,
    private readonly popularityService: PopularityService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search products with advanced filtering and facets' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID filter' })
  @ApiQuery({ name: 'brand', required: false, description: 'Brand ID filter' })
  @ApiQuery({ name: 'seller', required: false, description: 'Seller ID filter' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Minimum rating filter' })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, description: 'In stock filter' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page' })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortOption, description: 'Sort option' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  async searchProducts(@Query() query: SearchQuery) {
    return this.searchService.search(query);
  }

  @Public()
  @Get('autocomplete')
  @ApiOperation({ summary: 'Get search autocomplete suggestions' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query for autocomplete' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of suggestions' })
  async getAutocomplete(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getAutocomplete(query, limit);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions (legacy endpoint)' })
  async getSearchSuggestions(@Query('q') query: string) {
    return this.searchService.getSearchSuggestions(query);
  }

  @Public()
  @Get('filters')
  @ApiOperation({ summary: 'Get available filters for search' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID for category-specific filters' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for context-aware filters' })
  async getAvailableFilters(@Query() query: { category?: string; q?: string }) {
    return this.filterService.getAvailableFilters(query);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
  async getTrendingProducts(
    @Query() query: { category?: string; limit?: number },
  ) {
    return this.searchService.getTrendingProducts(query);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get popular products' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
  async getPopularProducts(
    @Query() query: { category?: string; limit?: number },
  ) {
    await this.popularityService.getBestSellingProducts(
      query.category,
      query.limit,
    );
    
    // TODO: Fetch full product data from search index
    return {
      results: [],
      meta: { category: query.category, limit: query.limit ?? 20 },
    };
  }

  @Get('recommendations')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized product recommendations' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID for personalization' })
  @ApiQuery({ name: 'productId', required: false, description: 'Product ID for related products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations' })
  async getRecommendations(
    @Query() query: { userId?: string; productId?: string; limit?: number },
  ) {
    return this.searchService.getRecommendations(query.userId, query.productId, query.limit);
  }

  @Public()
  @Get('categories/popular')
  @ApiOperation({ summary: 'Get popular categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of categories' })
  async getPopularCategories(@Query('limit') limit?: number) {
    const categories = await this.popularityService.getPopularCategories(limit);
    return { categories };
  }

  @Public()
  @Post('track/click')
  @ApiOperation({ summary: 'Track product click for analytics' })
  @HttpCode(HttpStatus.OK)
  async trackClick(
    @Body() body: {
      productId: string;
      query: string;
      position: number;
      userId?: string;
    },
  ) {
    await this.analyticsService.trackClick(
      body.productId,
      body.query,
      body.position,
      body.userId,
    );
    return { success: true };
  }

  @Post('reindex')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger full search index rebuild' })
  async triggerReindex() {
    return this.searchIndexService.triggerFullReindex();
  }

  @Post('reindex/:entityType/:entityId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reindex specific entity' })
  async reindexEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    await this.searchIndexService.indexEntity(entityType, entityId);
    return { success: true };
  }

  @Get('analytics/popular-queries')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get popular search queries' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of queries' })
  async getPopularQueries(@Query('limit') limit?: number) {
    const queries = await this.analyticsService.getPopularQueries(limit);
    return { queries };
  }

  @Get('analytics/zero-results')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get queries with zero results' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of queries' })
  async getZeroResultQueries(@Query('limit') limit?: number) {
    const queries = await this.analyticsService.getZeroResultQueries(limit);
    return { queries };
  }

  @Get('analytics/metrics')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search analytics metrics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  async getSearchMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.analyticsService.getSearchMetrics(start, end);
  }

  // Legacy endpoints for backward compatibility
  @Public()
  @Get('legacy/products')
  @ApiOperation({ summary: 'Legacy search products endpoint' })
  async searchProductsLegacy(@Query() query: any) {
    return this.searchService.searchProducts(query);
  }
}
