import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
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

import { FeatureFlagService } from './feature-flag.service';
import type { CreateFeatureFlagDto } from './feature-flag.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser, Public } from '../../common/decorators';
import { UserRole } from '../../common/types';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAllFlags() {
    return this.featureFlagService.getAllFlags();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feature flag by ID' })
  async getFlag(@Param('id') id: string) {
    return this.featureFlagService.getFlagById(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create feature flag' })
  async createFlag(
    @Body() createFlagDto: CreateFeatureFlagDto,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.featureFlagService.createFlag(createFlagDto, createdBy);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update feature flag' })
  async updateFlag(
    @Param('id') id: string,
    @Body() updateFlagDto: Partial<CreateFeatureFlagDto>,
  ) {
    return this.featureFlagService.updateFlag(id, updateFlagDto);
  }

  @Post(':id/toggle')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle feature flag' })
  async toggleFlag(@Param('id') id: string) {
    return this.featureFlagService.toggleFlag(id);
  }

  @Public()
  @Get('check/:key')
  @ApiOperation({ summary: 'Check if feature flag is enabled' })
  async checkFlag(
    @Param('key') key: string,
    @Query() context: { userId?: string; environment?: string },
  ) {
    const isEnabled = await this.featureFlagService.isEnabled(key, context);
    return { key, isEnabled };
  }

  @Public()
  @Post('bulk-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check multiple feature flags' })
  async checkMultipleFlags(@Body() body: { keys: string[]; context?: any }) {
    return this.featureFlagService.checkMultipleFlags(body.keys, body.context);
  }

  @Put(':id/rollout')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rollout percentage' })
  async updateRollout(
    @Param('id') id: string,
    @Body() body: { percentage: number },
  ) {
    return this.featureFlagService.increaseRollout(id, body.percentage);
  }

  @Post(':id/kill-switch')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emergency kill switch' })
  async killSwitch(@Param('id') id: string) {
    return this.featureFlagService.killSwitch(id);
  }
}
