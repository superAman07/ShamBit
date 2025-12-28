export class InventoryValidators {
  /**
   * Validate that a reservation can be committed (idempotency check)
   */
  static validateReservationCommitIdempotency(reservation: any): void {
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === 'COMMITTED') {
      // Already committed - this is idempotent, so it's okay
      return;
    }

    if (reservation.status !== 'ACTIVE') {
      throw new Error(`Cannot commit reservation with status: ${reservation.status}`);
    }

    // Check if reservation has expired
    if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
      throw new Error('Reservation has expired and cannot be committed');
    }
  }

  /**
   * Validate that a reservation can be released
   */
  static validateReservationRelease(reservation: any): void {
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === 'RELEASED') {
      // Already released - this is idempotent, so it's okay
      return;
    }

    if (reservation.status !== 'ACTIVE') {
      throw new Error(`Cannot release reservation with status: ${reservation.status}`);
    }
  }

  /**
   * Validate inventory availability for reservation
   */
  static validateInventoryAvailability(inventory: any, requestedQuantity: number): void {
    if (!inventory) {
      throw new Error('Inventory not found');
    }

    if (inventory.availableQuantity < requestedQuantity) {
      throw new Error(`Insufficient inventory. Available: ${inventory.availableQuantity}, Requested: ${requestedQuantity}`);
    }

    if (!inventory.isTrackingEnabled) {
      // If tracking is disabled, we don't enforce quantity limits
      return;
    }
  }

  /**
   * Validate reservation key format
   */
  static validateReservationKey(reservationKey: string): void {
    if (!reservationKey) {
      throw new Error('Reservation key is required');
    }

    if (typeof reservationKey !== 'string') {
      throw new Error('Reservation key must be a string');
    }

    if (reservationKey.length < 3 || reservationKey.length > 100) {
      throw new Error('Reservation key must be between 3 and 100 characters');
    }

    // Basic format validation - alphanumeric, hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(reservationKey)) {
      throw new Error('Reservation key can only contain alphanumeric characters, hyphens, and underscores');
    }
  }

  /**
   * Validate inventory movement data
   */
  static validateInventoryMovement(movement: any): void {
    if (!movement.inventoryId) {
      throw new Error('Inventory ID is required for movement');
    }

    if (!movement.type) {
      throw new Error('Movement type is required');
    }

    const validTypes = ['IN', 'OUT', 'RESERVED', 'RELEASED'];
    if (!validTypes.includes(movement.type)) {
      throw new Error(`Invalid movement type: ${movement.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    if (typeof movement.quantity !== 'number' || movement.quantity <= 0) {
      throw new Error('Movement quantity must be a positive number');
    }

    if (!movement.reason) {
      throw new Error('Movement reason is required');
    }

    if (!movement.createdBy) {
      throw new Error('Movement creator is required');
    }
  }

  /**
   * Validate stock increase operation
   */
  static validateStockIncrease(quantity: number): void {
    if (typeof quantity !== 'number') {
      throw new Error('Quantity must be a number');
    }

    if (quantity <= 0) {
      throw new Error('Stock increase quantity must be positive');
    }

    if (!Number.isInteger(quantity)) {
      throw new Error('Stock increase quantity must be a whole number');
    }

    if (quantity > 1000000) {
      throw new Error('Stock increase quantity is too large (max: 1,000,000)');
    }
  }

  /**
   * Validate stock decrease operation
   */
  static validateStockDecrease(quantity: number, availableQuantity: number): void {
    if (typeof quantity !== 'number') {
      throw new Error('Quantity must be a number');
    }

    if (quantity <= 0) {
      throw new Error('Stock decrease quantity must be positive');
    }

    if (!Number.isInteger(quantity)) {
      throw new Error('Stock decrease quantity must be a whole number');
    }

    if (quantity > availableQuantity) {
      throw new Error(`Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`);
    }
  }

  /**
   * Validate stock adjustment operation
   */
  static validateStockAdjustment(newQuantity: number): void {
    if (typeof newQuantity !== 'number') {
      throw new Error('New quantity must be a number');
    }

    if (newQuantity < 0) {
      throw new Error('Stock adjustment quantity cannot be negative');
    }

    if (!Number.isInteger(newQuantity)) {
      throw new Error('Stock adjustment quantity must be a whole number');
    }

    if (newQuantity > 1000000) {
      throw new Error('Stock adjustment quantity is too large (max: 1,000,000)');
    }
  }

  /**
   * Validate that inventory quantities are consistent
   */
  static validateInventoryConsistency(inventory: any): void {
    if (!inventory) {
      throw new Error('Inventory data is required');
    }

    if (inventory.availableQuantity < 0) {
      throw new Error('Available quantity cannot be negative');
    }

    if (inventory.reservedQuantity < 0) {
      throw new Error('Reserved quantity cannot be negative');
    }

    if (inventory.quantity < 0) {
      throw new Error('Total quantity cannot be negative');
    }

    // Check if available + reserved equals total (if total quantity is tracked)
    if (inventory.quantity !== undefined) {
      const calculatedTotal = inventory.availableQuantity + inventory.reservedQuantity;
      if (Math.abs(calculatedTotal - inventory.quantity) > 0.01) { // Allow for small floating point differences
        throw new Error(`Inventory quantities are inconsistent. Available: ${inventory.availableQuantity}, Reserved: ${inventory.reservedQuantity}, Total: ${inventory.quantity}`);
      }
    }
  }
}