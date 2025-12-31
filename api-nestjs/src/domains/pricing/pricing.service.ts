import { Injectable } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';

export interface CreatePricingDto {
  variantId: string;
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  discount?: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface UpdatePricingDto {
  mrp?: number;
  sellingPrice?: number;
  costPrice?: number;
  discount?: number;
  validFrom?: Date;
  validTo?: Date;
  isActive?: boolean;
}

export interface PricingResponseDto {
  id: string;
  variantId: string;
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  discount?: number;
  isActive: boolean;
  validFrom: Date;
  validTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PricingService {
  constructor(private readonly pricingRepository: PricingRepository) {}

  async createPricing(data: CreatePricingDto): Promise<PricingResponseDto> {
    return this.pricingRepository.create(data);
  }

  async updatePricing(
    id: string,
    data: UpdatePricingDto,
  ): Promise<PricingResponseDto> {
    return this.pricingRepository.update(id, data);
  }

  async getPricingByVariant(
    variantId: string,
  ): Promise<PricingResponseDto | null> {
    return this.pricingRepository.findByVariant(variantId);
  }

  async deletePricing(id: string): Promise<void> {
    await this.pricingRepository.delete(id);
  }

  async bulkUpdatePricing(
    updates: Array<{ id: string; data: UpdatePricingDto }>,
  ): Promise<void> {
    await this.pricingRepository.bulkUpdate(updates);
  }
}
