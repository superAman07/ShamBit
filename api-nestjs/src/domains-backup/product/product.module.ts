import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { ProductController } from './product.controller';

// Services
import { ProductService } from './product.service';
import { ProductAuditService } from './services/product-audit.service';
import { ProductIntegrationService } from './services/product-integration.service';

// Repositories
import { ProductRepository } from './repositories/product.repository';
import { ProductAttributeValueRepository } from './repositories/product-attribute-value.repository';

// Guards
import { ProductOwnershipGuard } from './guards/product-ownership.guard';

// External Dependencies
import { CategoryModule } from '../category/category.module';
import { BrandModule } from '../brand/brand.module';
import { AttributeModule } from '../attribute/attribute.module';
import { ObservabilityModule } from '../../infrastructure/observability/observability.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [
    EventEmitterModule,
    CategoryModule,
    BrandModule,
    AttributeModule,
    ObservabilityModule,
    PrismaModule,
  ],
  controllers: [ProductController],
  providers: [
    // Core Services
    ProductService,
    ProductAuditService,
    ProductIntegrationService,
    
    // Repositories
    ProductRepository,
    ProductAttributeValueRepository,
    
    // Guards
    ProductOwnershipGuard,
  ],
  exports: [
    ProductService,
    ProductAuditService,
    ProductIntegrationService,
    ProductRepository,
    ProductAttributeValueRepository,
  ],
})
export class ProductModule {}