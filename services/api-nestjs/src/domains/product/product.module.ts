import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { VariantService } from './variant.service';
import { VariantRepository } from './variant.repository';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
    VariantService,
    VariantRepository,
    MediaService,
    MediaRepository,
  ],
  exports: [ProductService, VariantService, MediaService],
})
export class ProductModule {}