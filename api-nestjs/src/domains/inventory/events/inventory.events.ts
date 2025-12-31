// Inventory Domain Events - Following strict naming convention

export class InventoryCreatedEvent {
  static readonly eventName = 'inventory.created';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryUpdatedEvent {
  static readonly eventName = 'inventory.updated';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryAdjustedEvent {
  static readonly eventName = 'inventory.adjusted';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    public readonly adjustment: number,
    public readonly reason: string,
    public readonly adjustedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryReservedEvent {
  static readonly eventName = 'inventory.reserved';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly quantity: number,
    public readonly reservationKey: string,
    public readonly reservedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryReleasedEvent {
  static readonly eventName = 'inventory.released';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly quantity: number,
    public readonly reservationKey: string,
    public readonly releasedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryCommittedEvent {
  static readonly eventName = 'inventory.committed';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly quantity: number,
    public readonly reservationKey: string,
    public readonly committedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryLowStockEvent {
  static readonly eventName = 'inventory.low_stock';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly currentQuantity: number,
    public readonly threshold: number,
    public readonly triggeredBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryOutOfStockEvent {
  static readonly eventName = 'inventory.out_of_stock';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly currentQuantity: number,
    public readonly triggeredBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryRestockedEvent {
  static readonly eventName = 'inventory.restocked';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly quantityAdded: number,
    public readonly restockedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryMovementEvent {
  static readonly eventName = 'inventory.movement';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly movementType:
      | 'INBOUND'
      | 'OUTBOUND'
      | 'ADJUSTMENT'
      | 'RESERVATION'
      | 'RELEASE',
    public readonly quantity: number,
    public readonly runningBalance: number,
    public readonly referenceType?: string,
    public readonly referenceId?: string,
    public readonly reason?: string,
    public readonly createdBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryBulkAdjustmentEvent {
  static readonly eventName = 'inventory.bulk.adjustment';

  constructor(
    public readonly sellerId: string,
    public readonly itemsProcessed: number,
    public readonly itemsSuccessful: number,
    public readonly itemsFailed: number,
    public readonly reason: string,
    public readonly adjustedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryReconciliationEvent {
  static readonly eventName = 'inventory.reconciliation';

  constructor(
    public readonly inventoryId: string,
    public readonly variantId: string,
    public readonly sellerId: string,
    public readonly discrepancies: {
      totalQuantity: { expected: number; actual: number };
      reservedQuantity: { expected: number; actual: number };
      availableQuantity: { expected: number; actual: number };
    },
    public readonly reconciledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
