import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CommissionRepository } from './commission.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export interface CreateCommissionRuleDto {
  name: string;
  type: 'CATEGORY' | 'SELLER' | 'PRODUCT';
  entityId: string;
  rate: number;
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  priority?: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface CommissionRule {
  id: string;
  name: string;
  type: 'CATEGORY' | 'SELLER' | 'PRODUCT';
  entityId: string; // categoryId, sellerId, or productId
  commissionType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  priority: number;
  isActive: boolean;
  validFrom: Date;
  validTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionCalculation {
  baseAmount: number;
  commissionAmount: number;
  commissionRate: number;
  appliedRules: {
    ruleId: string;
    type: string;
    value: number;
    commissionAmount: number;
  }[];
  netAmount: number;
}

export interface CreateCommissionRuleDto {
  name: string;
  type: 'CATEGORY' | 'SELLER' | 'PRODUCT';
  entityId: string;
  rate: number;
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  priority?: number;
  validFrom?: Date;
  validTo?: Date;
}

@Injectable()
export class CommissionService {
  constructor(
    private readonly commissionRepository: CommissionRepository,
    private readonly logger: LoggerService,
  ) {}

  async calculateCommission(
    productId: string,
    sellerId: string,
    categoryId: string,
    baseAmount: number,
  ): Promise<CommissionCalculation> {
    this.logger.log('CommissionService.calculateCommission', {
      productId,
      sellerId,
      categoryId,
      baseAmount,
    });

    // Get all applicable commission rules
    const rules = await this.getApplicableRules(productId, sellerId, categoryId);

    // Sort rules by priority (higher priority first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    let totalCommission = 0;
    const appliedRules: CommissionCalculation['appliedRules'] = [];

    // Apply rules in priority order
    for (const rule of sortedRules) {
      const ruleCommission = this.calculateRuleCommission(rule, baseAmount);
      
      if (ruleCommission > 0) {
        totalCommission += ruleCommission;
        appliedRules.push({
          ruleId: rule.id,
          type: rule.type,
          value: rule.value,
          commissionAmount: ruleCommission,
        });

        // For now, we only apply the highest priority rule
        // In the future, you might want to support rule stacking
        break;
      }
    }

    const commissionRate = baseAmount > 0 ? (totalCommission / baseAmount) * 100 : 0;
    const netAmount = baseAmount - totalCommission;

    const result: CommissionCalculation = {
      baseAmount,
      commissionAmount: totalCommission,
      commissionRate,
      appliedRules,
      netAmount,
    };

    this.logger.log('Commission calculated', {
      productId,
      sellerId,
      result,
    });

    return result;
  }

  async createRule(createRuleDto: CreateCommissionRuleDto): Promise<CommissionRule> {
    this.logger.log('CommissionService.createRule', { createRuleDto });

    // Validate rule data
    this.validateCommissionRule(createRuleDto);

    const rule = await this.commissionRepository.create({
      ...createRuleDto,
      isActive: true,
    });

    this.logger.log('Commission rule created', { ruleId: rule.id });
    return rule;
  }

  async updateRule(
    id: string,
    updateData: Partial<CreateCommissionRuleDto>,
  ): Promise<CommissionRule> {
    this.logger.log('CommissionService.updateRule', { id, updateData });

    const existingRule = await this.commissionRepository.findById(id);
    if (!existingRule) {
      throw new NotFoundException('Commission rule not found');
    }

    // Validate updated rule data
    if (updateData.commissionType || updateData.value !== undefined) {
      this.validateCommissionRule({
        ...existingRule,
        ...updateData,
      } as CreateCommissionRuleDto);
    }

    const updatedRule = await this.commissionRepository.update(id, updateData);
    this.logger.log('Commission rule updated', { ruleId: id });
    
    return updatedRule;
  }

  async deactivateRule(id: string): Promise<void> {
    this.logger.log('CommissionService.deactivateRule', { id });

    const rule = await this.commissionRepository.findById(id);
    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    await this.commissionRepository.update(id, { isActive: false });
    this.logger.log('Commission rule deactivated', { ruleId: id });
  }

  async getRulesByEntity(
    type: 'CATEGORY' | 'SELLER' | 'PRODUCT',
    entityId: string,
  ): Promise<CommissionRule[]> {
    return this.commissionRepository.findByEntity(type, entityId);
  }

  async getAllRules(): Promise<CommissionRule[]> {
    return this.commissionRepository.findAll();
  }

  private async getApplicableRules(
    productId: string,
    sellerId: string,
    categoryId: string,
  ): Promise<CommissionRule[]> {
    const now = new Date();
    
    // Get rules for product, seller, and category
    const [productRules, sellerRules, categoryRules] = await Promise.all([
      this.commissionRepository.findByEntity('PRODUCT', productId),
      this.commissionRepository.findByEntity('SELLER', sellerId),
      this.commissionRepository.findByEntity('CATEGORY', categoryId),
    ]);

    // Combine all rules and filter active ones within valid date range
    const allRules = [...productRules, ...sellerRules, ...categoryRules];
    
    return allRules.filter(rule => 
      rule.isActive &&
      rule.validFrom <= now &&
      (!rule.validTo || rule.validTo >= now)
    );
  }

  private calculateRuleCommission(rule: CommissionRule, baseAmount: number): number {
    let commission = 0;

    if (rule.commissionType === 'PERCENTAGE') {
      commission = (baseAmount * rule.value) / 100;
    } else if (rule.commissionType === 'FIXED') {
      commission = rule.value;
    }

    // Apply min/max constraints
    if (rule.minAmount && commission < rule.minAmount) {
      commission = rule.minAmount;
    }
    
    if (rule.maxAmount && commission > rule.maxAmount) {
      commission = rule.maxAmount;
    }

    // Ensure commission doesn't exceed base amount
    return Math.min(commission, baseAmount);
  }

  private validateCommissionRule(rule: CreateCommissionRuleDto): void {
    if (rule.commissionType === 'PERCENTAGE') {
      if (rule.value < 0 || rule.value > 100) {
        throw new BadRequestException('Percentage commission must be between 0 and 100');
      }
    } else if (rule.commissionType === 'FIXED') {
      if (rule.value < 0) {
        throw new BadRequestException('Fixed commission must be non-negative');
      }
    }

    if (rule.minAmount && rule.maxAmount && rule.minAmount > rule.maxAmount) {
      throw new BadRequestException('Minimum amount cannot be greater than maximum amount');
    }

    if (rule.validTo && rule.validFrom >= rule.validTo) {
      throw new BadRequestException('Valid from date must be before valid to date');
    }

    if (rule.priority < 0) {
      throw new BadRequestException('Priority must be non-negative');
    }
  }

  /**
   * Snapshot commission calculation for order processing
   * This ensures commission rates are locked at order time
   */
  async snapshotCommissionForOrder(
    productId: string,
    sellerId: string,
    categoryId: string,
    baseAmount: number,
  ): Promise<CommissionCalculation> {
    const calculation = await this.calculateCommission(
      productId,
      sellerId,
      categoryId,
      baseAmount,
    );

    // In a real implementation, you might want to store this snapshot
    // in the order record for audit purposes
    this.logger.log('Commission snapshot created for order', {
      productId,
      sellerId,
      calculation,
    });

    return calculation;
  }
}