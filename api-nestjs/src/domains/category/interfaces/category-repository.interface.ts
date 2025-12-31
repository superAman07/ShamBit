import { Category } from '../entities/category.entity';
import { CategoryStatus } from '../enums/category-status.enum';
import { CategoryVisibility } from '../enums/category-visibility.enum';

export interface CategoryFilters {
  parentId?: string | null;
  status?: CategoryStatus;
  visibility?: CategoryVisibility;
  isLeaf?: boolean;
  isFeatured?: boolean;
  depth?: number;
  maxDepth?: number;
  search?: string;
  pathPrefix?: string;
  brandId?: string; // Categories that allow this brand
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TreeOptions {
  includeChildren?: boolean;
  includeAncestors?: boolean;
  includeAttributes?: boolean;
  maxDepth?: number;
  activeOnly?: boolean;
}

export interface MoveResult {
  categoryId: string;
  oldPath: string;
  newPath: string;
  affectedDescendants: number;
  updatedProducts: number;
}

export interface TreeStatistics {
  totalCategories: number;
  maxDepth: number;
  leafCategories: number;
  rootCategories: number;
  statusCounts: Record<CategoryStatus, number>;
}

export interface ICategoryRepository {
  // Basic CRUD operations
  findById(id: string, options?: TreeOptions): Promise<Category | null>;
  findBySlug(slug: string, options?: TreeOptions): Promise<Category | null>;
  findByPath(path: string, options?: TreeOptions): Promise<Category | null>;

  // List and search operations
  findAll(
    filters?: CategoryFilters,
    pagination?: PaginationOptions,
  ): Promise<{ data: Category[]; total: number }>;
  findRoots(
    filters?: CategoryFilters,
    pagination?: PaginationOptions,
  ): Promise<{ data: Category[]; total: number }>;
  findChildren(
    parentId: string,
    filters?: CategoryFilters,
    pagination?: PaginationOptions,
  ): Promise<{ data: Category[]; total: number }>;

  // Tree traversal operations
  findAncestors(categoryId: string, includeRoot?: boolean): Promise<Category[]>;
  findDescendants(
    categoryId: string,
    maxDepth?: number,
    activeOnly?: boolean,
  ): Promise<Category[]>;
  findSiblings(
    categoryId: string,
    filters?: CategoryFilters,
  ): Promise<Category[]>;
  findSubtree(
    rootId: string,
    maxDepth?: number,
    activeOnly?: boolean,
  ): Promise<Category[]>;

  // Path-based operations
  findByPathPrefix(
    pathPrefix: string,
    filters?: CategoryFilters,
  ): Promise<Category[]>;
  findCategoriesInPaths(paths: string[]): Promise<Category[]>;

  // Create and update operations
  create(data: Partial<Category> & { createdBy: string }): Promise<Category>;
  update(
    id: string,
    data: Partial<Category> & { updatedBy: string },
  ): Promise<Category>;
  updateStatus(
    id: string,
    status: CategoryStatus,
    updatedBy: string,
    reason?: string,
  ): Promise<Category>;

  // Tree modification operations
  move(
    categoryId: string,
    newParentId: string | null,
    movedBy: string,
    reason?: string,
  ): Promise<MoveResult>;
  reorderChildren(
    parentId: string | null,
    childrenOrder: { id: string; displayOrder: number }[],
    updatedBy: string,
  ): Promise<void>;

  // Soft delete operations
  softDelete(id: string, deletedBy: string, reason?: string): Promise<void>;
  restore(id: string, restoredBy: string, reason?: string): Promise<Category>;

  // Bulk operations
  bulkCreate(
    categories: Array<Partial<Category> & { createdBy: string }>,
  ): Promise<Category[]>;
  bulkUpdate(
    updates: Array<{ id: string; data: Partial<Category>; updatedBy: string }>,
  ): Promise<Category[]>;
  bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void>;

  // Statistics and analytics
  getTreeStatistics(): Promise<TreeStatistics>;
  getCategoryStatistics(categoryId: string): Promise<{
    directChildren: number;
    totalDescendants: number;
    totalProducts: number;
    depth: number;
  }>;

  // Validation operations
  validatePath(path: string): Promise<boolean>;
  validateSlug(slug: string, excludeId?: string): Promise<boolean>;
  validateMove(
    categoryId: string,
    newParentId: string | null,
  ): Promise<{ isValid: boolean; errors: string[] }>;

  // Brand constraint operations
  findCategoriesAllowingBrand(brandId: string): Promise<Category[]>;
  findCategoriesRestrictingBrand(brandId: string): Promise<Category[]>;
  validateBrandInCategory(
    brandId: string,
    categoryId: string,
  ): Promise<boolean>;

  // Cache and performance operations
  refreshTreeStatistics(categoryId?: string): Promise<void>;
  rebuildMaterializedPaths(rootId?: string): Promise<void>;

  // Concurrency control
  incrementVersion(id: string): Promise<number>;
  checkVersion(id: string, expectedVersion: number): Promise<boolean>;
}
