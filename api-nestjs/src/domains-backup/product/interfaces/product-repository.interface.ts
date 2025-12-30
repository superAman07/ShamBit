import { Product } from '../entities/product.entity';
import { ProductAttributeValue } from '../entities/product-attribute-value.entity';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';

export interface ProductFilters {
  status?: ProductStatus;
  visibility?: ProductVisibility;
  moderationStatus?: ProductModerationStatus;
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  isFeatured?: boolean;
  hasVariants?: boolean;
  search?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  publishedAfter?: Date;
  publishedBefore?: Date;
  priceMin?: number;
  priceMax?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductIncludeOptions {
  includeAttributeValues?: boolean;
  includeCategory?: boolean;
  includeBrand?: boolean;
  includeSeller?: boolean;
  includeVariants?: boolean;
  includeReviews?: boolean;
}

export interface ProductStatistics {
  totalProducts: number;
  draftProducts: number;
  submittedProducts: number;
  approvedProducts: number;
  publishedProducts: number;
  rejectedProducts: number;
  suspendedProducts: number;
  archivedProducts: number;
  featuredProducts: number;
  productsWithVariants: number;
  productsByCategory: Record<string, number>;
  productsByBrand: Record<string, number>;
  productsBySeller: Record<string, number>;
  lastUpdated: Date;
}

export interface BulkUpdateData {
  id: string;
  data: Partial<Product>;
  updatedBy: string;
}

export interface ProductValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductRepository {
  // Basic CRUD operations
  findAll(
    filters?: ProductFilters,
    pagination?: PaginationOptions,
    includes?: ProductIncludeOptions
  ): Promise<{ data: Product[]; total: number }>;

  findById(id: string, includes?: ProductIncludeOptions): Promise<Product | null>;
  findBySlug(slug: string, includes?: ProductIncludeOptions): Promise<Product | null>;
  findByIds(ids: string[], includes?: ProductIncludeOptions): Promise<Product[]>;

  create(data: Partial<Product>): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
  softDelete(id: string, deletedBy: string, reason?: string): Promise<void>;

  // Validation operations
  validateSlug(slug: string, excludeId?: string): Promise<boolean>;
  validateName(name: string, sellerId: string, excludeId?: string): Promise<boolean>;
  validateCategoryBrandCombination(categoryId: string, brandId: string): Promise<boolean>;

  // Status operations
  updateStatus(id: string, status: ProductStatus, updatedBy: string, reason?: string): Promise<Product>;
  updateModerationStatus(
    id: string, 
    moderationStatus: ProductModerationStatus, 
    moderatedBy: string, 
    notes?: string
  ): Promise<Product>;
  
  // Bulk operations
  bulkUpdateStatus(ids: string[], status: ProductStatus, updatedBy: string, reason?: string): Promise<Product[]>;
  bulkUpdate(updates: BulkUpdateData[]): Promise<Product[]>;
  bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void>;

  // Search operations
  searchByName(query: string, filters?: ProductFilters): Promise<Product[]>;
  searchByDescription(query: string, filters?: ProductFilters): Promise<Product[]>;
  fullTextSearch(query: string, filters?: ProductFilters): Promise<Product[]>;

  // Category operations
  findByCategory(categoryId: string, filters?: ProductFilters, pagination?: PaginationOptions): Promise<{ data: Product[]; total: number }>;
  findByCategoryTree(categoryId: string, includeDescendants?: boolean): Promise<Product[]>;
  updateCategory(id: string, categoryId: string, updatedBy: string, reason?: string): Promise<Product>;

  // Brand operations
  findByBrand(brandId: string, filters?: ProductFilters, pagination?: PaginationOptions): Promise<{ data: Product[]; total: number }>;
  updateBrand(id: string, brandId: string, updatedBy: string, reason?: string): Promise<Product>;

  // Seller operations
  findBySeller(sellerId: string, filters?: ProductFilters, pagination?: PaginationOptions): Promise<{ data: Product[]; total: number }>;
  getSellerStatistics(sellerId: string): Promise<ProductStatistics>;

  // Featured products
  findFeatured(filters?: ProductFilters, limit?: number): Promise<Product[]>;
  setFeatured(id: string, isFeatured: boolean, updatedBy: string): Promise<Product>;

  // Publishing operations
  findScheduledForPublishing(beforeDate?: Date): Promise<Product[]>;
  publish(id: string, publishedBy: string): Promise<Product>;
  unpublish(id: string, unpublishedBy: string, reason?: string): Promise<Product>;

  // Moderation operations
  findPendingModeration(limit?: number): Promise<Product[]>;
  findByModerationStatus(status: ProductModerationStatus): Promise<Product[]>;

  // Statistics and analytics
  getStatistics(): Promise<ProductStatistics>;
  getCategoryStatistics(categoryId: string): Promise<ProductStatistics>;
  getBrandStatistics(brandId: string): Promise<ProductStatistics>;

  // Maintenance operations
  cleanupDeletedProducts(olderThanDays?: number): Promise<number>;
  refreshStatistics(): Promise<void>;

  // Versioning operations
  incrementVersion(id: string): Promise<Product>;
  findByVersion(id: string, version: number): Promise<Product | null>;
}

export interface ProductAttributeValueRepository {
  // Basic CRUD operations
  findByProduct(productId: string, locale?: string): Promise<ProductAttributeValue[]>;
  findByProductAndAttribute(productId: string, attributeId: string, locale?: string): Promise<ProductAttributeValue | null>;
  
  create(data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue>;
  update(id: string, data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue>;
  upsert(data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue>;
  delete(id: string): Promise<void>;

  // Bulk operations
  createMany(values: Partial<ProductAttributeValue>[]): Promise<ProductAttributeValue[]>;
  updateMany(updates: { id: string; data: Partial<ProductAttributeValue> }[]): Promise<ProductAttributeValue[]>;
  deleteByProduct(productId: string): Promise<void>;
  deleteByAttribute(attributeId: string): Promise<void>;

  // Inheritance operations
  inheritFromCategory(productId: string, categoryId: string, createdBy: string): Promise<ProductAttributeValue[]>;
  resolveInheritance(productId: string): Promise<ProductAttributeValue[]>;
  overrideInheritedValue(id: string, newValue: any, updatedBy: string): Promise<ProductAttributeValue>;

  // Query operations
  findByAttributeValue(attributeId: string, value: any): Promise<ProductAttributeValue[]>;
  findProductsWithAttribute(attributeId: string, value?: any): Promise<string[]>;
  findVariantAttributes(productId: string): Promise<ProductAttributeValue[]>;

  // Validation operations
  validateAttributeValues(productId: string): Promise<ProductValidationResult>;
  validateRequiredAttributes(productId: string, categoryId: string): Promise<ProductValidationResult>;

  // Statistics
  getAttributeUsageCount(attributeId: string): Promise<number>;
  getValueDistribution(attributeId: string): Promise<Record<string, number>>;
}