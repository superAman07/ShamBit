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

  static validateInventoryNonNegative(quantity: number, productId: string): void {
    if (quantity < 0) {
      throw new Error(`Inventory cannot be negative for product ${productId}`);
    }
  }
}