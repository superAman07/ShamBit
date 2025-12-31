import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryAttributeRepository } from './repositories/category-attribute.repository';
import { CategoryTreeService } from './services/category-tree.service';
import { CategoryAttributeService } from './services/category-attribute.service';
import { CategoryAuditService } from './services/category-audit.service';
import { CategoryAdminGuard } from './guards/category-admin.guard';

@Module({
  controllers: [CategoryController],
  providers: [
    CategoryService,
    CategoryRepository,
    CategoryAttributeRepository,
    CategoryTreeService,
    CategoryAttributeService,
    CategoryAuditService,
    CategoryAdminGuard,
  ],
  exports: [
    CategoryService,
    CategoryTreeService,
    CategoryAttributeService,
    CategoryAuditService,
  ],
})
export class CategoryModule {}
