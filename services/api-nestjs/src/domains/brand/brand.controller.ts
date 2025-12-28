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

import { BrandService, CreateBrandDto } from './brand.service';
import { BrandRequestService } from './brand-request.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Brands')
@Controller('brands')
@UseGuards(AuthGuard, RolesGuard)
export class BrandController {
  constructor(
    private readonly brandService: BrandService,
    private readonly brandRequestService: BrandRequestService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  async findAll(@Query() query: PaginationQuery, @CurrentUser('id') sellerId?: string) {
    return this.brandService.findAll(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  async findById(@Param('id') id: string) {
    return this.brandService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create brand' })
  async create(
    @Body() createBrandDto: CreateBrandDto,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.brandService.create(createBrandDto, createdBy);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update brand' })
  async update(@Param('id') id: string, @Body() updateBrandDto: Partial<CreateBrandDto>) {
    return this.brandService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand' })
  async delete(@Param('id') id: string) {
    await this.brandService.delete(id);
  }

  @Post('requests')
  @Roles(UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request new brand' })
  async requestBrand(
    @Body() requestDto: any,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.brandRequestService.createRequest(requestDto, sellerId);
  }

  @Get('requests')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get brand requests' })
  async getBrandRequests(@Query() query: PaginationQuery) {
    return this.brandRequestService.findAll(query);
  }

  @Put('requests/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve/reject brand request' })
  async handleBrandRequest(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.brandRequestService.handleRequest(id, body.status, adminId, body.reason);
  }
}