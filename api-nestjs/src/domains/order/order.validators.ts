export class OrderValidators {
  static validateMonetaryValues(value: number, fieldName: string): void {
    if (value < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }

    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} must be a valid number`);
    }

    // Check for reasonable precision (2 decimal places for currency)
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new Error(`${fieldName} cannot have more than 2 decimal places`);
    }
  }

  static validateOrderImmutability(existingOrder: any, updateData: any): void {
    // Prevent changes to critical fields after order is confirmed
    if (existingOrder.status !== 'PENDING') {
      const immutableFields = ['customerId', 'items', 'totalAmount'];

      for (const field of immutableFields) {
        if (
          updateData[field] !== undefined &&
          updateData[field] !== existingOrder[field]
        ) {
          throw new Error(`Cannot modify ${field} after order is confirmed`);
        }
      }
    }
  }

  static validateCurrencyImmutability(
    existingOrder: any,
    newCurrency?: string,
  ): void {
    if (newCurrency && newCurrency !== existingOrder.currency) {
      throw new Error('Cannot change order currency after creation');
    }
  }

  static validateOrderStatus(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: ['REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  static validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    // Alias for validateOrderStatus to match the method name used in the service
    this.validateOrderStatus(currentStatus, newStatus);
  }

  static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
  }

  static validateAddress(address: any): string[] {
    const errors: string[] = [];

    if (!address.street) errors.push('Street address is required');
    if (!address.city) errors.push('City is required');
    if (!address.state) errors.push('State is required');
    if (!address.postalCode) errors.push('Postal code is required');
    if (!address.country) errors.push('Country is required');

    return errors;
  }
}
