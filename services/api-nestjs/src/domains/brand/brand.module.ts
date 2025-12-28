import { Module } from '@nestjs/common';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { BrandRepository } from './brand.repository';
import { BrandRequestService } from './brand-request.service';
import { BrandRequestRepository } from './brand-request.repository';

@Module({
  controllers: [BrandController],
  providers: [
    BrandService,
    BrandRepository,
    BrandRequestService,
    BrandRequestRepository,
  ],
  exports: [BrandService, BrandRequestService],
})
export class BrandModule {}