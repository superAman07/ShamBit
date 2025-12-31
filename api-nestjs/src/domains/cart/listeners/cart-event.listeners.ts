import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CartCreatedEvent,
  CartItemAddedEvent,
  CartItemRemovedEvent,
  CartItemQuantityUpdatedEvent,
  CartMergedEvent,
  CartExpiredEvent,
  CartConvertedEvent,
  CartPromotionAppliedEvent,
  CartPriceChangesDetectedEvent,
} from '../events/cart.events';

@Injectable()
export class CartEventListeners {
  private readonly logger = new Logger(CartEventListeners.name);

  @OnEvent('cart.created')
  async handleCartCreated(event: CartCreatedEvent) {
    this.logger.log(
      `Cart created: ${event.cartId} for ${event.userId || event.sessionId}`,
    );

    // Send welcome notification for first-time users
    // Track cart creation analytics
    // Log audit trail
  }

  @OnEvent('cart.item_added')
  async handleItemAdded(event: CartItemAddedEvent) {
    this.logger.log(
      `Item added to cart: ${event.cartId}, item: ${event.item.variantId}`,
    );

    // Update user preferences based on added items
    // Track product interest analytics
    // Send abandoned cart reminders (scheduled)
  }

  @OnEvent('cart.item_removed')
  async handleItemRemoved(event: CartItemRemovedEvent) {
    this.logger.log(
      `Item removed from cart: ${event.cartId}, item: ${event.item.variantId}`,
    );

    // Track removal reasons
    // Update recommendation engine
  }

  @OnEvent('cart.item_quantity_updated')
  async handleQuantityUpdated(event: CartItemQuantityUpdatedEvent) {
    this.logger.log(
      `Item quantity updated in cart: ${event.cartId}, item: ${event.item.variantId}, old: ${event.oldQuantity}, new: ${event.newQuantity}`,
    );

    // Track quantity change patterns
    // Update inventory demand forecasting
  }

  @OnEvent('cart.promotion_applied')
  async handlePromotionApplied(event: CartPromotionAppliedEvent) {
    this.logger.log(
      `Promotion applied to cart: ${event.cartId}, promotion: ${event.promotionCode}`,
    );

    // Track promotion effectiveness
    // Update user promotion preferences
  }

  @OnEvent('cart.price_changes_detected')
  async handlePriceChanges(event: CartPriceChangesDetectedEvent) {
    this.logger.log(
      `Price changes detected in cart: ${event.cartId}, changes: ${event.priceChanges.length}`,
    );

    // Notify user about price changes
    // Track price volatility
  }

  @OnEvent('cart.expired')
  async handleCartExpired(event: CartExpiredEvent) {
    this.logger.log(`Cart expired: ${event.cartId}`);

    // Send cart recovery email
    // Track abandonment patterns
    // Clean up related data
  }

  @OnEvent('cart.converted')
  async handleCartConverted(event: CartConvertedEvent) {
    this.logger.log(
      `Cart converted to order: ${event.cartId} -> ${event.orderId}`,
    );

    // Track conversion metrics
    // Update customer lifetime value
    // Send order confirmation
  }

  @OnEvent('cart.merged')
  async handleCartMerged(event: CartMergedEvent) {
    this.logger.log(
      `Carts merged: ${event.sourceCartId} -> ${event.targetCartId}`,
    );

    // Track merge success rate
    // Update user session data
  }

  @OnEvent('cart.security_violation')
  async handleSecurityViolation(event: any) {
    this.logger.warn(`Security violation in cart: ${event.cartId}`);

    // Alert security team
    // Apply temporary restrictions
    // Log security incident
  }

  @OnEvent('cart.abuse_detected')
  async handleAbuseDetected(event: any) {
    this.logger.warn(`Abuse detected in cart: ${event.cartId}`);

    // Apply rate limiting
    // Flag user account for review
    // Log abuse patterns
  }

  @OnEvent('inventory.reservation_failed')
  async handleReservationFailed(event: any) {
    this.logger.warn(`Inventory reservation failed: ${event.itemId}`);

    // Notify user about unavailability
    // Suggest alternatives
    // Update demand forecasting
  }

  @OnEvent('inventory.reservations_expired')
  async handleReservationsExpired(event: any) {
    this.logger.log(`Inventory reservations expired for cart: ${event.cartId}`);

    // Notify user about expiry
    // Offer to extend reservation
    // Track reservation patterns
  }
}
