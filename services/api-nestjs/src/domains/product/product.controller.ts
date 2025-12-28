import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ProductService } from './product.service';
import { ProductAuditService } from './services/product-audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductOwnershipGuard } from './guards/product-ownership.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';

import { CreateProductDto } from './dtos/create-product.dto';
import {
  UpdateProductDto,
  ProductStatusUpdateDto,
  ProductModerationDto,
  ProductCategoryUpdateDto,
  ProductBrandUpdateDto,
  BulkProductUpdateDto,
  ProductCloneDto,
} from './dtos/update-product.dto';

import { ProductResponseDto, ProductListResponseDto } from './dtos/product-response.dto';

import { ProductStatus } from './enums/product-status.enum';
import { ProductModerationStatus } from './enums/product-moderation-status.enum';
import { ProductVisibility } from './enums/product-visibility.enum';

interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ProductQueryFilters extends PaginationQuery {
  status?: ProductStatus;
  visibility?: ProductVisibility;
  moderationStatus?: ProductModerationStatus;
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  isFeatured?: boolean;
  hasVariants?: boolean;
  search?: string;
  tags?: string;
  createdAfter?: string;
  createdBefore?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}

@ApiTags('Products')
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productAuditService: ProductAuditService,
  ) {}

  // ============================================================================
  // PRODUCT CRUD OPERATIONS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: ProductListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'visibility', required: false, enum: ProductVisibility, description: 'Filter by visibility' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filter by brand' })
  @ApiQuery({ name: 'sellerId', required: false, type: String, description: 'Filter by seller' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name and description' })
  async findAll(
    @Query() query: ProductQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductListResponseDto> {
    const filters: any = {
      status: query.status,
      visibility: query.visibility,
      moderationStatus: query.moderationStatus,
      categoryId: query.categoryId,
      brandId: query.brandId,
      sellerId: query.sellerId,
      isFeatured: query.isFeatured,
      hasVariants: query.hasVariants,
      search: query.search,
    };

    // Parse tags if provided
    if (query.tags) {
      filters.tags = query.tags.split(',');
    }

    // Parse dates if provided
    if (query.createdAfter) {
      filters.createdAfter = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      filters.createdBefore = new Date(query.createdBefore);
    }
    if (query.publishedAfter) {
      filters.publishedAfter = new Date(query.publishedAfter);
    }
    if (query.publishedBefore) {
      filters.publishedBefore = new Date(query.publishedBefore);
    }

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    const includes = {
      includeAttributeValues: false,
      includeCategory: true,
      includeBrand: true,
      includeSeller: false,
    };

    const result = await this.productService.findAll(filters, pagination, includes, userId, userRole);

    return {
      data: result.data as ProductResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiResponse({ status: 200, description: 'Featured products retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of products to return' })
  async getFeaturedProducts(
    @Query('limit') limit: number = 10,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductResponseDto[]> {
    const filters = { isFeatured: true, status: ProductStatus.PUBLISHED };
    const result = await this.productService.findAll(filters, { limit }, {}, undefined, userRole);
    return result.data as ProductResponseDto[];
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully', type: ProductListResponseDto })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  async searchProducts(
    @Query('q') query: string,
    @Query() filters: ProductQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductListResponseDto> {
    const searchFilters: any = {
      status: filters.status,
      visibility: filters.visibility,
      categoryId: filters.categoryId,
      brandId: filters.brandId,
    };

    const pagination = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'relevance',
      sortOrder: filters.sortOrder || 'desc',
    };

    const result = await this.productService.searchProducts(query, searchFilters, pagination, userId, userRole);

    return {
      data: result as ProductResponseDto[],
      total: result.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.length / pagination.limit),
    };
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return this.productService.getStatistics();
  }

  @Get('my-products')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current seller\'s products' })
  @ApiResponse({ status: 200, description: 'Seller products retrieved successfully', type: ProductListResponseDto })
  async getMyProducts(
    @Query() query: ProductQueryFilters,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductListResponseDto> {
    const filters = { ...query, sellerId };
    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'updatedAt',
      sortOrder: query.sortOrder || 'desc',
    };

    const result = await this.productService.findAll(filters, pagination, {}, sellerId, userRole);

    return {
      data: result.data as ProductResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('my-statistics')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current seller\'s product statistics' })
  @ApiResponse({ status: 200, description: 'Seller statistics retrieved successfully' })
  async getMyStatistics(@CurrentUser('id') sellerId: string) {
    return this.productService.getSellerStatistics(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiQuery({ name: 'includeAttributes', required: false, type: Boolean, description: 'Include attribute values' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeAttributes') includeAttributes?: boolean,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductResponseDto> {
    const includes = {
      includeAttributeValues: includeAttributes || false,
      includeCategory: true,
      includeBrand: true,
      includeSeller: true,
    };
    return this.productService.findById(id, includes, userId, userRole) as Promise<ProductResponseDto>;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('includeAttributes') includeAttributes?: boolean,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductResponseDto> {
    const includes = {
      includeAttributeValues: includeAttributes || false,
      includeCategory: true,
      includeBrand: true,
      includeSeller: true,
    };
    return this.productService.findBySlug(slug, includes, userId, userRole) as Promise<ProductResponseDto>;
  }

  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductResponseDto })
  @ApiResponse({ status: 409, description: 'Product with slug already exists' })
  async create(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @CurrentUser('id') createdBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.create(createProductDto, createdBy, userRole) as Promise<ProductResponseDto>;
  }

  @Put(':id')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, updateProductDto, updatedBy, userRole) as Promise<ProductResponseDto>;
  }

  @Put(':id/status')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product status' })
  @ApiResponse({ status: 200, description: 'Product status updated successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) statusUpdate: ProductStatusUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.updateStatus(id, statusUpdate, updatedBy, userRole) as Promise<ProductResponseDto>;
  }

  @Put(':id/category')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product category' })
  @ApiResponse({ status: 200, description: 'Product category updated successfully', type: ProductResponseDto })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) categoryUpdate: ProductCategoryUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.updateCategory(id, categoryUpdate, updatedBy, userRole) as Promise<ProductResponseDto>;
  }

  @Put(':id/brand')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product brand' })
  @ApiResponse({ status: 200, description: 'Product brand updated successfully', type: ProductResponseDto })
  async updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) brandUpdate: ProductBrandUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.updateBrand(id, brandUpdate, updatedBy, userRole) as Promise<ProductResponseDto>;
  }

  @Put(':id/featured')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle product featured status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product featured status updated successfully', type: ProductResponseDto })
  async toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isFeatured') isFeatured: boolean,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.setFeatured(id, isFeatured, updatedBy, userRole) as Promise<ProductResponseDto>;
  }

  @Delete(':id')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete product in current state' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') deletedBy: string,
    @CurrentUser('role') userRole: UserRole,
    @Query('reason') reason?: string,
  ): Promise<void> {
    await this.productService.delete(id, deletedBy, userRole, reason);
  }

  // ============================================================================
  // MODERATION OPERATIONS
  // ============================================================================

  @Get('moderation/pending')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products pending moderation' })
  @ApiResponse({ status: 200, description: 'Pending products retrieved successfully' })
  async getPendingModeration(
    @Query('limit') limit: number = 50,
  ): Promise<ProductResponseDto[]> {
    const filters = { moderationStatus: ProductModerationStatus.PENDING };
    const result = await this.productService.findAll(filters, { limit }, {});
    return result.data as ProductResponseDto[];
  }

  @Put(':id/moderation')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product moderation status' })
  @ApiResponse({ status: 200, description: 'Moderation status updated successfully', type: ProductResponseDto })
  async updateModerationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) moderationDto: ProductModerationDto,
    @CurrentUser('id') moderatedBy: string,
  ): Promise<ProductResponseDto> {
    return this.productService.updateModerationStatus(
      id,
      moderationDto.moderationStatus,
      moderatedBy,
      moderationDto.moderationNotes
    ) as Promise<ProductResponseDto>;
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  @Put('bulk/update')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update products (Admin only)' })
  @ApiResponse({ status: 200, description: 'Products updated successfully' })
  async bulkUpdate(
    @Body(ValidationPipe) bulkUpdate: BulkProductUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.productService.bulkUpdate(bulkUpdate, updatedBy, userRole);
  }

  // ============================================================================
  // CLONE OPERATIONS
  // ============================================================================

  @Post(':id/clone')
  @UseGuards(ProductOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clone product' })
  @ApiResponse({ status: 201, description: 'Product cloned successfully', type: ProductResponseDto })
  async cloneProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) cloneDto: ProductCloneDto,
    @CurrentUser('id') clonedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ProductResponseDto> {
    return this.productService.cloneProduct(id, cloneDto, clonedBy, userRole) as Promise<ProductResponseDto>;
  }

  // ============================================================================
  // CATEGORY & BRAND OPERATIONS
  // ============================================================================

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiResponse({ status: 200, description: 'Category products retrieved successfully', type: ProductListResponseDto })
  async getProductsByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: ProductQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductListResponseDto> {
    const filters = { ...query, categoryId };
    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'displayOrder',
      sortOrder: query.sortOrder || 'asc',
    };

    const result = await this.productService.findAll(filters, pagination, {}, userId, userRole);

    return {
      data: result.data as ProductResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('brand/:brandId')
  @ApiOperation({ summary: 'Get products by brand' })
  @ApiResponse({ status: 200, description: 'Brand products retrieved successfully', type: ProductListResponseDto })
  async getProductsByBrand(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ProductQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<ProductListResponseDto> {
    const filters = { ...query, brandId };
    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'displayOrder',
      sortOrder: query.sortOrder || 'asc',
    };

    const result = await this.productService.findAll(filters, pagination, {}, userId, userRole);

    return {
      data: result.data as ProductResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  // ============================================================================
  // AUDIT OPERATIONS
  // ============================================================================

  @Get(':id/audit')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product audit history (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit history retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of entries to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of entries to skip' })
  async getProductAuditHistory(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.productAuditService.getProductAuditHistory(productId, limit, offset);
  }

  @Get('audit/statistics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved successfully' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date (ISO string)' })
  async getAuditStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined;
    const dateToParsed = dateTo ? new Date(dateTo) : undefined;
    
    return this.productAuditService.getAuditStatistics(dateFromParsed, dateToParsed);
  }
}