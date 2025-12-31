import { InventoryLedger } from './inventory-ledger.entity';
import { InventoryReservation } from './inventory-reservation.entity';

export interface InventoryMetadata {
  lastCountDate?: Date;
  lastCountBy?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class Inventory {
  id: string;
  variantId: string;
  sellerId: string;
  warehouseId?: string;

  // Quantities (derived from ledger)
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;

  // Thresholds
  lowStockThreshold?: number;
  outOfStockThreshold?: number;

  // Metadata
  metadata?: InventoryMetadata;

  // Versioning
  version: number;

  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;

  // Relations
  ledgerEntries?: InventoryLedger[];
  reservations?: InventoryReservation[];

  constructor(data: Partial<Inventory>) {
    Object.assign(this, data);
  }

  // Domain Methods
  isActive(): boolean {
    return !this.deletedAt;
  }

  isInStock(): boolean {
    return this.availableQuantity > (this.outOfStockThreshold || 0);
  }

  isLowStock(): boolean {
    return this.availableQuantity <= (this.lowStockThreshold || 10);
  }

  canReserve(quantity: number): boolean {
    return this.availableQuantity >= quantity;
  }

  canFulfill(quantity: number): boolean {
    return this.availableQuantity >= quantity;
  }

  getStockStatus(): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (!this.isInStock()) {
      return 'OUT_OF_STOCK';
    }
    if (this.isLowStock()) {
      return 'LOW_STOCK';
    }
    return 'IN_STOCK';
  }

  calculateTotalQuantity(): number {
    return this.availableQuantity + this.reservedQuantity;
  }

  validateQuantities(): boolean {
    // Ensure quantities are consistent
    return (
      this.availableQuantity >= 0 &&
      this.reservedQuantity >= 0 &&
      this.totalQuantity === this.availableQuantity + this.reservedQuantity
    );
  }

  updateQuantities(available: number, reserved: number): void {
    if (available < 0 || reserved < 0) {
      throw new Error('Quantities cannot be negative');
    }

    this.availableQuantity = available;
    this.reservedQuantity = reserved;
    this.totalQuantity = available + reserved;
  }

  incrementVersion(): void {
    this.version += 1;
  }

  updateMetadata(metadata: Partial<InventoryMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  setThresholds(lowStock?: number, outOfStock?: number): void {
    if (lowStock !== undefined && lowStock < 0) {
      throw new Error('Low stock threshold cannot be negative');
    }
    if (outOfStock !== undefined && outOfStock < 0) {
      throw new Error('Out of stock threshold cannot be negative');
    }
    if (
      lowStock !== undefined &&
      outOfStock !== undefined &&
      lowStock < outOfStock
    ) {
      throw new Error(
        'Low stock threshold cannot be less than out of stock threshold',
      );
    }

    this.lowStockThreshold = lowStock;
    this.outOfStockThreshold = outOfStock;
  }

  getActiveReservations(): InventoryReservation[] {
    return this.reservations?.filter((r) => r.isActive()) || [];
  }

  getExpiredReservations(): InventoryReservation[] {
    return this.reservations?.filter((r) => r.hasExpired()) || [];
  }

  getTotalReservedQuantity(): number {
    return this.getActiveReservations().reduce(
      (total, reservation) => total + reservation.quantity,
      0,
    );
  }

  hasReservation(reservationKey: string): boolean {
    return (
      this.reservations?.some(
        (r) => r.reservationKey === reservationKey && r.isActive(),
      ) || false
    );
  }

  getReservation(reservationKey: string): InventoryReservation | undefined {
    return this.reservations?.find((r) => r.reservationKey === reservationKey);
  }

  // Stock level warnings
  shouldTriggerLowStockAlert(): boolean {
    return this.isLowStock() && this.lowStockThreshold !== null;
  }

  shouldTriggerOutOfStockAlert(): boolean {
    return !this.isInStock();
  }

  // Ledger analysis
  getLastMovement(): InventoryLedger | undefined {
    return this.ledgerEntries?.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
  }

  getMovementsSince(date: Date): InventoryLedger[] {
    return this.ledgerEntries?.filter((entry) => entry.createdAt >= date) || [];
  }

  getMovementsByType(type: string): InventoryLedger[] {
    return this.ledgerEntries?.filter((entry) => entry.type === type) || [];
  }

  calculateRunningBalance(): number {
    if (!this.ledgerEntries?.length) {
      return 0;
    }

    return this.ledgerEntries
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .reduce((balance, entry) => balance + entry.quantity, 0);
  }

  // Validation methods
  validateConsistency(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check quantity consistency
    if (!this.validateQuantities()) {
      errors.push('Quantity values are inconsistent');
    }

    // Check if calculated reserved quantity matches actual reservations
    const calculatedReserved = this.getTotalReservedQuantity();
    if (calculatedReserved !== this.reservedQuantity) {
      errors.push(
        `Reserved quantity mismatch: expected ${calculatedReserved}, got ${this.reservedQuantity}`,
      );
    }

    // Check if ledger balance matches total quantity
    const ledgerBalance = this.calculateRunningBalance();
    if (ledgerBalance !== this.totalQuantity) {
      errors.push(
        `Ledger balance mismatch: expected ${this.totalQuantity}, got ${ledgerBalance}`,
      );
    }

    // Check threshold consistency
    if (
      this.lowStockThreshold !== undefined &&
      this.outOfStockThreshold !== undefined &&
      this.lowStockThreshold < this.outOfStockThreshold
    ) {
      errors.push(
        'Low stock threshold cannot be less than out of stock threshold',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
