import { ProductStatus } from '../enums/product-status.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';

// ============================================================================
// PRODUCT LIFECYCLE EVENTS
// ============================================================================

export class ProductCreatedEvent {
  static readonly eventName = 'product.created';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly categoryId: string,
    public readonly brandId: string,
    public readonly sellerId: string,
    public readonly status: ProductStatus,
    public readonly createdBy: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}

export class ProductUpdatedEvent {
  static readonly eventName = 'product.updated';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly updatedAt: Date = new Date(),
  ) {}
}

export class ProductDeletedEvent {
  static readonly eventName = 'product.deleted';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly deletedBy: string,
    public readonly reason?: string,
    public readonly deletedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT STATUS EVENTS
// ============================================================================

export class ProductStatusChangedEvent {
  static readonly eventName = 'product.status.changed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly fromStatus: ProductStatus,
    public readonly toStatus: ProductStatus,
    public readonly sellerId: string,
    public readonly changedBy: string,
    public readonly reason?: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}

export class ProductSubmittedEvent {
  static readonly eventName = 'product.submitted';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly submittedBy: string,
    public readonly submittedAt: Date = new Date(),
  ) {}
}

export class ProductApprovedEvent {
  static readonly eventName = 'product.approved';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly approvedBy: string,
    public readonly approvedAt: Date = new Date(),
  ) {}
}

export class ProductRejectedEvent {
  static readonly eventName = 'product.rejected';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly rejectedBy: string,
    public readonly reason?: string,
    public readonly rejectedAt: Date = new Date(),
  ) {}
}

export class ProductPublishedEvent {
  static readonly eventName = 'product.published';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly categoryId: string,
    public readonly brandId: string,
    public readonly sellerId: string,
    public readonly publishedBy: string,
    public readonly publishedAt: Date = new Date(),
  ) {}
}

export class ProductUnpublishedEvent {
  static readonly eventName = 'product.unpublished';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly unpublishedBy: string,
    public readonly reason?: string,
    public readonly unpublishedAt: Date = new Date(),
  ) {}
}

export class ProductSuspendedEvent {
  static readonly eventName = 'product.suspended';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly suspendedBy: string,
    public readonly reason?: string,
    public readonly suspendedAt: Date = new Date(),
  ) {}
}

export class ProductArchivedEvent {
  static readonly eventName = 'product.archived';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly archivedBy: string,
    public readonly reason?: string,
    public readonly archivedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT MODERATION EVENTS
// ============================================================================

export class ProductModerationStatusChangedEvent {
  static readonly eventName = 'product.moderation.status.changed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly fromStatus: ProductModerationStatus,
    public readonly toStatus: ProductModerationStatus,
    public readonly sellerId: string,
    public readonly moderatedBy: string,
    public readonly notes?: string,
    public readonly moderatedAt: Date = new Date(),
  ) {}
}

export class ProductFlaggedEvent {
  static readonly eventName = 'product.flagged';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly flaggedBy: string,
    public readonly reason: string,
    public readonly flaggedAt: Date = new Date(),
  ) {}
}

export class ProductModerationStartedEvent {
  static readonly eventName = 'product.moderation.started';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly moderatorId: string,
    public readonly startedAt: Date = new Date(),
  ) {}
}

export class ProductModerationCompletedEvent {
  static readonly eventName = 'product.moderation.completed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly moderatorId: string,
    public readonly decision: ProductModerationStatus,
    public readonly notes?: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT ATTRIBUTE EVENTS
// ============================================================================

export class ProductAttributeValueChangedEvent {
  static readonly eventName = 'product.attribute.value.changed';

  constructor(
    public readonly productId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly fromValue: any,
    public readonly toValue: any,
    public readonly locale: string,
    public readonly changedBy: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}

export class ProductAttributeInheritedEvent {
  static readonly eventName = 'product.attribute.inherited';

  constructor(
    public readonly productId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly value: any,
    public readonly inheritedFrom: string, // Category ID
    public readonly locale: string,
    public readonly inheritedAt: Date = new Date(),
  ) {}
}

export class ProductAttributeOverriddenEvent {
  static readonly eventName = 'product.attribute.overridden';

  constructor(
    public readonly productId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly inheritedValue: any,
    public readonly overriddenValue: any,
    public readonly locale: string,
    public readonly overriddenBy: string,
    public readonly overriddenAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT CATEGORY & BRAND EVENTS
// ============================================================================

export class ProductCategoryChangedEvent {
  static readonly eventName = 'product.category.changed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly fromCategoryId: string,
    public readonly toCategoryId: string,
    public readonly sellerId: string,
    public readonly changedBy: string,
    public readonly reason?: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}

export class ProductBrandChangedEvent {
  static readonly eventName = 'product.brand.changed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly fromBrandId: string,
    public readonly toBrandId: string,
    public readonly sellerId: string,
    public readonly changedBy: string,
    public readonly reason?: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT MEDIA EVENTS
// ============================================================================

export class ProductMediaAddedEvent {
  static readonly eventName = 'product.media.added';

  constructor(
    public readonly productId: string,
    public readonly mediaType: 'image' | 'video' | 'document',
    public readonly mediaUrl: string,
    public readonly addedBy: string,
    public readonly addedAt: Date = new Date(),
  ) {}
}

export class ProductMediaRemovedEvent {
  static readonly eventName = 'product.media.removed';

  constructor(
    public readonly productId: string,
    public readonly mediaType: 'image' | 'video' | 'document',
    public readonly mediaUrl: string,
    public readonly removedBy: string,
    public readonly removedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT FEATURE EVENTS
// ============================================================================

export class ProductFeaturedEvent {
  static readonly eventName = 'product.featured';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly featuredBy: string,
    public readonly featuredAt: Date = new Date(),
  ) {}
}

export class ProductUnfeaturedEvent {
  static readonly eventName = 'product.unfeatured';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sellerId: string,
    public readonly unfeaturedBy: string,
    public readonly unfeaturedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT VARIANT EVENTS
// ============================================================================

export class ProductVariantConfigurationChangedEvent {
  static readonly eventName = 'product.variant.configuration.changed';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly hasVariants: boolean,
    public readonly variantAttributes: string[],
    public readonly changedBy: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// BULK OPERATION EVENTS
// ============================================================================

export class ProductBulkOperationEvent {
  static readonly eventName = 'product.bulk.operation';

  constructor(
    public readonly operation: string,
    public readonly productIds: string[],
    public readonly changes: Record<string, any>,
    public readonly performedBy: string,
    public readonly batchId: string,
    public readonly reason?: string,
    public readonly performedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// PRODUCT CLONE EVENTS
// ============================================================================

export class ProductClonedEvent {
  static readonly eventName = 'product.cloned';

  constructor(
    public readonly originalProductId: string,
    public readonly clonedProductId: string,
    public readonly originalName: string,
    public readonly clonedName: string,
    public readonly sellerId: string,
    public readonly clonedBy: string,
    public readonly clonedAt: Date = new Date(),
  ) {}
}

// ============================================================================
// EVENT AGGREGATES FOR COMPLEX WORKFLOWS
// ============================================================================

export class ProductWorkflowCompletedEvent {
  static readonly eventName = 'product.workflow.completed';

  constructor(
    public readonly productId: string,
    public readonly workflowType:
      | 'submission'
      | 'approval'
      | 'publishing'
      | 'moderation',
    public readonly startStatus: ProductStatus | ProductModerationStatus,
    public readonly endStatus: ProductStatus | ProductModerationStatus,
    public readonly duration: number, // milliseconds
    public readonly completedBy: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}
