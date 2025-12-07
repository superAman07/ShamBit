import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';
import {
  Promotion,
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionListQuery,
  ValidatePromotionRequest,
  ValidatePromotionResponse,
  PromotionUsage,
  PromotionUsageStats,
} from '../types/promotion.types';

const logger = createLogger('promotion-service');

export class PromotionService {
  private get db() {
    return getDatabase();
  }

  /**
   * Map database row to Promotion object
   */
  private mapToPromotion(row: any): Promotion {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      minOrderValue: row.min_order_value,
      maxDiscountAmount: row.max_discount_amount,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      perUserLimit: row.per_user_limit,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create a new promotion
   */
  async createPromotion(
    data: CreatePromotionDto,
    adminId: string
  ): Promise<Promotion> {
    // Validate discount value
    if (data.discountType === 'percentage') {
      if (data.discountValue < 0 || data.discountValue > 100) {
        throw new AppError(
          'Percentage discount must be between 0 and 100',
          400,
          'INVALID_DISCOUNT_VALUE'
        );
      }
    } else if (data.discountValue < 0) {
      throw new AppError(
        'Fixed discount amount must be positive',
        400,
        'INVALID_DISCOUNT_VALUE'
      );
    }

    // Validate dates
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new AppError(
        'End date must be after start date',
        400,
        'INVALID_DATE_RANGE'
      );
    }

    // Check if code already exists
    const existing = await this.db('promotions')
      .where('code', data.code.toUpperCase())
      .first();

    if (existing) {
      throw new AppError(
        'Promotion code already exists',
        409,
        'DUPLICATE_PROMO_CODE'
      );
    }

    const [promotion] = await this.db('promotions')
      .insert({
        code: data.code.toUpperCase(),
        description: data.description,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        min_order_value: data.minOrderValue,
        max_discount_amount: data.maxDiscountAmount,
        usage_limit: data.usageLimit,
        per_user_limit: data.perUserLimit,
        start_date: data.startDate,
        end_date: data.endDate,
        is_active: data.isActive ?? true,
        created_by: adminId,
      })
      .returning('*');

    return this.mapToPromotion(promotion);
  }

  /**
   * Get all promotions with optional filtering
   */
  async getPromotions(query: PromotionListQuery = {}): Promise<{
    promotions: Promotion[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalItems: number;
    };
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let queryBuilder = this.db('promotions');

    // Filter by active status
    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.where('is_active', query.isActive);
    }

    // Filter out expired promotions unless explicitly requested
    if (!query.includeExpired) {
      queryBuilder = queryBuilder.where('end_date', '>=', new Date());
    }

    // Get total count (without orderBy)
    const [{ count }] = await queryBuilder.clone().count('* as count');
    const totalItems = parseInt(count as string, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated results with ordering
    const promotions = await queryBuilder
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      promotions: promotions.map(this.mapToPromotion),
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };
  }

  /**
   * Get a single promotion by ID
   */
  async getPromotionById(id: string): Promise<Promotion> {
    const promotion = await this.db('promotions').where('id', id).first();

    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    return this.mapToPromotion(promotion);
  }

  /**
   * Get a promotion by code
   */
  async getPromotionByCode(code: string): Promise<Promotion> {
    const promotion = await this.db('promotions')
      .where('code', code.toUpperCase())
      .first();

    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    return this.mapToPromotion(promotion);
  }

  /**
   * Update a promotion
   */
  async updatePromotion(
    id: string,
    data: UpdatePromotionDto
  ): Promise<Promotion> {
    const promotion = await this.db('promotions').where('id', id).first();

    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountValue !== undefined) {
      // Validate discount value
      if (promotion.discount_type === 'percentage') {
        if (data.discountValue < 0 || data.discountValue > 100) {
          throw new AppError(
            'Percentage discount must be between 0 and 100',
            400,
            'INVALID_DISCOUNT_VALUE'
          );
        }
      } else if (data.discountValue < 0) {
        throw new AppError(
          'Fixed discount amount must be positive',
          400,
          'INVALID_DISCOUNT_VALUE'
        );
      }
      updateData.discount_value = data.discountValue;
    }
    if (data.minOrderValue !== undefined)
      updateData.min_order_value = data.minOrderValue;
    if (data.maxDiscountAmount !== undefined)
      updateData.max_discount_amount = data.maxDiscountAmount;
    if (data.usageLimit !== undefined) updateData.usage_limit = data.usageLimit;
    if (data.perUserLimit !== undefined)
      updateData.per_user_limit = data.perUserLimit;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    // Validate dates if both are being updated
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new AppError(
          'End date must be after start date',
          400,
          'INVALID_DATE_RANGE'
        );
      }
    }

    const [updatedPromotion] = await this.db('promotions')
      .where('id', id)
      .update(updateData)
      .returning('*');

    return this.mapToPromotion(updatedPromotion);
  }

  /**
   * Delete a promotion
   */
  async deletePromotion(id: string): Promise<void> {
    const promotion = await this.db('promotions').where('id', id).first();

    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    // Check if promotion has been used
    const [{ count }] = await this.db('promotion_usage')
      .where('promotion_id', id)
      .count('* as count');

    if (parseInt(count as string, 10) > 0) {
      throw new AppError(
        'Cannot delete promotion that has been used. Consider deactivating it instead.',
        400,
        'PROMOTION_IN_USE'
      );
    }

    await this.db('promotions').where('id', id).delete();
  }

  /**
   * Validate a promo code and calculate discount
   */
  async validatePromotion(
    request: ValidatePromotionRequest
  ): Promise<ValidatePromotionResponse> {
    try {
      // Get promotion by code
      const promotion = await this.db('promotions')
        .where('code', request.code.toUpperCase())
        .first();

      if (!promotion) {
        return {
          valid: false,
          error: 'Invalid promo code',
          errorCode: 'INVALID_PROMO_CODE',
        };
      }

      // Check if promotion is active
      if (!promotion.is_active) {
        return {
          valid: false,
          error: 'This promo code is no longer active',
          errorCode: 'PROMO_CODE_INACTIVE',
        };
      }

      // Check if promotion has started
      const now = new Date();
      if (new Date(promotion.start_date) > now) {
        return {
          valid: false,
          error: 'This promo code is not yet valid',
          errorCode: 'PROMO_CODE_NOT_STARTED',
        };
      }

      // Check if promotion has expired
      if (new Date(promotion.end_date) < now) {
        return {
          valid: false,
          error: 'This promo code has expired',
          errorCode: 'PROMO_CODE_EXPIRED',
        };
      }

      // Check minimum order value
      if (promotion.min_order_value && request.orderAmount < promotion.min_order_value) {
        return {
          valid: false,
          error: `Minimum order value of ₹${promotion.min_order_value / 100} required`,
          errorCode: 'MIN_ORDER_VALUE_NOT_MET',
        };
      }

      // Check total usage limit
      if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
        return {
          valid: false,
          error: 'This promo code has reached its usage limit',
          errorCode: 'USAGE_LIMIT_REACHED',
        };
      }

      // Check per-user usage limit
      if (promotion.per_user_limit) {
        const [{ count }] = await this.db('promotion_usage')
          .where({
            promotion_id: promotion.id,
            user_id: request.userId,
          })
          .count('* as count');

        const userUsageCount = parseInt(count as string, 10);
        if (userUsageCount >= promotion.per_user_limit) {
          return {
            valid: false,
            error: 'You have already used this promo code the maximum number of times',
            errorCode: 'USER_LIMIT_REACHED',
          };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (promotion.discount_type === 'percentage') {
        discountAmount = Math.round((request.orderAmount * promotion.discount_value) / 100);
        
        // Apply max discount cap if specified
        if (promotion.max_discount_amount && discountAmount > promotion.max_discount_amount) {
          discountAmount = promotion.max_discount_amount;
        }
      } else {
        // Fixed discount
        discountAmount = promotion.discount_value;
      }

      // Ensure discount doesn't exceed order amount
      if (discountAmount > request.orderAmount) {
        discountAmount = request.orderAmount;
      }

      return {
        valid: true,
        promotion: this.mapToPromotion(promotion),
        discountAmount,
      };
    } catch (error) {
      logger.error('Error validating promo code', { error });
      throw new AppError(
        'Error validating promo code',
        500,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Record promotion usage (called after successful order)
   */
  async recordPromotionUsage(
    promotionId: string,
    userId: string,
    orderId: string,
    discountAmount: number
  ): Promise<void> {
    const trx = await this.db.transaction();

    try {
      // Record usage
      await trx('promotion_usage').insert({
        promotion_id: promotionId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount,
      });

      // Increment usage count
      await trx('promotions')
        .where('id', promotionId)
        .increment('usage_count', 1);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw new AppError(
        'Error recording promotion usage',
        500,
        'USAGE_RECORD_ERROR'
      );
    }
  }

  /**
   * Get promotion usage statistics
   */
  async getPromotionUsageStats(promotionId: string): Promise<PromotionUsageStats> {
    const promotion = await this.db('promotions').where('id', promotionId).first();

    if (!promotion) {
      throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    // Get total usage and discount given
    const [totals] = await this.db('promotion_usage')
      .where('promotion_id', promotionId)
      .select(
        this.db.raw('COUNT(*) as total_usage'),
        this.db.raw('SUM(discount_amount) as total_discount'),
        this.db.raw('COUNT(DISTINCT user_id) as unique_users')
      );

    // Get usage by date
    const usageByDate = await this.db('promotion_usage')
      .where('promotion_id', promotionId)
      .select(
        this.db.raw('DATE(used_at) as date'),
        this.db.raw('COUNT(*) as count'),
        this.db.raw('SUM(discount_amount) as total_discount')
      )
      .groupBy(this.db.raw('DATE(used_at)'))
      .orderBy('date', 'desc');

    return {
      promotionId,
      code: promotion.code,
      totalUsage: parseInt(totals.total_usage || '0', 10),
      totalDiscountGiven: parseInt(totals.total_discount || '0', 10),
      uniqueUsers: parseInt(totals.unique_users || '0', 10),
      usageByDate: usageByDate.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count, 10),
        totalDiscount: parseInt(row.total_discount, 10),
      })),
    };
  }
}

export const promotionService = new PromotionService();
