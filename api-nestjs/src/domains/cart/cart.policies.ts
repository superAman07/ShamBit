import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Cart, CartItem, CartStatus } from './entities/cart.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  CUSTOMER = 'CUSTOMER',
  SYSTEM = 'SYSTEM',
}

export class CartPolicies {
  /**
   * Validate cart access permissions
   */
  static validateCartAccess(
    cart: Cart,
    userId?: string,
    sessionId?: string,
  ): void {
    if (cart.userId) {
      // User cart - must match user ID
      if (!userId || cart.userId !== userId) {
        throw new ForbiddenException('Access denied to cart');
      }
    } else {
      // Guest cart - must match session ID
      if (!sessionId || cart.sessionId !== sessionId) {
        throw new ForbiddenException('Access denied to cart');
      }
    }
  }

  /**
   * Check if user can modify cart
   */
  static canUserModifyCart(
    cart: Cart,
    userId?: string,
    sessionId?: string,
    userRole?: UserRole,
  ): boolean {
    // Admins can modify any cart
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // System can modify any cart
    if (userRole === UserRole.SYSTEM) {
      return true;
    }

    // Regular users can only modify their own carts
    if (cart.userId) {
      return userId === cart.userId;
    } else {
      return sessionId === cart.sessionId;
    }
  }

  /**
   * Check if user can view cart
   */
  static canUserViewCart(
    cart: Cart,
    userId?: string,
    sessionId?: string,
    userRole?: UserRole,
  ): boolean {
    // Admins and moderators can view any cart
    if (
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.MODERATOR
    ) {
      return true;
    }

    // Regular users can only view their own carts
    return this.canUserModifyCart(cart, userId, sessionId, userRole);
  }

  /**
   * Check if user can add items from specific seller
   */
  static canUserAddSellerItems(
    cart: Cart,
    sellerId: string,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    // Admins can add items from any seller
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if seller is active/approved (this would integrate with seller service)
    // For now, we'll assume all sellers are valid

    // Check business rules for seller mixing
    const existingSellers = new Set(cart.items.map((item) => item.sellerId));

    // If cart is empty or already has items from this seller, allow
    if (existingSellers.size === 0 || existingSellers.has(sellerId)) {
      return true;
    }

    // Check maximum sellers per cart limit
    const MAX_SELLERS_PER_CART = 5;
    if (existingSellers.size >= MAX_SELLERS_PER_CART) {
      return false;
    }

    return true;
  }

  /**
   * Check if cart can be converted to order
   */
  static canConvertCartToOrder(
    cart: Cart,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    // Only active carts can be converted
    if (cart.status !== CartStatus.ACTIVE) {
      return false;
    }

    // Cart must not be expired
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      return false;
    }

    // Cart must not be empty
    if (cart.isEmpty()) {
      return false;
    }

    // User must own the cart (or be admin)
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    return cart.userId === userId;
  }

  /**
   * Check if cart can be merged
   */
  static canMergeCarts(
    sourceCart: Cart,
    targetCart: Cart,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    // Admins can merge any carts
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Both carts must be active
    if (
      sourceCart.status !== CartStatus.ACTIVE ||
      targetCart.status !== CartStatus.ACTIVE
    ) {
      return false;
    }

    // User must own both carts or be merging guest cart into user cart
    if (sourceCart.userId && sourceCart.userId !== userId) {
      return false;
    }

    if (targetCart.userId && targetCart.userId !== userId) {
      return false;
    }

    // Special case: merging guest cart into user cart
    if (!sourceCart.userId && targetCart.userId === userId) {
      return true;
    }

    return true;
  }

  /**
   * Check rate limiting for cart operations
   */
  static checkOperationRateLimit(
    operationType: string,
    userId?: string,
    sessionId?: string,
  ): boolean {
    // This would integrate with a rate limiting service
    // For now, we'll implement basic checks

    const identifier = userId || sessionId;
    if (!identifier) return false;

    // Different limits for different operations
    const rateLimits = {
      add_item: { limit: 100, window: 3600 }, // 100 per hour
      update_quantity: { limit: 200, window: 3600 }, // 200 per hour
      remove_item: { limit: 50, window: 3600 }, // 50 per hour
      create_cart: { limit: 10, window: 3600 }, // 10 per hour
      merge_cart: { limit: 5, window: 3600 }, // 5 per hour
    };

    // This would check against Redis or similar storage
    return true; // Placeholder
  }

  /**
   * Validate cart operation permissions
   */
  static validateCartOperation(
    operation: string,
    cart: Cart,
    userId?: string,
    sessionId?: string,
    userRole?: UserRole,
  ): void {
    // Check basic access
    if (!this.canUserModifyCart(cart, userId, sessionId, userRole)) {
      throw new ForbiddenException(
        `Access denied for cart operation: ${operation}`,
      );
    }

    // Check cart status
    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot perform ${operation} on ${cart.status.toLowerCase()} cart`,
      );
    }

    // Check expiry
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      throw new BadRequestException(
        `Cannot perform ${operation} on expired cart`,
      );
    }

    // Check rate limiting
    if (!this.checkOperationRateLimit(operation, userId, sessionId)) {
      throw new ForbiddenException(
        `Rate limit exceeded for operation: ${operation}`,
      );
    }
  }

  /**
   * Check if user can apply promotions
   */
  static canUserApplyPromotions(
    cart: Cart,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    // Admins can apply any promotions
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // User must own the cart
    if (cart.userId && cart.userId !== userId) {
      return false;
    }

    // Cart must be active
    if (cart.status !== CartStatus.ACTIVE) {
      return false;
    }

    return true;
  }

  /**
   * Check seller-specific policies for cart items
   */
  static validateSellerPolicies(
    cart: Cart,
    sellerId: string,
    itemData: Partial<CartItem>,
  ): void {
    // Check if seller allows cart reservations
    // This would integrate with seller service to check seller settings

    // Check seller-specific quantity limits
    const sellerItems = cart.items.filter((item) => item.sellerId === sellerId);
    const totalSellerQuantity = sellerItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const SELLER_MAX_QUANTITY = 500; // Per seller limit
    if (totalSellerQuantity + (itemData.quantity || 0) > SELLER_MAX_QUANTITY) {
      throw new BadRequestException(
        `Exceeded maximum quantity limit for seller ${sellerId}`,
      );
    }

    // Check seller-specific value limits
    const sellerValue = sellerItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      itemData.totalPrice ||
        new (require('@prisma/client/runtime/library').Decimal)(0),
    );

    const SELLER_MAX_VALUE =
      new (require('@prisma/client/runtime/library').Decimal)(500000); // 5 lakh per seller
    if (sellerValue.gt(SELLER_MAX_VALUE)) {
      throw new BadRequestException(
        `Exceeded maximum order value limit for seller ${sellerId}`,
      );
    }
  }

  /**
   * Check geographic restrictions
   */
  static validateGeographicRestrictions(
    cart: Cart,
    userLocation?: { country: string; state: string; city: string },
  ): void {
    if (!userLocation) return;

    // Check if any items have geographic restrictions
    for (const item of cart.items) {
      // This would check variant/product shipping restrictions
      // For now, we'll implement basic country restriction

      const restrictedCountries = ['CN']; // Example: China restricted
      if (restrictedCountries.includes(userLocation.country)) {
        throw new BadRequestException(
          `Item ${item.variantId} cannot be shipped to ${userLocation.country}`,
        );
      }
    }
  }

  /**
   * Validate business hours restrictions
   */
  static validateBusinessHours(operation: string): void {
    const now = new Date();
    const hour = now.getHours();

    // Some operations might be restricted during maintenance hours
    const maintenanceHours = [2, 3, 4]; // 2 AM to 4 AM

    if (maintenanceHours.includes(hour)) {
      const restrictedOperations = ['create_cart', 'merge_cart'];

      if (restrictedOperations.includes(operation)) {
        throw new BadRequestException(
          'This operation is temporarily unavailable during maintenance hours (2 AM - 5 AM IST)',
        );
      }
    }
  }

  /**
   * Check fraud prevention rules
   */
  static validateFraudPrevention(
    cart: Cart,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
  ): void {
    // Check for suspicious patterns

    // 1. Too many high-value items
    const highValueItems = cart.items.filter((item) =>
      item.totalPrice.gt(
        new (require('@prisma/client/runtime/library').Decimal)(50000),
      ),
    );

    if (highValueItems.length > 10) {
      throw new BadRequestException(
        'Cart contains too many high-value items. Please contact support.',
      );
    }

    // 2. Rapid cart creation (would check against database)
    // This would be implemented with proper tracking

    // 3. Unusual quantity patterns
    const totalQuantity = cart.getTotalItemCount();
    if (totalQuantity > 1000) {
      throw new BadRequestException(
        'Cart quantity exceeds normal limits. Please contact support.',
      );
    }

    // 4. Geographic anomalies (would check IP location vs user location)
    // This would be implemented with IP geolocation service
  }
}
