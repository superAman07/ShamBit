import { BrandStatus } from '../enums/brand-status.enum';
import { BrandScope } from '../enums/brand-scope.enum';

export interface BrandMetadata {
  foundedYear?: number;
  headquarters?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  certifications?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
}

export class Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  status: BrandStatus;

  // Classification
  scope: BrandScope;
  isVerified: boolean;

  // Ownership
  ownerId?: string;

  // Metadata
  metadata?: BrandMetadata;

  // Relationships
  categoryIds: string[];
  allowedCategories?: string[];
  restrictedCategories?: string[];

  // Audit fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;

  constructor(data: Partial<Brand>) {
    Object.assign(this, data);
  }

  // Domain methods
  get isGlobal(): boolean {
    return this.scope === BrandScope.GLOBAL;
  }

  isActive(): boolean {
    return this.status === BrandStatus.ACTIVE && !this.deletedAt;
  }

  canBeUsedBy(sellerId?: string): boolean {
    if (!this.isActive()) return false;
    return this.isGlobal || this.ownerId === sellerId;
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  activate(): void {
    if (this.status === BrandStatus.SUSPENDED) {
      throw new Error('Suspended brands cannot be activated directly');
    }
    this.status = BrandStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = BrandStatus.INACTIVE;
  }

  suspend(): void {
    this.status = BrandStatus.SUSPENDED;
  }

  softDelete(deletedBy: string): void {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.status = BrandStatus.INACTIVE;
  }

  updateMetadata(metadata: Partial<BrandMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}