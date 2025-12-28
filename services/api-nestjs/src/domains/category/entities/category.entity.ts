import { CategoryStatus } from '../enums/category-status.enum';
import { CategoryVisibility } from '../enums/category-visibility.enum';

export interface CategoryMetadata {
  tags?: string[];
  customFields?: Record<string, any>;
  externalIds?: Record<string, string>; // Integration with external systems
  importSource?: string;
  lastSyncAt?: Date;
}

export class Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Tree structure
  parentId?: string;
  path: string;
  pathIds: string[];
  depth: number;
  
  // Tree statistics
  childCount: number;
  descendantCount: number;
  productCount: number;
  
  // Category properties
  status: CategoryStatus;
  visibility: CategoryVisibility;
  
  // SEO and metadata
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  metadata?: CategoryMetadata;
  
  // Display properties
  iconUrl?: string;
  bannerUrl?: string;
  displayOrder: number;
  isLeaf: boolean;
  isFeatured: boolean;
  
  // Brand constraints
  allowedBrands: string[];
  restrictedBrands: string[];
  requiresBrand: boolean;
  
  // Audit fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;

  constructor(data: Partial<Category>) {
    Object.assign(this, data);
  }

  // Domain methods
  isActive(): boolean {
    return this.status === CategoryStatus.ACTIVE && !this.deletedAt;
  }

  isVisible(): boolean {
    return [CategoryStatus.ACTIVE, CategoryStatus.INACTIVE].includes(this.status) && !this.deletedAt;
  }

  canHaveProducts(): boolean {
    return this.isLeaf && this.status === CategoryStatus.ACTIVE;
  }

  canHaveChildren(): boolean {
    return !this.isLeaf || this.childCount === 0;
  }

  isRoot(): boolean {
    return !this.parentId;
  }

  isDescendantOf(ancestorId: string): boolean {
    return this.pathIds.includes(ancestorId);
  }

  isAncestorOf(descendantPathIds: string[]): boolean {
    return descendantPathIds.includes(this.id);
  }

  getLevel(): number {
    return this.depth;
  }

  getBreadcrumb(): string[] {
    return this.path.split('/').filter(Boolean);
  }

  canBrandBeUsed(brandId: string): boolean {
    // If allowed brands are specified, brand must be in the list
    if (this.allowedBrands.length > 0) {
      if (!this.allowedBrands.includes(brandId)) {
        return false;
      }
    }

    // If restricted brands are specified, brand must not be in the list
    if (this.restrictedBrands.length > 0) {
      if (this.restrictedBrands.includes(brandId)) {
        return false;
      }
    }

    return true;
  }

  validateBrandRequirement(brandId?: string): boolean {
    if (this.requiresBrand && !brandId) {
      return false;
    }
    return true;
  }

  activate(): void {
    if (this.status === CategoryStatus.ARCHIVED) {
      throw new Error('Archived categories cannot be activated');
    }
    this.status = CategoryStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = CategoryStatus.INACTIVE;
  }

  archive(): void {
    this.status = CategoryStatus.ARCHIVED;
  }

  softDelete(deletedBy: string): void {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.status = CategoryStatus.ARCHIVED;
  }

  updateMetadata(metadata: Partial<CategoryMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  updatePath(newPath: string, newPathIds: string[], newDepth: number): void {
    this.path = newPath;
    this.pathIds = newPathIds;
    this.depth = newDepth;
  }

  updateTreeStatistics(childCount: number, descendantCount: number, productCount: number): void {
    this.childCount = childCount;
    this.descendantCount = descendantCount;
    this.productCount = productCount;
  }
}