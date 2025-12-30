import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ReviewRepository } from './review.repository';
import { ReviewModerationService } from './review-moderation.service';
import { ReviewAggregationService } from './review-aggregation.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export enum ReviewType {
  PRODUCT = 'PRODUCT',
  SELLER = 'SELLER',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export interface Review {
  id: string;
  userId: string;
  type: ReviewType;
  entityId: string; // productId or sellerId
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  images?: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reportCount: number;
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewDto {
  type: ReviewType;
  entityId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly moderationService: ReviewModerationService,
    private readonly aggregationService: ReviewAggregationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async createReview(createReviewDto: CreateReviewDto, userId: string): Promise<Review> {
    this.logger.log('ReviewService.createReview', { createReviewDto, userId });

    // Validate rating
    if (createReviewDto.rating < 1 || createReviewDto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if user already reviewed this entity
    const existingReview = await this.reviewRepository.findByUserAndEntity(
      userId,
      createReviewDto.type,
      createReviewDto.entityId,
    );

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this item');
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false;
    if (createReviewDto.orderId) {
      isVerifiedPurchase = await this.verifyPurchase(
        userId,
        createReviewDto.orderId,
        createReviewDto.entityId,
        createReviewDto.type,
      );
    }

    // Auto-moderate review
    const moderationResult = await this.moderationService.autoModerateReview({
      title: createReviewDto.title,
      comment: createReviewDto.comment,
      rating: createReviewDto.rating,
    });

    const review = await this.reviewRepository.create({
      ...createReviewDto,
      userId,
      status: moderationResult.status,
      isVerifiedPurchase,
      helpfulCount: 0,
      reportCount: 0,
    });

    // Update aggregated ratings
    await this.aggregationService.updateAggregatedRating(
      createReviewDto.type,
      createReviewDto.entityId,
    );

    // Emit review created event
    this.eventEmitter.emit('review.created', {
      reviewId: review.id,
      userId,
      type: createReviewDto.type,
      entityId: createReviewDto.entityId,
      rating: createReviewDto.rating,
      isVerifiedPurchase,
      timestamp: new Date(),
    });

    this.logger.log('Review created successfully', { reviewId: review.id });
    return {
      ...review,
      type: review.type as ReviewType,
      status: review.status as ReviewStatus,
    } as Review;
  }

  async findAll(query: any) {
    // TODO: Implement find all reviews
    return { reviews: [], total: 0 };
  }

  async findById(id: string): Promise<Review | null> {
    const review = await this.reviewRepository.findById(id);
    if (!review) return null;
    
    return {
      ...review,
      type: review.type as ReviewType,
      status: review.status as ReviewStatus,
    } as Review;
  }

  async updateReview(id: string, updateDto: any, userId: string) {
    // TODO: Implement review update
    return this.reviewRepository.update(id, updateDto);
  }

  async deleteReview(id: string, userId: string) {
    // TODO: Implement review deletion
    await this.reviewRepository.delete(id);
  }

  async markHelpful(reviewId: string, userId: string, isHelpful: boolean) {
    // TODO: Implement mark helpful
    return { success: true };
  }

  async reportReview(reviewId: string, userId: string, reason: string) {
    // TODO: Implement report review
    return { success: true };
  }

  async getPendingModeration(query: any) {
    return this.moderationService.getPendingReviews(query);
  }

  async moderateReview(reviewId: string, status: string, moderatorId: string, reason?: string) {
    return this.moderationService.moderateReview(reviewId, status, moderatorId, reason);
  }

  private async verifyPurchase(
    userId: string,
    orderId: string,
    entityId: string,
    type: ReviewType,
  ): Promise<boolean> {
    // TODO: Implement purchase verification logic
    // Check if user has purchased this product
    return false;
  }
}