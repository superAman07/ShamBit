import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreatePricingDto, UpdatePricingDto, PricingResponseDto } from './pricing.service';

@Injectable()
export class PricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePricingDto): Promise<PricingResponseDto> {
    const pricing = await this.prisma.variantPricing.create({
      data: {
        variantId: data.variantId,
        mrp: data.mrp,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        discount: data.discount,
        validFrom: data.validFrom || new Date(),
        validTo: data.validTo,
      },
    });

    return {
      id: pricing.id,
      variantId: pricing.variantId,
      mrp: Number(pricing.mrp),
      sellingPrice: Number(pricing.sellingPrice),
      costPrice: pricing.costPrice ? Number(pricing.costPrice) : undefined,
      discount: pricing.discount ? Number(pricing.discount) : undefined,
      isActive: pricing.isActive,
      validFrom: pricing.validFrom,
      validTo: pricing.validTo,
      createdAt: pricing.createdAt,
      updatedAt: pricing.updatedAt,
    };
  }

  async update(id: string, data: UpdatePricingDto): Promise<PricingResponseDto> {
    const pricing = await this.prisma.variantPricing.update({
      where: { id },
      data: {
        mrp: data.mrp,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        discount: data.discount,
        validFrom: data.validFrom,
        validTo: data.validTo,
        isActive: data.isActive,
      },
    });

    return {
      id: pricing.id,
      variantId: pricing.variantId,
      mrp: Number(pricing.mrp),
      sellingPrice: Number(pricing.sellingPrice),
      costPrice: pricing.costPrice ? Number(pricing.costPrice) : undefined,
      discount: pricing.discount ? Number(pricing.discount) : undefined,
      isActive: pricing.isActive,
      validFrom: pricing.validFrom,
      validTo: pricing.validTo,
      createdAt: pricing.createdAt,
      updatedAt: pricing.updatedAt,
    };
  }

  async findByVariant(variantId: string): Promise<PricingResponseDto | null> {
    const pricing = await this.prisma.variantPricing.findUnique({
      where: { variantId },
    });

    if (!pricing) return null;

    return {
      id: pricing.id,
      variantId: pricing.variantId,
      mrp: Number(pricing.mrp),
      sellingPrice: Number(pricing.sellingPrice),
      costPrice: pricing.costPrice ? Number(pricing.costPrice) : undefined,
      discount: pricing.discount ? Number(pricing.discount) : undefined,
      isActive: pricing.isActive,
      validFrom: pricing.validFrom,
      validTo: pricing.validTo,
      createdAt: pricing.createdAt,
      updatedAt: pricing.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.variantPricing.delete({
      where: { id },
    });
  }

  async bulkUpdate(updates: Array<{ id: string; data: UpdatePricingDto }>): Promise<void> {
    const promises = updates.map(({ id, data }) =>
      this.prisma.variantPricing.update({
        where: { id },
        data: {
          mrp: data.mrp,
          sellingPrice: data.sellingPrice,
          costPrice: data.costPrice,
          discount: data.discount,
          validFrom: data.validFrom,
          validTo: data.validTo,
          isActive: data.isActive,
        },
      })
    );

    await Promise.all(promises);
  }
}