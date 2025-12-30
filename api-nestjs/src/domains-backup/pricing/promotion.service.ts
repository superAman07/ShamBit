import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PromotionRepository } from './promotion.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export enum PromotionType {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_SHIPPING = 'FREE_SHIPPING',
  BUNDLE_DISCOUNT = 'BUNDLE_DISCOUNT',
}

export enum PromotionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PromotionScope {
  GLOBAL = 'GLOBAL',
  CATEGORY = 'CATEGORY',
  PRODUCT = 'PRODUCT',
  SELLER = 'SELLER',
  USER = 'USER',
}

export interface PromotionRule {
  id: string;
  name: string;
  description: string;
  code?: string; // Coupon code
  type: PromotionType;
  scope: PromotionScope;
  status: PromotionStatus;
  
  // Discount configuration
  discountValue: number; // Percentage or fixed amount
  maxDiscountAmount?: number; // Cap for percentage discounts
  minOrderAmount?: number; // Minimum order value
  
  // Usage limits
  usageLimit?: number; // Total usage limit
  usageLimitPerUser?: number; // Per-user usage limit
  currentUsage: number;
  
  // Validity
  validFrom: Date;
  validTo: Date;
  
  // Scope filters
  applicableCategories?: string[];
  applicableProducts?: string[];
  applicableSellers?: string[];
  applicableUsers?: string[];
  
  // Buy X Get Y specific
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercentage?: number;
  
  // Bundle specific
  bundleProducts?: string[];
  bundleMinQuantity?: number;
  
  // Metadata
  priority: number;
  isStackable: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromotionDto {
  name: string;
  description: string;
  code?: string;
  type: PromotionType;
  scope: PromotionScope;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  validFrom: Date;
  validTo: Date;
  applicableCategories?: string[];
  applicableProducts?: string[];
  applicableSellers?: string[];
  applicableUsers?: string[];
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercentage?: number;
  bundleProducts?: string[];
  bundleMinQuantity?: number;
  priority?: number;
  isStackable?: boolean;
}

export interface PromotionApplication {
  promotionId: string;
  promotionName: string;
  promotionCode?: string;
  discountAmount: number;
  applicableItems: {
    variantId: string;
    quantity: number;
    originalPrice: number;
    discountedPrice: number;
    discountAmount: number;
  }[];
}

export interface PromotionEligibilityCheck {
  orderId?: string;
  userId: string;
  items: {
    variantId: string;
    productId: string;
    categoryId: string;
    sellerId: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  promotionCode?: string;
}

@Injectable()
export class PromotionService {
  constructor(
    private readonly promotionRepository: PromotionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async createPromotion(
    createPromotionDto: CreatePromotionDto,
    createdBy: string,
  ): Promise<PromotionRule> {
    this.logger.log('PromotionService.createPromotion', { createPromotionDto, createdBy });

    // Validate promotion data
    this.validatePromotionData(createPromotionDto);

    // Check for duplicate coupon code
    if (createPromotionDto.code) {
      const existingPromotion = await this.promotionRepository.findByCode(
        createPromotionDto.code,
      );
      if (existingPromotion) {
        throw new ConflictException('Promotion code already exists');
      }
    }

    const promotion = await this.promotionRepository.create({
      ...createPromotionDto,
      status: PromotionStatus.DRAFT,
      currentUsage: 0,
      priority: createPromotionDto.priority || 0,
      isStackable: createPromotionDto.isStackable || false,
      createdBy,
    });

    // Emit promotion created event
    this.eventEmitter.emit('promotion.created', {
      promotionId: promotion.id,
      promotionName: promotion.name,
      createdBy,
      timestamp: new Date(),
    });

    this.logger.log('Promotion created successfully', { promotionId: promotion.id });
    return promotion;
  }

  async activatePromotion(promotionId: string, activatedBy: string): Promise<PromotionRule> {
    this.logger.log('PromotionService.activatePromotion', { promotionId, activatedBy });

    const promotion = await this.promotionRepository.findById(promotionId);
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion.status !== PromotionStatus.DRAFT && promotion.status !== PromotionStatus.PAUSED) {
      throw new BadRequestException('Promotion cannot be activated from current status');
    }

    // Validate promotion is within valid date range
    const now = new Date();
    if (now < promotion.validFrom || now > promotion.validTo) {
      throw new BadRequestException('Promotion is outside valid date range');
    }

    const updatedPromotion = await this.promotionRepository.update(promotionId, {
      status: PromotionStatus.ACTIVE,
    });

    // Emit promotion activated event
    this.eventEmitter.emit('promotion.activated', {
      promotionId,
      promotionName: promotion.name,
      activatedBy,
      timestamp: new Date(),
    });

    this.logger.log('Promotion activated successfully', { promotionId });
    return updatedPromotion;
  }

  async getEligiblePromotions(
    eligibilityCheck: PromotionEligibilityCheck,
  ): Promise<PromotionRule[]> {
    this.logger.log('PromotionService.getEligiblePromotions', { 
      userId: eligibilityCheck.userId,
      itemCount: eligibilityCheck.items.length,
      totalAmount: eligibilityCheck.totalAmount,
    });

    const now = new Date();
    
    // Get all active promotions
    let promotions = await this.promotionRepository.findActive(now);

    // Filter by promotion code if provided
    if (eligibilityCheck.promotionCode) {
      promotions = promotions.filter(p => p.code === eligibilityCheck.promotionCode);
    }

    // Filter eligible promotions
    const eligiblePromotions: PromotionRule[] = [];

    for (const promotion of promotions) {
      if (await this.isPromotionEligible(promotion, eligibilityCheck)) {
        eligiblePromotions.push(promotion);
      }
    }

    // Sort by priority (higher priority first)
    eligiblePromotions.sort((a, b) => b.priority - a.priority);

    this.logger.log('Eligible promotions found', {
      userId: eligibilityCheck.userId,
      eligibleCount: eligiblePromotions.length,
      promotionIds: eligiblePromotions.map(p => p.id),
    });

    return eligiblePromotions;
  }

  async applyPromotions(
    eligibilityCheck: PromotionEligibilityCheck,
    maxPromotions = 1,
  ): Promise<PromotionApplication[]> {
    this.logger.log('PromotionService.applyPromotions', {
      userId: eligibilityCheck.userId,
      maxPromotions,
    });

    const eligiblePromotions = await this.getEligiblePromotions(eligibilityCheck);
    const applications: PromotionApplication[] = [];
    let remainingItems = [...eligibilityCheck.items];
    let remainingAmount = eligibilityCheck.totalAmount;

    for (const promotion of eligiblePromotions) {
      if (applications.length >= maxPromotions) {
        break;
      }

      // Check if promotion is stackable
      if (applications.length > 0 && !promotion.isStackable) {
        continue;
      }

      const application = this.calculatePromotionDiscount(
        promotion,
        remainingItems,
        remainingAmount,
      );

      if (application && application.discountAmount > 0) {
        applications.push(application);

        // Update remaining items and amount for next promotion
        remainingItems = this.updateRemainingItems(remainingItems, application);
        remainingAmount -= application.discountAmount;
      }
    }

    this.logger.log('Promotions applied', {
      userId: eligibilityCheck.userId,
      applicationsCount: applications.length,
      totalDiscount: applications.reduce((sum, app) => sum + app.discountAmount, 0),
    });

    return applications;
  }

  async recordPromotionUsage(
    promotionId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    this.logger.log('PromotionService.recordPromotionUsage', {
      promotionId,
      userId,
      orderId,
      discountAmount,
    });

    const promotion = await this.promotionRepository.findById(promotionId);
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    // Update usage count
    await this.promotionRepository.update(promotionId, {
      currentUsage: promotion.currentUsage + 1,
    });

    // Record usage history
    await this.promotionRepository.recordUsage({
      promotionId,
      userId,
      orderId,
      discountAmount,
      usedAt: new Date(),
    });

    // Check if promotion has reached usage limit
    if (promotion.usageLimit && promotion.currentUsage + 1 >= promotion.usageLimit) {
      await this.promotionRepository.update(promotionId, {
        status: PromotionStatus.EXPIRED,
      });

      this.eventEmitter.emit('promotion.usage_limit_reached', {
        promotionId,
        promotionName: promotion.name,
        timestamp: new Date(),
      });
    }

    // Emit promotion used event
    this.eventEmitter.emit('promotion.used', {
      promotionId,
      promotionName: promotion.name,
      userId,
      orderId,
      discountAmount,
      timestamp: new Date(),
    });

    this.logger.log('Promotion usage recorded', { promotionId, orderId });
  }

  private async isPromotionEligible(
    promotion: PromotionRule,
    eligibilityCheck: PromotionEligibilityCheck,
  ): Promise<boolean> {
    // Check minimum order amount
    if (promotion.minOrderAmount && eligibilityCheck.totalAmount < promotion.minOrderAmount) {
      return false;
    }

    // Check usage limits
    if (promotion.usageLimit && promotion.currentUsage >= promotion.usageLimit) {
      return false;
    }

    // Check per-user usage limit
    if (promotion.usageLimitPerUser) {
      const userUsage = await this.promotionRepository.getUserUsageCount(
        promotion.id,
        eligibilityCheck.userId,
      );
      if (userUsage >= promotion.usageLimitPerUser) {
        return false;
      }
    }

    // Check scope-specific eligibility
    switch (promotion.scope) {
      case PromotionScope.GLOBAL:
        return true;

      case PromotionScope.CATEGORY:
        if (!promotion.applicableCategories?.length) return false;
        return eligibilityCheck.items.some(item =>
          promotion.applicableCategories!.includes(item.categoryId),
        );

      case PromotionScope.PRODUCT:
        if (!promotion.applicableProducts?.length) return false;
        return eligibilityCheck.items.some(item =>
          promotion.applicableProducts!.includes(item.productId),
        );

      case PromotionScope.SELLER:
        if (!promotion.applicableSellers?.length) return false;
        return eligibilityCheck.items.some(item =>
          promotion.applicableSellers!.includes(item.sellerId),
        );

      case PromotionScope.USER:
        if (!promotion.applicableUsers?.length) return false;
        return promotion.applicableUsers.includes(eligibilityCheck.userId);

      default:
        return false;
    }
  }

  private calculatePromotionDiscount(
    promotion: PromotionRule,
    items: PromotionEligibilityCheck['items'],
    totalAmount: number,
  ): PromotionApplication | null {
    const applicableItems = this.getApplicableItems(promotion, items);
    if (applicableItems.length === 0) {
      return null;
    }

    let discountAmount = 0;
    const discountedItems: PromotionApplication['applicableItems'] = [];

    switch (promotion.type) {
      case PromotionType.PERCENTAGE_DISCOUNT:
        for (const item of applicableItems) {
          const itemTotal = item.quantity * item.unitPrice;
          const itemDiscount = (itemTotal * promotion.discountValue) / 100;
          const cappedDiscount = promotion.maxDiscountAmount
            ? Math.min(itemDiscount, promotion.maxDiscountAmount)
            : itemDiscount;
          
          discountAmount += cappedDiscount;
          discountedItems.push({
            variantId: item.variantId,
            quantity: item.quantity,
            originalPrice: item.unitPrice,
            discountedPrice: item.unitPrice - (cappedDiscount / item.quantity),
            discountAmount: cappedDiscount,
          });
        }
        break;

      case PromotionType.FIXED_DISCOUNT:
        discountAmount = Math.min(promotion.discountValue, totalAmount);
        // Distribute discount proportionally across applicable items
        const applicableTotal = applicableItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice),
          0,
        );
        
        for (const item of applicableItems) {
          const itemTotal = item.quantity * item.unitPrice;
          const itemDiscountRatio = itemTotal / applicableTotal;
          const itemDiscount = discountAmount * itemDiscountRatio;
          
          discountedItems.push({
            variantId: item.variantId,
            quantity: item.quantity,
            originalPrice: item.unitPrice,
            discountedPrice: item.unitPrice - (itemDiscount / item.quantity),
            discountAmount: itemDiscount,
          });
        }
        break;

      case PromotionType.BUY_X_GET_Y:
        // Implementation for Buy X Get Y logic
        discountAmount = this.calculateBuyXGetYDiscount(promotion, applicableItems);
        break;

      case PromotionType.FREE_SHIPPING:
        // This would be handled at the shipping calculation level
        discountAmount = 0; // Shipping discount handled separately
        break;

      default:
        return null;
    }

    if (discountAmount <= 0) {
      return null;
    }

    return {
      promotionId: promotion.id,
      promotionName: promotion.name,
      promotionCode: promotion.code,
      discountAmount,
      applicableItems: discountedItems,
    };
  }

  private getApplicableItems(
    promotion: PromotionRule,
    items: PromotionEligibilityCheck['items'],
  ): PromotionEligibilityCheck['items'] {
    switch (promotion.scope) {
      case PromotionScope.GLOBAL:
        return items;

      case PromotionScope.CATEGORY:
        return items.filter(item =>
          promotion.applicableCategories?.includes(item.categoryId),
        );

      case PromotionScope.PRODUCT:
        return items.filter(item =>
          promotion.applicableProducts?.includes(item.productId),
        );

      case PromotionScope.SELLER:
        return items.filter(item =>
          promotion.applicableSellers?.includes(item.sellerId),
        );

      default:
        return items;
    }
  }

  private calculateBuyXGetYDiscount(
    promotion: PromotionRule,
    items: PromotionEligibilityCheck['items'],
  ): number {
    if (!promotion.buyQuantity || !promotion.getQuantity) {
      return 0;
    }

    // Sort items by price (ascending) to give discount on cheapest items
    const sortedItems = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
    
    let totalQuantity = 0;
    let discountAmount = 0;

    for (const item of sortedItems) {
      totalQuantity += item.quantity;
    }

    const eligibleSets = Math.floor(totalQuantity / promotion.buyQuantity);
    const freeItems = eligibleSets * promotion.getQuantity;

    // Apply discount to cheapest items
    let remainingFreeItems = freeItems;
    for (const item of sortedItems) {
      if (remainingFreeItems <= 0) break;

      const itemsToDiscount = Math.min(remainingFreeItems, item.quantity);
      const itemDiscount = itemsToDiscount * item.unitPrice;
      
      if (promotion.getDiscountPercentage) {
        discountAmount += (itemDiscount * promotion.getDiscountPercentage) / 100;
      } else {
        discountAmount += itemDiscount; // 100% discount (free)
      }

      remainingFreeItems -= itemsToDiscount;
    }

    return discountAmount;
  }

  private updateRemainingItems(
    items: PromotionEligibilityCheck['items'],
    application: PromotionApplication,
  ): PromotionEligibilityCheck['items'] {
    // For non-stackable promotions, you might want to remove discounted items
    // For now, we'll keep all items for potential stacking
    return items;
  }

  private validatePromotionData(data: CreatePromotionDto): void {
    if (data.validFrom >= data.validTo) {
      throw new BadRequestException('Valid from date must be before valid to date');
    }

    if (data.type === PromotionType.PERCENTAGE_DISCOUNT) {
      if (data.discountValue <= 0 || data.discountValue > 100) {
        throw new BadRequestException('Percentage discount must be between 0 and 100');
      }
    }

    if (data.type === PromotionType.FIXED_DISCOUNT && data.discountValue <= 0) {
      throw new BadRequestException('Fixed discount must be greater than 0');
    }

    if (data.type === PromotionType.BUY_X_GET_Y) {
      if (!data.buyQuantity || !data.getQuantity || data.buyQuantity <= 0 || data.getQuantity <= 0) {
        throw new BadRequestException('Buy X Get Y promotions require valid buy and get quantities');
      }
    }
  }
}