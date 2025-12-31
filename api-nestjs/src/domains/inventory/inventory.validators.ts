export class InventoryValidators {
  static validateReservationCommitIdempotency(reservation: any): void {
    if (reservation.status === 'COMMITTED') {
      throw new Error('Reservation has already been committed');
    }
  }

  static validateReservationExists(reservationKey: string): void {
    if (!reservationKey) {
      throw new Error('Reservation key is required');
    }
  }

  static validateInventoryNonNegative(
    quantity: number,
    productId: string,
  ): void {
    if (quantity < 0) {
      throw new Error(`Inventory cannot be negative for product ${productId}`);
    }
  }
  static validateStockIncrease(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Stock increase quantity must be positive');
    }
  }

  static validateStockDecrease(
    quantity: number,
    availableQuantity: number,
  ): void {
    if (quantity <= 0) {
      throw new Error('Stock decrease quantity must be positive');
    }
    if (quantity > availableQuantity) {
      throw new Error('Insufficient stock available');
    }
  }

  static validateStockAdjustment(quantity: number): void {
    if (quantity < 0) {
      throw new Error('Stock adjustment quantity cannot be negative');
    }
  }
}
