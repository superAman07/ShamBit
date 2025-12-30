import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewAggregationService {
  async updateAggregatedRating(entityType: string, entityId: string) {
    // TODO: Implement rating aggregation
  }

  async getAggregatedRating(entityType: string, entityId: string) {
    // TODO: Implement aggregated rating retrieval
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
}