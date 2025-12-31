import { Injectable, Logger } from '@nestjs/common';
import { Cart, CartItem } from '../entities/cart.entity';

export interface CartMetrics {
  cartCreated: number;
  itemAdded: number;
  itemRemoved: number;
  cartConverted: number;
  cartAbandoned: number;
  promotionApplied: number;
  priceChangeDetected: number;
}

export interface CartAnalyticsData {
  event: string;
  cartId: string;
  userId?: string;
  sessionId?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class CartAnalyticsService {
  private readonly logger = new Logger(CartAnalyticsService.name);
  private metrics: CartMetrics = {
    cartCreated: 0,
    itemAdded: 0,
    itemRemoved: 0,
    cartConverted: 0,
    cartAbandoned: 0,
    promotionApplied: 0,
    priceChangeDetected: 0,
  };

  /**
   * Track cart creation
   */
  trackCartCreated(cart: Cart): void {
    this.metrics.cartCreated++;

    this.trackEvent({
      event: 'cart_created',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        userType: cart.userId ? 'authenticated' : 'guest',
        currency: cart.currency,
        locale: cart.locale,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track item added to cart
   */
  trackItemAdded(cart: Cart, item: CartItem): void {
    this.metrics.itemAdded++;

    this.trackEvent({
      event: 'cart_item_added',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        variantId: item.variantId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        category: item.variantSnapshot?.categoryId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track item removed from cart
   */
  trackItemRemoved(cart: Cart, item: CartItem): void {
    this.metrics.itemRemoved++;

    this.trackEvent({
      event: 'cart_item_removed',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        variantId: item.variantId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        reason: 'user_action', // Could be 'unavailable', 'price_change', etc.
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track cart conversion to order
   */
  trackCartConverted(cart: Cart, orderId: string): void {
    this.metrics.cartConverted++;

    this.trackEvent({
      event: 'cart_converted',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        orderId,
        itemCount: cart.items.length,
        totalValue: cart.totalAmount.toNumber(),
        discountAmount: cart.discountAmount.toNumber(),
        sellerCount: cart.getSellerCount(),
        conversionTime: this.calculateConversionTime(cart),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track cart abandonment
   */
  trackCartAbandoned(cart: Cart, reason: string): void {
    this.metrics.cartAbandoned++;

    this.trackEvent({
      event: 'cart_abandoned',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        reason,
        itemCount: cart.items.length,
        totalValue: cart.totalAmount.toNumber(),
        timeToAbandon: this.calculateAbandonmentTime(cart),
        lastActivity: cart.lastActivityAt,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track promotion application
   */
  trackPromotionApplied(
    cart: Cart,
    promotionCode: string,
    discountAmount: number,
  ): void {
    this.metrics.promotionApplied++;

    this.trackEvent({
      event: 'promotion_applied',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        promotionCode,
        discountAmount,
        cartValue: cart.subtotal.toNumber(),
        discountPercentage: (discountAmount / cart.subtotal.toNumber()) * 100,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track price changes detected
   */
  trackPriceChanges(cart: Cart, priceChanges: any[]): void {
    this.metrics.priceChangeDetected++;

    this.trackEvent({
      event: 'price_changes_detected',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        changeCount: priceChanges.length,
        totalImpact: priceChanges.reduce(
          (sum, change) => sum + change.impact,
          0,
        ),
        priceIncreases: priceChanges.filter((c) => c.priceIncrease).length,
        priceDecreases: priceChanges.filter((c) => !c.priceIncrease).length,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track cart merge operation
   */
  trackCartMerged(
    sourceCartId: string,
    targetCartId: string,
    userId: string,
    mergeResults: any[],
  ): void {
    this.trackEvent({
      event: 'cart_merged',
      cartId: targetCartId,
      userId,
      metadata: {
        sourceCartId,
        mergedItemCount: mergeResults.filter((r) => r.success).length,
        failedItemCount: mergeResults.filter((r) => !r.success).length,
        mergeSuccess: mergeResults.every((r) => r.success),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track inventory shortage
   */
  trackInventoryShortage(cart: Cart, unavailableItems: any[]): void {
    this.trackEvent({
      event: 'inventory_shortage',
      cartId: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      metadata: {
        unavailableCount: unavailableItems.length,
        affectedVariants: unavailableItems.map((item) => item.variantId),
        totalAffectedValue: unavailableItems.reduce(
          (sum, item) => sum + item.totalPrice,
          0,
        ),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): CartMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      cartCreated: 0,
      itemAdded: 0,
      itemRemoved: 0,
      cartConverted: 0,
      cartAbandoned: 0,
      promotionApplied: 0,
      priceChangeDetected: 0,
    };
  }

  /**
   * Get conversion rate
   */
  getConversionRate(): number {
    if (this.metrics.cartCreated === 0) return 0;
    return (this.metrics.cartConverted / this.metrics.cartCreated) * 100;
  }

  /**
   * Get abandonment rate
   */
  getAbandonmentRate(): number {
    if (this.metrics.cartCreated === 0) return 0;
    return (this.metrics.cartAbandoned / this.metrics.cartCreated) * 100;
  }

  /**
   * Get average items per cart
   */
  getAverageItemsPerCart(): number {
    if (this.metrics.cartCreated === 0) return 0;
    return this.metrics.itemAdded / this.metrics.cartCreated;
  }

  // Private helper methods

  private trackEvent(data: CartAnalyticsData): void {
    // In production, this would send to analytics service (Google Analytics, Mixpanel, etc.)
    this.logger.debug(`Analytics Event: ${data.event}`, {
      cartId: data.cartId,
      userId: data.userId,
      metadata: data.metadata,
    });

    // For now, just log the event
    // In production, you might:
    // - Send to Google Analytics
    // - Send to Mixpanel
    // - Store in analytics database
    // - Send to data warehouse
  }

  private calculateConversionTime(cart: Cart): number {
    // Calculate time from cart creation to conversion in minutes
    const now = new Date();
    const createdAt = cart.createdAt;
    return Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));
  }

  private calculateAbandonmentTime(cart: Cart): number {
    // Calculate time from last activity to abandonment in minutes
    const now = new Date();
    const lastActivity = cart.lastActivityAt;
    return Math.round((now.getTime() - lastActivity.getTime()) / (1000 * 60));
  }
}
