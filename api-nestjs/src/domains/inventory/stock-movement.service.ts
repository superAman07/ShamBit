import { Injectable } from '@nestjs/common';
import { StockMovementRepository } from './stock-movement.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export interface StockMovement {
  id: string;
  variantId: string;
  sellerId: string;
  type: string;
  quantity: number;
  reason: string;
  reference?: string | null;
  userId: string;
  createdAt: Date;
}

@Injectable()
export class StockMovementService {
  constructor(
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly logger: LoggerService,
  ) {}

  async recordMovement(data: {
    variantId: string;
    sellerId: string;
    type: string;
    quantity: number;
    previousQuantity?: number;
    newQuantity?: number;
    reason: string;
    referenceId?: string;
    referenceType?: string;
    userId: string;
  }): Promise<StockMovement> {
    this.logger.log('StockMovementService.recordMovement', {
      variantId: data.variantId,
      type: data.type,
      quantity: data.quantity,
    });

    return this.stockMovementRepository.create(data);
  }

  async getMovementHistory(
    variantId: string,
    sellerId: string,
    limit = 50,
  ): Promise<StockMovement[]> {
    return this.stockMovementRepository.findByVariantAndSeller(
      variantId,
      sellerId,
      limit,
    );
  }
}
