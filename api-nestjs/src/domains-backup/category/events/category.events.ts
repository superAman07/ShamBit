// Category Domain Events - Following strict naming convention

export class CategoryCreatedEvent {
  static readonly eventName = 'category.created';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly categorySlug: string,
    public readonly parentId: string | null,
    public readonly path: string,
    public readonly depth: number,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryUpdatedEvent {
  static readonly eventName = 'category.updated';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryActivatedEvent {
  static readonly eventName = 'category.activated';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly path: string,
    public readonly activatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryDeactivatedEvent {
  static readonly eventName = 'category.deactivated';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly path: string,
    public readonly deactivatedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryArchivedEvent {
  static readonly eventName = 'category.archived';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly path: string,
    public readonly archivedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryDeletedEvent {
  static readonly eventName = 'category.deleted';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly path: string,
    public readonly deletedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryMovedEvent {
  static readonly eventName = 'category.moved';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly oldPath: string,
    public readonly newPath: string,
    public readonly oldParentId: string | null,
    public readonly newParentId: string | null,
    public readonly affectedDescendants: number,
    public readonly movedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryTreeRebuiltEvent {
  static readonly eventName = 'category.tree.rebuilt';
  
  constructor(
    public readonly rootCategoryId: string,
    public readonly affectedCategories: number,
    public readonly rebuiltBy: string,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Attribute Events
export class CategoryAttributeCreatedEvent {
  static readonly eventName = 'category.attribute.created';
  
  constructor(
    public readonly categoryId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly attributeSlug: string,
    public readonly attributeType: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryAttributeUpdatedEvent {
  static readonly eventName = 'category.attribute.updated';
  
  constructor(
    public readonly categoryId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryAttributeDeletedEvent {
  static readonly eventName = 'category.attribute.deleted';
  
  constructor(
    public readonly categoryId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly deletedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryAttributeInheritedEvent {
  static readonly eventName = 'category.attribute.inherited';
  
  constructor(
    public readonly sourceCategoryId: string,
    public readonly targetCategoryId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly inheritedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryAttributeOverriddenEvent {
  static readonly eventName = 'category.attribute.overridden';
  
  constructor(
    public readonly categoryId: string,
    public readonly attributeId: string,
    public readonly attributeName: string,
    public readonly overriddenValues: Record<string, any>,
    public readonly overriddenBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Brand Integration Events
export class CategoryBrandConstraintUpdatedEvent {
  static readonly eventName = 'category.brand.constraint.updated';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly allowedBrands: string[],
    public readonly restrictedBrands: string[],
    public readonly requiresBrand: boolean,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Performance Events
export class CategoryStatisticsUpdatedEvent {
  static readonly eventName = 'category.statistics.updated';
  
  constructor(
    public readonly categoryId: string,
    public readonly childCount: number,
    public readonly descendantCount: number,
    public readonly productCount: number,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CategoryCacheInvalidatedEvent {
  static readonly eventName = 'category.cache.invalidated';
  
  constructor(
    public readonly categoryIds: string[],
    public readonly cacheKeys: string[],
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Legacy events for backward compatibility
export class CategoryStatusChangedEvent {
  static readonly eventName = 'category.status.changed';
  
  constructor(
    public readonly categoryId: string,
    public readonly categoryName: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly reason?: string,
    public readonly updatedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Bulk operation events
export class CategoryBulkOperationCompletedEvent {
  static readonly eventName = 'category.bulk.operation.completed';
  
  constructor(
    public readonly operation: string, // 'CREATE', 'UPDATE', 'DELETE', 'MOVE'
    public readonly categoryIds: string[],
    public readonly successCount: number,
    public readonly failureCount: number,
    public readonly errors: string[],
    public readonly executedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}