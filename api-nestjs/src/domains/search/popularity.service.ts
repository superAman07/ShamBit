import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PopularityService {
  private readonly logger = new Logger(PopularityService.name);

  constructor(private readonly prisma: PrismaService) { }

  async calculatePopularityScore(productId: string): Promise<number> {
    try {
      // Get product metrics
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: {
              orderItems: {
                where: {
                  order: {
                    status: 'COMPLETED',
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!product) return 0;

      // Get reviews separately as there is no direct relation in schema
      const reviews = await this.prisma.review.findMany({
        where: {
          type: 'PRODUCT',
          entityId: productId,
          status: 'APPROVED',
        },
      });

      // Calculate metrics
      const orderCount = product.variants.reduce(
        (sum: number, variant: any) => sum + variant.orderItems.length,
        0
      );

      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : 0;

      // TODO: Get view count from analytics service
      const viewCount = 0;

      // Calculate popularity score using weighted formula
      const score = this.calculateWeightedScore({
        orderCount,
        reviewCount,
        averageRating,
        viewCount,
        createdAt: product.createdAt,
      });

      return score;

    } catch (error) {
      this.logger.error(`Failed to calculate popularity for product ${productId}`, error);
      return 0;
    }
  }

  private calculateWeightedScore(metrics: {
    orderCount: number;
    reviewCount: number;
    averageRating: number;
    viewCount: number;
    createdAt: Date;
  }): number {
    const {
      orderCount,
      reviewCount,
      averageRating,
      viewCount,
      createdAt,
    } = metrics;

    // Weights for different factors
    const weights = {
      orders: 0.4,
      reviews: 0.2,
      rating: 0.2,
      views: 0.1,
      freshness: 0.1,
    };

    // Normalize values (log scale for counts to prevent outliers)
    const normalizedOrders = Math.log(orderCount + 1);
    const normalizedReviews = Math.log(reviewCount + 1);
    const normalizedRating = averageRating / 5; // 0-1 scale
    const normalizedViews = Math.log(viewCount + 1);

    // Freshness factor (newer products get slight boost)
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessFactor = Math.max(0, 1 - daysSinceCreation / 365); // Decay over a year

    // Calculate weighted score
    const score = (
      normalizedOrders * weights.orders +
      normalizedReviews * weights.reviews +
      normalizedRating * weights.rating +
      normalizedViews * weights.views +
      freshnessFactor * weights.freshness
    ) * 100; // Scale to 0-100

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  async getTrendingProducts(categoryId?: string, limit = 20): Promise<string[]> {
    try {
      const where: any = {
        isActive: true,
        ...(categoryId && { categoryId }),
      };

      // Get products with recent activity
      const products: any[] = await this.prisma.product.findMany({
        where,
        include: {
          variants: {
            include: {
              orderItems: {
                where: {
                  order: {
                    status: 'COMPLETED',
                    createdAt: {
                      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                    },
                  },
                },
              },
            },
          },
        },
        take: limit * 2, // Get more to filter and sort
      });

      // Calculate trending scores (recent activity weighted more)
      const trending = products
        .map(product => {
          const recentOrders = product.variants.reduce(
            (sum: number, variant: any) => sum + variant.orderItems.length,
            0
          );

          return {
            productId: product.id,
            trendingScore: recentOrders * 10, // Simple trending score
          };
        })
        .filter(item => item.trendingScore > 0)
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map(item => item.productId);

      return trending;

    } catch (error) {
      this.logger.error('Failed to get trending products', error);
      return [];
    }
  }

  async getPopularCategories(limit = 10): Promise<Array<{ categoryId: string; score: number }>> {
    try {
      // Get categories with most orders in last 30 days
      const categories: any[] = await this.prisma.category.findMany({
        include: {
          products: {
            include: {
              variants: {
                include: {
                  orderItems: {
                    where: {
                      order: {
                        status: 'COMPLETED',
                        createdAt: {
                          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const popular = categories
        .map(category => {
          const orderCount = category.products.reduce(
            (sum: number, product: any) => sum + product.variants.reduce(
              (vSum: number, variant: any) => vSum + variant.orderItems.length,
              0
            ),
            0
          );

          return {
            categoryId: category.id,
            score: orderCount,
          };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return popular;

    } catch (error) {
      this.logger.error('Failed to get popular categories', error);
      return [];
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updatePopularityScores() {
    try {
      this.logger.log('Starting popularity scores update...');

      // Get products that need score updates (active products)
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 1000, // Process in batches
      });

      let updated = 0;
      for (const product of products) {
        try {
          const score = await this.calculatePopularityScore(product.id);

          // TODO: Store popularity score in search index or separate table
          // For now, we'll just log it
          this.logger.debug(`Product ${product.id} popularity score: ${score}`);
          updated++;

        } catch (error) {
          this.logger.error(`Failed to update popularity for product ${product.id}`, error);
        }
      }

      this.logger.log(`Updated popularity scores for ${updated} products`);

    } catch (error) {
      this.logger.error('Failed to update popularity scores', error);
    }
  }

  async getBestSellingProducts(categoryId?: string, limit = 20): Promise<string[]> {
    try {
      const where: any = {
        isActive: true,
        ...(categoryId && { categoryId }),
      };

      const products: any[] = await this.prisma.product.findMany({
        where,
        include: {
          variants: {
            include: {
              orderItems: {
                where: {
                  order: { status: 'COMPLETED' },
                },
              },
            },
          },
        },
      });

      const bestSelling = products
        .map(product => {
          const totalSold = product.variants.reduce(
            (sum: number, variant: any) => sum + variant.orderItems.reduce(
              (vSum: number, item: any) => vSum + item.quantity,
              0
            ),
            0
          );

          return {
            productId: product.id,
            totalSold,
          };
        })
        .filter(item => item.totalSold > 0)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, limit)
        .map(item => item.productId);

      return bestSelling;

    } catch (error) {
      this.logger.error('Failed to get best selling products', error);
      return [];
    }
  }
}