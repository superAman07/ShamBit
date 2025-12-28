import { BadRequestException } from '@nestjs/common';
import { Inventory } from './entities/inventory.entity';
import { InventoryLedger } from './entities/inventory-ledger.entity';

export class InventoryValidators {
  
  // ============================================================================
  // CRITICAL SAFETY INVARIANTS - NEVER BYPASS THESE
  // ============================================================================
  
  /**
   * SAFETY: Stock is NEVER mutated directly - only through ledger
   */
  static validateStockIncrease(quantity: number): void {
    if (quantity <= 0) {
      throw new BadRequestException('Stock increase quantity must be positive');
    }
    if (!Number.isInteger(quantity)) {
      throw new BadRequestException('Stock quantity must be an integer');
    }
    if (quantity > 1000000) {
      throw new BadRequestException('Stock increase too large - maximum 1,000,000 per operation');
    }
  }

  /**
   * SAFETY: Cannot decrease more than available (prevent overselling)
   */
  static validateStockDecrease(quantity: number, availableQuantity: number): void {
    if (quantity <= 0) {
      throw new BadRequestException('Stock decrease quantity must be positive');
    }
    if (!Number.isInteger(quantity)) {
      throw new BadRequestException('Stock quantity must be an integer');
    }
    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Cannot decrease stock by ${quantity}. Only ${availableQuantity} available.`
      );
    }
  }

  /**
   * SAFETY: Stock adjustments must be valid
   */
  static validateStockAdjustment(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }
    if (!Number.isInteger(newQuantity)) {
      throw new BadRequestException('Stock quantity must be an integer');
    }
    if (newQuantity > 10000000) {
      throw new BadRequestException('Stock quantity too large - maximum 10,000,000');
    }
  }

  /**
   * SAFETY: Reservation must exist before order creation succeeds
   */
  static validateReservationExists(reservationKey: string): void {
    if (!reservationKey || reservationKey.trim().length === 0) {
      throw new BadRequestException('Inventory reservation is required before order creation');
    }
  }

  /**
   * SAFETY: Reservation → commit only once (idempotent)
   */
  static validateReservationCommitIdempotency(reservation: any): void {
    if (reservation.status === 'COMMITTED') {
      throw new BadRequestException('Reservation has already been committed');
    }
    
    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot commit reservation in ${reservation.status} status`);
    }
  }

  /**
   * SAFETY: Cannot reduce inventory below zero
   */
  static validateInventoryNonNegative(currentQuantity: number, reduction: number): void {
    if (currentQuantity - reduction < 0) {
      throw new BadRequestException(
        `Cannot reduce inventory below zero. Current: ${currentQuantity}, Attempted reduction: ${reduction}`
      );
    }
  }

  /**
   * SAFETY: Derived quantities must be consistent (available = total - reserved)
   */
  static validateInventoryConsistency(inventory: Inventory): void {
    const expectedTotal = inventory.availableQuantity + inventory.reservedQuantity;
    
    if (inventory.totalQuantity !== expectedTotal) {
      throw new BadRequestException(
        `Inventory inconsistency: total=${inventory.totalQuantity}, expected=${expectedTotal}`
      );
    }
    
    if (inventory.availableQuantity < 0) {
      throw new BadRequestException('Available quantity cannot be negative');
    }
    
    if (inventory.reservedQuantity < 0) {
      throw new BadRequestException('Reserved quantity cannot be negative');
    }
  }

  /**
   * SAFETY: Ledger entries are append-only and immutable
   */
  static validateLedgerEntry(entry: InventoryLedger): void {
    if (!entry.inventoryId) {
      throw new BadRequestException('Ledger entry must have inventory ID');
    }
    
    if (!entry.type) {
      throw new BadRequestException('Ledger entry must have type');
    }
    
    if (entry.quantity === 0) {
      throw new BadRequestException('Ledger entry quantity cannot be zero');
    }
    
    if (entry.runningBalance < 0) {
      throw new BadRequestException('Running balance cannot be negative');
    }
    
    if (!entry.createdBy) {
      throw new BadRequestException('Ledger entry must have creator');
    }
  }

  /**
   * SAFETY: Reservations must have TTL and valid reference
   */
  static validateReservation(
    quantity: number,
    availableQuantity: number,
    expiresAt: Date,
    reservationKey: string,
    referenceId: string
  ): void {
    if (quantity <= 0) {
      throw new BadRequestException('Reservation quantity must be positive');
    }
    
    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Cannot reserve ${quantity}. Only ${availableQuantity} available.`
      );
    }
    
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Reservation expiry must be in the future');
    }
    
    if (!reservationKey || reservationKey.trim().length === 0) {
      throw new BadRequestException('Reservation key is required');
    }
    
    if (!referenceId || referenceId.trim().length === 0) {
      throw new BadRequestException('Reservation reference ID is required');
    }
    
    // TTL validation - maximum 24 hours
    const maxTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (expiresAt.getTime() - Date.now() > maxTTL) {
      throw new BadRequestException('Reservation TTL cannot exceed 24 hours');
    }
  }

  /**
   * SAFETY: Cannot delete inventory with existing ledger entries
   */
  static validateInventoryDeletion(inventory: Inventory, hasLedgerEntries: boolean): void {
    if (hasLedgerEntries) {
      throw new BadRequestException('Cannot delete inventory with existing ledger entries');
    }
    
    if (inventory.totalQuantity > 0) {
      throw new BadRequestException('Cannot delete inventory with stock');
    }
    
    if (inventory.reservedQuantity > 0) {
      throw new BadRequestException('Cannot delete inventory with active reservations');
    }
  }

  /**
   * SAFETY: Validate reservation state transitions
   */
  static validateReservationTransition(
    currentStatus: string,
    newStatus: string,
    isExpired: boolean
  ): void {
    const validTransitions: Record<string, string[]> = {
      'ACTIVE': ['COMMITTED', 'RELEASED', 'EXPIRED'],
      'COMMITTED': [], // Terminal state
      'RELEASED': [], // Terminal state
      'EXPIRED': ['RELEASED'], // Can be manually released
    };
    
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid reservation transition from ${currentStatus} to ${newStatus}`
      );
    }
    
    if (newStatus === 'COMMITTED' && isExpired) {
      throw new BadRequestException('Cannot commit expired reservation');
    }
  }

  /**
   * SAFETY: Validate bulk operations don't exceed limits
   */
  static validateBulkOperation(itemCount: number, maxItems: number = 1000): void {
    if (itemCount <= 0) {
      throw new BadRequestException('Bulk operation must include at least one item');
    }
    
    if (itemCount > maxItems) {
      throw new BadRequestException(
        `Bulk operation too large: ${itemCount} items. Maximum: ${maxItems}`
      );
    }
  }
}