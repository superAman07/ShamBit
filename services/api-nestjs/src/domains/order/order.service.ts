import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { OrderRepository } from './order.repository';
import { OrderItemService } from './order-item.service';
import { OrderStateMachine } from './order-state-machine.service';
import { InventoryService } from '../inventory/inventory.service';
import { CommissionService } from '../pricing/commission.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import { UserRole } from '../../common/types';

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED',
}

export interface OrderItem {
  variantId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Immutable snapshots
  productSnapshot: {
    id: string;
    name: string;
    description: string;
    slug: string;
    categoryId: string;
    brandId: string;
  };
  variantSnapshot: {
    id: string;
    sku: string;
    attributeValues: Record<string, any>;
  };
  commissionSnapshot: {
    baseAmount: number;
    commissionAmount: number;
    commissionRate: number;
    netAmount: number;
  };
}

export interface CreateOrderDto {
  items: {
    variantId: string;
    sellerId: string;
    quantity: number;
  }[];
  shippingAddressId: string;
  billingAddressId?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddressId: string;
  billingAddressId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemService: OrderItemService,
    private readonly orderStateMachine: OrderStateMachine,
    private readonly inventoryService: InventoryService,
    private readonly commissionService: CommissionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    this.logger.log('OrderService.createOrder', { createOrderDto, userId });

    // Validate order items
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Create order with DRAFT status
    const order = await this.orderRepository.create({
      orderNumber,
      userId,
      status: OrderStatus.DRAFT,
      shippingAddressId: createOrderDto.shippingAddressId,
      billingAddressId: createOrderDto.billingAddressId || createOrderDto.shippingAddressId,
      notes: createOrderDto.notes,
      subtotal: 0,
      shippingCost: 0,
      taxAmount: 0,
      totalAmount: 0,
    });

    try {
      // Process order items with snapshots
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const itemDto of createOrderDto.items) {
        const orderItem = await this.createOrderItemWithSnapshots(
          order.id,
          itemDto,
          userId,
        );
        orderItems.push(orderItem);
        subtotal += orderItem.totalPrice;
      }

      // Calculate shipping and tax (simplified for now)
      const shippingCost = this.calculateShippingCost(orderItems);
      const taxAmount = this.calculateTax(subtotal, shippingCost);
      const totalAmount = subtotal + shippingCost + taxAmount;

      // Update order totals
      const updatedOrder = await this.orderRepository.update(order.id, {
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
      });

      // Emit order created event
      this.eventEmitter.emit('order.created', {
        orderId: order.id,
        orderNumber,
        userId,
        totalAmount,
        itemCount: orderItems.length,
        timestamp: new Date(),
      });

      this.logger.log('Order created successfully', {
        orderId: order.id,
        orderNumber,
        totalAmount,
      });

      return { ...updatedOrder, items: orderItems };
    } catch (error) {
      // Cleanup order if item processing fails
      await this.orderRepository.delete(order.id);
      throw error;
    }
  }

  async processPayment(orderId: string, userId: string): Promise<Order> {
    this.logger.log('OrderService.processPayment', { orderId, userId });

    const order = await this.findById(orderId, userId);

    // Validate order status
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Order is not in draft status');
    }

    // Reserve inventory for all items
    const reservationIds: string[] = [];
    const reservationExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    try {
      for (const item of order.items) {
        const reservationId = await this.inventoryService.reserveStock({
          variantId: item.variantId,
          sellerId: item.sellerId,
          quantity: item.quantity,
          orderId: order.id,
          expiresAt: reservationExpiry,
        });
        reservationIds.push(reservationId);
      }

      // Update order status to pending payment
      const updatedOrder = await this.orderRepository.update(orderId, {
        status: OrderStatus.PENDING_PAYMENT,
      });

      // Store reservation IDs for later confirmation/release
      await this.orderRepository.updateMetadata(orderId, {
        reservationIds,
        reservationExpiry: reservationExpiry.toISOString(),
      });

      // Emit payment processing event
      this.eventEmitter.emit('order.payment_processing', {
        orderId,
        userId,
        totalAmount: order.totalAmount,
        reservationIds,
        timestamp: new Date(),
      });

      this.logger.log('Order payment processing initiated', {
        orderId,
        reservationCount: reservationIds.length,
      });

      return { ...updatedOrder, items: order.items };
    } catch (error) {
      // Release any successful reservations
      for (const reservationId of reservationIds) {
        try {
          await this.inventoryService.releaseReservation(
            reservationId,
            'Order payment processing failed',
          );
        } catch (releaseError) {
          this.logger.error('Failed to release reservation', {
            reservationId,
            error: releaseError,
          });
        }
      }
      throw error;
    }
  }

  async confirmPayment(orderId: string, paymentId: string): Promise<Order> {
    this.logger.log('OrderService.confirmPayment', { orderId, paymentId });

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    // Get reservation IDs from metadata
    const metadata = await this.orderRepository.getMetadata(orderId);
    const reservationIds = metadata?.reservationIds || [];

    try {
      // Confirm all inventory reservations
      for (const reservationId of reservationIds) {
        await this.inventoryService.confirmReservation(
          reservationId,
          `Payment confirmed for order ${order.orderNumber}`,
        );
      }

      // Update order status
      const updatedOrder = await this.orderRepository.update(orderId, {
        status: OrderStatus.PAYMENT_CONFIRMED,
        paymentId,
        paidAt: new Date(),
      });

      // Clear reservation metadata
      await this.orderRepository.updateMetadata(orderId, {
        reservationIds: null,
        reservationExpiry: null,
      });

      // Emit payment confirmed event
      this.eventEmitter.emit('order.payment_confirmed', {
        orderId,
        orderNumber: order.orderNumber,
        userId: order.userId,
        paymentId,
        totalAmount: order.totalAmount,
        timestamp: new Date(),
      });

      this.logger.log('Order payment confirmed', { orderId, paymentId });

      return updatedOrder;
    } catch (error) {
      this.logger.error('Failed to confirm payment', { orderId, error });
      throw new BadRequestException('Failed to confirm payment');
    }
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string,
    userRole?: UserRole,
  ): Promise<Order> {
    this.logger.log('OrderService.cancelOrder', { orderId, userId, reason });

    const order = await this.findById(orderId, userId, userRole);

    // Validate cancellation is allowed
    if (!this.orderStateMachine.canTransition(order.status, OrderStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} status`);
    }

    // Release inventory reservations if they exist
    const metadata = await this.orderRepository.getMetadata(orderId);
    const reservationIds = metadata?.reservationIds || [];

    for (const reservationId of reservationIds) {
      try {
        await this.inventoryService.releaseReservation(reservationId, reason);
      } catch (error) {
        this.logger.error('Failed to release reservation during cancellation', {
          reservationId,
          error,
        });
      }
    }

    // Update order status
    const updatedOrder = await this.orderRepository.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    // Emit order cancelled event
    this.eventEmitter.emit('order.cancelled', {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.userId,
      reason,
      timestamp: new Date(),
    });

    this.logger.log('Order cancelled successfully', { orderId, reason });

    return updatedOrder;
  }

  async findById(orderId: string, userId?: string, userRole?: UserRole): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (userId && userRole !== UserRole.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('Access denied to this order');
    }

    return order;
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<Order[]> {
    return this.orderRepository.findByUser(userId, page, limit);
  }

  private async createOrderItemWithSnapshots(
    orderId: string,
    itemDto: CreateOrderDto['items'][0],
    userId: string,
  ): Promise<OrderItem> {
    // This would fetch product, variant, and pricing data
    // and create immutable snapshots for the order item
    // Implementation depends on your product and variant services
    
    // For now, returning a placeholder structure
    return {
      variantId: itemDto.variantId,
      sellerId: itemDto.sellerId,
      quantity: itemDto.quantity,
      unitPrice: 0, // Would be fetched from pricing service
      totalPrice: 0, // quantity * unitPrice
      productSnapshot: {
        id: '',
        name: '',
        description: '',
        slug: '',
        categoryId: '',
        brandId: '',
      },
      variantSnapshot: {
        id: itemDto.variantId,
        sku: '',
        attributeValues: {},
      },
      commissionSnapshot: {
        baseAmount: 0,
        commissionAmount: 0,
        commissionRate: 0,
        netAmount: 0,
      },
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  private calculateShippingCost(items: OrderItem[]): number {
    // Simplified shipping calculation
    // In reality, this would consider weight, dimensions, location, etc.
    return items.length * 50; // ₹50 per item
  }

  private calculateTax(subtotal: number, shippingCost: number): number {
    // Simplified tax calculation (18% GST)
    return (subtotal + shippingCost) * 0.18;
  }
}