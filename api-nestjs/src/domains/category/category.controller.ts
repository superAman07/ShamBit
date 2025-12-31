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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CategoryAttributeService } from './services/category-attribute.service';
import { CategoryAuditService } from './services/category-audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoryAdminGuard } from './guards/category-admin.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';

import { CreateCategoryDto } from './dtos/create-category.dto';
import {
  UpdateCategoryDto,
  CategoryStatusUpdateDto,
  MoveCategoryDto,
} from './dtos/update-category.dto';
import {
  CreateCategoryAttributeDto,
  UpdateCategoryAttributeDto,
} from './dtos/category-attribute.dto';
import {
  CategoryResponseDto,
  CategoryListResponseDto,
  CategoryTreeResponseDto,
} from './dtos/category-response.dto';

import { CategoryStatus } from './enums/category-status.enum';
import { CategoryVisibility } from './enums/category-visibility.enum';
import { AttributeType } from './enums/attribute-type.enum';

interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CategoryQueryFilters extends PaginationQuery {
  status?: CategoryStatus;
  visibility?: CategoryVisibility;
  parentId?: string;
  isLeaf?: boolean;
  isFeatured?: boolean;
  search?: string;
  brandId?: string;
}

interface TreeQueryOptions {
  rootId?: string;
  maxDepth?: number;
  activeOnly?: boolean;
  includeAttributes?: boolean;
  includeBrands?: boolean;
}

@ApiTags('Categories')
@Controller('categories')
@UseGuards(AuthGuard, RolesGuard)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly categoryAttributeService: CategoryAttributeService,
    private readonly categoryAuditService: CategoryAuditService,
  ) {}

  // Category CRUD Operations
  @Get()
  @ApiOperation({ summary: 'Get all categories with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: CategoryListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CategoryStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    enum: CategoryVisibility,
    description: 'Filter by visibility',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent category',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in name and description',
  })
  async findAll(
    @Query() query: CategoryQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryListResponseDto> {
    const filters: any = {
      status: query.status,
      visibility: query.visibility,
      parentId: query.parentId,
      isLeaf: query.isLeaf,
      isFeatured: query.isFeatured,
      search: query.search,
    };

    if (query.brandId) {
      filters.brandId = query.brandId;
    }

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'displayOrder',
      sortOrder: query.sortOrder || 'asc',
    };

    const result = await this.categoryService.findAll(
      filters,
      pagination,
      userId,
      userRole,
    );

    return {
      data: result.data as CategoryResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('roots')
  @ApiOperation({ summary: 'Get root categories' })
  @ApiResponse({
    status: 200,
    description: 'Root categories retrieved successfully',
    type: CategoryListResponseDto,
  })
  async findRoots(
    @Query() query: CategoryQueryFilters,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryListResponseDto> {
    const filters: any = {
      status: query.status || CategoryStatus.ACTIVE,
      visibility: query.visibility,
      search: query.search,
    };

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 50,
      sortBy: query.sortBy || 'displayOrder',
      sortOrder: query.sortOrder || 'asc',
    };

    const result = await this.categoryService.findRoots(
      filters,
      pagination,
      userRole,
    );

    return {
      data: result.data as CategoryResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
    type: CategoryTreeResponseDto,
  })
  @ApiQuery({
    name: 'rootId',
    required: false,
    type: String,
    description: 'Root category ID (optional)',
  })
  @ApiQuery({
    name: 'maxDepth',
    required: false,
    type: Number,
    description: 'Maximum tree depth',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Include only active categories',
  })
  async getCategoryTree(
    @Query() query: TreeQueryOptions,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryTreeResponseDto> {
    const tree = await this.categoryService.getCategoryTree(
      query.rootId,
      query.maxDepth,
      query.activeOnly !== false, // Default to true
      userRole,
    );

    return {
      data: tree as CategoryResponseDto[],
      rootId: query.rootId || undefined,
      maxDepth: query.maxDepth,
      totalNodes: tree.length,
    };
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured categories' })
  @ApiResponse({
    status: 200,
    description: 'Featured categories retrieved successfully',
  })
  async getFeaturedCategories(
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryResponseDto[]> {
    return this.categoryService.getFeaturedCategories({}, userRole) as Promise<
      CategoryResponseDto[]
    >;
  }

  @Get('leaf')
  @ApiOperation({
    summary: 'Get leaf categories (categories without children)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaf categories retrieved successfully',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Parent category ID (optional)',
  })
  async getLeafCategories(
    @Query('parentId') parentId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryResponseDto[]> {
    return this.categoryService.getLeafCategories(
      parentId,
      userRole,
    ) as Promise<CategoryResponseDto[]>;
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    return this.categoryService.getTreeStatistics();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: CategoryListResponseDto,
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  async searchCategories(
    @Query('q') query: string,
    @Query() filters: CategoryQueryFilters,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryListResponseDto> {
    const searchFilters: any = {
      status: filters.status,
      visibility: filters.visibility,
      parentId: filters.parentId,
    };

    const pagination = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'name',
      sortOrder: filters.sortOrder || 'asc',
    };

    const result = await this.categoryService.searchCategories(
      query,
      searchFilters,
      pagination,
      userRole,
    );

    return {
      data: result.data as CategoryResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: 'Include child categories',
  })
  @ApiQuery({
    name: 'includeAncestors',
    required: false,
    type: Boolean,
    description: 'Include ancestor categories',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeChildren') includeChildren?: boolean,
    @Query('includeAncestors') includeAncestors?: boolean,
  ): Promise<CategoryResponseDto> {
    const options = {
      includeChildren: includeChildren || false,
      includeAncestors: includeAncestors || false,
    };
    return this.categoryService.findById(
      id,
      options,
    ) as Promise<CategoryResponseDto>;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('includeChildren') includeChildren?: boolean,
    @Query('includeAncestors') includeAncestors?: boolean,
  ): Promise<CategoryResponseDto> {
    const options = {
      includeChildren: includeChildren || false,
      includeAncestors: includeAncestors || false,
    };
    return this.categoryService.findBySlug(
      slug,
      options,
    ) as Promise<CategoryResponseDto>;
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct children of a category' })
  @ApiResponse({
    status: 200,
    description: 'Child categories retrieved successfully',
    type: CategoryListResponseDto,
  })
  async getChildren(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CategoryQueryFilters,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<CategoryListResponseDto> {
    const filters: any = {
      status: query.status || CategoryStatus.ACTIVE,
      visibility: query.visibility,
      search: query.search,
    };

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 50,
      sortBy: query.sortBy || 'displayOrder',
      sortOrder: query.sortOrder || 'asc',
    };

    const result = await this.categoryService.findChildren(
      id,
      filters,
      pagination,
      userRole,
    );

    return {
      data: result.data as CategoryResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get ancestor categories (breadcrumb path)' })
  @ApiResponse({
    status: 200,
    description: 'Ancestor categories retrieved successfully',
  })
  @ApiQuery({
    name: 'includeRoot',
    required: false,
    type: Boolean,
    description: 'Include root category',
  })
  async getAncestors(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRoot') includeRoot: boolean = true,
  ): Promise<CategoryResponseDto[]> {
    return this.categoryService.getAncestors(id, includeRoot) as Promise<
      CategoryResponseDto[]
    >;
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendant categories' })
  @ApiResponse({
    status: 200,
    description: 'Descendant categories retrieved successfully',
  })
  @ApiQuery({
    name: 'maxDepth',
    required: false,
    type: Number,
    description: 'Maximum depth to traverse',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Include only active categories',
  })
  async getDescendants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('maxDepth') maxDepth?: number,
    @Query('activeOnly') activeOnly: boolean = false,
  ): Promise<CategoryResponseDto[]> {
    return this.categoryService.getDescendants(
      id,
      maxDepth,
      activeOnly,
    ) as Promise<CategoryResponseDto[]>;
  }

  @Post()
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Category with slug already exists',
  })
  async create(
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
    @CurrentUser('id') createdBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(
      createCategoryDto,
      createdBy,
      userRole,
    ) as Promise<CategoryResponseDto>;
  }

  @Put(':id')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(
      id,
      updateCategoryDto,
      updatedBy,
      userRole,
    ) as Promise<CategoryResponseDto>;
  }

  @Put(':id/status')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Category status updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) statusUpdate: CategoryStatusUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.updateStatus(
      id,
      statusUpdate,
      updatedBy,
      userRole,
    ) as Promise<CategoryResponseDto>;
  }

  @Put(':id/move')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move category to new parent (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category moved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid move operation' })
  async moveCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) moveDto: MoveCategoryDto,
    @CurrentUser('id') movedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.categoryService.moveCategory(id, moveDto, movedBy, userRole);
  }

  @Delete(':id')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with children or products',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') deletedBy: string,
    @CurrentUser('role') userRole: UserRole,
    @Query('reason') reason?: string,
  ): Promise<void> {
    await this.categoryService.delete(id, deletedBy, userRole, reason);
  }

  // Category Attribute Operations
  @Get(':id/attributes')
  @ApiOperation({ summary: 'Get category attributes' })
  @ApiResponse({
    status: 200,
    description: 'Category attributes retrieved successfully',
  })
  @ApiQuery({
    name: 'inherited',
    required: false,
    type: Boolean,
    description: 'Include inherited attributes',
  })
  async getCategoryAttributes(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Query('inherited') includeInherited: boolean = true,
  ) {
    return this.categoryAttributeService.findByCategoryId(
      categoryId,
      includeInherited,
    );
  }

  @Post(':id/attributes')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add attribute to category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Attribute added successfully' })
  async addCategoryAttribute(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body(ValidationPipe) createAttributeDto: CreateCategoryAttributeDto,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.categoryAttributeService.create(
      categoryId,
      createAttributeDto,
      createdBy,
      UserRole.ADMIN,
    );
  }

  @Put(':id/attributes/:attributeId')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category attribute (Admin only)' })
  @ApiResponse({ status: 200, description: 'Attribute updated successfully' })
  async updateCategoryAttribute(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Param('attributeId', ParseUUIDPipe) attributeId: string,
    @Body(ValidationPipe) updateAttributeDto: UpdateCategoryAttributeDto,
    @CurrentUser('id') updatedBy: string,
  ) {
    return this.categoryAttributeService.update(
      attributeId,
      updateAttributeDto,
      updatedBy,
      UserRole.ADMIN,
    );
  }

  @Delete(':id/attributes/:attributeId')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove attribute from category (Admin only)' })
  @ApiResponse({ status: 204, description: 'Attribute removed successfully' })
  async removeCategoryAttribute(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Param('attributeId', ParseUUIDPipe) attributeId: string,
    @CurrentUser('id') deletedBy: string,
  ): Promise<void> {
    await this.categoryAttributeService.delete(
      attributeId,
      deletedBy,
      UserRole.ADMIN,
    );
  }

  // Brand Integration
  @Get(':id/brands')
  @ApiOperation({ summary: 'Get brands allowed in category' })
  @ApiResponse({
    status: 200,
    description: 'Category brands retrieved successfully',
  })
  async getCategoryBrands(@Param('id', ParseUUIDPipe) categoryId: string) {
    return this.categoryService.findCategoriesForBrand(categoryId);
  }

  @Post(':id/validate-brand')
  @ApiOperation({ summary: 'Validate if brand can be used in category' })
  @ApiResponse({ status: 200, description: 'Brand validation result' })
  async validateBrandInCategory(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body('brandId', ParseUUIDPipe) brandId: string,
  ) {
    const isValid = await this.categoryService.validateBrandInCategory(
      brandId,
      categoryId,
    );
    return { isValid, categoryId, brandId };
  }

  // Bulk Operations
  @Put('bulk/status')
  @UseGuards(CategoryAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update category status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Categories updated successfully' })
  async bulkUpdateStatus(
    @Body()
    bulkUpdate: {
      categoryIds: string[];
      status: CategoryStatus;
      reason?: string;
    },
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.categoryService.bulkUpdateStatus(
      bulkUpdate.categoryIds,
      bulkUpdate.status,
      updatedBy,
      userRole,
      bulkUpdate.reason,
    );
  }

  // Maintenance Operations
  @Post('maintenance/refresh-statistics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Refresh tree statistics (Admin only)' })
  @ApiResponse({
    status: 204,
    description: 'Statistics refreshed successfully',
  })
  async refreshStatistics(
    @Query('categoryId') categoryId?: string,
  ): Promise<void> {
    await this.categoryService.refreshTreeStatistics(categoryId);
  }

  @Post('maintenance/rebuild-paths')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rebuild materialized paths (Admin only)' })
  @ApiResponse({ status: 204, description: 'Paths rebuilt successfully' })
  async rebuildPaths(@Query('rootId') rootId?: string): Promise<void> {
    await this.categoryService.rebuildMaterializedPaths(rootId);
  }

  // Audit Operations
  @Get(':id/audit')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category audit history (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit history retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of entries to skip',
  })
  async getCategoryAuditHistory(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.categoryAuditService.getCategoryAuditHistory(
      categoryId,
      limit,
      offset,
    );
  }

  @Get('audit/statistics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO string)',
  })
  async getAuditStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined;
    const dateToParsed = dateTo ? new Date(dateTo) : undefined;

    return this.categoryAuditService.getAuditStatistics(
      dateFromParsed,
      dateToParsed,
    );
  }
}
