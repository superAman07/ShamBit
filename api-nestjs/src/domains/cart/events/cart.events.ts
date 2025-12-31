import { CartItem } from '../entities/cart.entity';

// Base cart event class
export abstract class BaseCartEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly cartId: string,
    public readonly actorId?: string,
  ) {
    this.occurredAt = new Date();
  }
}

// Cart lifecycle events
export class CartCreatedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly userId?: string,
    public readonly sessionId?: string,
  ) {
    super(cartId, userId || sessionId);
  }
}

export class CartExpiredEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly reason: string = 'TIMEOUT',
  ) {
    super(cartId, 'SYSTEM');
  }
}

export class CartConvertedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
    public readonly itemCount: number,
  ) {
    super(cartId, userId);
  }
}

export class CartAbandonedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly lastActivityAt: Date,
    public readonly itemCount: number,
    public readonly totalValue: number,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartMergedEvent extends BaseCartEvent {
  constructor(
    public readonly sourceCartId: string,
    public readonly targetCartId: string,
    public readonly userId: string,
    public readonly mergeResults: Array<{
      success: boolean;
      itemId: string;
      error?: string;
    }>,
  ) {
    super(targetCartId, userId);
  }
}

// Cart item events
export class CartItemAddedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly item: CartItem,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartItemRemovedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly item: CartItem,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartItemQuantityUpdatedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly item: CartItem,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartItemPriceChangedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly itemId: string,
    public readonly variantId: string,
    public readonly oldPrice: number,
    public readonly newPrice: number,
    public readonly priceChangeReason?: string,
  ) {
    super(cartId, 'SYSTEM');
  }
}

export class CartItemUnavailableEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly itemId: string,
    public readonly variantId: string,
    public readonly reason: string,
  ) {
    super(cartId, 'SYSTEM');
  }
}

// Cart promotion events
export class CartPromotionAppliedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly promotionId: string,
    public readonly promotionCode: string,
    public readonly discountAmount: number,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartPromotionRemovedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly promotionId: string,
    public readonly promotionCode: string,
    public readonly reason: string,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartPromotionsAppliedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly appliedPromotions: Array<{
      promotionId: string;
      promotionCode: string;
      discountAmount: number;
    }>,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

// Cart pricing events
export class CartTotalsRecalculatedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly oldTotals: {
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      shippingAmount: number;
      totalAmount: number;
    },
    public readonly newTotals: {
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      shippingAmount: number;
      totalAmount: number;
    },
  ) {
    super(cartId, 'SYSTEM');
  }
}

export class CartPriceChangesDetectedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly priceChanges: Array<{
      itemId: string;
      variantId: string;
      oldPrice: number;
      newPrice: number;
      priceIncrease: boolean;
      percentageChange: number;
    }>,
  ) {
    super(cartId, 'SYSTEM');
  }
}

// Cart validation events
export class CartValidationFailedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly validationErrors: Array<{
      field: string;
      message: string;
      code: string;
    }>,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartLimitExceededEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly limitType: string, // 'ITEM_COUNT', 'VALUE', 'SELLER_COUNT', etc.
    public readonly currentValue: number,
    public readonly limitValue: number,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

// Cart activity events
export class CartActivityUpdatedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly activityType: string, // 'VIEW', 'MODIFY', 'CHECKOUT_ATTEMPT'
    public readonly metadata?: Record<string, any>,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartInactivityWarningEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly inactiveDuration: number, // in minutes
    public readonly warningLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    public readonly expiresAt?: Date,
  ) {
    super(cartId, 'SYSTEM');
  }
}

// Cart security events
export class CartSecurityViolationEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly violationType: string,
    public readonly details: Record<string, any>,
    public readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

export class CartAbuseDetectedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly abuseType: string,
    public readonly patterns: Array<{
      type: string;
      severity: string;
      details: Record<string, any>;
    }>,
    public readonly actionsApplied: string[],
    actorId?: string,
  ) {
    super(cartId, actorId);
  }
}

// Cart inventory events
export class CartInventoryReservedEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly reservations: Array<{
      itemId: string;
      variantId: string;
      quantity: number;
      reservationId: string;
      expiresAt: Date;
    }>,
  ) {
    super(cartId, 'SYSTEM');
  }
}

export class CartInventoryReservationExpiredEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly expiredReservations: Array<{
      itemId: string;
      variantId: string;
      quantity: number;
      reservationId: string;
    }>,
  ) {
    super(cartId, 'SYSTEM');
  }
}

export class CartInventoryShortageEvent extends BaseCartEvent {
  constructor(
    cartId: string,
    public readonly shortageItems: Array<{
      itemId: string;
      variantId: string;
      requestedQuantity: number;
      availableQuantity: number;
    }>,
  ) {
    super(cartId, 'SYSTEM');
  }
}

// Cart cleanup events
export class CartCleanupEvent extends BaseCartEvent {
  constructor(
    public readonly cleanupType: 'EXPIRED' | 'ABANDONED' | 'MERGED',
    public readonly cleanedCartIds: string[],
    public readonly cleanupStats: {
      totalCarts: number;
      totalItems: number;
      totalValue: number;
    },
  ) {
    super('BULK_CLEANUP', 'SYSTEM');
  }
}

// Event type constants for easy reference
export const CART_EVENTS = {
  // Lifecycle
  CART_CREATED: 'cart.created',
  CART_EXPIRED: 'cart.expired',
  CART_CONVERTED: 'cart.converted',
  CART_ABANDONED: 'cart.abandoned',
  CART_MERGED: 'cart.merged',

  // Items
  ITEM_ADDED: 'cart.item_added',
  ITEM_REMOVED: 'cart.item_removed',
  ITEM_QUANTITY_UPDATED: 'cart.item_quantity_updated',
  ITEM_PRICE_CHANGED: 'cart.item_price_changed',
  ITEM_UNAVAILABLE: 'cart.item_unavailable',

  // Promotions
  PROMOTION_APPLIED: 'cart.promotion_applied',
  PROMOTION_REMOVED: 'cart.promotion_removed',
  PROMOTIONS_APPLIED: 'cart.promotions_applied',

  // Pricing
  TOTALS_RECALCULATED: 'cart.totals_recalculated',
  PRICE_CHANGES_DETECTED: 'cart.price_changes_detected',

  // Validation
  VALIDATION_FAILED: 'cart.validation_failed',
  LIMIT_EXCEEDED: 'cart.limit_exceeded',

  // Activity
  ACTIVITY_UPDATED: 'cart.activity_updated',
  INACTIVITY_WARNING: 'cart.inactivity_warning',

  // Security
  SECURITY_VIOLATION: 'cart.security_violation',
  ABUSE_DETECTED: 'cart.abuse_detected',

  // Inventory
  INVENTORY_RESERVED: 'cart.inventory_reserved',
  INVENTORY_RESERVATION_EXPIRED: 'cart.inventory_reservation_expired',
  INVENTORY_SHORTAGE: 'cart.inventory_shortage',

  // Cleanup
  CLEANUP: 'cart.cleanup',
} as const;
