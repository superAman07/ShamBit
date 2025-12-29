import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PromotionRule, CreatePromotionDto } from './promotion.service';

@Injectable()
export class PromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePromotionDto & { 
    status: string; 
    currentUsage: number; 
    createdBy: string; 
  }): Promise<PromotionRule> {
    const promotion = await this.prisma.promotion.create({
      data: {
        name: data.name,
        description: data.description,
        code: data.code,
        type: data.type,
        scope: data.scope,
        status: data.status,
        discountValue: data.discountValue,
        maxDiscountAmount: data.maxDiscountAmount,
        minOrderAmount: data.minOrderAmount,
        usageLimit: data.usageLimit,
        usageLimitPerUser: data.usageLimitPerUser,
        currentUsage: data.currentUsage,
        validFrom: data.validFrom,
        validTo: data.validTo,
        applicableCategories: data.applicableCategories || [],
        applicableProducts: data.applicableProducts || [],
        applicableSellers: data.applicableSellers || [],
        applicableUsers: data.applicableUsers || [],
        buyQuantity: data.buyQuantity,
        getQuantity: data.getQuantity,
        getDiscountPercentage: data.getDiscountPercentage,
        bundleProducts: data.bundleProducts || [],
        bundleMinQuantity: data.bundleMinQuantity,
        priority: data.priority || 0,
        isStackable: data.isStackable || false,
        createdBy: data.createdBy,
      },
    });

    return this.mapToPromotionRule(promotion);
  }

  async findById(id: string): Promise<PromotionRule | null> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      return null;
    }

    return this.mapToPromotionRule(promotion);
  }

  async findByCode(code: string): Promise<PromotionRule | null> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { code },
    });

    if (!promotion) {
      return null;
    }

    return this.mapToPromotionRule(promotion);
  }

  async update(id: string, data: any): Promise<PromotionRule> {
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data,
    });

    return this.mapToPromotionRule(promotion);
  }

  async findActive(date: Date): Promise<PromotionRule[]> {
    const promotions = await this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: date },
        OR: [
          { validTo: null },
          { validTo: { gte: date } },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    return promotions.map(this.mapToPromotionRule);
  }

  async getUserUsageCount(promotionId: string, userId: string): Promise<number> {
    return this.prisma.promotionUsage.count({
      where: {
        promotionId,
        userId,
      },
    });
  }

  async recordUsage(data: {
    promotionId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
    usedAt: Date;
  }): Promise<void> {
    await this.prisma.promotionUsage.create({
      data,
    });
  }

  private mapToPromotionRule(promotion: any): PromotionRule {
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      code: promotion.code,
      type: promotion.type,
      scope: promotion.scope,
      status: promotion.status,
      discountValue: promotion.discountValue,
      maxDiscountAmount: promotion.maxDiscountAmount,
      minOrderAmount: promotion.minOrderAmount,
      usageLimit: promotion.usageLimit,
      usageLimitPerUser: promotion.usageLimitPerUser,
      currentUsage: promotion.currentUsage,
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      applicableCategories: promotion.applicableCategories,
      applicableProducts: promotion.applicableProducts,
      applicableSellers: promotion.applicableSellers,
      applicableUsers: promotion.applicableUsers,
      buyQuantity: promotion.buyQuantity,
      getQuantity: promotion.getQuantity,
      getDiscountPercentage: promotion.getDiscountPercentage,
      bundleProducts: promotion.bundleProducts,
      bundleMinQuantity: promotion.bundleMinQuantity,
      priority: promotion.priority,
      isStackable: promotion.isStackable,
      createdBy: promotion.createdBy,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }
}