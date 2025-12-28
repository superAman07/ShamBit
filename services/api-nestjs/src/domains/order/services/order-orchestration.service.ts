import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InventoryReservationService } from '../../inventory/services/inventory-reservation.service';
import { OrderRepository } from '../repositories/order.repository';
import { OrderAuditService } from './order-audit.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderValidationService } from './order-validation.service';

import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatus, OrderItemStatus } from '../enums/order-status.enum';

import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderCreatedEvent, OrderFailedEvent } from '../events/order.events';

export interface OrderCreationResult {
  success: boolean;
  order?: Order;
  error?: string;
  validationErrors?: string[];
}

export interface OrderCreationContext {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  reservations: Map<string, string>; // itemId -> reservationKey
  rollbackActions: (() => Promise<void>)[];
}

@Injectable()
export class OrderOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly inventoryReservationService: InventoryReservationService,
    private readonly orderRepository: OrderRepository,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderPricingService: OrderPricingService,
    private readonly orderValidationService: OrderValidationService,
  ) {}

  /**
   * CRITICAL: Order creation orchestration with full compensation logic
   * This is the heart of the commerce system - handles all failure scenarios
   */
  async createOrder(createOrderDto: CreateOrderDto, createdBy: string): Promise<OrderCreationResult> {
    this.logger.log('OrderOrchestrationService.createOrder', {
      customerId: createOrderDto.customerId,
      itemCount: createOrderDto.items.length,
      createdBy,
    });

    const context: OrderCreationContext = {
      orderId: '', // Will be set after order creation
      customerId: createOrderDto.customerId,
      items: [],
      reservations: new Map(),
      rollbackActions: [],
    };

    try {
      // PHASE 1: Pre-validation
      await this.validateOrderCreation(createOrderDto, context);

      // PHASE 2: Price calculation and locking
      const pricingResult = await this.calculateAndLockPricing(createOrderDto, context);

      // PHASE 3: Inventory reservation (CRITICAL - must be atomic)
      await this.reserveInventory(createOrderDto, context);

      // PHASE 4: Order persistence (within transaction)
      const order = await this.persistOrder(createOrderDto, pricingResult, context, createdBy);

      // PHASE 5: Post-creation processing
      await this.postOrderCreation(order, context);

      this.logger.log('Order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      });

      return {
        success: true,
        order,
      };

    } catch (error) {
      this.logger.error('Order creation failed', error, {
        customerId: createOrderDto.customerId,
        orderId: context.orderId,
      });

      // CRITICAL: Execute compensation logic
      await this.executeCompensation(context, error.message);

      // Emit failure event
      this.eventEmitter.emit('order.failed', new OrderFailedEvent(
        context.customerId,
        createOrderDto.items.map(i => i.variantId),
        error.message,
        createdBy
      ));

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // PHASE 1: PRE-VALIDATION
  // ============================================================================

  private async validateOrderCreation(
    createOrderDto: CreateOrderDto,
    context: OrderCreationContext
  ): Promise<void> {
    this.logger.log('OrderOrchestrationService.validateOrderCreation');

    // Validate order structure
    const structuralValidation = await this.orderValidationService.validateOrderStructure(createOrderDto);
    if (!structuralValidation.isValid) {
      throw new Error(`Order validation failed: ${structuralValidation.errors.join(', ')}`);
    }

    // Validate customer exists and is active
    await this.orderValidationService.validateCustomer(createOrderDto.customerId);

    // Validate all variants exist and are available
    await this.orderValidationService.validateVariants(createOrderDto.items);

    // Validate inventory availability (pre-check)
    await this.orderValidationService.validateInventoryAvailability(createOrderDto.items);

    // Validate business rules (limits, restrictions, etc.)
    await this.orderValidationService.validateBusinessRules(createOrderDto);
  }

  // ============================================================================
  // PHASE 2: PRICING CALCULATION & LOCKING
  // ============================================================================

  private async calculateAndLockPricing(
    createOrderDto: CreateOrderDto,
    context: OrderCreationContext
  ): Promise<any> {
    this.logger.log('OrderOrchestrationService.calculateAndLockPricing');

    // Calculate item prices (with promotions, discounts)
    const itemPricing = await this.orderPricingService.calculateItemPricing(
      createOrderDto.items,
      createOrderDto.customerId
    );

    // Calculate taxes
    const taxCalculation = await this.orderPricingService.calculateTaxes(
      itemPricing,
      createOrderDto.shippingAddress
    );

    // Calculate shipping
    const shippingCalculation = await this.orderPricingService.calculateShipping(
      itemPricing,
      createOrderDto.shippingAddress,
      createOrderDto.shippingMethod
    );

    // Apply discounts and promotions
    const discountCalculation = await this.orderPricingService.applyDiscounts(
      itemPricing,
      createOrderDto.promotionCodes || [],
      createOrderDto.customerId
    );

    // Lock prices (prevent changes during order processing)
    const priceLock = await this.orderPricingService.lockPrices(
      itemPricing,
      taxCalculation,
      shippingCalculation,
      discountCalculation
    );

    // Add rollback action for price lock
    context.rollbackActions.push(async () => {
      await this.orderPricingService.releasePriceLock(priceLock.lockId);
    });

    return {
      itemPricing,
      taxCalculation,
      shippingCalculation,
      discountCalculation,
      priceLock,
    };
  }

  // ============================================================================
  // PHASE 3: INVENTORY RESERVATION (CRITICAL)
  // ============================================================================

  private async reserveInventory(
    createOrderDto: CreateOrderDto,
    context: OrderCreationContext
  ): Promise<void> {
    this.logger.log('OrderOrchestrationService.reserveInventory');

    const reservationExpiry = new Date();
    reservationExpiry.setMinutes(reservationExpiry.getMinutes() + 30); // 30-minute reservation

    for (const itemDto of createOrderDto.items) {
      try {
        // Generate unique reservation key
        const reservationKey = `order_${Date.now()}_${itemDto.variantId}_${Math.random().toString(36).substr(2, 9)}`;

        // Find inventory for this variant/seller combination
        const inventory = await this.findInventoryForItem(itemDto);
        if (!inventory) {
          throw new Error(`No inventory found for variant ${itemDto.variantId}`);
        }

        // SAFETY: Validate reservation requirements before creation
        InventoryValidators.validateReservationExists(reservationKey);
        InventoryValidators.validateInventoryNonNegative(
          inventory.availableQuantity, 
          itemDto.quantity
        );

        // Reserve inventory
        const reservationResult = await this.inventoryReservationService.reserveInventory({
          inventoryId: inventory.id,
          quantity: itemDto.quantity,
          reservationKey,
          referenceType: 'ORDER',
          referenceId: 'PENDING', // Will be updated with actual order ID
          expiresAt: reservationExpiry,
          createdBy: createOrderDto.customerId,
          metadata: {
            variantId: itemDto.variantId,
            productId: itemDto.productId,
            customerId: createOrderDto.customerId,
          },
        });

        if (!reservationResult.success) {
          throw new Error(`Inventory reservation failed: ${reservationResult.error}`);
        }

        // Track reservation for rollback
        context.reservations.set(itemDto.variantId, reservationKey);

        // Add rollback action
        context.rollbackActions.push(async () => {
          await this.inventoryReservationService.releaseReservation(
            reservationKey,
            'SYSTEM',
            'Order creation failed - releasing reservation'
          );
        });

        this.logger.log('Inventory reserved successfully', {
          variantId: itemDto.variantId,
          quantity: itemDto.quantity,
          reservationKey,
        });

      } catch (error) {
        this.logger.error('Inventory reservation failed', error, {
          variantId: itemDto.variantId,
          quantity: itemDto.quantity,
        });
        throw error;
      }
    }
  }

  // ============================================================================
  // PHASE 4: ORDER PERSISTENCE (ATOMIC)
  // ============================================================================

  private async persistOrder(
    createOrderDto: CreateOrderDto,
    pricingResult: any,
    context: OrderCreationContext,
    createdBy: string
  ): Promise<Order> {
    this.logger.log('OrderOrchestrationService.persistOrder');

    return this.prisma.$transaction(async (tx) => {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const orderData = {
        orderNumber,
        customerId: createOrderDto.customerId,
        status: OrderStatus.PENDING,
        subtotal: pricingResult.itemPricing.subtotal,
        taxAmount: pricingResult.taxCalculation.totalTax,
        shippingAmount: pricingResult.shippingCalculation.totalShipping,
        discountAmount: pricingResult.discountCalculation.totalDiscount,
        totalAmount: pricingResult.priceLock.finalTotal,
        currency: createOrderDto.currency || 'USD',
        shippingAddress: createOrderDto.shippingAddress,
        billingAddress: createOrderDto.billingAddress,
        shippingMethod: createOrderDto.shippingMethod,
        expiresAt: this.calculateOrderExpiry(),
        metadata: createOrderDto.metadata || {},
        createdBy,
      };

      const order = await this.orderRepository.create(orderData, tx);
      context.orderId = order.id;

      // Create order items with product snapshots
      for (const itemDto of createOrderDto.items) {
        const reservationKey = context.reservations.get(itemDto.variantId);
        const itemPricing = pricingResult.itemPricing.items.find(
          (i: any) => i.variantId === itemDto.variantId
        );

        // Get product snapshot
        const productSnapshot = await this.createProductSnapshot(itemDto.variantId);

        const orderItemData = {
          orderId: order.id,
          variantId: itemDto.variantId,
          productId: itemDto.productId,
          sellerId: itemDto.sellerId,
          quantity: itemDto.quantity,
          unitPrice: itemPricing.unitPrice,
          totalPrice: itemPricing.totalPrice,
          reservationKey,
          status: OrderItemStatus.RESERVED,
          productSnapshot,
          metadata: itemDto.metadata || {},
        };

        const orderItem = await this.orderRepository.createItem(orderItemData, tx);
        context.items.push(orderItem);
      }

      // Update reservation references with actual order ID
      for (const [variantId, reservationKey] of context.reservations) {
        await this.updateReservationReference(reservationKey, order.id);
      }

      // Create audit log
      await this.orderAuditService.logAction(
        order.id,
        'CREATE',
        createdBy,
        null,
        order,
        'Order created',
        tx
      );

      return order;
    }, {
      isolationLevel: 'Serializable', // Highest isolation for order creation
    });
  }

  // ============================================================================
  // PHASE 5: POST-CREATION PROCESSING
  // ============================================================================

  private async postOrderCreation(order: Order, context: OrderCreationContext): Promise<void> {
    this.logger.log('OrderOrchestrationService.postOrderCreation', { orderId: order.id });

    try {
      // Emit order created event
      this.eventEmitter.emit('order.created', new OrderCreatedEvent(
        order.id,
        order.orderNumber,
        order.customerId,
        order.totalAmount,
        order.currency,
        context.items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        order.createdBy
      ));

      // Schedule order expiry job
      await this.scheduleOrderExpiry(order);

      // Trigger payment processing (async)
      await this.initiatePaymentProcessing(order);

      // Send order confirmation (async)
      this.sendOrderConfirmation(order).catch(error => {
        this.logger.error('Failed to send order confirmation', error, { orderId: order.id });
      });

    } catch (error) {
      this.logger.error('Post-order creation processing failed', error, { orderId: order.id });
      // Don't throw - order is already created successfully
    }
  }

  // ============================================================================
  // COMPENSATION LOGIC (CRITICAL)
  // ============================================================================

  private async executeCompensation(context: OrderCreationContext, reason: string): Promise<void> {
    this.logger.log('OrderOrchestrationService.executeCompensation', {
      orderId: context.orderId,
      rollbackActionsCount: context.rollbackActions.length,
      reason,
    });

    // Execute rollback actions in reverse order
    for (let i = context.rollbackActions.length - 1; i >= 0; i--) {
      try {
        await context.rollbackActions[i]();
      } catch (rollbackError) {
        this.logger.error('Rollback action failed', rollbackError, {
          orderId: context.orderId,
          actionIndex: i,
        });
        // Continue with other rollback actions
      }
    }

    // If order was partially created, mark it as failed
    if (context.orderId) {
      try {
        await this.orderRepository.markAsFailed(context.orderId, reason);
      } catch (error) {
        this.logger.error('Failed to mark order as failed', error, { orderId: context.orderId });
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async findInventoryForItem(itemDto: any): Promise<any> {
    // Implementation would find inventory for variant/seller combination
    // This is a placeholder - actual implementation would use InventoryService
    return { id: 'inventory-id' };
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  private calculateOrderExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30); // 30-minute payment window
    return expiry;
  }

  private async createProductSnapshot(variantId: string): Promise<any> {
    // Implementation would create immutable product snapshot
    // This is a placeholder - actual implementation would use ProductService
    return {
      productId: 'product-id',
      variantId,
      sku: 'SKU-123',
      productName: 'Product Name',
      // ... complete snapshot
    };
  }

  private async updateReservationReference(reservationKey: string, orderId: string): Promise<void> {
    // Update reservation with actual order ID
    // Implementation would update the reservation record
  }

  private async scheduleOrderExpiry(order: Order): Promise<void> {
    // Schedule job to handle order expiry
    // Implementation would use job queue
  }

  private async initiatePaymentProcessing(order: Order): Promise<void> {
    // Initiate payment processing workflow
    // Implementation would integrate with payment service
  }

  private async sendOrderConfirmation(order: Order): Promise<void> {
    // Send order confirmation email/notification
    // Implementation would use notification service
  }
}