import { BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderItemStatus, canTransitionOrderStatus, canTransitionOrderItemStatus } from './enums/order-status.enum';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

export class OrderValidators {
  
  // ============================================================================
  // CRITICAL SAFETY INVARIANTS - NEVER BYPASS THESE
  // ============================================================================
  
  /**
   * SAFETY: Order status transitions must follow state machine
   */
  static validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (!canTransitionOrderStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid order status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * SAFETY: Order item status transitions must follow state machine
   */
  static validateItemStatusTransition(currentStatus: OrderItemStatus, newStatus: OrderItemStatus): void {
    if (!canTransitionOrderItemStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid order item status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * SAFETY: Order cannot be modified after CONFIRMED
   */
  static validateOrderImmutability(order: Order, updateData: any): void {
    if (order.status === OrderStatus.CONFIRMED || 
        order.status === OrderStatus.PROCESSING ||
        order.status === OrderStatus.SHIPPED ||
        order.status === OrderStatus.DELIVERED) {
      
      // Only allow specific fields to be updated after confirmation
      const allowedFields = ['trackingNumber', 'estimatedDelivery', 'actualDelivery', 'notes', 'updatedBy', 'updatedAt'];
      const attemptedFields = Object.keys(updateData);
      const forbiddenFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (forbiddenFields.length > 0) {
        throw new BadRequestException(
          `Cannot modify ${forbiddenFields.join(', ')} after order confirmation`
        );
      }
    }
  }

  /**
   * SAFETY: Items immutable after creation - snapshot never updated
   */
  static validateItemImmutability(orderItem: OrderItem): void {
    // Order items are completely immutable after creation
    // Only status and refund fields can be updated
    throw new BadRequestException('Order items cannot be modified after creation');
  }

  /**
   * SAFETY: Order total ≠ recalculated dynamically - always use stored values
   */
  static validatePricingImmutability(order: Order): void {
    // Prices are locked at order creation - never recalculate
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order pricing is immutable after creation');
    }
  }

  /**
   * SAFETY: All monetary values stored as integers (cents)
   */
  static validateMonetaryValues(amount: number, fieldName: string): void {
    if (!Number.isInteger(amount * 100)) {
      throw new BadRequestException(`${fieldName} must have at most 2 decimal places`);
    }
    
    if (amount < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }
    
    if (amount > 999999.99) {
      throw new BadRequestException(`${fieldName} exceeds maximum allowed value`);
    }
  }

  /**
   * SAFETY: Currency locked per order
   */
  static validateCurrencyImmutability(order: Order, newCurrency?: string): void {
    if (newCurrency && order.currency !== newCurrency) {
      throw new BadRequestException('Order currency cannot be changed after creation');
    }
  }

  /**
   * SAFETY: Order must have valid items and pricing
   */
  static validateOrderStructure(order: Partial<Order>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!order.customerId) errors.push('Customer ID is required');
    if (!order.items || order.items.length === 0) errors.push('Order must have at least one item');
    if (!order.shippingAddress) errors.push('Shipping address is required');
    if (!order.billingAddress) errors.push('Billing address is required');

    // Validate pricing
    if (order.subtotal === undefined || order.subtotal < 0) {
      errors.push('Subtotal must be non-negative');
    }
    if (order.taxAmount === undefined || order.taxAmount < 0) {
      errors.push('Tax amount must be non-negative');
    }
    if (order.shippingAmount === undefined || order.shippingAmount < 0) {
      errors.push('Shipping amount must be non-negative');
    }
    if (order.discountAmount === undefined || order.discountAmount < 0) {
      errors.push('Discount amount must be non-negative');
    }
    if (order.totalAmount === undefined || order.totalAmount < 0) {
      errors.push('Total amount must be non-negative');
    }

    // Validate pricing calculation
    if (order.subtotal !== undefined && order.taxAmount !== undefined && 
        order.shippingAmount !== undefined && order.discountAmount !== undefined && 
        order.totalAmount !== undefined) {
      const expectedTotal = order.subtotal + order.taxAmount + order.shippingAmount - order.discountAmount;
      if (Math.abs(order.totalAmount - expectedTotal) > 0.01) {
        errors.push(`Total amount mismatch: expected ${expectedTotal}, got ${order.totalAmount}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * SAFETY: Order items must be valid and consistent
   */
  static validateOrderItems(items: Partial<OrderItem>[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!items || items.length === 0) {
      errors.push('Order must have at least one item');
      return { isValid: false, errors };
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemErrors = this.validateOrderItem(item);
      if (!itemErrors.isValid) {
        errors.push(...itemErrors.errors.map(e => `Item ${i + 1}: ${e}`));
      }
    }

    // Check for duplicate variants
    const variantIds = items.map(item => item.variantId).filter(Boolean);
    const uniqueVariantIds = new Set(variantIds);
    if (variantIds.length !== uniqueVariantIds.size) {
      errors.push('Order contains duplicate variants');
    }

    // Validate total item count
    if (items.length > 100) {
      errors.push('Order cannot have more than 100 items');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * SAFETY: Individual order item validation
   */
  static validateOrderItem(item: Partial<OrderItem>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!item.variantId) errors.push('Variant ID is required');
    if (!item.productId) errors.push('Product ID is required');
    if (!item.sellerId) errors.push('Seller ID is required');
    if (!item.quantity || item.quantity <= 0) errors.push('Quantity must be positive');
    if (!Number.isInteger(item.quantity)) errors.push('Quantity must be an integer');
    if (item.quantity && item.quantity > 1000) errors.push('Quantity cannot exceed 1000 per item');

    // Validate pricing
    if (item.unitPrice === undefined || item.unitPrice < 0) {
      errors.push('Unit price must be non-negative');
    }
    if (item.totalPrice === undefined || item.totalPrice < 0) {
      errors.push('Total price must be non-negative');
    }

    // Validate price calculation
    if (item.unitPrice !== undefined && item.quantity !== undefined && item.totalPrice !== undefined) {
      const expectedTotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
      if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
        errors.push(`Total price mismatch: expected ${expectedTotal}, got ${item.totalPrice}`);
      }
    }

    // Validate refund amounts
    if (item.refundedQuantity !== undefined) {
      if (item.refundedQuantity < 0) errors.push('Refunded quantity cannot be negative');
      if (item.quantity !== undefined && item.refundedQuantity > item.quantity) {
        errors.push('Refunded quantity cannot exceed total quantity');
      }
    }

    if (item.refundedAmount !== undefined) {
      if (item.refundedAmount < 0) errors.push('Refunded amount cannot be negative');
      if (item.totalPrice !== undefined && item.refundedAmount > item.totalPrice) {
        errors.push('Refunded amount cannot exceed total price');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * SAFETY: Address validation
   */
  static validateAddress(address: any, type: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address) {
      errors.push(`${type} address is required`);
      return { isValid: false, errors };
    }

    // Required fields
    if (!address.firstName?.trim()) errors.push(`${type} address first name is required`);
    if (!address.lastName?.trim()) errors.push(`${type} address last name is required`);
    if (!address.addressLine1?.trim()) errors.push(`${type} address line 1 is required`);
    if (!address.city?.trim()) errors.push(`${type} address city is required`);
    if (!address.state?.trim()) errors.push(`${type} address state is required`);
    if (!address.postalCode?.trim()) errors.push(`${type} address postal code is required`);
    if (!address.country?.trim()) errors.push(`${type} address country is required`);

    // Field length validation
    if (address.firstName && address.firstName.length > 50) {
      errors.push(`${type} address first name too long (max 50 characters)`);
    }
    if (address.lastName && address.lastName.length > 50) {
      errors.push(`${type} address last name too long (max 50 characters)`);
    }
    if (address.addressLine1 && address.addressLine1.length > 100) {
      errors.push(`${type} address line 1 too long (max 100 characters)`);
    }
    if (address.addressLine2 && address.addressLine2.length > 100) {
      errors.push(`${type} address line 2 too long (max 100 characters)`);
    }
    if (address.city && address.city.length > 50) {
      errors.push(`${type} address city too long (max 50 characters)`);
    }
    if (address.postalCode && address.postalCode.length > 20) {
      errors.push(`${type} address postal code too long (max 20 characters)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * SAFETY: Order cancellation validation
   */
  static validateOrderCancellation(order: Order): void {
    if (!order.canBeCancelled()) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} status`);
    }

    if (order.hasExpired()) {
      throw new BadRequestException('Cannot cancel expired order');
    }
  }

  /**
   * SAFETY: Order refund validation
   */
  static validateOrderRefund(order: Order, refundAmount?: number): void {
    if (!order.canBeRefunded()) {
      throw new BadRequestException(`Cannot refund order in ${order.status} status`);
    }

    if (refundAmount !== undefined) {
      if (refundAmount <= 0) {
        throw new BadRequestException('Refund amount must be positive');
      }

      const maxRefundable = order.getTotalPaid() - order.getTotalRefunded();
      if (refundAmount > maxRefundable) {
        throw new BadRequestException(
          `Refund amount ${refundAmount} exceeds maximum refundable amount ${maxRefundable}`
        );
      }
    }
  }

  /**
   * SAFETY: Order item refund validation
   */
  static validateOrderItemRefund(
    item: OrderItem,
    refundQuantity: number,
    refundAmount?: number
  ): void {
    if (!item.canBeRefunded()) {
      throw new BadRequestException(`Cannot refund item in ${item.status} status`);
    }

    if (refundQuantity <= 0) {
      throw new BadRequestException('Refund quantity must be positive');
    }

    if (!item.canRefundQuantity(refundQuantity)) {
      throw new BadRequestException(
        `Cannot refund ${refundQuantity} items. Maximum refundable: ${item.getRemainingQuantity()}`
      );
    }

    if (refundAmount !== undefined) {
      if (refundAmount <= 0) {
        throw new BadRequestException('Refund amount must be positive');
      }

      if (!item.canRefundAmount(refundAmount)) {
        throw new BadRequestException(
          `Cannot refund ${refundAmount}. Maximum refundable: ${item.getRemainingAmount()}`
        );
      }
    }
  }

  /**
   * SAFETY: Payment validation
   */
  static validatePayment(order: Order, paymentAmount: number): void {
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const outstandingAmount = order.getOutstandingAmount();
    if (paymentAmount > outstandingAmount) {
      throw new BadRequestException(
        `Payment amount ${paymentAmount} exceeds outstanding amount ${outstandingAmount}`
      );
    }
  }

  /**
   * SAFETY: Order expiry validation
   */
  static validateOrderExpiry(order: Order): void {
    if (order.hasExpired() && order.isPending()) {
      throw new BadRequestException('Order has expired and cannot be processed');
    }
  }

  /**
   * SAFETY: Multi-seller order validation
   */
  static validateMultiSellerOrder(order: Order): void {
    if (!order.isMultiSeller()) {
      throw new BadRequestException('Order does not span multiple sellers');
    }

    if (order.isSplit) {
      throw new BadRequestException('Order has already been split');
    }
  }

  /**
   * SAFETY: Bulk operation validation
   */
  static validateBulkOperation(itemCount: number, maxItems: number = 100): void {
    if (itemCount <= 0) {
      throw new BadRequestException('Bulk operation must include at least one item');
    }

    if (itemCount > maxItems) {
      throw new BadRequestException(
        `Bulk operation too large: ${itemCount} items. Maximum: ${maxItems}`
      );
    }
  }

  /**
   * SAFETY: Currency validation
   */
  static validateCurrency(currency: string): void {
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    
    if (!currency || currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }

    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * SAFETY: Order number validation
   */
  static validateOrderNumber(orderNumber: string): void {
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new BadRequestException('Order number is required');
    }

    if (orderNumber.length > 50) {
      throw new BadRequestException('Order number too long (max 50 characters)');
    }

    // Order number format validation (alphanumeric with hyphens)
    const orderNumberPattern = /^[A-Z0-9\-]+$/;
    if (!orderNumberPattern.test(orderNumber)) {
      throw new BadRequestException('Order number must contain only uppercase letters, numbers, and hyphens');
    }
  }

  /**
   * SAFETY: Metadata validation
   */
  static validateMetadata(metadata?: Record<string, any>): void {
    if (metadata) {
      const metadataString = JSON.stringify(metadata);
      if (metadataString.length > 10000) {
        throw new BadRequestException('Metadata too large - maximum 10KB');
      }
    }
  }
}