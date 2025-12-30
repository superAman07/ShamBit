export enum LedgerEntryType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum ReferenceType {
  ORDER = 'ORDER',
  REFUND = 'REFUND',
  ADMIN = 'ADMIN',
  IMPORT = 'IMPORT',
  RESERVATION = 'RESERVATION',
  TRANSFER = 'TRANSFER',
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  FOUND = 'FOUND',
}

export interface LedgerMetadata {
  orderId?: string;
  orderItemId?: string;
  refundId?: string;
  transferId?: string;
  importBatchId?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class InventoryLedger {
  id: string;
  inventoryId: string;
  
  // Movement details
  type: LedgerEntryType;
  quantity: number; // Positive for inbound, negative for outbound
  runningBalance: number;
  
  // Reference information
  referenceType?: ReferenceType;
  referenceId?: string;
  
  // Context
  reason?: string;
  metadata?: LedgerMetadata;
  
  // System Fields
  createdBy: string;
  createdAt: Date;
  
  constructor(data: Partial<InventoryLedger>) {
    Object.assign(this, data);
  }
  
  // Domain Methods
  isInbound(): boolean {
    return this.type === LedgerEntryType.INBOUND || this.quantity > 0;
  }
  
  isOutbound(): boolean {
    return this.type === LedgerEntryType.OUTBOUND || this.quantity < 0;
  }
  
  isReservation(): boolean {
    return this.type === LedgerEntryType.RESERVATION;
  }
  
  isRelease(): boolean {
    return this.type === LedgerEntryType.RELEASE;
  }
  
  isAdjustment(): boolean {
    return this.type === LedgerEntryType.ADJUSTMENT;
  }
  
  getAbsoluteQuantity(): number {
    return Math.abs(this.quantity);
  }
  
  getMovementDirection(): 'IN' | 'OUT' | 'NEUTRAL' {
    if (this.quantity > 0) return 'IN';
    if (this.quantity < 0) return 'OUT';
    return 'NEUTRAL';
  }
  
  hasReference(): boolean {
    return !!(this.referenceType && this.referenceId);
  }
  
  isOrderRelated(): boolean {
    return this.referenceType === ReferenceType.ORDER;
  }
  
  isRefundRelated(): boolean {
    return this.referenceType === ReferenceType.REFUND;
  }
  
  isAdminAction(): boolean {
    return this.referenceType === ReferenceType.ADMIN;
  }
  
  getDisplayReason(): string {
    if (this.reason) {
      return this.reason;
    }
    
    // Generate default reason based on type and reference
    switch (this.type) {
      case LedgerEntryType.INBOUND:
        if (this.referenceType === ReferenceType.IMPORT) {
          return 'Stock imported';
        }
        if (this.referenceType === ReferenceType.REFUND) {
          return 'Stock returned from refund';
        }
        return 'Stock added';
        
      case LedgerEntryType.OUTBOUND:
        if (this.referenceType === ReferenceType.ORDER) {
          return 'Stock sold';
        }
        if (this.referenceType === ReferenceType.DAMAGE) {
          return 'Stock damaged';
        }
        if (this.referenceType === ReferenceType.LOSS) {
          return 'Stock lost';
        }
        return 'Stock removed';
        
      case LedgerEntryType.RESERVATION:
        return 'Stock reserved';
        
      case LedgerEntryType.RELEASE:
        return 'Reservation released';
        
      case LedgerEntryType.ADJUSTMENT:
        return 'Stock adjusted';
        
      default:
        return 'Stock movement';
    }
  }
  
  updateMetadata(metadata: Partial<LedgerMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  // Validation
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate quantity based on type
    switch (this.type) {
      case LedgerEntryType.INBOUND:
        if (this.quantity <= 0) {
          errors.push('Inbound entries must have positive quantity');
        }
        break;
        
      case LedgerEntryType.OUTBOUND:
        if (this.quantity >= 0) {
          errors.push('Outbound entries must have negative quantity');
        }
        break;
        
      case LedgerEntryType.RESERVATION:
        if (this.quantity >= 0) {
          errors.push('Reservation entries must have negative quantity');
        }
        break;
        
      case LedgerEntryType.RELEASE:
        if (this.quantity <= 0) {
          errors.push('Release entries must have positive quantity');
        }
        break;
    }
    
    // Validate reference consistency
    if (this.referenceType && !this.referenceId) {
      errors.push('Reference ID is required when reference type is specified');
    }
    
    if (!this.referenceType && this.referenceId) {
      errors.push('Reference type is required when reference ID is specified');
    }
    
    // Validate running balance
    if (this.runningBalance < 0) {
      errors.push('Running balance cannot be negative');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  // Factory methods for common entry types
  static createInboundEntry(data: {
    inventoryId: string;
    quantity: number;
    runningBalance: number;
    referenceType?: ReferenceType;
    referenceId?: string;
    reason?: string;
    createdBy: string;
    metadata?: LedgerMetadata;
  }): InventoryLedger {
    return new InventoryLedger({
      ...data,
      type: LedgerEntryType.INBOUND,
      quantity: Math.abs(data.quantity), // Ensure positive
      createdAt: new Date(),
    });
  }
  
  static createOutboundEntry(data: {
    inventoryId: string;
    quantity: number;
    runningBalance: number;
    referenceType?: ReferenceType;
    referenceId?: string;
    reason?: string;
    createdBy: string;
    metadata?: LedgerMetadata;
  }): InventoryLedger {
    return new InventoryLedger({
      ...data,
      type: LedgerEntryType.OUTBOUND,
      quantity: -Math.abs(data.quantity), // Ensure negative
      createdAt: new Date(),
    });
  }
  
  static createReservationEntry(data: {
    inventoryId: string;
    quantity: number;
    runningBalance: number;
    referenceId: string;
    reason?: string;
    createdBy: string;
    metadata?: LedgerMetadata;
  }): InventoryLedger {
    return new InventoryLedger({
      ...data,
      type: LedgerEntryType.RESERVATION,
      referenceType: ReferenceType.RESERVATION,
      quantity: -Math.abs(data.quantity), // Ensure negative
      createdAt: new Date(),
    });
  }
  
  static createReleaseEntry(data: {
    inventoryId: string;
    quantity: number;
    runningBalance: number;
    referenceId: string;
    reason?: string;
    createdBy: string;
    metadata?: LedgerMetadata;
  }): InventoryLedger {
    return new InventoryLedger({
      ...data,
      type: LedgerEntryType.RELEASE,
      referenceType: ReferenceType.RESERVATION,
      quantity: Math.abs(data.quantity), // Ensure positive
      createdAt: new Date(),
    });
  }
  
  static createAdjustmentEntry(data: {
    inventoryId: string;
    quantity: number;
    runningBalance: number;
    reason: string;
    createdBy: string;
    metadata?: LedgerMetadata;
  }): InventoryLedger {
    return new InventoryLedger({
      ...data,
      type: LedgerEntryType.ADJUSTMENT,
      referenceType: ReferenceType.ADMIN,
      createdAt: new Date(),
    });
  }
}