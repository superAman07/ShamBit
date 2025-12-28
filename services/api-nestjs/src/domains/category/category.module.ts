import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { AttributeService } from './attribute.service';
import { AttributeRepository } from './attribute.repository';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    CategoryRepository,
    AttributeService,
    AttributeRepository,
  ],
  exports: [CategoryService, AttributeService],
})
export class CategoryModule {}