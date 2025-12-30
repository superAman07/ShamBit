import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import { OrderRepository } from './repositories/order.repository';
import { OrderAuditService } from './services/order-audit.service.js';
import { OrderOrchestrationService } from './services/order-orchestration.service';

import { OrderFulfillmentService } from './services/order-fulfillment.service.js';
import { OrderRefundService } from './services/order-refund.service.js';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { InventoryValidators } from '../inventory/inventory.validators';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus, OrderItemStatus } from './enums/order-status.enum';
import { OrderPolicies } from './order.policies.js';
import { OrderValidators } from './order.validators';

import { CreateOrderDto } from './dtos/create-order.dto';
import { UpdateOrderDto, OrderStatusUpdateDto } from './dtos/update-order.dto.js';
import { CancelOrderDto } from './dtos/cancel-order.dto.js';
import { RefundOrderDto } from './dtos/refund-order.dto.js';



import {
  OrderUpdatedEvent,
  OrderStatusChangedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderExpiredEvent,
} from './events/order.events';

import { UserRole } from '../../common/types';

// Export types for use in other modules
export { OrderStatus, OrderItemStatus } from './enums/order-status.enum';
export { CreateOrderDto } from './dtos/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderOrchestrationService: OrderOrchestrationService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly orderRefundService: OrderRefundService,
    private readonly inventoryReservationService: InventoryReservationService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: any = {},
    pagination: any = {},
    includes: any = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('OrderService.findAll', { filters, pagination, userId });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(filters, userId, userRole);

    return this.orderRepository.findAll(enhancedFilters, pagination, includes);
  }

  async findById(
    id: string,
    includes: any = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    await this.checkOrderAccess(order, userId, userRole);

    return order;
  }

  async findByOrderNumber(
    orderNumber: string,
    includes: any = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Order> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    await this.checkOrderAccess(order, userId, userRole);

    return order;
  }

  async findByCustomer(
    customerId: string,
    filters: any = {},
    pagination: any = {},
    includes: any = {}
  ) {
    return this.orderRepository.findByCustomer(customerId, pagination);
  }

  // ============================================================================
  // ORDER CREATION (ORCHESTRATED)
  // ============================================================================

  async create(createOrderDto: CreateOrderDto, createdBy: string) {
    this.logger.log('OrderService.create', { createOrderDto, createdBy });

    // SAFETY: Validate all monetary values are properly formatted
    for (const item of createOrderDto.items) {
      OrderValidators.validateMonetaryValues(item.unitPrice || 0, 'item unit price');
    }

    // Validate permissions
    await this.validateOrderCreationPermissions(createOrderDto, createdBy);

    // Use orchestration service for complex order creation
    const result = await this.orderOrchestrationService.createOrder(createOrderDto, createdBy);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Order creation failed');
    }

    this.logger.log('Order created successfully', { orderId: result.order!.id });
    return result.order!;
  }

  // ============================================================================
  // ORDER UPDATES
  // ============================================================================

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    updatedBy: string
  ): Promise<Order> {
    this.logger.log('OrderService.update', { id, updateOrderDto, updatedBy });

    const existingOrder = await this.findById(id);

    // Check permissions
    await this.checkOrderAccess(existingOrder, updatedBy);

    // SAFETY: Validate order immutability after confirmation
    OrderValidators.validateOrderImmutability(existingOrder, updateOrderDto);

    // SAFETY: Validate currency immutability
    OrderValidators.validateCurrencyImmutability(existingOrder, updateOrderDto.currency);

    // Validate update rules
    await this.validateOrderUpdate(existingOrder);

    // Update order
    const updatedOrder = await this.orderRepository.update(id, {
      ...updateOrderDto,
      updatedBy,
    });

    // Create audit log
    await this.orderAuditService.logAction({
      orderId: id,
      action: 'UPDATE',
      userId: updatedBy,
      oldValues: existingOrder,
      newValues: updatedOrder,
      reason: 'Order updated',
    });

    // Emit event
    this.eventEmitter.emit('order.updated', new OrderUpdatedEvent(
      id,
      updatedOrder.orderNumber,
      updatedOrder.customerId,
      this.calculateChanges(existingOrder, updatedOrder),
      updatedBy
    ));

    this.logger.log('Order updated successfully', { orderId: id });
    return updatedOrder;
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  async updateStatus(
    id: string,
    statusUpdate: OrderStatusUpdateDto,
    updatedBy: string
  ): Promise<Order> {
    this.logger.log('OrderService.updateStatus', { id, statusUpdate, updatedBy });

    const order = await this.findById(id);

    // Check permissions
    await this.checkOrderAccess(order, updatedBy);

    // Validate status transition
    OrderValidators.validateStatusTransition(order.status, statusUpdate.status);

    // Apply business rules for status changes
    await this.validateStatusChange(order, statusUpdate.status);

    // Update status with side effects
    const updatedOrder = await this.executeStatusChange(order, statusUpdate, updatedBy);

    this.logger.log('Order status updated successfully', {
      orderId: id,
      from: order.status,
      to: statusUpdate.status,
    });

    return updatedOrder;
  }

  async confirm(id: string, confirmedBy: string): Promise<Order> {
    return this.updateStatus(id, { status: OrderStatus.CONFIRMED }, confirmedBy);
  }

  async ship(id: string, shippedBy: string, trackingNumber?: string): Promise<Order> {
    const order = await this.findById(id);
    
    // Use fulfillment service for shipping logic
    return this.orderFulfillmentService.shipOrder(order, shippedBy, trackingNumber);
  }

  async deliver(id: string, deliveredBy: string): Promise<Order> {
    return this.updateStatus(id, { status: OrderStatus.DELIVERED }, deliveredBy);
  }

  // ============================================================================
  // ORDER CANCELLATION
  // ============================================================================

  async cancel(
    id: string,
    cancelDto: CancelOrderDto,
    cancelledBy: string
  ): Promise<Order> {
    this.logger.log('OrderService.cancel', { id, cancelDto, cancelledBy });

    const order = await this.findById(id);

    // Check permissions
    await this.checkOrderAccess(order, cancelledBy);

    // Validate cancellation rules
    await this.validateOrderCancellation(order);

    return this.prisma.$transaction(async () => {
      // Update order status
      const cancelledOrder = await this.orderRepository.updateStatus(
        id,
        OrderStatus.CANCELLED,
        cancelledBy
      );

      // Cancel all order items
      for (const item of order.items || []) {
        await this.cancelOrderItem(item, cancelDto.reason, 'SYSTEM');
      }

      // Release all inventory reservations
      await this.releaseOrderReservations(order, 'Order cancelled');

      // Create audit log
      await this.orderAuditService.logAction({
        orderId: id,
        action: 'CANCEL',
        userId: cancelledBy,
        oldValues: order,
        newValues: cancelledOrder,
        reason: cancelDto.reason || 'Order cancelled',
      });

      // Emit event
      this.eventEmitter.emit('order.cancelled', new OrderCancelledEvent(
        id,
        order.orderNumber,
        order.customerId,
        cancelDto.reason || 'Order cancelled',
        cancelledBy
      ));

      this.logger.log('Order cancelled successfully', { orderId: id });
      return cancelledOrder;
    });
  }

  // ============================================================================
  // ORDER REFUNDS
  // ============================================================================

  async refund(
    id: string,
    refundDto: RefundOrderDto,
    refundedBy: string
  ) {
    this.logger.log('OrderService.refund', { id, refundDto, refundedBy });

    const order = await this.findById(id);

    // Check permissions
    await this.checkOrderAccess(order, refundedBy);

    // Use refund service for complex refund logic
    return this.orderRefundService.processRefund(order.id, refundDto);
  }

  // ============================================================================
  // ORDER EXPIRY HANDLING
  // ============================================================================

  async handleExpiredOrders(): Promise<{ processed: number; errors: string[] }> {
    this.logger.log('OrderService.handleExpiredOrders');

    const results = { processed: 0, errors: [] as string[] };

    try {
      // Find expired orders
      const expiredOrders = await this.orderRepository.findExpiredOrders();

      this.logger.log('Found expired orders', { count: expiredOrders.length });

      // Process each expired order
      for (const order of expiredOrders) {
        try {
          await this.expireOrder(order);
          results.processed++;
        } catch (error) {
          results.errors.push(`Order ${order.id}: ${error.message}`);
        }
      }

      this.logger.log('Expired orders processing completed', results);
      return results;

    } catch (error) {
      this.logger.error('Failed to process expired orders', error);
      results.errors.push(error.message);
      return results;
    }
  }

  private async expireOrder(order: Order): Promise<void> {
    this.logger.log('OrderService.expireOrder', { orderId: order.id });

    return this.prisma.$transaction(async () => {
      // Cancel the order
      await this.orderRepository.updateStatus(
        order.id,
        OrderStatus.CANCELLED,
        'SYSTEM'
      );

      // Release inventory reservations
      await this.releaseOrderReservations(order, 'Order expired');

      // Create audit log
      await this.orderAuditService.logAction({
        orderId: order.id,
        action: 'EXPIRE',
        userId: 'SYSTEM',
        oldValues: order,
        newValues: { ...order, status: OrderStatus.CANCELLED },
        reason: 'Order expired',
      });

      // Emit event
      this.eventEmitter.emit('order.expired', new OrderExpiredEvent(
        order.id,
        order.orderNumber,
        order.customerId,
        order.expiresAt!
      ));
    });
  }

  // ============================================================================
  // MULTI-SELLER ORDER SPLITTING
  // ============================================================================

  async splitMultiSellerOrder(order: Order): Promise<Order[]> {
    this.logger.log('OrderService.splitMultiSellerOrder', { orderId: order.id });

    if (!order.isMultiSeller()) {
      throw new BadRequestException('Order does not require splitting');
    }

    const sellers = order.getSellers();
    const childOrders: Order[] = [];

    return this.prisma.$transaction(async () => {
      // Mark parent order as split
      await this.orderRepository.update(order.id, { isSplit: true });

      // Create child orders for each seller
      for (const sellerId of sellers) {
        const sellerItems = order.getItemsBySeller(sellerId);
        const sellerSubtotal = order.getSubtotalBySeller(sellerId);

        // Calculate proportional amounts
        const proportion = sellerSubtotal / order.subtotal;
        const sellerTax = Math.round(order.taxAmount * proportion * 100) / 100;
        const sellerShipping = Math.round(order.shippingAmount * proportion * 100) / 100;
        const sellerDiscount = Math.round(order.discountAmount * proportion * 100) / 100;
        const sellerTotal = sellerSubtotal + sellerTax + sellerShipping - sellerDiscount;

        const childOrderData = {
          orderNumber: `${order.orderNumber}-${sellerId.slice(-4)}`,
          userId: order.customerId,
          status: order.status,
          shippingAddressId: order.shippingAddress ? 'temp-id' : '',
          billingAddressId: order.billingAddress ? 'temp-id' : '',
          notes: order.notes,
          totalAmount: sellerSubtotal,
          discountAmount: sellerDiscount,
          taxAmount: sellerTax,
          shippingAmount: sellerShipping,
          finalAmount: sellerTotal,
        };

        const childOrder = await this.orderRepository.create(childOrderData);
        childOrders.push(childOrder);
      }

      this.logger.log('Multi-seller order split successfully', {
        parentOrderId: order.id,
        childOrderCount: childOrders.length,
      });

      return childOrders;
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyAccessFilters(
    filters: any,
    userId?: string,
    userRole?: UserRole
  ): Promise<any> {
    // Apply role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      return { ...filters, customerId: userId };
    }

    if (userRole === UserRole.SELLER) {
      return { ...filters, sellerId: userId };
    }

    return filters;
  }

  private async checkOrderAccess(
    order: Order,
    userId?: string,
    userRole?: UserRole
  ): Promise<void> {
    if (!OrderPolicies.canAccess(userId || '', userRole || '', order)) {
      throw new ForbiddenException('Access denied to this order');
    }
  }

  private async validateOrderCreationPermissions(
    createOrderDto: CreateOrderDto,
    createdBy: string
  ): Promise<void> {
    // Validate user can create orders for this customer
    if (createOrderDto.customerId !== createdBy) {
      // Additional permission checks for admin/seller creating orders
    }
  }

  private async validateOrderUpdate(
    existingOrder: Order
  ): Promise<void> {
    // Validate business rules for updates
    if (existingOrder.isTerminal) {
      throw new BadRequestException('Cannot update terminal order');
    }
  }

  private async validateStatusChange(
    order: Order,
    newStatus: OrderStatus
  ): Promise<void> {
    // Additional business rule validations for status changes
    if (newStatus === OrderStatus.CONFIRMED && !order.isFullyPaid()) {
      throw new BadRequestException('Cannot confirm order without payment');
    }
  }

  private async executeStatusChange(
    order: Order,
    statusUpdate: OrderStatusUpdateDto,
    updatedBy: string
  ): Promise<Order> {
    return this.prisma.$transaction(async () => {
      // Update order status
      const updatedOrder = await this.orderRepository.updateStatus(
        order.id,
        statusUpdate.status,
        updatedBy
      );

      // Execute side effects based on status
      await this.executeStatusSideEffects(order, statusUpdate.status, updatedBy);

      // Create audit log
      await this.orderAuditService.logAction({
        orderId: order.id,
        action: 'STATUS_CHANGE',
        userId: updatedBy,
        oldValues: { status: order.status },
        newValues: { status: statusUpdate.status },
        reason: statusUpdate.reason || 'Status changed',
      });

      // Emit status-specific events
      this.emitStatusChangeEvent(updatedOrder, order.status, updatedBy);

      return updatedOrder;
    });
  }

  private async executeStatusSideEffects(
    order: Order,
    newStatus: OrderStatus,
    updatedBy: string
  ): Promise<void> {
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        // Commit inventory reservations
        await this.commitOrderReservations(order);
        break;

      case OrderStatus.CANCELLED:
        // Release inventory reservations
        await this.releaseOrderReservations(order, 'Order cancelled');
        break;

      case OrderStatus.SHIPPED:
        // Update shipping timestamp
        await this.orderRepository.updateShippingInfo(order.id, {
          shippedAt: new Date(),
        });
        break;

      case OrderStatus.DELIVERED:
        // Update delivery timestamp
        await this.orderRepository.updateDeliveryInfo(order.id, {
          deliveredAt: new Date(),
        });
        break;
    }
  }

  private async commitOrderReservations(order: Order): Promise<void> {
    for (const item of order.items || []) {
      if (item.reservationKey) {
        // SAFETY: Validate reservation can only be committed once
        const reservation = await this.inventoryReservationService.getReservation(item.reservationKey);
        if (reservation) {
          InventoryValidators.validateReservationCommitIdempotency(reservation);
        }

        await this.inventoryReservationService.commitReservation(
          item.reservationKey,
          'SYSTEM',
          `Order ${order.orderNumber} confirmed`
        );
      }
    }
  }

  private async releaseOrderReservations(
    order: Order,
    reason: string
  ): Promise<void> {
    for (const item of order.items || []) {
      if (item.reservationKey) {
        await this.inventoryReservationService.releaseReservation(
          item.reservationKey,
          'SYSTEM',
          reason
        );
      }
    }
  }

  private async cancelOrderItem(
    item: OrderItem,
    reason: string,
    cancelledBy: string
  ): Promise<void> {
    await this.orderRepository.updateItemStatus(
      item.id,
      OrderItemStatus.CANCELLED
    );
  }

  private async validateOrderCancellation(order: Order): Promise<void> {
    if (!order.canBeCancelled) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} status`);
    }
  }

  private calculateChanges(
    oldOrder: Order,
    newOrder: Order
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    // Compare relevant fields
    const fieldsToCompare = ['status', 'shippingAddress', 'billingAddress', 'notes'];

    for (const field of fieldsToCompare) {
      const oldValue = (oldOrder as any)[field];
      const newValue = (newOrder as any)[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }

  private emitStatusChangeEvent(
    order: Order,
    oldStatus: OrderStatus,
    updatedBy: string
  ): void {
    // Emit generic status change event
    this.eventEmitter.emit('order.status.changed', new OrderStatusChangedEvent(
      order.id,
      order.orderNumber,
      order.customerId,
      oldStatus,
      order.status,
      updatedBy
    ));

    // Emit specific status events
    switch (order.status) {
      case OrderStatus.CONFIRMED:
        this.eventEmitter.emit('order.confirmed', new OrderConfirmedEvent(
          order.id,
          order.orderNumber,
          order.customerId,
          order.totalAmount
        ));
        break;

      case OrderStatus.SHIPPED:
        this.eventEmitter.emit('order.shipped', new OrderShippedEvent(
          order.id,
          order.orderNumber,
          order.customerId,
          order.trackingNumber || '',
          'DEFAULT_CARRIER'
        ));
        break;

      case OrderStatus.DELIVERED:
        this.eventEmitter.emit('order.delivered', new OrderDeliveredEvent(
          order.id,
          order.orderNumber,
          order.customerId,
          order.deliveredAt!
        ));
        break;
    }
  }

  // ============================================================================
  // MISSING METHODS IMPLEMENTATION
  // ============================================================================

  async findByUser(userId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    return this.orderRepository.findAll(
      { customerId: userId },
      { limit, offset },
      { items: true, payments: true }
    );
  }

  async createOrder(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    return this.create(createOrderDto, userId);
  }

  async processPayment(orderId: string, userId: string): Promise<any> {
    this.logger.log('OrderService.processPayment', { orderId, userId });
    
    const order = await this.findById(orderId);
    await this.checkOrderAccess(order, userId);

    // TODO: Implement payment processing logic
    // This would typically integrate with payment gateway
    
    return { success: true, message: 'Payment processing initiated' };
  }

  async confirmPayment(orderId: string, paymentId: string): Promise<Order> {
    this.logger.log('OrderService.confirmPayment', { orderId, paymentId });
    
    const order = await this.findById(orderId);
    
    // Update order status to confirmed
    const updatedOrder = await this.orderRepository.update(orderId, {
      status: OrderStatus.CONFIRMED,
      paymentMethod: 'CONFIRMED',
      updatedAt: new Date(),
      version: order.version + 1,
    });

    // Emit event
    this.eventEmitter.emit('order.confirmed', new OrderConfirmedEvent(
      orderId,
      order.orderNumber,
      order.customerId,
      paymentId
    ));

    return updatedOrder;
  }

  async cancelOrder(
    orderId: string, 
    userId: string, 
    reason: string, 
    userRole: UserRole
  ): Promise<Order> {
    this.logger.log('OrderService.cancelOrder', { orderId, userId, reason });
    
    const order = await this.findById(orderId);
    await this.checkOrderAccess(order, userId, userRole);

    if (!order.canBeCancelled) {
      throw new BadRequestException('Order cannot be cancelled in current status');
    }

    const updatedOrder = await this.orderRepository.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason,
      updatedAt: new Date(),
      version: order.version + 1,
    });

    // Create audit log
    await this.orderAuditService.logAction({
      orderId,
      action: 'CANCEL',
      userId,
      oldValues: order,
      newValues: updatedOrder,
      reason,
    });

    // Emit event
    this.eventEmitter.emit('order.cancelled', new OrderCancelledEvent(
      orderId,
      order.orderNumber,
      order.customerId,
      reason,
      userId
    ));

    return updatedOrder;
  }

}