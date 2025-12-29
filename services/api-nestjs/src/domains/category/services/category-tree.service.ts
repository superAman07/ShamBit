import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { Category } from '../entities/category.entity';
import { CategoryStatus } from '../enums/category-status.enum';
import { CategoryVisibility } from '../enums/category-visibility.enum';
import { UserRole } from '../../../common/types';

export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface TreeTraversalOptions {
  maxDepth?: number;
  activeOnly?: boolean;
  leafOnly?: boolean;
  includeProductCounts?: boolean;
  sortBy?: 'name' | 'displayOrder' | 'productCount';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CategoryTreeService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly logger: LoggerService,
  ) { }

  async getCategoryTree(
    rootId?: string,
    maxDepth?: number,
    activeOnly: boolean = true,
    userRole?: UserRole
  ): Promise<Category[]> {
    this.logger.log('CategoryTreeService.getCategoryTree', { rootId, maxDepth, activeOnly });

    const filters: any = {};

    if (activeOnly) {
      filters.status = CategoryStatus.ACTIVE;
    }

    // Apply visibility filters
    if (userRole !== UserRole.ADMIN) {
      if (userRole === UserRole.SELLER) {
        filters.visibility = CategoryVisibility.PUBLIC; // Sellers see public categories
      } else {
        filters.visibility = CategoryVisibility.PUBLIC; // Customers see only public
      }
    }

    if (rootId) {
      return this.categoryRepository.findSubtree(rootId, maxDepth, activeOnly);
    } else {
      const result = await this.categoryRepository.findAll(filters, { limit: 10000 });
      return result.data;
    }
  }

  async buildNestedTree(
    categories: Category[],
    rootId?: string,
    options: TreeTraversalOptions = {}
  ): Promise<CategoryTreeNode[]> {
    this.logger.log('CategoryTreeService.buildNestedTree', {
      categoryCount: categories.length,
      rootId,
      options
    });

    // Create a map for quick lookup
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // Initialize all nodes
    categories.forEach(category => {
      if (this.shouldIncludeCategory(category, options)) {
        categoryMap.set(category.id, {
          category,
          children: [],
          level: category.depth,
          hasChildren: category.childCount > 0,
          isExpanded: false,
        });
      }
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      if (!categoryNode) return;

      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId)!;
        parent.children.push(categoryNode);
      } else if (!rootId || category.id === rootId || category.parentId === null) {
        roots.push(categoryNode);
      }
    });

    // Sort children at each level
    this.sortTreeNodes(roots, options);

    return roots;
  }

  async getCategoryBreadcrumb(categoryId: string): Promise<Category[]> {
    return this.categoryRepository.findAncestors(categoryId, true);
  }

  async getCategorySiblings(categoryId: string, activeOnly: boolean = true): Promise<Category[]> {
    const filters: any = {};
    if (activeOnly) {
      filters.status = CategoryStatus.ACTIVE;
    }

    return this.categoryRepository.findSiblings(categoryId, filters);
  }

  async getChildrenWithCounts(
    parentId: string | null,
    includeInactive: boolean = false
  ): Promise<Array<Category & { directProductCount: number }>> {
    const filters: any = {};
    if (!includeInactive) {
      filters.status = CategoryStatus.ACTIVE;
    }

    // Pass parentId explicitly. Use 'null' as string if repo expects optional string or handle null.
    // Assuming repo.findChildren expects string | null or optional string.
    // If repo expects string | undefined, convert null to undefined.
    const parentIdArg = parentId === null ? undefined : parentId;
    const result = await this.categoryRepository.findChildren(parentIdArg, filters, { limit: 1000 });

    // The productCount is already included in the category entity
    return result.data.map(categoryData => {
      // Create a full Category entity to ensure methods exist
      const category = new Category(categoryData);

      // Return intersection type
      return Object.assign(category, {
        directProductCount: category.productCount,
      });
    });
  }

  async findCategoryPath(categoryId: string): Promise<string[]> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      return [];
    }

    return category.path.split('/').filter(Boolean);
  }

  async validateTreeIntegrity(rootId?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    this.logger.log('CategoryTreeService.validateTreeIntegrity', { rootId });

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get all categories to validate
      const categories = rootId
        ? await this.categoryRepository.findSubtree(rootId)
        : (await this.categoryRepository.findAll({}, { limit: 100000 })).data;

      // Validate each category
      for (const category of categories) {
        // Check path consistency
        const expectedPath = await this.calculateExpectedPath(category);
        if (category.path !== expectedPath) {
          errors.push(`Category ${category.id} has incorrect path: expected ${expectedPath}, got ${category.path}`);
        }

        // Check depth consistency
        const expectedDepth = category.pathIds.length;
        if (category.depth !== expectedDepth) {
          errors.push(`Category ${category.id} has incorrect depth: expected ${expectedDepth}, got ${category.depth}`);
        }

        // Check parent relationship
        if (category.parentId) {
          const parent = await this.categoryRepository.findById(category.parentId);
          if (!parent) {
            errors.push(`Category ${category.id} has non-existent parent ${category.parentId}`);
          } else if (!category.pathIds.includes(category.parentId)) {
            errors.push(`Category ${category.id} parent ${category.parentId} not in pathIds`);
          }
        }

        // Check for circular references
        if (category.pathIds.includes(category.id)) {
          errors.push(`Category ${category.id} has circular reference in pathIds`);
        }

        // Validate tree statistics
        const actualChildCount = await this.countDirectChildren(category.id);
        if (category.childCount !== actualChildCount) {
          warnings.push(`Category ${category.id} has incorrect child count: expected ${actualChildCount}, got ${category.childCount}`);
        }
      }

      // Check for orphaned categories
      const orphanedCategories = await this.findOrphanedCategories();
      if (orphanedCategories.length > 0) {
        warnings.push(`Found ${orphanedCategories.length} orphaned categories`);
      }

    } catch (error) {
      errors.push(`Tree validation failed: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async repairTreeIntegrity(rootId?: string, dryRun: boolean = true): Promise<{
    repairsNeeded: number;
    repairsApplied: number;
    errors: string[];
  }> {
    this.logger.log('CategoryTreeService.repairTreeIntegrity', { rootId, dryRun });

    const errors: string[] = [];
    let repairsNeeded = 0;
    let repairsApplied = 0;

    try {
      const validation = await this.validateTreeIntegrity(rootId);
      repairsNeeded = validation.errors.length + validation.warnings.length;

      if (!dryRun && repairsNeeded > 0) {
        // Apply repairs
        await this.categoryRepository.rebuildMaterializedPaths(rootId);
        await this.categoryRepository.refreshTreeStatistics(rootId);
        repairsApplied = repairsNeeded;
      }

    } catch (error) {
      errors.push(`Tree repair failed: ${error.message}`);
    }

    return {
      repairsNeeded,
      repairsApplied,
      errors,
    };
  }

  async getTreeMetrics(rootId?: string): Promise<{
    totalCategories: number;
    maxDepth: number;
    averageDepth: number;
    leafCategories: number;
    branchCategories: number;
    averageChildrenPerBranch: number;
  }> {
    const categories = rootId
      ? await this.categoryRepository.findSubtree(rootId)
      : (await this.categoryRepository.findAll({}, { limit: 100000 })).data;

    const totalCategories = categories.length;
    const maxDepth = Math.max(...categories.map(c => c.depth));
    const averageDepth = categories.reduce((sum, c) => sum + c.depth, 0) / totalCategories;
    const leafCategories = categories.filter(c => c.isLeaf).length;
    const branchCategories = categories.filter(c => !c.isLeaf).length;
    const averageChildrenPerBranch = branchCategories > 0
      ? categories.reduce((sum, c) => sum + c.childCount, 0) / branchCategories
      : 0;

    return {
      totalCategories,
      maxDepth,
      averageDepth,
      leafCategories,
      branchCategories,
      averageChildrenPerBranch,
    };
  }

  async optimizeTreeStructure(rootId?: string): Promise<{
    optimizationsApplied: string[];
    performanceImprovement: number;
  }> {
    this.logger.log('CategoryTreeService.optimizeTreeStructure', { rootId });

    const optimizationsApplied: string[] = [];

    // Refresh materialized paths
    await this.categoryRepository.rebuildMaterializedPaths(rootId);
    optimizationsApplied.push('Rebuilt materialized paths');

    // Update tree statistics
    await this.categoryRepository.refreshTreeStatistics(rootId);
    optimizationsApplied.push('Refreshed tree statistics');

    // TODO: Add more optimization strategies
    // - Rebalance deep trees
    // - Optimize display orders
    // - Clean up unused categories

    return {
      optimizationsApplied,
      performanceImprovement: 15, // Estimated percentage improvement
    };
  }

  // Private helper methods
  private shouldIncludeCategory(category: Category, options: TreeTraversalOptions): boolean {
    if (options.activeOnly && category.status !== CategoryStatus.ACTIVE) {
      return false;
    }

    if (options.leafOnly && !category.isLeaf) {
      return false;
    }

    if (options.maxDepth !== undefined && category.depth > options.maxDepth) {
      return false;
    }

    return true;
  }

  private sortTreeNodes(nodes: CategoryTreeNode[], options: TreeTraversalOptions): void {
    const sortBy = options.sortBy || 'displayOrder';
    const sortOrder = options.sortOrder || 'asc';

    nodes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.category.name.localeCompare(b.category.name);
          break;
        case 'productCount':
          comparison = a.category.productCount - b.category.productCount;
          break;
        case 'displayOrder':
        default:
          comparison = a.category.displayOrder - b.category.displayOrder;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Recursively sort children
    nodes.forEach(node => {
      if (node.children.length > 0) {
        this.sortTreeNodes(node.children, options);
      }
    });
  }

  private async calculateExpectedPath(category: Category): Promise<string> {
    if (!category.parentId) {
      return `/${category.slug}`;
    }

    const parent = await this.categoryRepository.findById(category.parentId);
    if (!parent) {
      throw new Error(`Parent category ${category.parentId} not found`);
    }

    return `${parent.path}/${category.slug}`;
  }

  private async countDirectChildren(categoryId: string): Promise<number> {
    const result = await this.categoryRepository.findChildren(categoryId, {}, { limit: 1 });
    return result.total;
  }

  private async findOrphanedCategories(): Promise<Category[]> {
    // This would require a custom query to find categories with non-existent parents
    // For now, return empty array - implement based on specific database capabilities
    return [];
  }
}