import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Cart, CartItem, CartStatus } from './entities/cart.entity';
import { AddItemRequest } from './cart.service';

export class CartValidators {
  /**
   * Validate cart limits and business rules
   */
  static validateCartLimits(cart: Cart): void {
    const MAX_ITEMS = 100;
    const MAX_QUANTITY_PER_ITEM = 999;
    const MAX_CART_VALUE = new Decimal(1000000); // 10 lakh INR
    const MAX_SELLERS_PER_CART = 5;

    if (cart.items.length > MAX_ITEMS) {
      throw new BadRequestException(
        `Cart cannot have more than ${MAX_ITEMS} items`,
      );
    }

    for (const item of cart.items) {
      if (item.quantity > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException(
          `Item quantity cannot exceed ${MAX_QUANTITY_PER_ITEM}`,
        );
      }
    }

    if (cart.totalAmount.gt(MAX_CART_VALUE)) {
      throw new BadRequestException('Cart value exceeds maximum limit');
    }

    if (cart.getSellerCount() > MAX_SELLERS_PER_CART) {
      throw new BadRequestException(
        `Cart cannot have items from more than ${MAX_SELLERS_PER_CART} sellers`,
      );
    }
  }

  /**
   * Validate item compatibility within cart
   */
  static validateItemCompatibility(items: CartItem[]): void {
    // Check for conflicting items (e.g., different shipping zones)
    const shippingZones = new Set();
    const sellers = new Set();

    for (const item of items) {
      // This would check variant's shipping zone
      // shippingZones.add(item.variant.product.shippingZone);
      sellers.add(item.sellerId);
    }

    // Business rule: Items should be from compatible shipping zones
    if (shippingZones.size > 3) {
      throw new BadRequestException(
        'Cart contains items from too many different shipping zones',
      );
    }
  }

  /**
   * Validate cart expiry
   */
  static validateCartExpiry(cart: Cart): void {
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      throw new BadRequestException('Cart has expired');
    }
  }

  /**
   * Validate cart status for operations
   */
  static validateCartStatus(
    cart: Cart,
    allowedStatuses: CartStatus[] = [CartStatus.ACTIVE],
  ): void {
    if (!allowedStatuses.includes(cart.status)) {
      throw new BadRequestException(
        `Cart operation not allowed. Cart status is ${cart.status}`,
      );
    }
  }

  /**
   * Validate add item request
   */
  static validateAddItemRequest(request: AddItemRequest): void {
    if (!request.variantId) {
      throw new BadRequestException('Variant ID is required');
    }

    if (!request.quantity || request.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (request.quantity > 999) {
      throw new BadRequestException('Quantity cannot exceed 999');
    }

    // Validate variant ID format (assuming CUID)
    if (!/^c[a-z0-9]{24}$/.test(request.variantId)) {
      throw new BadRequestException('Invalid variant ID format');
    }

    if (request.sellerId && !/^c[a-z0-9]{24}$/.test(request.sellerId)) {
      throw new BadRequestException('Invalid seller ID format');
    }
  }

  /**
   * Validate monetary values
   */
  static validateMonetaryValues(value: Decimal, fieldName: string): void {
    if (value.lt(0)) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    if (!value.isFinite()) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    // Check for reasonable maximum values
    const MAX_VALUE = new Decimal(10000000); // 1 crore
    if (value.gt(MAX_VALUE)) {
      throw new BadRequestException(
        `${fieldName} exceeds maximum allowed value`,
      );
    }
  }

  /**
   * Validate cart item quantity update
   */
  static validateQuantityUpdate(
    currentQuantity: number,
    newQuantity: number,
  ): void {
    if (newQuantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    if (newQuantity > 999) {
      throw new BadRequestException('Quantity cannot exceed 999');
    }

    // Validate reasonable quantity changes (prevent abuse)
    const quantityChange = Math.abs(newQuantity - currentQuantity);
    if (quantityChange > 100) {
      throw new BadRequestException(
        'Quantity change too large. Please update in smaller increments.',
      );
    }
  }

  /**
   * Validate cart merge operation
   */
  static validateCartMerge(sourceCart: Cart, targetCart: Cart): void {
    if (sourceCart.id === targetCart.id) {
      throw new BadRequestException('Cannot merge cart with itself');
    }

    if (sourceCart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Source cart must be active for merge');
    }

    if (targetCart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Target cart must be active for merge');
    }

    // Check if merged cart would exceed limits
    const totalItems = sourceCart.items.length + targetCart.items.length;
    if (totalItems > 100) {
      throw new BadRequestException(
        'Merged cart would exceed maximum item limit',
      );
    }

    const combinedValue = sourceCart.totalAmount.add(targetCart.totalAmount);
    if (combinedValue.gt(new Decimal(1000000))) {
      throw new BadRequestException(
        'Merged cart would exceed maximum value limit',
      );
    }
  }

  /**
   * Validate cart conversion to order
   */
  static validateCartConversion(cart: Cart): void {
    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active carts can be converted to orders',
      );
    }

    if (cart.isEmpty()) {
      throw new BadRequestException('Cannot convert empty cart to order');
    }

    // Check for unavailable items
    const unavailableItems = cart.items.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      throw new BadRequestException(
        `Cart contains ${unavailableItems.length} unavailable items`,
      );
    }

    // Validate minimum order value
    const MIN_ORDER_VALUE = new Decimal(100); // 100 INR
    if (cart.totalAmount.lt(MIN_ORDER_VALUE)) {
      throw new BadRequestException(
        `Order value must be at least ₹${MIN_ORDER_VALUE.toString()}`,
      );
    }
  }

  /**
   * Validate cart item price consistency
   */
  static validatePriceConsistency(item: CartItem): void {
    const calculatedTotal = item.currentUnitPrice.mul(item.quantity);

    if (!calculatedTotal.equals(item.totalPrice)) {
      throw new BadRequestException(
        `Price inconsistency detected for item ${item.id}`,
      );
    }

    if (item.discountAmount.gt(item.totalPrice)) {
      throw new BadRequestException(
        `Discount amount cannot exceed item total price`,
      );
    }
  }

  /**
   * Validate cart ownership
   */
  static validateCartOwnership(
    cart: Cart,
    userId?: string,
    sessionId?: string,
  ): void {
    if (cart.userId) {
      // User cart - must match user ID
      if (!userId || cart.userId !== userId) {
        throw new BadRequestException(
          'Cart does not belong to the specified user',
        );
      }
    } else {
      // Guest cart - must match session ID
      if (!sessionId || cart.sessionId !== sessionId) {
        throw new BadRequestException(
          'Cart does not belong to the specified session',
        );
      }
    }
  }

  /**
   * Validate cart activity and freshness
   */
  static validateCartActivity(cart: Cart): void {
    const MAX_INACTIVE_HOURS = 72; // 3 days
    const inactiveThreshold = new Date(
      Date.now() - MAX_INACTIVE_HOURS * 60 * 60 * 1000,
    );

    if (cart.lastActivityAt < inactiveThreshold) {
      throw new BadRequestException(
        'Cart has been inactive for too long and may need refresh',
      );
    }
  }

  /**
   * Validate cart for checkout readiness
   */
  static validateCheckoutReadiness(cart: Cart): void {
    // Run all relevant validations for checkout
    this.validateCartStatus(cart, [CartStatus.ACTIVE]);
    this.validateCartExpiry(cart);
    this.validateCartConversion(cart);
    this.validateCartLimits(cart);

    // Validate all items
    for (const item of cart.items) {
      this.validatePriceConsistency(item);

      if (!item.isAvailable) {
        throw new BadRequestException(
          `Item ${item.variantId} is not available for checkout`,
        );
      }

      if (item.hasPriceChanged()) {
        throw new BadRequestException(
          `Item ${item.variantId} has price changes that need to be acknowledged`,
        );
      }
    }
  }

  /**
   * Validate bulk operations
   */
  static validateBulkOperation(itemIds: string[], maxItems: number = 50): void {
    if (!itemIds || itemIds.length === 0) {
      throw new BadRequestException('No items specified for bulk operation');
    }

    if (itemIds.length > maxItems) {
      throw new BadRequestException(
        `Bulk operation cannot exceed ${maxItems} items`,
      );
    }

    // Check for duplicates
    const uniqueIds = new Set(itemIds);
    if (uniqueIds.size !== itemIds.length) {
      throw new BadRequestException(
        'Duplicate item IDs found in bulk operation',
      );
    }

    // Validate ID formats
    for (const id of itemIds) {
      if (!/^c[a-z0-9]{24}$/.test(id)) {
        throw new BadRequestException(`Invalid item ID format: ${id}`);
      }
    }
  }
}
