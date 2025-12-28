import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CategoryRepository } from './repositories/category.repository';
import { CategoryAuditService } from './services/category-audit.service';
import { CategoryTreeService } from './services/category-tree.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Category } from './entities/category.entity';
import { CategoryStatus } from './enums/category-status.enum';
import { CategoryVisibility } from './enums/category-visibility.enum';
import { CategoryPolicies } from './category.policies';
import { CategoryValidators } from './category.validators';

import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto, CategoryStatusUpdateDto, MoveCategoryDto } from './dtos/update-category.dto';
import {
  CategoryFilters,
  PaginationOptions,
  TreeOptions,
  MoveResult,
  TreeStatistics,
} from './interfaces/category-repository.interface';

import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryActivatedEvent,
  CategoryDeactivatedEvent,
  CategoryArchivedEvent,
} from './events/category.events';

import { UserRole } from '../../common/types';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly categoryAuditService: CategoryAuditService,
    private readonly categoryTreeService: CategoryTreeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // Basic CRUD operations
  async findAll(
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('CategoryService.findAll', { filters, pagination, userId });

    // Apply visibility filters based on user role
    const enhancedFilters = this.applyVisibilityFilters(filters, userRole);

    return this.categoryRepository.findAll(enhancedFilters, pagination);
  }

  async findById(id: string, options: TreeOptions = {}): Promise<Category> {
    const category = await this.categoryRepository.findById(id, options);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string, options: TreeOptions = {}): Promise<Category> {
    const category = await this.categoryRepository.findBySlug(slug, options);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findByPath(path: string, options: TreeOptions = {}): Promise<Category> {
    const category = await this.categoryRepository.findByPath(path, options);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  // Tree operations
  async findRoots(
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {},
    userRole?: UserRole
  ) {
    this.logger.log('CategoryService.findRoots', { filters, pagination });

    const enhancedFilters = this.applyVisibilityFilters(filters, userRole);
    return this.categoryRepository.findRoots(enhancedFilters, pagination);
  }

  async findChildren(
    parentId: string,
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {},
    userRole?: UserRole
  ) {
    const enhancedFilters = this.applyVisibilityFilters(filters, userRole);
    return this.categoryRepository.findChildren(parentId, enhancedFilters, pagination);
  }

  async getAncestors(categoryId: string, includeRoot: boolean = true): Promise<Category[]> {
    return this.categoryRepository.findAncestors(categoryId, includeRoot);
  }

  async getDescendants(
    categoryId: string,
    maxDepth?: number,
    activeOnly: boolean = false
  ): Promise<Category[]> {
    return this.categoryRepository.findDescendants(categoryId, maxDepth, activeOnly);
  }

  async getCategoryTree(
    rootId?: string,
    maxDepth?: number,
    activeOnly: boolean = true,
    userRole?: UserRole
  ): Promise<Category[]> {
    return this.categoryTreeService.getCategoryTree(rootId, maxDepth, activeOnly, userRole);
  }

  // Create operations
  async create(
    createCategoryDto: CreateCategoryDto,
    createdBy: string,
    userRole: UserRole
  ): Promise<Category> {
    this.logger.log('CategoryService.create', { createCategoryDto, createdBy });

    // Validate permissions
    if (!CategoryPolicies.canUserCreateCategory(null, createdBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to create categories');
    }

    // Validate input data
    CategoryValidators.validateCategoryName(createCategoryDto.name);
    const normalizedSlug = CategoryValidators.validateAndNormalizeCategorySlug(createCategoryDto.slug);
    CategoryValidators.validateCategoryDescription(createCategoryDto.description);
    CategoryValidators.validateSeoFields(
      createCategoryDto.seoTitle,
      createCategoryDto.seoDescription,
      createCategoryDto.seoKeywords
    );

    if (createCategoryDto.iconUrl) {
      CategoryValidators.validateUrl(createCategoryDto.iconUrl, 'Icon URL');
    }
    if (createCategoryDto.bannerUrl) {
      CategoryValidators.validateUrl(createCategoryDto.bannerUrl, 'Banner URL');
    }

    CategoryValidators.validateBrandIds(createCategoryDto.allowedBrands || [], 'Allowed brands');
    CategoryValidators.validateBrandIds(createCategoryDto.restrictedBrands || [], 'Restricted brands');
    CategoryValidators.validateMetadata(createCategoryDto.metadata);

    // Validate parent category if specified
    let parentCategory: Category | null = null;
    if (createCategoryDto.parentId) {
      parentCategory = await this.findById(createCategoryDto.parentId);
      
      if (!CategoryPolicies.canUserCreateCategory(parentCategory, createdBy, userRole)) {
        throw new ForbiddenException('Cannot create category under this parent');
      }
    }

    // Check slug uniqueness
    const slugExists = !(await this.categoryRepository.validateSlug(normalizedSlug));
    if (slugExists) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Create the category
    const categoryData = {
      ...createCategoryDto,
      slug: normalizedSlug,
      status: CategoryStatus.DRAFT, // Start as draft for admin review
      createdBy,
    };

    const category = await this.categoryRepository.create(categoryData);

    // Create audit log
    await this.categoryAuditService.logAction(
      category.id,
      'CREATE',
      createdBy,
      null,
      category,
      'Category created'
    );

    // Emit event
    this.eventEmitter.emit(
      CategoryCreatedEvent.eventName,
      new CategoryCreatedEvent(
        category.id,
        category.name,
        category.slug,
        category.parentId || null,
        category.path,
        category.depth,
        createdBy
      )
    );

    this.logger.log('Category created successfully', { categoryId: category.id });
    return category;
  }

  // Update operations
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Category> {
    this.logger.log('CategoryService.update', { id, updateCategoryDto, updatedBy });

    const existingCategory = await this.findById(id);

    // Check permissions
    if (!CategoryPolicies.canUserModifyCategory(existingCategory, updatedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to update this category');
    }

    // Validate input data
    if (updateCategoryDto.name) {
      CategoryValidators.validateCategoryName(updateCategoryDto.name);
    }

    if (updateCategoryDto.description !== undefined) {
      CategoryValidators.validateCategoryDescription(updateCategoryDto.description);
    }

    CategoryValidators.validateSeoFields(
      updateCategoryDto.seoTitle,
      updateCategoryDto.seoDescription,
      updateCategoryDto.seoKeywords
    );

    if (updateCategoryDto.iconUrl) {
      CategoryValidators.validateUrl(updateCategoryDto.iconUrl, 'Icon URL');
    }
    if (updateCategoryDto.bannerUrl) {
      CategoryValidators.validateUrl(updateCategoryDto.bannerUrl, 'Banner URL');
    }

    if (updateCategoryDto.allowedBrands) {
      CategoryValidators.validateBrandIds(updateCategoryDto.allowedBrands, 'Allowed brands');
    }
    if (updateCategoryDto.restrictedBrands) {
      CategoryValidators.validateBrandIds(updateCategoryDto.restrictedBrands, 'Restricted brands');
    }

    CategoryValidators.validateMetadata(updateCategoryDto.metadata);

    // Validate status transition if provided
    if (updateCategoryDto.status) {
      if (!CategoryPolicies.canTransitionTo(existingCategory.status, updateCategoryDto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${existingCategory.status} to ${updateCategoryDto.status}`
        );
      }

      if (CategoryPolicies.requiresAdminApproval(updateCategoryDto.status) && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Admin approval required for this status change');
      }
    }

    const updatedCategory = await this.categoryRepository.update(id, {
      ...updateCategoryDto,
      updatedBy,
    });

    // Create audit log
    await this.categoryAuditService.logAction(
      id,
      'UPDATE',
      updatedBy,
      existingCategory,
      updatedCategory,
      'Category updated'
    );

    // Emit appropriate events based on status change
    if (updateCategoryDto.status && updateCategoryDto.status !== existingCategory.status) {
      await this.emitStatusChangeEvent(updatedCategory, existingCategory.status, updatedBy);
    }

    // Emit general update event
    this.eventEmitter.emit(
      CategoryUpdatedEvent.eventName,
      new CategoryUpdatedEvent(
        id,
        updatedCategory.name,
        this.calculateChanges(existingCategory, updatedCategory),
        updatedBy
      )
    );

    this.logger.log('Category updated successfully', { categoryId: id });
    return updatedCategory;
  }

  async updateStatus(
    id: string,
    statusUpdate: CategoryStatusUpdateDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Category> {
    return this.update(id, { status: statusUpdate.status }, updatedBy, userRole);
  }

  // Move operations
  async moveCategory(
    id: string,
    moveDto: MoveCategoryDto,
    movedBy: string,
    userRole: UserRole
  ): Promise<MoveResult> {
    this.logger.log('CategoryService.moveCategory', { id, moveDto, movedBy });

    const category = await this.findById(id);

    // Check permissions
    if (!CategoryPolicies.canUserModifyCategory(category, movedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to move this category');
    }

    // Validate move operation
    const validation = await this.categoryRepository.validateMove(id, moveDto.newParentId || null);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    // Additional business rule validation
    let newParent: Category | null = null;
    if (moveDto.newParentId) {
      newParent = await this.findById(moveDto.newParentId);
      
      if (!CategoryPolicies.canMoveCategory(category, newParent, movedBy, userRole)) {
        throw new ForbiddenException('Cannot move category to this parent');
      }
    }

    const result = await this.categoryRepository.move(id, moveDto.newParentId || null, movedBy, moveDto.reason);

    // Create audit log
    await this.categoryAuditService.logAction(
      id,
      'MOVE',
      movedBy,
      { parentId: category.parentId, path: category.path },
      { parentId: moveDto.newParentId || null, path: result.newPath },
      moveDto.reason || 'Category moved'
    );

    this.logger.log('Category moved successfully', result);
    return result;
  }

  // Delete operations
  async delete(id: string, deletedBy: string, userRole: UserRole, reason?: string): Promise<void> {
    this.logger.log('CategoryService.delete', { id, deletedBy });

    const category = await this.findById(id);

    // Check permissions
    if (!CategoryPolicies.canUserDeleteCategory(category, deletedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to delete this category');
    }

    // Validate deletion constraints
    if (!CategoryPolicies.canDeleteCategoryWithChildren(category)) {
      throw new BadRequestException('Cannot delete category with children');
    }

    if (!CategoryPolicies.canDeleteCategoryWithProducts(category)) {
      throw new BadRequestException('Cannot delete category with products');
    }

    await this.categoryRepository.softDelete(id, deletedBy, reason);

    // Create audit log
    await this.categoryAuditService.logAction(
      id,
      'DELETE',
      deletedBy,
      category,
      null,
      reason || 'Category deleted'
    );

    this.logger.log('Category deleted successfully', { categoryId: id });
  }

  // Search and filtering
  async searchCategories(
    query: string,
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {},
    userRole?: UserRole
  ) {
    const searchFilters = {
      ...this.applyVisibilityFilters(filters, userRole),
      search: query,
    };

    return this.categoryRepository.findAll(searchFilters, pagination);
  }

  async getFeaturedCategories(
    filters: CategoryFilters = {},
    userRole?: UserRole
  ): Promise<Category[]> {
    const featuredFilters = {
      ...this.applyVisibilityFilters(filters, userRole),
      isFeatured: true,
      status: CategoryStatus.ACTIVE,
    };

    const result = await this.categoryRepository.findAll(featuredFilters, { limit: 50 });
    return result.data;
  }

  async getLeafCategories(
    parentId?: string,
    userRole?: UserRole
  ): Promise<Category[]> {
    const filters: CategoryFilters = {
      isLeaf: true,
      status: CategoryStatus.ACTIVE,
    };

    if (parentId) {
      // Get all descendants of parent that are leaf categories
      const descendants = await this.getDescendants(parentId, undefined, true);
      return descendants.filter(cat => cat.isLeaf);
    }

    const enhancedFilters = this.applyVisibilityFilters(filters, userRole);
    const result = await this.categoryRepository.findAll(enhancedFilters, { limit: 1000 });
    return result.data;
  }

  // Statistics and analytics
  async getTreeStatistics(tenantId?: string): Promise<TreeStatistics> {
    return this.categoryRepository.getTreeStatistics(tenantId);
  }

  async getCategoryStatistics(categoryId: string) {
    return this.categoryRepository.getCategoryStatistics(categoryId);
  }

  // Brand integration
  async validateBrandInCategory(brandId: string, categoryId: string): Promise<boolean> {
    return this.categoryRepository.validateBrandInCategory(brandId, categoryId);
  }

  async findCategoriesForBrand(brandId: string): Promise<Category[]> {
    return this.categoryRepository.findCategoriesAllowingBrand(brandId);
  }

  // Bulk operations
  async bulkUpdateStatus(
    categoryIds: string[],
    status: CategoryStatus,
    updatedBy: string,
    userRole: UserRole,
    reason?: string
  ): Promise<Category[]> {
    this.logger.log('CategoryService.bulkUpdateStatus', { categoryIds, status, updatedBy });

    // Validate permissions for each category
    for (const categoryId of categoryIds) {
      const category = await this.findById(categoryId);
      if (!CategoryPolicies.canUserModifyCategory(category, updatedBy, userRole)) {
        throw new ForbiddenException(`Insufficient permissions to update category ${categoryId}`);
      }
    }

    const updates = categoryIds.map(id => ({
      id,
      data: { status },
      updatedBy,
    }));

    const updatedCategories = await this.categoryRepository.bulkUpdate(updates);

    // Create audit logs
    for (const category of updatedCategories) {
      await this.categoryAuditService.logAction(
        category.id,
        `BULK_STATUS_UPDATE_${status}`,
        updatedBy,
        null,
        category,
        reason || 'Bulk status update'
      );
    }

    this.logger.log('Bulk status update completed', { 
      count: updatedCategories.length, 
      status 
    });

    return updatedCategories;
  }

  // Maintenance operations
  async refreshTreeStatistics(categoryId?: string): Promise<void> {
    this.logger.log('CategoryService.refreshTreeStatistics', { categoryId });
    await this.categoryRepository.refreshTreeStatistics(categoryId);
  }

  async rebuildMaterializedPaths(rootId?: string): Promise<void> {
    this.logger.log('CategoryService.rebuildMaterializedPaths', { rootId });
    await this.categoryRepository.rebuildMaterializedPaths(rootId);
  }

  // Private helper methods
  private applyVisibilityFilters(
    filters: CategoryFilters,
    userRole?: UserRole
  ): CategoryFilters {
    const enhancedFilters = { ...filters };

    // Apply visibility rules based on user role
    if (userRole === UserRole.ADMIN) {
      // Admins can see all categories
      return enhancedFilters;
    }

    if (userRole === UserRole.SELLER) {
      // Sellers can see public and internal categories
      if (!enhancedFilters.visibility) {
        enhancedFilters.visibility = CategoryVisibility.PUBLIC; // Default to public
      }
    } else {
      // Customers can only see public categories
      enhancedFilters.visibility = CategoryVisibility.PUBLIC;
    }

    return enhancedFilters;
  }

  private async emitStatusChangeEvent(
    category: Category,
    _oldStatus: CategoryStatus,
    updatedBy: string
  ): Promise<void> {
    switch (category.status) {
      case CategoryStatus.ACTIVE:
        this.eventEmitter.emit(
          CategoryActivatedEvent.eventName,
          new CategoryActivatedEvent(category.id, category.name, category.path, updatedBy)
        );
        break;
      case CategoryStatus.INACTIVE:
        this.eventEmitter.emit(
          CategoryDeactivatedEvent.eventName,
          new CategoryDeactivatedEvent(category.id, category.name, category.path, updatedBy)
        );
        break;
      case CategoryStatus.ARCHIVED:
        this.eventEmitter.emit(
          CategoryArchivedEvent.eventName,
          new CategoryArchivedEvent(category.id, category.name, category.path, updatedBy)
        );
        break;
    }
  }

  private calculateChanges(oldCategory: Category, newCategory: Category): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    const fields = [
      'name', 'description', 'status', 'visibility', 'isLeaf', 'isFeatured',
      'seoTitle', 'seoDescription', 'iconUrl', 'bannerUrl', 'displayOrder'
    ];
    
    for (const field of fields) {
      const oldValue = (oldCategory as any)[field];
      const newValue = (newCategory as any)[field];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }
}