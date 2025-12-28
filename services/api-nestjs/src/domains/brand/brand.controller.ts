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

import { BrandService } from './brand.service';
import { BrandRequestService } from './services/brand-request.service';
import { BrandAuditService } from './services/brand-audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BrandOwnershipGuard } from './guards/brand-ownership.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto, BrandStatusUpdateDto } from './dtos/update-brand.dto';
import { CreateBrandRequestDto, HandleBrandRequestDto } from './dtos/brand-request.dto';
import {
  BrandResponseDto,
  BrandRequestResponseDto,
  BrandListResponseDto,
  BrandRequestListResponseDto,
} from './dtos/brand-response.dto';
import { BrandStatus } from './enums/brand-status.enum';
import { BrandRequestStatus, BrandRequestType } from './enums/request-status.enum';

interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface BrandQueryFilters extends PaginationQuery {
  status?: BrandStatus;
  isGlobal?: boolean;
  isVerified?: boolean;
  categoryIds?: string;
  search?: string;
}

interface BrandRequestQueryFilters extends PaginationQuery {
  status?: BrandRequestStatus;
  type?: BrandRequestType;
  dateFrom?: string;
  dateTo?: string;
}

@ApiTags('Brands')
@Controller('brands')
@UseGuards(AuthGuard, RolesGuard)
export class BrandController {
  constructor(
    private readonly brandService: BrandService,
    private readonly brandRequestService: BrandRequestService,
    private readonly brandAuditService: BrandAuditService,
  ) {}

  // Brand CRUD Operations
  @Get()
  @ApiOperation({ summary: 'Get all brands with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully', type: BrandListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: BrandStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'isGlobal', required: false, type: Boolean, description: 'Filter by global brands' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name and description' })
  async findAll(
    @Query() query: BrandQueryFilters,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ): Promise<BrandListResponseDto> {
    const filters: any = {
      status: query.status,
      isGlobal: query.isGlobal,
      search: query.search,
    };

    // Parse categoryIds if provided
    if (query.categoryIds) {
      filters.categoryIds = query.categoryIds.split(',');
    }

    // For sellers, include their brands + global brands
    if (userRole === UserRole.SELLER) {
      filters.sellerId = userId;
    }

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    const result = await this.brandService.findAll(filters, pagination);

    return {
      data: result.data as BrandResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get brand statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ) {
    const sellerId = userRole === UserRole.SELLER ? userId : undefined;
    return this.brandService.getStatistics(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiResponse({ status: 200, description: 'Brand retrieved successfully', type: BrandResponseDto })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<BrandResponseDto> {
    return this.brandService.findById(id) as Promise<BrandResponseDto>;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get brand by slug' })
  @ApiResponse({ status: 200, description: 'Brand retrieved successfully', type: BrandResponseDto })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findBySlug(@Param('slug') slug: string): Promise<BrandResponseDto> {
    return this.brandService.findBySlug(slug) as Promise<BrandResponseDto>;
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new brand (Admin only)' })
  @ApiResponse({ status: 201, description: 'Brand created successfully', type: BrandResponseDto })
  @ApiResponse({ status: 409, description: 'Brand with slug already exists' })
  async create(
    @Body(ValidationPipe) createBrandDto: CreateBrandDto,
    @CurrentUser('id') createdBy: string,
  ): Promise<BrandResponseDto> {
    return this.brandService.create(createBrandDto, createdBy) as Promise<BrandResponseDto>;
  }

  @Put(':id')
  @UseGuards(BrandOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand' })
  @ApiResponse({ status: 200, description: 'Brand updated successfully', type: BrandResponseDto })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateBrandDto: UpdateBrandDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<BrandResponseDto> {
    return this.brandService.update(id, updateBrandDto, updatedBy, userRole) as Promise<BrandResponseDto>;
  }

  @Put(':id/status')
  @UseGuards(BrandOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand status' })
  @ApiResponse({ status: 200, description: 'Brand status updated successfully', type: BrandResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) statusUpdate: BrandStatusUpdateDto,
    @CurrentUser('id') updatedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<BrandResponseDto> {
    return this.brandService.updateStatus(id, statusUpdate, updatedBy, userRole) as Promise<BrandResponseDto>;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand (Admin only)' })
  @ApiResponse({ status: 204, description: 'Brand deleted successfully' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') deletedBy: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<void> {
    await this.brandService.delete(id, deletedBy, userRole);
  }

  // Brand Request Operations
  @Post('requests')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create brand request (Seller only)' })
  @ApiResponse({ status: 201, description: 'Brand request created successfully', type: BrandRequestResponseDto })
  @ApiResponse({ status: 409, description: 'Duplicate request exists' })
  async createBrandRequest(
    @Body(ValidationPipe) requestDto: CreateBrandRequestDto,
    @CurrentUser('id') sellerId: string,
  ): Promise<BrandRequestResponseDto> {
    return this.brandRequestService.createRequest(requestDto, sellerId) as Promise<BrandRequestResponseDto>;
  }

  @Get('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brand requests' })
  @ApiResponse({ status: 200, description: 'Brand requests retrieved successfully', type: BrandRequestListResponseDto })
  @ApiQuery({ name: 'status', required: false, enum: BrandRequestStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: BrandRequestType, description: 'Filter by type' })
  async getBrandRequests(
    @Query() query: BrandRequestQueryFilters,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<BrandRequestListResponseDto> {
    const filters: any = {
      status: query.status,
      type: query.type,
    };

    // Parse dates if provided
    if (query.dateFrom) {
      filters.dateFrom = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      filters.dateTo = new Date(query.dateTo);
    }

    // For sellers, only show their own requests
    if (userRole === UserRole.SELLER) {
      filters.requesterId = userId;
    }

    const pagination = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    const result = await this.brandRequestService.findAll(filters, pagination);

    return {
      data: result.data as BrandRequestResponseDto[],
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }

  @Get('requests/statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brand request statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getBrandRequestStatistics(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    const requesterId = userRole === UserRole.SELLER ? userId : undefined;
    return this.brandRequestService.getStatistics(requesterId);
  }

  @Get('requests/pending')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending brand requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved successfully' })
  async getPendingRequests(): Promise<BrandRequestResponseDto[]> {
    return this.brandRequestService.getPendingRequests() as Promise<BrandRequestResponseDto[]>;
  }

  @Get('requests/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brand request by ID' })
  @ApiResponse({ status: 200, description: 'Brand request retrieved successfully', type: BrandRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Brand request not found' })
  async getBrandRequestById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BrandRequestResponseDto> {
    return this.brandRequestService.findById(id) as Promise<BrandRequestResponseDto>;
  }

  @Put('requests/:id/handle')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle brand request - approve or reject (Admin only)' })
  @ApiResponse({ status: 200, description: 'Brand request handled successfully', type: BrandRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request status or missing rejection reason' })
  async handleBrandRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) handleDto: HandleBrandRequestDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BrandRequestResponseDto> {
    return this.brandRequestService.handleRequest(id, handleDto, adminId) as Promise<BrandRequestResponseDto>;
  }

  @Put('requests/:id/cancel')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel brand request (Seller only)' })
  @ApiResponse({ status: 200, description: 'Brand request cancelled successfully', type: BrandRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Can only cancel own requests' })
  async cancelBrandRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') sellerId: string,
  ): Promise<BrandRequestResponseDto> {
    return this.brandRequestService.cancelRequest(id, sellerId) as Promise<BrandRequestResponseDto>;
  }

  // Audit Operations
  @Get(':id/audit')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brand audit history (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit history retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of entries to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of entries to skip' })
  async getBrandAuditHistory(
    @Param('id', ParseUUIDPipe) brandId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.brandAuditService.getBrandAuditHistory(brandId, limit, offset);
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
    
    return this.brandAuditService.getAuditStatistics(dateFromParsed, dateToParsed);
  }
}