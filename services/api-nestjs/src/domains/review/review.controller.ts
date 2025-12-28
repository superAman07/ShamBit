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

import { ReviewService, CreateReviewDto } from './review.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(AuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get reviews' })
  async findAll(@Query() query: PaginationQuery & { entityType?: string; entityId?: string }) {
    return this.reviewService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  async findById(@Param('id') id: string) {
    return this.reviewService.findById(id);
  }

  @Post()
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review' })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.createReview(createReviewDto, userId);
  }

  @Put(':id')
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateReviewDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.updateReview(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete review' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.reviewService.deleteReview(id, userId);
  }

  @Post(':id/helpful')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markHelpful(
    @Param('id') reviewId: string,
    @Body() body: { isHelpful: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.markHelpful(reviewId, userId, body.isHelpful);
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report review' })
  async reportReview(
    @Param('id') reviewId: string,
    @Body() body: { reason: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.reportReview(reviewId, userId, body.reason);
  }

  @Get('moderation/pending')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews pending moderation' })
  async getPendingModeration(@Query() query: PaginationQuery) {
    return this.reviewService.getPendingModeration(query);
  }

  @Post(':id/moderate')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate review' })
  async moderateReview(
    @Param('id') reviewId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string },
    @CurrentUser('id') moderatorId: string,
  ) {
    return this.reviewService.moderateReview(reviewId, body.status, moderatorId, body.reason);
  }
}