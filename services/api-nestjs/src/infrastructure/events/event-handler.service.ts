import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../observability/logger.service';
import { DomainEvent } from './event.service';

@Injectable()
export class EventHandlerService implements OnModuleInit {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Product Events
    this.eventEmitter.on('product.created', this.handleProductCreated.bind(this));
    this.eventEmitter.on('product.updated', this.handleProductUpdated.bind(this));
    this.eventEmitter.on('product.submitted_for_approval', this.handleProductSubmittedForApproval.bind(this));
    this.eventEmitter.on('product.approval_status_changed', this.handleProductApprovalStatusChanged.bind(this));

    // Inventory Events
    this.eventEmitter.on('inventory.stock_updated', this.handleStockUpdated.bind(this));
    this.eventEmitter.on('inventory.low_stock_alert', this.handleLowStockAlert.bind(this));
    this.eventEmitter.on('inventory.stock_reserved', this.handleStockReserved.bind(this));
    this.eventEmitter.on('inventory.reservation_released', this.handleReservationReleased.bind(this));
    this.eventEmitter.on('inventory.reservation_confirmed', this.handleReservationConfirmed.bind(this));

    // Order Events
    this.eventEmitter.on('order.created', this.handleOrderCreated.bind(this));
    this.eventEmitter.on('order.payment_processing', this.handleOrderPaymentProcessing.bind(this));
    this.eventEmitter.on('order.payment_confirmed', this.handleOrderPaymentConfirmed.bind(this));
    this.eventEmitter.on('order.cancelled', this.handleOrderCancelled.bind(this));

    // Promotion Events
    this.eventEmitter.on('promotion.created', this.handlePromotionCreated.bind(this));
    this.eventEmitter.on('promotion.activated', this.handlePromotionActivated.bind(this));
    this.eventEmitter.on('promotion.used', this.handlePromotionUsed.bind(this));
    this.eventEmitter.on('promotion.usage_limit_reached', this.handlePromotionUsageLimitReached.bind(this));

    // Generic domain event handler for logging
    this.eventEmitter.on('domain.event', this.handleDomainEvent.bind(this));
  }

  // Product Event Handlers
  private async handleProductCreated(event: any) {
    this.logger.logBusinessEvent('product_created', event.productId, 'Product', {
      sellerId: event.sellerId,
      categoryId: event.categoryId,
    });
    
    // Additional side effects:
    // - Send notification to admin for approval queue
    // - Update search index
    // - Track analytics
  }

  private async handleProductUpdated(event: any) {
    this.logger.logBusinessEvent('product_updated', event.productId, 'Product', {
      sellerId: event.sellerId,
      changes: event.changes,
    });
    
    // Additional side effects:
    // - Update search index
    // - Invalidate cache
    // - Notify watchers
  }

  private async handleProductSubmittedForApproval(event: any) {
    this.logger.logBusinessEvent('product_submitted_for_approval', event.productId, 'Product', {
      sellerId: event.sellerId,
    });
    
    // Additional side effects:
    // - Send notification to admin
    // - Add to approval queue
    // - Send confirmation to seller
  }

  private async handleProductApprovalStatusChanged(event: any) {
    this.logger.logBusinessEvent('product_approval_status_changed', event.productId, 'Product', {
      sellerId: event.sellerId,
      status: event.status,
      adminId: event.adminId,
      reason: event.reason,
    });
    
    // Additional side effects:
    // - Send notification to seller
    // - Update search index if approved
    // - Track approval metrics
  }

  // Inventory Event Handlers
  private async handleStockUpdated(event: any) {
    this.logger.logBusinessEvent('stock_updated', event.variantId, 'Inventory', {
      sellerId: event.sellerId,
      previousQuantity: event.previousQuantity,
      newQuantity: event.newQuantity,
      change: event.change,
      reason: event.reason,
    });
    
    // Additional side effects:
    // - Update search index with availability
    // - Notify interested buyers if back in stock
    // - Update analytics
  }

  private async handleLowStockAlert(event: any) {
    this.logger.warn('Low stock alert', {
      variantId: event.variantId,
      sellerId: event.sellerId,
      currentQuantity: event.currentQuantity,
      threshold: event.threshold,
    });
    
    // Additional side effects:
    // - Send notification to seller
    // - Create alert in admin dashboard
    // - Trigger auto-reorder if configured
  }

  private async handleStockReserved(event: any) {
    this.logger.logBusinessEvent('stock_reserved', event.variantId, 'Inventory', {
      reservationId: event.reservationId,
      sellerId: event.sellerId,
      quantity: event.quantity,
      orderId: event.orderId,
    });
  }

  private async handleReservationReleased(event: any) {
    this.logger.logBusinessEvent('reservation_released', event.variantId, 'Inventory', {
      reservationId: event.reservationId,
      sellerId: event.sellerId,
      quantity: event.quantity,
      reason: event.reason,
    });
  }

  private async handleReservationConfirmed(event: any) {
    this.logger.logBusinessEvent('reservation_confirmed', event.variantId, 'Inventory', {
      reservationId: event.reservationId,
      sellerId: event.sellerId,
      quantity: event.quantity,
      orderId: event.orderId,
    });
  }

  // Order Event Handlers
  private async handleOrderCreated(event: any) {
    this.logger.logBusinessEvent('order_created', event.orderId, 'Order', {
      orderNumber: event.orderNumber,
      userId: event.userId,
      totalAmount: event.totalAmount,
      itemCount: event.itemCount,
    });
    
    // Additional side effects:
    // - Send order confirmation email
    // - Update user analytics
    // - Track conversion metrics
  }

  private async handleOrderPaymentProcessing(event: any) {
    this.logger.logBusinessEvent('order_payment_processing', event.orderId, 'Order', {
      userId: event.userId,
      totalAmount: event.totalAmount,
      reservationCount: event.reservationIds?.length,
    });
    
    // Additional side effects:
    // - Set payment timeout
    // - Send processing notification
  }

  private async handleOrderPaymentConfirmed(event: any) {
    this.logger.logBusinessEvent('order_payment_confirmed', event.orderId, 'Order', {
      orderNumber: event.orderNumber,
      userId: event.userId,
      paymentId: event.paymentId,
      totalAmount: event.totalAmount,
    });
    
    // Additional side effects:
    // - Send payment confirmation email
    // - Trigger fulfillment process
    // - Update revenue metrics
    // - Send notification to sellers
  }

  private async handleOrderCancelled(event: any) {
    this.logger.logBusinessEvent('order_cancelled', event.orderId, 'Order', {
      orderNumber: event.orderNumber,
      userId: event.userId,
      reason: event.reason,
    });
    
    // Additional side effects:
    // - Send cancellation email
    // - Process refund if payment was made
    // - Update cancellation metrics
  }

  // Promotion Event Handlers
  private async handlePromotionCreated(event: any) {
    this.logger.logBusinessEvent('promotion_created', event.promotionId, 'Promotion', {
      promotionName: event.promotionName,
      createdBy: event.createdBy,
    });
  }

  private async handlePromotionActivated(event: any) {
    this.logger.logBusinessEvent('promotion_activated', event.promotionId, 'Promotion', {
      promotionName: event.promotionName,
      activatedBy: event.activatedBy,
    });
    
    // Additional side effects:
    // - Send notification to marketing team
    // - Update promotion banners
    // - Notify eligible users
  }

  private async handlePromotionUsed(event: any) {
    this.logger.logBusinessEvent('promotion_used', event.promotionId, 'Promotion', {
      promotionName: event.promotionName,
      userId: event.userId,
      orderId: event.orderId,
      discountAmount: event.discountAmount,
    });
    
    // Additional side effects:
    // - Update promotion analytics
    // - Track user behavior
  }

  private async handlePromotionUsageLimitReached(event: any) {
    this.logger.warn('Promotion usage limit reached', {
      promotionId: event.promotionId,
      promotionName: event.promotionName,
    });
    
    // Additional side effects:
    // - Send notification to marketing team
    // - Update promotion status in UI
  }

  // Generic domain event handler
  private async handleDomainEvent(event: DomainEvent) {
    this.logger.debug('Domain event processed', {
      eventId: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      correlationId: event.metadata.correlationId,
    });
    
    // Additional cross-cutting concerns:
    // - Webhook notifications
    // - External system integrations
    // - Audit logging
    // - Metrics collection
  }
}