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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductApprovalDto,
} from './dto/product.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Products')
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  async findAll(
    @Query() query: PaginationQuery,
    @CurrentUser('id') userId?: string,
    @CurrentUser('roles') userRoles?: UserRole[],
  ) {
    // Sellers can only see their own products, admins see all
    const sellerId = userRoles?.includes(UserRole.ADMIN) ? undefined : userId;
    return this.productService.findAll(query, sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('roles') userRoles?: UserRole[],
  ) {
    const sellerId = userRoles?.includes(UserRole.ADMIN) ? undefined : userId;
    return this.productService.findById(id, sellerId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (public)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findBySlug(@Param('slug') slug: string) {
    return this.productService.findBySlug(slug);
  }

  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.productService.create(createProductDto, sellerId);
  }

  @Put(':id')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    const userRole = userRoles.includes(UserRole.ADMIN) ? UserRole.ADMIN : UserRole.SELLER;
    return this.productService.update(id, updateProductDto, sellerId, userRole);
  }

  @Post(':id/submit')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit product for approval' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async submitForApproval(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.productService.submitForApproval(id, sellerId);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject product' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async approveProduct(
    @Param('id') id: string,
    @Body() approvalDto: ProductApprovalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.productService.approveProduct(id, approvalDto, adminId);
  }

  @Delete(':id')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    const userRole = userRoles.includes(UserRole.ADMIN) ? UserRole.ADMIN : UserRole.SELLER;
    await this.productService.delete(id, sellerId, userRole);
  }
}