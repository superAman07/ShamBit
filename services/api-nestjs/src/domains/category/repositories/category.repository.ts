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
  ) {}

  // Basic CRUD operations
  async findById(id: string, options: TreeOptions = {}): Promise<Category | null> {
    const include = this.buildIncludeOptions(options);
    
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
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
        deletedAt: null,
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
        deletedAt: null,
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

    const ancestorIds = includeRoot ? category.pathIds : category.pathIds.slice(1);
    
    if (ancestorIds.length === 0) {
      return [];
    }

    const ancestors = await this.prisma.category.findMany({
      where: {
        id: { in: ancestorIds },
        deletedAt: null,
      },
      orderBy: { depth: 'asc' },
    });

    // Maintain order based on pathIds
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
      pathIds: { has: categoryId },
      deletedAt: null,
    };

    if (activeOnly) {
      where.status = CategoryStatus.ACTIVE;
    }

    if (maxDepth !== undefined) {
      where.depth = { lte: category.depth + maxDepth };
    }

    const descendants = await this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
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
    where.id = { not: categoryId };

    const siblings = await this.prisma.category.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
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
        { pathIds: { has: rootId } },
      ],
      deletedAt: null,
    };

    if (activeOnly) {
      where.status = CategoryStatus.ACTIVE;
    }

    if (maxDepth !== undefined) {
      where.depth = { lte: root.depth + maxDepth };
    }

    const subtree = await this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
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
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    return categories.map(this.mapToDomain);
  }

  async findCategoriesInPaths(paths: string[]): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        path: { in: paths },
        deletedAt: null,
      },
      orderBy: { depth: 'asc' },
    });

    return categories.map(this.mapToDomain);
  }

  // Create and update operations
  async create(data: Partial<Category> & { createdBy: string }): Promise<Category> {
    this.logger.log('CategoryRepository.create', { data });

    // Generate path and pathIds
    const { path, pathIds, depth } = await this.generatePathInfo(data.parentId, data.slug!);

    const categoryData = {
      ...data,
      path,
      pathIds,
      depth,
      version: 1,
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
        category.depth,
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
      // Update with optimistic locking
      const updated = await tx.category.update({
        where: {
          id,
          version: existingCategory.version,
        },
        data: {
          ...data,
          version: { increment: 1 },
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
    const { path: newPath, pathIds: newPathIds, depth: newDepth } = 
      await this.generatePathInfo(newParentId, category.slug);

    const result = await this.prisma.$transaction(async (tx) => {
      // Update the category itself
      await tx.category.update({
        where: { id: categoryId },
        data: {
          parentId: newParentId,
          path: newPath,
          pathIds: newPathIds,
          depth: newDepth,
          updatedBy: movedBy,
          version: { increment: 1 },
        },
      });

      // Update all descendants
      const descendants = await tx.category.findMany({
        where: {
          pathIds: { has: categoryId },
          deletedAt: null,
        },
      });

      let affectedDescendants = 0;
      for (const descendant of descendants) {
        const descendantNewPath = descendant.path.replace(oldPath, newPath);
        const descendantNewPathIds = [
          ...newPathIds,
          categoryId,
          ...descendant.pathIds.slice(descendant.pathIds.indexOf(categoryId) + 1),
        ];
        const descendantNewDepth = newDepth + (descendant.depth - category.depth);

        await tx.category.update({
          where: { id: descendant.id },
          data: {
            path: descendantNewPath,
            pathIds: descendantNewPathIds,
            depth: descendantNewDepth,
            version: { increment: 1 },
          },
        });

        affectedDescendants++;
      }

      // Update products with new category path
      const updatedProducts = await tx.product.updateMany({
        where: {
          OR: [
            { categoryId },
            { categoryPathIds: { has: categoryId } },
          ],
        },
        data: {
          categoryPath: newPath,
          categoryPathIds: newPathIds,
          categoryDepth: newDepth,
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
        oldParentId,
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
            displayOrder,
            updatedBy,
            version: { increment: 1 },
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
          deletedAt: new Date(),
          deletedBy,
          status: CategoryStatus.ARCHIVED,
          version: { increment: 1 },
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
        deletedAt: null,
        deletedBy: null,
        status: CategoryStatus.ACTIVE,
        updatedBy: restoredBy,
        version: { increment: 1 },
      },
    });

    return this.mapToDomain(category);
  }

  // Bulk operations
  async bulkCreate(categories: Array<Partial<Category> & { createdBy: string }>): Promise<Category[]> {
    const results: Category[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const categoryData of categories) {
        const { path, pathIds, depth } = await this.generatePathInfo(
          categoryData.parentId,
          categoryData.slug!
        );

        const category = await tx.category.create({
          data: {
            ...categoryData,
            path,
            pathIds,
            depth,
            version: 1,
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
            ...data,
            version: { increment: 1 },
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
          deletedAt: new Date(),
          deletedBy,
          status: CategoryStatus.ARCHIVED,
        },
      });
    });
  }

  // Statistics and analytics
  async getTreeStatistics(tenantId?: string): Promise<TreeStatistics> {
    const where: any = { deletedAt: null };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [
      totalCategories,
      maxDepthResult,
      leafCategories,
      rootCategories,
      statusCounts,
    ] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.aggregate({
        where,
        _max: { depth: true },
      }),
      this.prisma.category.count({
        where: { ...where, isLeaf: true },
      }),
      this.prisma.category.count({
        where: { ...where, parentId: null },
      }),
      this.prisma.category.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    const statusCountsMap = Object.values(CategoryStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<CategoryStatus, number>);

    statusCounts.forEach(({ status, _count }) => {
      statusCountsMap[status] = _count;
    });

    return {
      totalCategories,
      maxDepth: maxDepthResult._max.depth || 0,
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
        childCount: true,
        descendantCount: true,
        productCount: true,
        depth: true,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return {
      directChildren: category.childCount,
      totalDescendants: category.descendantCount,
      totalProducts: category.productCount,
      depth: category.depth,
    };
  }

  // Validation operations
  async validatePath(path: string): Promise<boolean> {
    const existing = await this.prisma.category.findFirst({
      where: { path, deletedAt: null },
    });
    return !existing;
  }

  async validateSlug(slug: string, excludeId?: string): Promise<boolean> {
    const where: any = { slug, deletedAt: null };
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
      if (potentialParent && potentialParent.pathIds.includes(categoryId)) {
        errors.push('Cannot move category to its own descendant');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Brand constraint operations
  async findCategoriesAllowingBrand(brandId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        allowedBrands: { has: brandId },
        deletedAt: null,
      },
    });

    return categories.map(this.mapToDomain);
  }

  async findCategoriesRestrictingBrand(brandId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        restrictedBrands: { has: brandId },
        deletedAt: null,
      },
    });

    return categories.map(this.mapToDomain);
  }

  async validateBrandInCategory(brandId: string, categoryId: string): Promise<boolean> {
    const category = await this.findById(categoryId);
    if (!category) {
      return false;
    }

    return category.canBrandBeUsed(brandId);
  }

  // Cache and performance operations
  async refreshTreeStatistics(categoryId?: string): Promise<void> {
    if (categoryId) {
      await this.updateTreeStatistics(this.prisma, categoryId);
    } else {
      // Refresh all categories
      const categories = await this.prisma.category.findMany({
        where: { deletedAt: null },
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
    const category = await this.prisma.category.update({
      where: { id },
      data: { version: { increment: 1 } },
      select: { version: true },
    });

    return category.version;
  }

  async checkVersion(id: string, expectedVersion: number): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { version: true },
    });

    return category?.version === expectedVersion;
  }

  // Private helper methods
  private buildWhereClause(filters: CategoryFilters): any {
    const where: any = { deletedAt: null };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.visibility) {
      where.visibility = filters.visibility;
    }

    if (filters.isLeaf !== undefined) {
      where.isLeaf = filters.isLeaf;
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.depth !== undefined) {
      where.depth = filters.depth;
    }

    if (filters.maxDepth !== undefined) {
      where.depth = { lte: filters.maxDepth };
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.pathPrefix) {
      where.path = { startsWith: filters.pathPrefix };
    }

    if (filters.brandId) {
      where.OR = [
        { allowedBrands: { has: filters.brandId } },
        { AND: [
          { allowedBrands: { isEmpty: true } },
          { restrictedBrands: { not: { has: filters.brandId } } },
        ]},
      ];
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
        where: { deletedAt: null },
        orderBy: { displayOrder: 'asc' },
      };
    }

    if (options.includeAncestors) {
      include.parent = true;
    }

    if (options.includeAttributes) {
      include.attributes = {
        orderBy: { displayOrder: 'asc' },
      };
    }

    return include;
  }

  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;
    return orderBy;
  }

  private async generatePathInfo(
    parentId: string | null,
    slug: string
  ): Promise<{ path: string; pathIds: string[]; depth: number }> {
    if (!parentId) {
      return {
        path: `/${slug}`,
        pathIds: [],
        depth: 0,
      };
    }

    const parent = await this.findById(parentId);
    if (!parent) {
      throw new Error('Parent category not found');
    }

    return {
      path: `${parent.path}/${slug}`,
      pathIds: [...parent.pathIds, parentId],
      depth: parent.depth + 1,
    };
  }

  private async updateTreeStatistics(tx: any, categoryId: string): Promise<void> {
    const [childCount, descendantCount, productCount] = await Promise.all([
      tx.category.count({
        where: { parentId: categoryId, deletedAt: null },
      }),
      tx.category.count({
        where: { pathIds: { has: categoryId }, deletedAt: null },
      }),
      tx.product.count({
        where: { categoryId, deletedAt: null },
      }),
    ]);

    await tx.category.update({
      where: { id: categoryId },
      data: {
        childCount,
        descendantCount,
        productCount,
      },
    });

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

    const fields = ['name', 'description', 'status', 'visibility', 'isLeaf', 'isFeatured'];
    
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
      pathIds: prismaData.pathIds,
      depth: prismaData.depth,
      childCount: prismaData.childCount,
      descendantCount: prismaData.descendantCount,
      productCount: prismaData.productCount,
      status: prismaData.status,
      visibility: prismaData.visibility,
      seoTitle: prismaData.seoTitle,
      seoDescription: prismaData.seoDescription,
      seoKeywords: prismaData.seoKeywords,
      metadata: prismaData.metadata,
      iconUrl: prismaData.iconUrl,
      bannerUrl: prismaData.bannerUrl,
      displayOrder: prismaData.displayOrder,
      isLeaf: prismaData.isLeaf,
      isFeatured: prismaData.isFeatured,
      allowedBrands: prismaData.allowedBrands,
      restrictedBrands: prismaData.restrictedBrands,
      requiresBrand: prismaData.requiresBrand,
      createdBy: prismaData.createdBy,
      updatedBy: prismaData.updatedBy,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
      deletedAt: prismaData.deletedAt,
      deletedBy: prismaData.deletedBy,
    });
  }
}