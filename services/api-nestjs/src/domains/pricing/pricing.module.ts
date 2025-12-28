import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';
import { CommissionService } from './commission.service';
import { CommissionRepository } from './commission.repository';
import { PromotionService } from './promotion.service';
import { PromotionRepository } from './promotion.repository';

@Module({
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
    CommissionService,
    CommissionRepository,
    PromotionService,
    PromotionRepository,
  ],
  exports: [PricingService, CommissionService, PromotionService],
})
export class PricingModule {}