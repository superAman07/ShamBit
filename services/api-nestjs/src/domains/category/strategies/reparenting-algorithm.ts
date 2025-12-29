// Safe Re-parenting Algorithm for Category Tree
// Handles complex tree operations with data consistency and performance optimization

import { PrismaClient } from '@prisma/client';
import { CategoryStatus } from '../enums/category-status.enum';

export interface ReparentingOptions {
  validateConstraints?: boolean;
  updateProducts?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

export interface ReparentingResult {
  success: boolean;
  categoryId: string;
  oldPath: string;
  newPath: string;
  affectedCategories: number;
  affectedProducts: number;
  errors: string[];
  warnings: string[];
  executionTime: number;
}

export class CategoryReparentingAlgorithm {
  constructor(private readonly prisma: PrismaClient) {}

  async reparentCategory(
    categoryId: string,
    newParentId: string | null,
    userId: string,
    options: ReparentingOptions = {}
  ): Promise<ReparentingResult> {
    const startTime = Date.now();
    const result: ReparentingResult = {
      success: false,
      categoryId,
      oldPath: '',
      newPath: '',
      affectedCategories: 0,
      affectedProducts: 0,
      errors: [],
      warnings: [],
      executionTime: 0,
    };

    try {
      // Step 1: Validate the operation
      const validation = await this.validateReparenting(categoryId, newParentId, options);
      if (!validation.isValid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        return result;
      }

      // Step 2: Get current category data
      const category = await this.getCategoryWithTree(categoryId);
      if (!category) {
        result.errors.push('Category not found');
        return result;
      }

      result.oldPath = category.path;

      // Step 3: Calculate new path information
      const newPathInfo = await this.calculateNewPathInfo(newParentId, category.slug);
      result.newPath = newPathInfo.path;

      // Step 4: If dry run, return early with calculations
      if (options.dryRun) {
        const descendants = await this.getDescendants(categoryId);
        result.affectedCategories = descendants.length + 1;
        result.affectedProducts = await this.countAffectedProducts(categoryId);
        result.success = true;
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // Step 5: Execute the reparenting in a transaction
      const transactionResult = await this.executeReparenting(
        category,
        newParentId,
        newPathInfo,
        userId,
        options
      );

      result.success = transactionResult.success;
      result.affectedCategories = transactionResult.affectedCategories;
      result.affectedProducts = transactionResult.affectedProducts;
      result.errors = transactionResult.errors;
      result.warnings = transactionResult.warnings;

    } catch (error) {
      result.errors.push(`Reparenting failed: ${error.message}`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private async validateReparenting(
    categoryId: string,
    newParentId: string | null,
    options: ReparentingOptions
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validations
    if (categoryId === newParentId) {
      errors.push('Cannot move category to itself');
    }

    // Get category data for validation
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        path: true,
        pathIds: true,
        level: true,
        isActive: true,
        parentId: true,
        slug: true,
      },
    });

    if (!category) {
      errors.push('Category not found');
      return { isValid: false, errors, warnings };
    }

    // Check if category is in a valid state for moving
    if (!category.isActive) {
      errors.push('Cannot move inactive/archived categories');
    }

    // Validate new parent
    if (newParentId) {
      const newParent = await this.prisma.category.findUnique({
        where: { id: newParentId },
        select: {
          id: true,
          path: true,
          pathIds: true,
          level: true,
          isActive: true,
        },
      });

      if (!newParent) {
        errors.push('New parent category not found');
      } else {
        // Check if new parent is a descendant
        if (newParent.pathIds.includes(categoryId)) {
          errors.push('Cannot move category to its own descendant');
        }

        // Check depth limits
        const maxDepth = 10; // Configurable limit
        const newLevel = newParent.level + 1;
        const categoryTreeDepth = await this.getMaxDescendantDepth(categoryId);
        const finalDepth = newLevel + (categoryTreeDepth - category.level);

        if (finalDepth > maxDepth) {
          errors.push(`Move would exceed maximum tree depth (${maxDepth})`);
        }

        // Check if parent can have children
        const childCountForParent = await this.prisma.category.count({ where: { parentId: newParent.id } });
        const isLeaf = childCountForParent === 0;
        if (isLeaf && newParent.isActive) {
          warnings.push('Moving to a leaf category - parent will no longer be able to contain products');
        }

        // Check parent status
        if (!newParent.isActive) {
          warnings.push('Moving to an inactive parent category');
        }
      }
    }

    // Business rule validations
    if (options.validateConstraints) {
      const constraintValidation = await this.validateBusinessConstraints(category, newParentId);
      errors.push(...constraintValidation.errors);
      warnings.push(...constraintValidation.warnings);
    }

    // Performance warnings
    const childCount = await this.prisma.category.count({ where: { parentId: categoryId } });
    if (childCount > 100) {
      warnings.push(`Category has ${childCount} children - operation may take longer`);
    }

    const descendantCount = await this.prisma.category.count({ where: { pathIds: { has: categoryId } } });
    if (descendantCount > 1000) {
      warnings.push(`Category has ${descendantCount} descendants - consider running during maintenance window`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async calculateNewPathInfo(
    newParentId: string | null,
    categorySlug: string
  ): Promise<{ path: string; pathIds: string[]; depth: number }> {
    if (!newParentId) {
      return {
        path: `/${categorySlug}`,
        pathIds: [],
        depth: 0,
      };
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: newParentId },
      select: {
        path: true,
        pathIds: true,
        level: true,
      },
    });

    if (!parent) {
      throw new Error('Parent category not found');
    }

    return {
      path: `${parent.path}/${categorySlug}`,
      pathIds: [...parent.pathIds, newParentId],
      depth: parent.level + 1,
    };
  }

  private async executeReparenting(
    category: any,
    newParentId: string | null,
    newPathInfo: { path: string; pathIds: string[]; depth: number },
    userId: string,
    options: ReparentingOptions
  ): Promise<{
    success: boolean;
    affectedCategories: number;
    affectedProducts: number;
    errors: string[];
    warnings: string[];
  }> {
    const batchSize = options.batchSize || 100;
    let affectedCategories = 0;
    let affectedProducts = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 1: Update the category itself
        await tx.category.update({
          where: { id: category.id },
          data: {
            parentId: newParentId,
            path: newPathInfo.path,
            pathIds: newPathInfo.pathIds,
            level: newPathInfo.depth,
          },
        });

        affectedCategories++;

        // Step 2: Get all descendants
        const descendants = await tx.category.findMany({
          where: { pathIds: { has: category.id } },
          select: {
            id: true,
            path: true,
            pathIds: true,
            level: true,
            slug: true,
          },
          orderBy: { level: 'asc' },
        });

        // Step 3: Update descendants in batches
        for (let i = 0; i < descendants.length; i += batchSize) {
          const batch = descendants.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (descendant) => {
              // Calculate new path for descendant
              const relativePath = descendant.path.substring(category.path.length);
              const newDescendantPath = newPathInfo.path + relativePath;
              
              // Calculate new pathIds for descendant
              const relativePathIds = descendant.pathIds.slice(
                descendant.pathIds.indexOf(category.id) + 1
              );
              const newDescendantPathIds = [
                ...newPathInfo.pathIds,
                category.id,
                ...relativePathIds,
              ];
              
              // Calculate new depth
              const depthDifference = newPathInfo.depth - category.level;
              const newDescendantDepth = descendant.level + depthDifference;

              await tx.category.update({
                where: { id: descendant.id },
                data: {
                  path: newDescendantPath,
                  pathIds: newDescendantPathIds,
                  level: newDescendantDepth,
                },
              });

              affectedCategories++;
            })
          );
        }

        // Step 4: Update products if requested
        if (options.updateProducts) {
          // Product model in this schema does not track category path fields.
          // We update count of affected products instead of mutating non-existent fields.
          const productCountForCategory = await tx.product.count({ where: { categoryId: category.id } });
          affectedProducts = productCountForCategory;
        }

        // Step 5: Update tree statistics for affected parents
        const parentsToUpdate = new Set<string>();
        
        // Add old parent
        if (category.parentId) {
          parentsToUpdate.add(category.parentId);
        }
        
        // Add new parent
        if (newParentId) {
          parentsToUpdate.add(newParentId);
        }

        // Update statistics for affected parents
        for (const parentId of parentsToUpdate) {
          await this.updateTreeStatistics(tx, parentId);
        }

        // Audit log model not present in this schema; skip creating audit record.
      });

      return {
        success: true,
        affectedCategories,
        affectedProducts,
        errors,
        warnings,
      };

    } catch (error) {
      errors.push(`Transaction failed: ${error.message}`);
      return {
        success: false,
        affectedCategories: 0,
        affectedProducts: 0,
        errors,
        warnings,
      };
    }
  }

  // Helper methods
  private async getCategoryWithTree(categoryId: string): Promise<any> {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        path: true,
        pathIds: true,
        level: true,
        parentId: true,
        isActive: true,
      },
    });
  }

  private async getDescendants(categoryId: string): Promise<any[]> {
    return this.prisma.category.findMany({
      where: { pathIds: { has: categoryId } },
      select: { id: true, path: true, level: true },
    });
  }

  private async countAffectedProducts(categoryId: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        categoryId,
      },
    });
  }

  private async getMaxDescendantDepth(categoryId: string): Promise<number> {
    const result = await this.prisma.category.aggregate({
      where: { pathIds: { has: categoryId } },
      _max: { level: true },
    });
    // result._max may be undefined if no descendants
    // @ts-ignore
    return (result._max && (result._max.level as number)) || 0;
  }

  private async validateBusinessConstraints(
    category: any,
    newParentId: string | null
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add business-specific validation logic here
    // For example:
    // - Brand constraints
    // - Category type restrictions
    // - Marketplace rules
    // - Tenant-specific rules

    return { errors, warnings };
  }

  private async updateTreeStatistics(tx: any, categoryId: string): Promise<void> {
    const [childCount, descendantCount, productCount] = await Promise.all([
      tx.category.count({
        where: { parentId: categoryId },
      }),
      tx.category.count({
        where: { pathIds: { has: categoryId } },
      }),
      tx.product.count({
        where: { categoryId },
      }),
    ]);
    // This schema does not persist tree statistics fields on category.
    // If required, implement persistence to a separate stats table or add fields to the model.
    return;
  }

  // Batch reparenting for multiple categories
  async batchReparent(
    operations: Array<{ categoryId: string; newParentId: string | null }>,
    userId: string,
    options: ReparentingOptions = {}
  ): Promise<ReparentingResult[]> {
    const results: ReparentingResult[] = [];

    // Sort operations by current depth (deepest first) to avoid conflicts
    const sortedOperations = await this.sortOperationsByDepth(operations);

    for (const operation of sortedOperations) {
      const result = await this.reparentCategory(
        operation.categoryId,
        operation.newParentId,
        userId,
        options
      );
      results.push(result);

      // Stop on first error if not in dry run mode
      if (!result.success && !options.dryRun) {
        break;
      }
    }

    return results;
  }

  private async sortOperationsByDepth(
    operations: Array<{ categoryId: string; newParentId: string | null }>
  ): Promise<Array<{ categoryId: string; newParentId: string | null; depth: number }>> {
    const categoriesData = await this.prisma.category.findMany({
      where: { id: { in: operations.map(op => op.categoryId) } },
      select: { id: true, level: true },
    });

    const depthMap = new Map(categoriesData.map(cat => [cat.id, cat.level]));

    return operations
      .map(op => ({
        ...op,
        depth: depthMap.get(op.categoryId) || 0,
      }))
      .sort((a, b) => b.depth - a.depth); // Deepest first
  }
}