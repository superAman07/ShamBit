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
        depth: true,
        status: true,
        childCount: true,
        productCount: true,
      },
    });

    if (!category) {
      errors.push('Category not found');
      return { isValid: false, errors, warnings };
    }

    // Check if category is in a valid state for moving
    if (category.status === CategoryStatus.ARCHIVED) {
      errors.push('Cannot move archived categories');
    }

    // Validate new parent
    if (newParentId) {
      const newParent = await this.prisma.category.findUnique({
        where: { id: newParentId },
        select: {
          id: true,
          path: true,
          pathIds: true,
          depth: true,
          status: true,
          isLeaf: true,
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
        const newDepth = newParent.depth + 1;
        const categoryTreeDepth = await this.getMaxDescendantDepth(categoryId);
        const finalDepth = newDepth + (categoryTreeDepth - category.depth);

        if (finalDepth > maxDepth) {
          errors.push(`Move would exceed maximum tree depth (${maxDepth})`);
        }

        // Check if parent can have children
        if (newParent.isLeaf && newParent.status === CategoryStatus.ACTIVE) {
          warnings.push('Moving to a leaf category - parent will no longer be able to contain products');
        }

        // Check parent status
        if (newParent.status !== CategoryStatus.ACTIVE) {
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
    if (category.childCount > 100) {
      warnings.push(`Category has ${category.childCount} children - operation may take longer`);
    }

    const descendantCount = await this.prisma.category.count({
      where: { pathIds: { has: categoryId } },
    });

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
        depth: true,
      },
    });

    if (!parent) {
      throw new Error('Parent category not found');
    }

    return {
      path: `${parent.path}/${categorySlug}`,
      pathIds: [...parent.pathIds, newParentId],
      depth: parent.depth + 1,
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
            depth: newPathInfo.depth,
            updatedBy: userId,
            version: { increment: 1 },
          },
        });

        affectedCategories++;

        // Step 2: Get all descendants
        const descendants = await tx.category.findMany({
          where: {
            pathIds: { has: category.id },
            deletedAt: null,
          },
          select: {
            id: true,
            path: true,
            pathIds: true,
            depth: true,
            slug: true,
          },
          orderBy: { depth: 'asc' },
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
              const depthDifference = newPathInfo.depth - category.depth;
              const newDescendantDepth = descendant.depth + depthDifference;

              await tx.category.update({
                where: { id: descendant.id },
                data: {
                  path: newDescendantPath,
                  pathIds: newDescendantPathIds,
                  depth: newDescendantDepth,
                  version: { increment: 1 },
                },
              });

              affectedCategories++;
            })
          );
        }

        // Step 4: Update products if requested
        if (options.updateProducts) {
          const productUpdateResult = await tx.product.updateMany({
            where: {
              OR: [
                { categoryId: category.id },
                { categoryPathIds: { has: category.id } },
              ],
            },
            data: {
              categoryPath: newPathInfo.path,
              categoryPathIds: newPathInfo.pathIds,
              categoryDepth: newPathInfo.depth,
            },
          });

          affectedProducts = productUpdateResult.count;
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

        // Step 6: Create audit log
        await tx.categoryAuditLog.create({
          data: {
            categoryId: category.id,
            action: 'MOVE',
            oldValues: {
              parentId: category.parentId,
              path: category.path,
              pathIds: category.pathIds,
              depth: category.depth,
            },
            newValues: {
              parentId: newParentId,
              path: newPathInfo.path,
              pathIds: newPathInfo.pathIds,
              depth: newPathInfo.depth,
            },
            oldPath: category.path,
            newPath: newPathInfo.path,
            oldParentId: category.parentId,
            newParentId: newParentId,
            userId,
            userRole: 'ADMIN', // This should come from context
            reason: 'Category reparenting operation',
            metadata: {
              affectedCategories,
              affectedProducts,
              batchSize,
            },
          },
        });
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
        depth: true,
        parentId: true,
        status: true,
        childCount: true,
        productCount: true,
      },
    });
  }

  private async getDescendants(categoryId: string): Promise<any[]> {
    return this.prisma.category.findMany({
      where: {
        pathIds: { has: categoryId },
        deletedAt: null,
      },
      select: {
        id: true,
        path: true,
        depth: true,
      },
    });
  }

  private async countAffectedProducts(categoryId: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        OR: [
          { categoryId },
          { categoryPathIds: { has: categoryId } },
        ],
      },
    });
  }

  private async getMaxDescendantDepth(categoryId: string): Promise<number> {
    const result = await this.prisma.category.aggregate({
      where: {
        pathIds: { has: categoryId },
        deletedAt: null,
      },
      _max: { depth: true },
    });

    return result._max.depth || 0;
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
      where: {
        id: { in: operations.map(op => op.categoryId) },
      },
      select: {
        id: true,
        depth: true,
      },
    });

    const depthMap = new Map(categoriesData.map(cat => [cat.id, cat.depth]));

    return operations
      .map(op => ({
        ...op,
        depth: depthMap.get(op.categoryId) || 0,
      }))
      .sort((a, b) => b.depth - a.depth); // Deepest first
  }
}