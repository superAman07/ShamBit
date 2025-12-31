import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
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

import {
  CommissionService,
  type CreateCommissionRuleDto,
} from './commission.service';
import {
  PromotionService,
  type CreatePromotionDto,
  type PromotionEligibilityCheck,
} from './promotion.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';

@ApiTags('Pricing')
@Controller('pricing')
@UseGuards(AuthGuard, RolesGuard)
export class PricingController {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly promotionService: PromotionService,
  ) {}

  // Commission Rules
  @Get('commission-rules')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all commission rules' })
  async getCommissionRules() {
    return this.commissionService.getAllRules();
  }

  @Post('commission-rules')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create commission rule' })
  async createCommissionRule(@Body() createRuleDto: CreateCommissionRuleDto) {
    return this.commissionService.createRule(createRuleDto);
  }

  @Put('commission-rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update commission rule' })
  async updateCommissionRule(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCommissionRuleDto>,
  ) {
    return this.commissionService.updateRule(id, updateData);
  }

  @Post('commission-rules/:id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate commission rule' })
  async deactivateCommissionRule(@Param('id') id: string) {
    await this.commissionService.deactivateRule(id);
    return { message: 'Commission rule deactivated successfully' };
  }

  // Promotions
  @Get('promotions')
  @ApiOperation({ summary: 'Get all promotions' })
  async getPromotions() {
    // This would typically have pagination and filtering
    return { message: 'Promotions endpoint - implementation needed' };
  }

  @Post('promotions')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create promotion' })
  async createPromotion(
    @Body() createPromotionDto: CreatePromotionDto,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.promotionService.createPromotion(createPromotionDto, createdBy);
  }

  @Post('promotions/:id/activate')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate promotion' })
  async activatePromotion(
    @Param('id') promotionId: string,
    @CurrentUser('id') activatedBy: string,
  ) {
    return this.promotionService.activatePromotion(promotionId, activatedBy);
  }

  @Post('promotions/apply')
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply promotions to order' })
  async applyPromotions(
    @Body() eligibilityCheck: PromotionEligibilityCheck,
    @CurrentUser('id') userId: string,
  ) {
    // Ensure the user ID matches the request
    eligibilityCheck.userId = userId;

    return this.promotionService.applyPromotions(eligibilityCheck);
  }

  @Post('promotions/eligible')
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get eligible promotions for order' })
  async getEligiblePromotions(
    @Body() eligibilityCheck: PromotionEligibilityCheck,
    @CurrentUser('id') userId: string,
  ) {
    // Ensure the user ID matches the request
    eligibilityCheck.userId = userId;

    return this.promotionService.getEligiblePromotions(eligibilityCheck);
  }
}
