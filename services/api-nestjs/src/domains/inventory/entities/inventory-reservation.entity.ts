import { ReservationStatus } from '../enums/reservation-status.enum';

export interface ReservationMetadata {
  cartId?: string;
  orderId?: string;
  customerId?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class InventoryReservation {
  id: string;
  inventoryId: string;
  
  // Reservation details
  quantity: number;
  reservationKey: string;
  
  // Expiry
  expiresAt: Date;
  isExpired: boolean;
  
  // Status
  status: ReservationStatus;
  
  // Reference information
  referenceType: string;
  referenceId: string;
  
  // Metadata
  metadata?: ReservationMetadata;
  
  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  constructor(data: Partial<InventoryReservation>) {
    Object.assign(this, data);
  }
  
  // Domain Methods
  isActive(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired;
  }
  
  isCommitted(): boolean {
    return this.status === ReservationStatus.COMMITTED;
  }
  
  isReleased(): boolean {
    return this.status === ReservationStatus.RELEASED;
  }
  
  hasExpired(): boolean {
    return this.isExpired || this.expiresAt < new Date();
  }
  
  canBeCommitted(): boolean {
    return this.isActive() && !this.hasExpired();
  }
  
  canBeReleased(): boolean {
    return this.isActive() || this.hasExpired();
  }
  
  getRemainingTime(): number {
    if (this.hasExpired()) {
      return 0;
    }
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }
  
  getRemainingTimeInMinutes(): number {
    return Math.floor(this.getRemainingTime() / (1000 * 60));
  }
  
  willExpireWithin(minutes: number): boolean {
    return this.getRemainingTimeInMinutes() <= minutes;
  }
  
  commit(): void {
    if (!this.canBeCommitted()) {
      throw new Error(`Cannot commit reservation in ${this.status} status or expired reservation`);
    }
    this.status = ReservationStatus.COMMITTED;
  }
  
  release(): void {
    if (!this.canBeReleased()) {
      throw new Error(`Cannot release reservation in ${this.status} status`);
    }
    this.status = ReservationStatus.RELEASED;
  }
  
  markExpired(): void {
    this.isExpired = true;
    this.status = ReservationStatus.EXPIRED;
  }
  
  updateMetadata(metadata: Partial<ReservationMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  getDisplayStatus(): string {
    if (this.hasExpired() && this.status === ReservationStatus.ACTIVE) {
      return 'EXPIRED';
    }
    return this.status;
  }
  
  // Validation
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate quantity
    if (this.quantity <= 0) {
      errors.push('Reservation quantity must be positive');
    }
    
    // Validate expiry
    if (this.expiresAt <= this.createdAt) {
      errors.push('Expiry date must be after creation date');
    }
    
    // Validate reservation key
    if (!this.reservationKey || this.reservationKey.trim().length === 0) {
      errors.push('Reservation key is required');
    }
    
    // Validate reference
    if (!this.referenceType || !this.referenceId) {
      errors.push('Reference type and ID are required');
    }
    
    // Validate status consistency
    if (this.hasExpired() && this.status === ReservationStatus.ACTIVE) {
      errors.push('Active reservation cannot be expired');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  // Factory methods
  static createCartReservation(data: {
    inventoryId: string;
    quantity: number;
    cartId: string;
    cartItemId: string;
    expiresAt: Date;
    createdBy: string;
    metadata?: ReservationMetadata;
  }): InventoryReservation {
    return new InventoryReservation({
      ...data,
      reservationKey: `cart_${data.cartItemId}`,
      referenceType: 'CART',
      referenceId: data.cartId,
      status: ReservationStatus.ACTIVE,
      isExpired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  static createOrderReservation(data: {
    inventoryId: string;
    quantity: number;
    orderId: string;
    orderItemId: string;
    expiresAt: Date;
    createdBy: string;
    metadata?: ReservationMetadata;
  }): InventoryReservation {
    return new InventoryReservation({
      ...data,
      reservationKey: `order_${data.orderItemId}`,
      referenceType: 'ORDER',
      referenceId: data.orderId,
      status: ReservationStatus.ACTIVE,
      isExpired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  static createQuoteReservation(data: {
    inventoryId: string;
    quantity: number;
    quoteId: string;
    quoteItemId: string;
    expiresAt: Date;
    createdBy: string;
    metadata?: ReservationMetadata;
  }): InventoryReservation {
    return new InventoryReservation({
      ...data,
      reservationKey: `quote_${data.quoteItemId}`,
      referenceType: 'QUOTE',
      referenceId: data.quoteId,
      status: ReservationStatus.ACTIVE,
      isExpired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}