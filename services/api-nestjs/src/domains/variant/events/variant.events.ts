// Variant Domain Events - Following strict naming convention

export class VariantCreatedEvent {
  static readonly eventName = 'variant.created';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantUpdatedEvent {
  static readonly eventName = 'variant.updated';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantDeletedEvent {
  static readonly eventName = 'variant.deleted';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly deletedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantStatusChangedEvent {
  static readonly eventName = 'variant.status.changed';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantActivatedEvent {
  static readonly eventName = 'variant.activated';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly activatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantDisabledEvent {
  static readonly eventName = 'variant.disabled';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly disabledBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantArchivedEvent {
  static readonly eventName = 'variant.archived';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly archivedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantBulkGeneratedEvent {
  static readonly eventName = 'variant.bulk.generated';
  
  constructor(
    public readonly productId: string,
    public readonly variantsCreated: number,
    public readonly variantsUpdated: number,
    public readonly variantsSkipped: number,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class VariantStockChangedEvent {
  static readonly eventName = 'variant.stock.changed';
  
  constructor(
    public readonly variantId: string,
    public readonly sku: string,
    public readonly productId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    public readonly changeType: 'INCREASE' | 'DECREASE' | 'RESERVATION' | 'RELEASE',
    public readonly reason: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}