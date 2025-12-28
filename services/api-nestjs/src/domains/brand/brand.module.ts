import { Module } from '@nestjs/common';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { BrandRepository } from './repositories/brand.repository';
import { BrandRequestService } from './services/brand-request.service';
import { BrandRequestRepository } from './repositories/brand-request.repository';
import { BrandAuditService } from './services/brand-audit.service';
import { BrandAccessService } from './services/brand-access.service';
import { BrandOwnershipGuard } from './guards/brand-ownership.guard';

@Module({
  controllers: [BrandController],
  providers: [
    BrandService,
    BrandRepository,
    BrandRequestService,
    BrandRequestRepository,
    BrandAuditService,
    BrandAccessService,
    BrandOwnershipGuard,
  ],
  exports: [
    BrandService,
    BrandRequestService,
    BrandAuditService,
    BrandAccessService,
  ],
})
export class BrandModule {}