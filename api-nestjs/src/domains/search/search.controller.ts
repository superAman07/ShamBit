import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { SearchService } from './search.service';
import { FilterService } from './filter.service';
import { SearchIndexService } from './search-index.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public } from '../../common/decorators';
import { UserRole } from '../../common/types';

@ApiTags('Search & Discovery')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly filterService: FilterService,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search products' })
  async searchProducts(
    @Query()
    query: {
      q?: string;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      rating?: number;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    return this.searchService.searchProducts(query);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  async getSearchSuggestions(@Query('q') query: string) {
    return this.searchService.getSearchSuggestions(query);
  }

  @Public()
  @Get('filters')
  @ApiOperation({ summary: 'Get available filters' })
  async getAvailableFilters(@Query() query: { category?: string; q?: string }) {
    return this.filterService.getAvailableFilters(query);
  }

  @Post('reindex')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger search reindex' })
  async triggerReindex() {
    return this.searchIndexService.triggerFullReindex();
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  async getTrendingProducts(
    @Query() query: { category?: string; limit?: number },
  ) {
    return this.searchService.getTrendingProducts(query);
  }

  @Get('recommendations')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product recommendations' })
  async getRecommendations(
    @Query() query: { userId?: string; productId?: string; limit?: number },
  ) {
    return this.searchService.getRecommendations(query);
  }

  @Public()
  @Get('categories/popular')
  @ApiOperation({ summary: 'Get popular categories' })
  async getPopularCategories() {
    return this.searchService.getPopularCategories();
  }
}
