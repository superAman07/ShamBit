import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';
import { ProductAttributeValue } from './product-attribute-value.entity';

export interface ProductMetadata {
  // SEO Configuration
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];

  // Marketing
  marketingTags?: string[];
  promotionalText?: string;

  // Technical
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };

  // Shipping
  shippingClass?: string;
  requiresShipping?: boolean;

  // Custom fields
  customFields?: Record<string, any>;
}

export class Product {
  id: string;

  // Basic Information
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;

  // Relationships (Required)
  categoryId: string;
  brandId: string;
  sellerId: string;

  // Product Lifecycle
  status: ProductStatus;
  visibility: ProductVisibility;

  // Moderation & Approval
  moderationStatus: ProductModerationStatus;
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;

  // Publishing Control
  publishedAt?: Date;
  scheduledPublishAt?: Date;

  // SEO & Marketing
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  metaData?: ProductMetadata;

  // Media
  images: string[];
  videos: string[];
  documents: string[];

  // Organization
  tags: string[];
  displayOrder: number;
  isFeatured: boolean;

  // Variant Configuration
  hasVariants: boolean;
  variantAttributes: string[]; // Attribute IDs that drive variants

  // Versioning & Concurrency
  version: number;

  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;

  // Relationships
  attributeValues?: ProductAttributeValue[];

  // Computed Properties
  get isPublished(): boolean {
    return this.status === ProductStatus.PUBLISHED;
  }

  get isDraft(): boolean {
    return this.status === ProductStatus.DRAFT;
  }

  get isApproved(): boolean {
    return this.moderationStatus === ProductModerationStatus.APPROVED;
  }

  get needsModeration(): boolean {
    return [
      ProductModerationStatus.PENDING,
      ProductModerationStatus.REVIEWING,
      ProductModerationStatus.FLAGGED,
    ].includes(this.moderationStatus);
  }

  get isVisible(): boolean {
    return (
      this.status === ProductStatus.PUBLISHED &&
      this.moderationStatus === ProductModerationStatus.APPROVED
    );
  }

  get canBeEdited(): boolean {
    return [ProductStatus.DRAFT, ProductStatus.REJECTED].includes(this.status);
  }

  get canBePublished(): boolean {
    return (
      this.status === ProductStatus.APPROVED &&
      this.moderationStatus === ProductModerationStatus.APPROVED
    );
  }

  get canBeDeleted(): boolean {
    return [ProductStatus.DRAFT, ProductStatus.REJECTED].includes(this.status);
  }

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get hasMedia(): boolean {
    return this.images.length > 0 || this.videos.length > 0;
  }

  get primaryImage(): string | undefined {
    return this.images[0];
  }

  get isScheduledForPublishing(): boolean {
    return !!this.scheduledPublishAt && this.scheduledPublishAt > new Date();
  }

  // Status Management Methods
  canTransitionTo(newStatus: ProductStatus): boolean {
    const { canTransitionTo } = require('../enums/product-status.enum');
    return canTransitionTo(this.status, newStatus);
  }

  getAvailableStatusTransitions(): ProductStatus[] {
    const { getAvailableTransitions } = require('../enums/product-status.enum');
    return getAvailableTransitions(this.status);
  }

  canModerationTransitionTo(
    newModerationStatus: ProductModerationStatus,
  ): boolean {
    const {
      canModerationTransitionTo,
    } = require('../enums/product-moderation-status.enum');
    return canModerationTransitionTo(
      this.moderationStatus,
      newModerationStatus,
    );
  }

  // Permission Methods
  canUserView(userRole: string, userId?: string): boolean {
    const { canUserViewProduct } = require('../enums/product-visibility.enum');
    const isOwner = userId === this.sellerId;
    return canUserViewProduct(this.visibility, userRole as any, isOwner);
  }

  canUserEdit(userRole: string, userId?: string): boolean {
    const isOwner = userId === this.sellerId;
    const isAdmin = userRole === 'ADMIN';

    // Only owners can edit their products (and only in editable states)
    // Admins can always edit
    return (isOwner && this.canBeEdited) || isAdmin;
  }

  canUserModerate(userRole: string): boolean {
    return userRole === 'ADMIN' || userRole === 'MODERATOR';
  }

  canUserPublish(userRole: string, userId?: string): boolean {
    const isOwner = userId === this.sellerId;
    const isAdmin = userRole === 'ADMIN';

    // Owners can publish if product is approved
    // Admins can always publish
    return (isOwner && this.canBePublished) || isAdmin;
  }

  canUserDelete(userRole: string, userId?: string): boolean {
    const isOwner = userId === this.sellerId;
    const isAdmin = userRole === 'ADMIN';

    // Only owners can delete their own products (in deletable states)
    // Admins can always delete
    return (isOwner && this.canBeDeleted) || isAdmin;
  }

  // Attribute Methods
  getAttributeValue(attributeId: string, locale: string = 'en'): any {
    const attributeValue = this.attributeValues?.find(
      (av) => av.attributeId === attributeId && av.locale === locale,
    );
    return attributeValue?.getValue();
  }

  hasAttributeValue(attributeId: string, locale: string = 'en'): boolean {
    const attributeValue = this.attributeValues?.find(
      (av) => av.attributeId === attributeId && av.locale === locale,
    );
    return attributeValue?.hasValue || false;
  }

  getVariantAttributeValues(): Record<string, any> {
    if (!this.hasVariants || !this.attributeValues) {
      return {};
    }

    const variantValues: Record<string, any> = {};

    for (const attributeId of this.variantAttributes) {
      const value = this.getAttributeValue(attributeId);
      if (value !== undefined) {
        variantValues[attributeId] = value;
      }
    }

    return variantValues;
  }

  // Media Methods
  addImage(imageUrl: string): void {
    if (!this.images.includes(imageUrl)) {
      this.images.push(imageUrl);
    }
  }

  removeImage(imageUrl: string): void {
    const index = this.images.indexOf(imageUrl);
    if (index > -1) {
      this.images.splice(index, 1);
    }
  }

  reorderImages(imageUrls: string[]): void {
    // Validate that all URLs exist in current images
    const validUrls = imageUrls.filter((url) => this.images.includes(url));
    this.images = validUrls;
  }

  // SEO Methods
  getEffectiveSeoTitle(): string {
    return this.seoTitle || this.name;
  }

  getEffectiveSeoDescription(): string {
    return (
      this.seoDescription || this.shortDescription || this.description || ''
    );
  }

  // Validation Methods
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!this.categoryId) {
      errors.push('Category is required');
    }

    if (!this.brandId) {
      errors.push('Brand is required');
    }

    if (!this.sellerId) {
      errors.push('Seller is required');
    }

    // Name length validation
    if (this.name && this.name.length > 200) {
      errors.push('Product name cannot exceed 200 characters');
    }

    // Description length validation
    if (this.description && this.description.length > 5000) {
      errors.push('Product description cannot exceed 5000 characters');
    }

    if (this.shortDescription && this.shortDescription.length > 500) {
      errors.push('Short description cannot exceed 500 characters');
    }

    // SEO validation
    if (this.seoTitle && this.seoTitle.length > 60) {
      errors.push('SEO title should not exceed 60 characters');
    }

    if (this.seoDescription && this.seoDescription.length > 160) {
      errors.push('SEO description should not exceed 160 characters');
    }

    // Variant validation
    if (this.hasVariants && this.variantAttributes.length === 0) {
      errors.push(
        'Products with variants must have at least one variant attribute',
      );
    }

    if (!this.hasVariants && this.variantAttributes.length > 0) {
      errors.push('Products without variants cannot have variant attributes');
    }

    // Media validation
    if (this.images.length === 0) {
      errors.push('At least one product image is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Utility Methods
  clone(): Product {
    const cloned = new Product();

    // Copy all properties
    Object.assign(cloned, {
      ...this,
      images: [...this.images],
      videos: [...this.videos],
      documents: [...this.documents],
      tags: [...this.tags],
      seoKeywords: [...this.seoKeywords],
      variantAttributes: [...this.variantAttributes],
      metaData: this.metaData
        ? JSON.parse(JSON.stringify(this.metaData))
        : undefined,
    });

    // Generate new ID for clone
    cloned.id = `${this.id}_copy_${Date.now()}`;
    cloned.slug = `${this.slug}-copy-${Date.now()}`;
    cloned.status = ProductStatus.DRAFT;
    cloned.moderationStatus = ProductModerationStatus.PENDING;
    cloned.publishedAt = undefined;
    cloned.version = 1;

    return cloned;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      shortDescription: this.shortDescription,
      categoryId: this.categoryId,
      brandId: this.brandId,
      sellerId: this.sellerId,
      status: this.status,
      visibility: this.visibility,
      moderationStatus: this.moderationStatus,
      moderationNotes: this.moderationNotes,
      moderatedBy: this.moderatedBy,
      moderatedAt: this.moderatedAt,
      publishedAt: this.publishedAt,
      scheduledPublishAt: this.scheduledPublishAt,
      seoTitle: this.seoTitle,
      seoDescription: this.seoDescription,
      seoKeywords: this.seoKeywords,
      metaData: this.metaData,
      images: this.images,
      videos: this.videos,
      documents: this.documents,
      tags: this.tags,
      displayOrder: this.displayOrder,
      isFeatured: this.isFeatured,
      hasVariants: this.hasVariants,
      variantAttributes: this.variantAttributes,
      version: this.version,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy,
      // Computed properties
      isPublished: this.isPublished,
      isDraft: this.isDraft,
      isApproved: this.isApproved,
      needsModeration: this.needsModeration,
      isVisible: this.isVisible,
      canBeEdited: this.canBeEdited,
      canBePublished: this.canBePublished,
      canBeDeleted: this.canBeDeleted,
      isDeleted: this.isDeleted,
      hasMedia: this.hasMedia,
      primaryImage: this.primaryImage,
      isScheduledForPublishing: this.isScheduledForPublishing,
    };
  }
}
