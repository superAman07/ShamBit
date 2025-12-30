import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { ReviewModerationService } from './review-moderation.service';
import { ReviewAggregationService } from './review-aggregation.service';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewService,
    ReviewRepository,
    ReviewModerationService,
    ReviewAggregationService,
  ],
  exports: [ReviewService, ReviewAggregationService],
})
export class ReviewModule {}