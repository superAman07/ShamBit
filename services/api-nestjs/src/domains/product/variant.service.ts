import { Injectable, NotFoundException } from '@nestjs/common';
import { VariantRepository } from './variant.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

@Injectable()
export class VariantService {
  constructor(
    private readonly variantRepository: VariantRepository,
    private readonly logger: LoggerService,
  ) {}

  async findByProductId(productId: string) {
    this.logger.log('VariantService.findByProductId', { productId });
    return this.variantRepository.findByProductId(productId);
  }

  async findById(id: string) {
    const variant = await this.variantRepository.findById(id);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  // Additional variant methods would be implemented here
}