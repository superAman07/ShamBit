import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { Category } from '../entities/category.entity';
import { CategoryStatus } from '../enums/category-status.enum';
import { CategoryVisibility } from '../enums/category-visibility.enum';
import {
  ICategoryRepository,
  CategoryFilters,
  PaginationOptions,
  TreeOptions,
  MoveResult,
  TreeStatistics,
} from '../interfaces/category-repository.interface';

import {
  CategoryMovedEvent,
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
  CategoryStatisticsUpdatedEvent,
} from '../events/category.events';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) { }

  // Basic CRUD operations
  async findById(id: string, options: TreeOptions = {}): Promise<Category | null> {
    const include = this.buildIncludeOptions(options);

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        isActive: true,
      },
      include,
    });

    return category ? this.mapToDomain(category) : null;
  }

  async findBySlug(slug: string, options: TreeOptions = {}): Promise<Category | null> {
    const include = this.buildIncludeOptions(options);

    const category = await this.prisma.category.findFirst({
      where: {
        slug,
        isActive: true,
      },
      include,
    });

    return category ? this.mapToDomain(category) : null;
  }

  async findByPath(path: string, options: TreeOptions = {}): Promise<Category | null> {
    const include = this.buildIncludeOptions(options);

    const category = await this.prisma.category.findFirst({
      where: {
        path,
        isActive: true,
      },
      include,
    });

    return category ? this.mapToDomain(category) : null;
  }

  // List and search operations
  async findAll(
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Category[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
    } = pagination;

    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(sortBy, sortOrder),
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              path: true,
            },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: data.map(this.mapToDomain),
      total,
    };
  }

  async findRoots(
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Category[]; total: number }> {
    return this.findAll(
      { ...filters, parentId: null },
      pagination
    );
  }

  async findChildren(
    parentId: string,
    filters: CategoryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Category[]; total: number }> {
    return this.findAll(
      { ...filters, parentId },
      pagination
    );
  }

  // Tree traversal operations
  async findAncestors(categoryId: string, includeRoot: boolean = true): Promise<Category[]> {
    const category = await this.findById(categoryId);
    if (!category) {
      return [];
    }

    // Parse path to get ancestor IDs
    const pathParts = category.path.split('/').filter(Boolean);
    const ancestorIds = includeRoot ? pathParts : pathParts.slice(1);

    if (ancestorIds.length === 0) {
      return [];
    }

    const ancestors = await this.prisma.category.findMany({
      where: {
        id: { in: ancestorIds },
        isActive: true,
      },
      orderBy: { level: 'asc' },
    });

    // Maintain order based on path
    const orderedAncestors = ancestorIds
      .map(id => ancestors.find(a => a.id === id))
      .filter(Boolean)
      .map(this.mapToDomain);

    return orderedAncestors;
  }

  async findDescendants(
    categoryId: string,
    maxDepth?: number,
    activeOnly: boolean = false
  ): Promise<Category[]> {
    const category = await this.findById(categoryId);
    if (!category) {
      return [];
    }

    const where: any = {
      path: { startsWith: category.path + '/' },
      isActive: true,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (maxDepth !== undefined) {
      where.level = { lte: category.depth + maxDepth };
    }

    const descendants = await this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return descendants.map(this.mapToDomain);
  }

  async findSiblings(categoryId: string, filters: CategoryFilters = {}): Promise<Category[]> {
    const category = await this.findById(categoryId);
    if (!category) {
      return [];
    }

    const where = this.buildWhereClause({
      ...filters,
      parentId: category.parentId,
    });

    // Exclude the category itself
    if (categoryId) {
      where.id = { not: categoryId };
    }

    const siblings = await this.prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return siblings.map(this.mapToDomain);
  }

  async findSubtree(
    rootId: string,
    maxDepth?: number,
    activeOnly: boolean = false
  ): Promise<Category[]> {
    const root = await this.findById(rootId);
    if (!root) {
      return [];
    }

    const where: any = {
      OR: [
        { id: rootId },
        { path: { startsWith: root.path + '/' } },
      ],
      isActive: true,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (maxDepth !== undefined) {
      where.level = { lte: root.depth + maxDepth };
    }

    const subtree = await this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return subtree.map(this.mapToDomain);
  }

  // Path-based operations
  async findByPathPrefix(pathPrefix: string, filters: CategoryFilters = {}): Promise<Category[]> {
    const where = this.buildWhereClause({
      ...filters,
      pathPrefix,
    });

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return categories.map(this.mapToDomain);
  }

  async findCategoriesInPaths(paths: string[]): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        path: { in: paths },
        isActive: true,
      },
      orderBy: { level: 'asc' },
    });

    return categories.map(this.mapToDomain);
  }

  // Create and update operations
  async create(data: Partial<Category> & { createdBy: string }): Promise<Category> {
    this.logger.log('CategoryRepository.create', { data });

    // Generate path and depth
    const { path, depth } = await this.generatePathInfo(data.parentId || null, data.slug!);

    const categoryData = {
      name: data.name!,
      description: data.description || '',
      slug: data.slug!,
      parentId: data.parentId || null,
      path,
      level: depth,
      isActive: true,
      sortOrder: data.displayOrder || 0,
      imageUrl: data.iconUrl || null,
    };

    const category = await this.prisma.$transaction(async (tx) => {
      // Create the category
      const newCategory = await tx.category.create({
        data: categoryData,
        include: {
          parent: true,
        },
      });

      // Update parent statistics if has parent
      if (data.parentId) {
        await this.updateTreeStatistics(tx, data.parentId);
      }

      return newCategory;
    });

    const domainCategory = this.mapToDomain(category);

    // Emit event
    this.eventEmitter.emit(
      CategoryCreatedEvent.eventName,
      new CategoryCreatedEvent(
        category.id,
        category.name,
        category.slug,
        category.parentId,
        category.path,
        category.level,
        data.createdBy
      )
    );

    this.logger.log('Category created successfully', { categoryId: category.id });
    return domainCategory;
  }

  async update(id: string, data: Partial<Category> & { updatedBy: string }): Promise<Category> {
    this.logger.log('CategoryRepository.update', { id, data });

    const existingCategory = await this.findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    const category = await this.prisma.$transaction(async (tx) => {
      // Update the category
      const updated = await tx.category.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          slug: data.slug,
          parentId: data.parentId,
          path: data.path,
          level: data.depth,
          sortOrder: data.displayOrder,
          imageUrl: data.iconUrl || null,
        },
        include: {
          parent: true,
        },
      });

      return updated;
    });

    const domainCategory = this.mapToDomain(category);

    // Emit event
    this.eventEmitter.emit(
      CategoryUpdatedEvent.eventName,
      new CategoryUpdatedEvent(
        category.id,
        category.name,
        this.calculateChanges(existingCategory, domainCategory),
        data.updatedBy
      )
    );

    this.logger.log('Category updated successfully', { categoryId: id });
    return domainCategory;
  }

  async updateStatus(
    id: string,
    status: CategoryStatus,
    updatedBy: string,
    reason?: string
  ): Promise<Category> {
    return this.update(id, { status, updatedBy });
  }

  // Tree modification operations
  async move(
    categoryId: string,
    newParentId: string | null,
    movedBy: string,
    reason?: string
  ): Promise<MoveResult> {
    this.logger.log('CategoryRepository.move', { categoryId, newParentId, movedBy });

    const category = await this.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const oldPath = category.path;
    const oldParentId = category.parentId;

    // Generate new path information
    const { path: newPath, depth: newDepth } =
      await this.generatePathInfo(newParentId, category.slug);

    const result = await this.prisma.$transaction(async (tx) => {
      // Update the category itself
      await tx.category.update({
        where: { id: categoryId },
        data: {
          parentId: newParentId,
          path: newPath,
          level: newDepth,
        },
      });

      // Update all descendants
      const descendants = await tx.category.findMany({
        where: {
          path: { startsWith: oldPath + '/' },
          isActive: true,
        },
      });

      let affectedDescendants = 0;
      for (const descendant of descendants) {
        const descendantNewPath = descendant.path.replace(oldPath, newPath);
        const descendantNewDepth = newDepth + (descendant.level - category.depth);

        await tx.category.update({
          where: { id: descendant.id },
          data: {
            path: descendantNewPath,
            level: descendantNewDepth,
          },
        });

        affectedDescendants++;
      }

      // Update products with new category path
      const updatedProducts = await tx.product.updateMany({
        where: {
          categoryId: categoryId,
        },
        data: {
          // Note: categoryDepth field may not exist in the Product model
          // This would need to be implemented if the field exists
        },
      });

      // Update tree statistics for old and new parents
      if (oldParentId) {
        await this.updateTreeStatistics(tx, oldParentId);
      }
      if (newParentId) {
        await this.updateTreeStatistics(tx, newParentId);
      }

      return {
        categoryId,
        oldPath,
        newPath,
        affectedDescendants,
        updatedProducts: updatedProducts.count,
      };
    });

    // Emit event
    this.eventEmitter.emit(
      CategoryMovedEvent.eventName,
      new CategoryMovedEvent(
        categoryId,
        category.name,
        oldPath,
        newPath,
        oldParentId || null,
        newParentId,
        result.affectedDescendants,
        movedBy,
        reason
      )
    );

    this.logger.log('Category moved successfully', result);
    return result;
  }

  async reorderChildren(
    parentId: string | null,
    childrenOrder: { id: string; displayOrder: number }[],
    updatedBy: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { id, displayOrder } of childrenOrder) {
        await tx.category.update({
          where: { id },
          data: {
            sortOrder: displayOrder,
          },
        });
      }
    });
  }

  // Soft delete operations
  async softDelete(id: string, deletedBy: string, reason?: string): Promise<void> {
    this.logger.log('CategoryRepository.softDelete', { id, deletedBy });

    const category = await this.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete the category
      await tx.category.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      // Update parent statistics
      if (category.parentId) {
        await this.updateTreeStatistics(tx, category.parentId);
      }
    });

    // Emit event
    this.eventEmitter.emit(
      CategoryDeletedEvent.eventName,
      new CategoryDeletedEvent(
        id,
        category.name,
        category.path,
        deletedBy
      )
    );

    this.logger.log('Category soft deleted successfully', { categoryId: id });
  }

  async restore(id: string, restoredBy: string, reason?: string): Promise<Category> {
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        isActive: true,
      },
    });

    return this.mapToDomain(category);
  }

  // Bulk operations
  async bulkCreate(categories: Array<Partial<Category> & { createdBy: string }>): Promise<Category[]> {
    const results: Category[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const categoryData of categories) {
        const { path, depth } = await this.generatePathInfo(
          categoryData.parentId || null,
          categoryData.slug!
        );

        const category = await tx.category.create({
          data: {
            name: categoryData.name!,
            description: categoryData.description || '',
            slug: categoryData.slug!,
            parentId: categoryData.parentId || null,
            path,
            level: depth,
            isActive: true,
            sortOrder: categoryData.displayOrder || 0,
            imageUrl: categoryData.iconUrl || null,
          },
        });

        results.push(this.mapToDomain(category));
      }
    });

    return results;
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<Category>; updatedBy: string }>
  ): Promise<Category[]> {
    const results: Category[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const { id, data } of updates) {
        const category = await tx.category.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            slug: data.slug,
            parentId: data.parentId,
            path: data.path,
            level: data.depth,
            sortOrder: data.displayOrder,
            imageUrl: data.iconUrl || null,
          },
        });

        results.push(this.mapToDomain(category));
      }
    });

    return results;
  }

  async bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.category.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
        },
      });
    });
  }

  // Statistics and analytics
  async getTreeStatistics(): Promise<TreeStatistics> {
    const where: any = { isActive: true };

    const [
      totalCategories,
      maxLevelResult,
      leafCategories,
      rootCategories,
      statusCounts,
    ] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.aggregate({
        where,
        _max: { level: true },
      }),
      this.prisma.category.count({
        where: { ...where, parentId: { not: null } },
      }),
      this.prisma.category.count({
        where: { ...where, parentId: null },
      }),
      this.prisma.category.groupBy({
        by: ['isActive'],
        where,
        _count: true,
      }),
    ]);

    const statusCountsMap = {
      [CategoryStatus.ACTIVE]: 0,
      [CategoryStatus.INACTIVE]: 0,
      [CategoryStatus.ARCHIVED]: 0,
      [CategoryStatus.DRAFT]: 0,
      [CategoryStatus.REJECTED]: 0,
    };

    statusCounts.forEach(({ isActive, _count }) => {
      statusCountsMap[isActive ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE] = _count;
    });

    return {
      totalCategories,
      maxDepth: maxLevelResult._max.level || 0,
      leafCategories,
      rootCategories,
      statusCounts: statusCountsMap,
    };
  }

  async getCategoryStatistics(categoryId: string): Promise<{
    directChildren: number;
    totalDescendants: number;
    totalProducts: number;
    depth: number;
  }> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        level: true,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Count direct children
    const directChildren = await this.prisma.category.count({
      where: { parentId: categoryId, isActive: true },
    });

    // Count descendants
    const descendants = await this.prisma.category.count({
      where: { path: { startsWith: `${category.level}/` }, isActive: true },
    });

    // Count products
    const products = await this.prisma.product.count({
      where: { categoryId, isActive: true },
    });

    return {
      directChildren,
      totalDescendants: descendants,
      totalProducts: products,
      depth: category.level,
    };
  }

  // Validation operations
  async validatePath(path: string): Promise<boolean> {
    const existing = await this.prisma.category.findFirst({
      where: { path, isActive: true },
    });
    return !existing;
  }

  async validateSlug(slug: string, excludeId?: string): Promise<boolean> {
    const where: any = { slug, isActive: true };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.category.findFirst({ where });
    return !existing;
  }

  async validateMove(
    categoryId: string,
    newParentId: string | null
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Cannot move to self
    if (categoryId === newParentId) {
      errors.push('Cannot move category to itself');
    }

    // Cannot move to descendant
    if (newParentId) {
      const potentialParent = await this.findById(newParentId);
      if (potentialParent) {
        const category = await this.findById(categoryId);
        if (category && potentialParent.path.includes(category.path + '/')) {
          errors.push('Cannot move category to its own descendant');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Brand constraint operations
  async findCategoriesAllowingBrand(brandId: string): Promise<Category[]> {
    // Since the schema doesn't have allowedBrands field, we'll return all active categories
    // This would need to be implemented based on your business logic
    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
      },
    });

    return categories.map(this.mapToDomain);
  }

  async findCategoriesRestrictingBrand(brandId: string): Promise<Category[]> {
    // Since the schema doesn't have restrictedBrands field, we'll return empty array
    // This would need to be implemented based on your business logic
    return [];
  }

  async validateBrandInCategory(brandId: string, categoryId: string): Promise<boolean> {
    const category = await this.findById(categoryId);
    if (!category) {
      return false;
    }

    // Since the schema doesn't have brand constraints, we'll return true
    // This would need to be implemented based on your business logic
    return true;
  }

  // Cache and performance operations
  async refreshTreeStatistics(categoryId?: string): Promise<void> {
    if (categoryId) {
      await this.updateTreeStatistics(this.prisma, categoryId);
    } else {
      // Refresh all categories
      const categories = await this.prisma.category.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const category of categories) {
        await this.updateTreeStatistics(this.prisma, category.id);
      }
    }
  }

  async rebuildMaterializedPaths(rootId?: string): Promise<void> {
    // Implementation for rebuilding materialized paths
    // This would be used for data migration or corruption recovery
    this.logger.log('Rebuilding materialized paths', { rootId });

    // Implementation details would go here
    // This is a complex operation that should be run during maintenance windows
  }

  // Concurrency control
  async incrementVersion(id: string): Promise<number> {
    // Since the schema doesn't have version field, we'll return 1
    return 1;
  }

  async checkVersion(id: string, expectedVersion: number): Promise<boolean> {
    // Since the schema doesn't have version field, we'll return true
    return true;
  }

  // Private helper methods
  private buildWhereClause(filters: CategoryFilters): any {
    const where: any = { isActive: true };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.status) {
      where.isActive = filters.status === CategoryStatus.ACTIVE;
    }

    if (filters.depth !== undefined) {
      where.level = filters.depth;
    }

    if (filters.maxDepth !== undefined) {
      where.level = { lte: filters.maxDepth };
    }

    if (filters.pathPrefix) {
      where.path = { startsWith: filters.pathPrefix };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildIncludeOptions(options: TreeOptions): any {
    const include: any = {};

    if (options.includeChildren) {
      include.children = {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      };
    }

    if (options.includeAncestors) {
      include.parent = true;
    }

    return include;
  }

  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const orderBy: any = {};
    // Map displayOrder to sortOrder for compatibility
    const field = sortBy === 'displayOrder' ? 'sortOrder' : sortBy;
    orderBy[field] = sortOrder;
    return orderBy;
  }

  private async generatePathInfo(
    parentId: string | null,
    slug: string
  ): Promise<{ path: string; depth: number }> {
    if (!parentId) {
      return {
        path: `/${slug}`,
        depth: 0,
      };
    }

    const parent = await this.findById(parentId);
    if (!parent) {
      throw new Error('Parent category not found');
    }

    return {
      path: `${parent.path}/${slug}`,
      depth: parent.depth + 1,
    };
  }

  private async updateTreeStatistics(tx: any, categoryId: string): Promise<void> {
    const [childCount, descendantCount, productCount] = await Promise.all([
      tx.category.count({
        where: { parentId: categoryId, isActive: true },
      }),
      tx.category.count({
        where: { path: { startsWith: `${categoryId}/` }, isActive: true },
      }),
      tx.product.count({
        where: { categoryId, isActive: true },
      }),
    ]);

    // Since the schema doesn't have tree statistics fields, we'll skip the update
    // This would need to be implemented if you add these fields to the schema

    // Emit statistics updated event
    this.eventEmitter.emit(
      CategoryStatisticsUpdatedEvent.eventName,
      new CategoryStatisticsUpdatedEvent(
        categoryId,
        childCount,
        descendantCount,
        productCount,
        'system'
      )
    );
  }

  private calculateChanges(oldCategory: Category, newCategory: Category): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    const fields = ['name', 'description', 'status', 'displayOrder'];

    for (const field of fields) {
      const oldValue = (oldCategory as any)[field];
      const newValue = (newCategory as any)[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }

  private mapToDomain(prismaData: any): Category {
    return new Category({
      id: prismaData.id,
      name: prismaData.name,
      slug: prismaData.slug,
      description: prismaData.description,
      parentId: prismaData.parentId,
      path: prismaData.path,
      pathIds: prismaData.path.split('/').filter(Boolean),
      depth: prismaData.level,
      childCount: 0, // Will be calculated when needed
      descendantCount: 0, // Will be calculated when needed
      productCount: 0, // Will be calculated when needed
      status: prismaData.isActive ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
      visibility: CategoryVisibility.PUBLIC, // Default value
      seoTitle: prismaData.seoTitle,
      seoDescription: prismaData.seoDescription,
      seoKeywords: prismaData.seoKeywords || [],
      metadata: prismaData.metadata,
      iconUrl: prismaData.imageUrl || undefined,
      bannerUrl: prismaData.bannerUrl,
      displayOrder: prismaData.sortOrder,
      isLeaf: !prismaData.children || prismaData.children.length === 0,
      isFeatured: prismaData.isFeatured || false,
      allowedBrands: [],
      restrictedBrands: [],
      requiresBrand: false,
      createdBy: prismaData.createdBy,
      updatedBy: prismaData.updatedBy,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
      deletedAt: prismaData.deletedAt,
      deletedBy: prismaData.deletedBy,
    });
  }
}
