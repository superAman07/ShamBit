// Tree Query Examples for Category Repository
// These examples demonstrate efficient tree operations using the hybrid model

import { PrismaClient } from '@prisma/client';

export class CategoryTreeQueries {
  constructor(private readonly prisma: PrismaClient) {}

  // 1. Get all descendants of a category (subtree)
  async getSubtree(categoryId: string, maxDepth?: number) {
    // Use `path` to find descendants (assumes `path` contains ancestor ids)
    const where: any = {
      path: { contains: categoryId },
      isActive: true,
    };

    if (maxDepth !== undefined) {
      const rootCategory = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { level: true },
      });
      
      if (rootCategory) {
        where.level = { lte: rootCategory.level + maxDepth };
      }
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
  }

  // 2. Get all ancestors of a category (breadcrumb)
  async getAncestors(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { path: true },
    });

    if (!category || !category.path) {
      return [];
    }

    // Assume `path` is a delimiter-separated list of ancestor ids (e.g. "/a/b/c")
    const pathIds = category.path.split('/').filter(Boolean);

    return this.prisma.category.findMany({
      where: {
        id: { in: pathIds },
        isActive: true,
      },
      orderBy: { level: 'asc' },
    });
  }

  // 3. Get direct children with pagination
  async getChildren(parentId: string | null, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [children, total] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          parentId,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({
        where: {
          parentId,
          isActive: true,
        },
      }),
    ]);

    return { children, total, page, limit };
  }

  // 4. Get category tree with nested structure (limited depth)
  async getCategoryTree(rootId?: string, maxDepth: number = 3) {
    const where: any = {
      isActive: true,
    };

    if (rootId) {
      where.OR = [
        { id: rootId },
        { path: { contains: rootId } },
      ];
      
      const rootCategory = await this.prisma.category.findUnique({
        where: { id: rootId },
        select: { level: true },
      });
      
      if (rootCategory) {
        where.level = { lte: rootCategory.level + maxDepth };
      }
    } else {
      where.level = { lte: maxDepth };
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
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
        isActive: true,
      },
      orderBy: { level: 'asc' },
    });
  }

  // 6. Get leaf categories (can contain products)
  async getLeafCategories(parentId?: string) {
    const where: any = {
      isActive: true,
      // leaf categories: no children
      children: { none: {} },
    };

    if (parentId) {
      where.path = { contains: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
  }

  // 7. Get categories at specific depth level
  async getCategoriesByDepth(depth: number, parentId?: string) {
    const where: any = {
      level: depth,
      isActive: true,
    };

    if (parentId) {
      where.path = { contains: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 8. Search categories with full-text search
  async searchCategories(query: string, parentId?: string) {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      isActive: true,
    };

    if (parentId) {
      where.path = { contains: parentId };
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
  }

  // 9. Get categories with product counts
  async getCategoriesWithProductCounts(parentId?: string) {
    const where: any = {
      isActive: true,
    };

    if (parentId) {
      where.OR = [
        { id: parentId },
        { path: { contains: parentId } },
      ];
    }

    const rows = await this.prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        path: true,
        level: true,
        _count: { select: { products: true, children: true } },
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Map counts into friendly property names
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      path: r.path,
      level: r.level,
      productCount: r._count?.products ?? 0,
      childCount: r._count?.children ?? 0,
    }));
  }

  // 10. Get featured categories hierarchy
  async getFeaturedCategoriesTree() {
    // Example: get active categories marked in some way (no `isFeatured` field in model)
    const featuredCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Collect ancestors by reading `path` strings
    const allPathIds = featuredCategories.flatMap(cat => (cat.path || '').split('/').filter(Boolean));
    const uniquePathIds = [...new Set(allPathIds)];

    const ancestors = uniquePathIds.length > 0
      ? await this.prisma.category.findMany({ where: { id: { in: uniquePathIds } } })
      : [];

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
        level: true,
        _count: { select: { children: true, products: true } },
      },
    });

    if (!category) {
      return null;
    }

    // Check if category can be deleted
    const canDelete = (category._count?.children ?? 0) === 0 && (category._count?.products ?? 0) === 0;

    // Check if category can be moved
    const canMove = true; // Additional business logic would go here

    // Get potential move targets (categories that are not descendants)
    const potentialParents = await this.prisma.category.findMany({
      where: {
        id: { notIn: [categoryId, ...(category.path ? category.path.split('/').filter(Boolean) : [])] },
        NOT: { path: { contains: categoryId } },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        path: true,
        level: true,
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
  async bulkUpdatePaths(updates: Array<{ id: string; newPath: string; newDepth: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const update of updates) {
        const result = await tx.category.update({
          where: { id: update.id },
          data: {
            path: update.newPath,
            level: update.newDepth,
          },
        });
        results.push(result);
      }
      
      return results;
    });
  }

  // Helper method to build nested tree structure
  private buildNestedTree(categories: any[], rootId?: string): any[] {
    const categoryMap = new Map<string, any>();
    const roots: any[] = [];

    // Create map for quick lookup
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] as any[] });
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
    // Use `path` to fetch tree-related rows (no materialized view in schema)
    return this.prisma.category.findMany({
      where: {
        OR: [
          { id: categoryId },
          { path: { contains: categoryId } },
        ],
        isActive: true,
      },
      orderBy: { level: 'asc' },
    });
  }

  // Batch statistics update
  async updateTreeStatisticsBatch(categoryIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      for (const categoryId of categoryIds) {
        const [childCount, descendantCount, productCount] = await Promise.all([
          tx.category.count({ where: { parentId: categoryId } }),
          tx.category.count({ where: { path: { contains: categoryId } } }),
          tx.product.count({ where: { categoryId } }),
        ]);

        // If your schema stores these aggregate fields, update them here. Otherwise
        // you can persist aggregates in a separate statistics table. This example
        // just demonstrates the counts and does not update non-existent fields.
        // await tx.category.update({ where: { id: categoryId }, data: { /* ... */ } });
      }
    });
  }
}