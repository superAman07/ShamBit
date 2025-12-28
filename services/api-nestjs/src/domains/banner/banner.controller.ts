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

import { BannerService } from './banner.service';
import { CampaignService } from './campaign.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser, Public } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Banners & CMS')
@Controller('banners')
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly campaignService: CampaignService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active banners' })
  async getActiveBanners(@Query() query: { position?: string }) {
    return this.bannerService.getActiveBanners(query.position);
  }

  @Get('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all banners for admin' })
  async getAllBanners(@Query() query: PaginationQuery) {
    return this.bannerService.getAllBanners(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get banner by ID' })
  async getBanner(@Param('id') id: string) {
    return this.bannerService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create banner' })
  async createBanner(
    @Body() createBannerDto: any,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.bannerService.createBanner(createBannerDto, createdBy);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banner' })
  async updateBanner(
    @Param('id') id: string,
    @Body() updateBannerDto: any,
  ) {
    return this.bannerService.updateBanner(id, updateBannerDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete banner' })
  async deleteBanner(@Param('id') id: string) {
    await this.bannerService.deleteBanner(id);
  }

  @Post(':id/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate/deactivate banner' })
  async toggleBanner(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.bannerService.toggleBanner(id, body.isActive);
  }

  // Campaign endpoints
  @Get('campaigns')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns' })
  async getCampaigns(@Query() query: PaginationQuery) {
    return this.campaignService.findAll(query);
  }

  @Post('campaigns')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create campaign' })
  async createCampaign(
    @Body() createCampaignDto: any,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.campaignService.createCampaign(createCampaignDto, createdBy);
  }

  @Get('campaigns/:id/analytics')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign analytics' })
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }
}