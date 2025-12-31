import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CommissionRule, CreateCommissionRuleDto } from './commission.service';

@Injectable()
export class CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCommissionRuleDto): Promise<CommissionRule> {
    const rule = await this.prisma.commissionRule.create({
      data: {
        name: data.name,
        type: data.type,
        entityType: data.type,
        entityId: data.entityId,
        rate: data.commissionType === 'PERCENTAGE' ? data.value : 0,
        fixedAmount: data.commissionType === 'FIXED' ? data.value : null,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        priority: data.priority || 0,
        validFrom: data.validFrom || new Date(),
        validTo: data.validTo,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return {
      id: rule.id,
      name: rule.name,
      type: rule.type as 'CATEGORY' | 'SELLER' | 'PRODUCT',
      entityId: rule.entityId!,
      commissionType: rule.fixedAmount ? 'FIXED' : 'PERCENTAGE',
      value: rule.fixedAmount ? Number(rule.fixedAmount) : Number(rule.rate),
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom,
      validTo: rule.validTo || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  async findById(id: string): Promise<CommissionRule | null> {
    const rule = await this.prisma.commissionRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return null;
    }

    return {
      id: rule.id,
      name: rule.name,
      type: rule.type as 'CATEGORY' | 'SELLER' | 'PRODUCT',
      entityId: rule.entityId!,
      commissionType: rule.fixedAmount ? 'FIXED' : 'PERCENTAGE',
      value: rule.fixedAmount ? Number(rule.fixedAmount) : Number(rule.rate),
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom,
      validTo: rule.validTo || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  async update(
    id: string,
    data: Partial<CreateCommissionRuleDto>,
  ): Promise<CommissionRule> {
    const updateData: any = {
      name: data.name,
      type: data.type,
      entityId: data.entityId,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      priority: data.priority,
      validFrom: data.validFrom,
      validTo: data.validTo,
      isActive: data.isActive,
    };

    // Handle commission type and value updates
    if (data.commissionType || data.value !== undefined) {
      let type = data.commissionType;

      // If updating value without type, we need current type
      if (!type && data.value !== undefined) {
        const existing = await this.findById(id);
        if (existing) {
          type = existing.commissionType;
        }
      }

      if (type === 'PERCENTAGE') {
        if (data.value !== undefined) updateData.rate = data.value;
        if (data.commissionType === 'PERCENTAGE') {
          updateData.fixedAmount = null;
        }
      } else if (type === 'FIXED') {
        if (data.value !== undefined) updateData.fixedAmount = data.value;
        if (data.commissionType === 'FIXED') {
          updateData.rate = 0;
        }
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const rule = await this.prisma.commissionRule.update({
      where: { id },
      data: updateData,
    });

    return {
      id: rule.id,
      name: rule.name,
      type: rule.type as 'CATEGORY' | 'SELLER' | 'PRODUCT',
      entityId: rule.entityId!,
      commissionType: rule.fixedAmount ? 'FIXED' : 'PERCENTAGE',
      value: rule.fixedAmount ? Number(rule.fixedAmount) : Number(rule.rate),
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom,
      validTo: rule.validTo || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  async findByEntity(
    type: 'CATEGORY' | 'SELLER' | 'PRODUCT',
    entityId: string,
  ): Promise<CommissionRule[]> {
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        type,
        entityId,
        isActive: true,
      },
    });

    return rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      type: rule.type as 'CATEGORY' | 'SELLER' | 'PRODUCT',
      entityId: rule.entityId!,
      commissionType: rule.fixedAmount ? 'FIXED' : 'PERCENTAGE',
      value: rule.fixedAmount ? Number(rule.fixedAmount) : Number(rule.rate),
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom,
      validTo: rule.validTo || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));
  }

  async findAll(): Promise<CommissionRule[]> {
    const rules = await this.prisma.commissionRule.findMany({
      orderBy: { priority: 'desc' },
    });

    return rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      type: rule.type as 'CATEGORY' | 'SELLER' | 'PRODUCT',
      entityId: rule.entityId!,
      commissionType: rule.fixedAmount ? 'FIXED' : 'PERCENTAGE',
      value: rule.fixedAmount ? Number(rule.fixedAmount) : Number(rule.rate),
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      priority: rule.priority,
      isActive: rule.isActive,
      validFrom: rule.validFrom,
      validTo: rule.validTo || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));
  }
}
