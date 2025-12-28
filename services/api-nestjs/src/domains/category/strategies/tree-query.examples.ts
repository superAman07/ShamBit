// Tree Query Examples for Category Repository
// These examples demonstrate efficient tree operations using the hybrid model

import { PrismaClient } from '@prisma/client';

export class CategoryTreeQueries {
  constructor(private readonly prisma: PrismaClient) {}

  // 1. Get all descendants of a category (subtree)
  async getSubtree(categoryId: string, maxDepth?: number) {
    const where: any = {
      pathIds: { has: categoryId },
      deletedAt: null,
    };

    if (maxDepth !== undefined) {
      const rootCategory = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { depth: true },
      });
      
      if (rootCategory) {
        where.depth = { lte: rootCategory.depth + maxDepth };
      }
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });
  }

  // 2. Get all ancestors of a category (breadcrumb)
  async getAncestors(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { pathIds: true },
    });

    if (!category || category.pathIds.length === 0) {
      return [];
    }

    return this.prisma.category.findMany({
      where: {
        id: { in: category.pathIds },
        deletedAt: null,
      },
      orderBy: { depth: 'asc' },
    });
  }

  // 3. Get direct children with pagination
  async getChildren(parentId: string | null, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [children, total] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          parentId,
          deletedAt: null,
        },
        orderBy: { displayOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({
        where: {
          parentId,
          deletedAt: null,
        },
      }),
    ]);

    return { children, total, page, limit };
  }

  // 4. Get category tree with nested structure (limited depth)
  async getCategoryTree(rootId?: string, maxDepth: number = 3) {
    const where: any = {
      deletedAt: null,
      status: 'ACTIVE',
    };

    if (rootId) {
      where.OR = [
        { id: rootId },
        { pathIds: { has: rootId } },
      ];
      
      const rootCategory = await this.prisma.category.findUnique({
        where: { id: rootId },
        select: { depth: true },
      });
      
      if (rootCategory) {
        where.depth = { lte: rootCategory.depth + maxDepth };
      }
    } else {
      where.depth = { lte: maxDepth };
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // Build nested structure
    return this.buildNestedTree(categories, rootId);
  }

  // 5. Find categories by path pattern
  async findByPathPattern(pathPattern: string) {
    return this.prisma.category.findMany({
      where: {
        path: { startsWith: pathPattern },
        deletedAt: null,
      },
      orderBy: { depth: 'asc' },
    });
  }

  // 6. Get leaf categories (can contain products)
  async getLeafCategories(parentId?: string) {
    const where: any = {
      isLeaf: true,
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (parentId) {
      where.pathIds = { has: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });
  }

  // 7. Get categories at specific depth level
  async getCategoriesByDepth(depth: number, parentId?: string) {
    const where: any = {
      depth,
      deletedAt: null,
    };

    if (parentId) {
      where.pathIds = { has: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
  }

  // 8. Search categories with full-text search
  async searchCategories(query: string, parentId?: string) {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { seoKeywords: { has: query } },
      ],
      deletedAt: null,
      status: 'ACTIVE',
    };

    if (parentId) {
      where.pathIds = { has: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });
  }

  // 9. Get categories with product counts
  async getCategoriesWithProductCounts(parentId?: string) {
    const where: any = {
      deletedAt: null,
      status: 'ACTIVE',
    };

    if (parentId) {
      where.OR = [
        { id: parentId },
        { pathIds: { has: parentId } },
      ];
    }

    return this.prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        path: true,
        depth: true,
        productCount: true,
        childCount: true,
        descendantCount: true,
      },
      orderBy: [
        { depth: 'asc' },
        { displayOrder: 'asc' },
      ],
    });
  }

  // 10. Get featured categories hierarchy
  async getFeaturedCategoriesTree() {
    const featuredCategories = await this.prisma.category.findMany({
      where: {
        isFeatured: true,
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get all ancestors of featured categories
    const allPathIds = featuredCategories.flatMap(cat => cat.pathIds);
    const uniquePathIds = [...new Set(allPathIds)];

    const ancestors = await this.prisma.category.findMany({
      where: {
        id: { in: uniquePathIds },
        deletedAt: null,
      },
    });

    const allCategories = [...featuredCategories, ...ancestors];
    return this.buildNestedTree(allCategories);
  }

  // 11. Efficient category validation queries
  async validateCategoryOperations(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        path: true,
        pathIds: true,
        depth: true,
        childCount: true,
        productCount: true,
      },
    });

    if (!category) {
      return null;
    }

    // Check if category can be deleted
    const canDelete = category.childCount === 0 && category.productCount === 0;

    // Check if category can be moved
    const canMove = true; // Additional business logic would go here

    // Get potential move targets (categories that are not descendants)
    const potentialParents = await this.prisma.category.findMany({
      where: {
        id: { notIn: [categoryId, ...category.pathIds] },
        NOT: { pathIds: { has: categoryId } },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        path: true,
        depth: true,
      },
    });

    return {
      category,
      canDelete,
      canMove,
      potentialParents,
    };
  }

  // 12. Bulk tree operations
  async bulkUpdatePaths(updates: Array<{ id: string; newPath: string; newPathIds: string[]; newDepth: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const update of updates) {
        const result = await tx.category.update({
          where: { id: update.id },
          data: {
            path: update.newPath,
            pathIds: update.newPathIds,
            depth: update.newDepth,
            version: { increment: 1 },
          },
        });
        results.push(result);
      }
      
      return results;
    });
  }

  // Helper method to build nested tree structure
  private buildNestedTree(categories: any[], rootId?: string): any[] {
    const categoryMap = new Map();
    const roots: any[] = [];

    // Create map for quick lookup
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId);
        parent.children.push(categoryNode);
      } else if (!rootId || category.id === rootId || category.parentId === null) {
        roots.push(categoryNode);
      }
    });

    return roots;
  }

  // Performance optimization: Materialized view queries
  async getTreeViewData(categoryId: string) {
    // This would use the CategoryTreeView table for high-performance queries
    return this.prisma.categoryTreeView.findMany({
      where: {
        OR: [
          { categoryId },
          { ancestorId: categoryId },
        ],
      },
      orderBy: { depth: 'asc' },
    });
  }

  // Batch statistics update
  async updateTreeStatisticsBatch(categoryIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      for (const categoryId of categoryIds) {
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
    });
  }
}