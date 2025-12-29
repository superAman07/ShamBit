import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Order } from '../entities/order.entity';
import { OrderStatus, OrderItemStatus } from '../enums/order-status.enum';

export interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  sellerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface OrderIncludeOptions {
  items?: boolean;
  payments?: boolean;
  refunds?: boolean;
  shipments?: boolean;
}

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<Order>): Promise<Order> {
    // This is a placeholder implementation
    // In a real implementation, you would map the Order entity to Prisma schema
    const order = await this.prisma.order.create({
      data: {
        orderNumber: data.orderNumber!,
        userId: data.customerId!, // Schema uses userId instead of customerId
        status: data.status!,
        totalAmount: data.totalAmount || 0,
        discountAmount: data.discountAmount || 0,
        taxAmount: data.taxAmount || 0,
        shippingAmount: data.shippingAmount || 0,
        finalAmount: data.totalAmount || 0, // Schema uses finalAmount
        paymentStatus: data.paymentStatus || 'PENDING',
        shippingAddressId: data.shippingAddressId!,
        billingAddressId: data.billingAddressId || data.shippingAddressId!,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(order);
  }

  async findById(id: string, includes: OrderIncludeOptions = {}): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: includes.items,
        payments: includes.payments,
        shipments: includes.shipments,
      },
    });

    return order ? this.mapToEntity(order) : null;
  }

  async findAll(
    filters: OrderFilters = {},
    pagination: PaginationOptions = {},
    includes: OrderIncludeOptions = {}
  ): Promise<{ data: Order[]; total: number }> {
    const where: any = {};

    if (filters.customerId) {
      where.userId = filters.customerId; // Schema uses userId instead of customerId
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: includes.items,
          payments: includes.payments,
          shipments: includes.shipments,
        },
        take: pagination.limit,
        skip: pagination.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(order => this.mapToEntity(order)),
      total,
    };
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        shippingAmount: data.shippingAmount,
        finalAmount: data.totalAmount, // Schema uses finalAmount
        paymentStatus: data.paymentStatus,
        notes: data.notes,
        cancelledAt: data.cancelledAt,
        cancelReason: data.cancellationReason, // Schema uses cancelReason
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(order);
  }

  async findByOrderNumber(orderNumber: string, includes: OrderIncludeOptions = {}): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: includes.items,
        payments: includes.payments,
        shipments: includes.shipments,
      },
    });

    return order ? this.mapToEntity(order) : null;
  }

  async findByCustomer(
    customerId: string,
    pagination: PaginationOptions = {}
  ): Promise<{ data: Order[]; total: number }> {
    return this.findAll(
      { customerId },
      pagination,
      { items: true, payments: true }
    );
  }

  async createItem(orderItemData: any, tx?: any): Promise<any> {
    // TODO: Implement order item creation
    // This would typically create an OrderItem record
    return { id: 'temp_item_id' };
  }

  async markAsFailed(orderId: string, reason: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FAILED,
        cancelReason: reason, // Schema uses cancelReason
        updatedAt: new Date(),
      },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus, updatedBy: string): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(order);
  }

  async updateItemStatus(itemId: string, status: OrderItemStatus): Promise<void> {
    // TODO: Implement order item status update
    // This would update the OrderItem table
  }

  async updateShippingInfo(orderId: string, shippingInfo: { shippedAt: Date }): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // TODO: Add shippedAt field to schema or handle in shipment table
        updatedAt: new Date(),
      },
    });
  }

  async updateDeliveryInfo(orderId: string, deliveryInfo: { deliveredAt: Date }): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // Note: Schema doesn't have actualDeliveryDate field
        // This would need to be handled in a separate shipment table
        updatedAt: new Date(),
      },
    });
  }

  async findExpiredOrders(): Promise<Order[]> {
    // TODO: Implement expired orders query
    // This would find orders that have exceeded their expiry time
    return [];
  }

  private mapToEntity(order: any): Order {
    return new Order({
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.userId, // Map userId back to customerId for entity
      status: order.status as OrderStatus,
      items: order.items || [],
      subtotal: Number(order.totalAmount) - Number(order.shippingAmount) - Number(order.taxAmount) + Number(order.discountAmount),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.finalAmount || order.totalAmount),
      currency: 'USD', // Default currency since schema doesn't have this field
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      paymentMethod: undefined, // Schema doesn't have this field
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      metadata: {}, // Schema doesn't have metadata field
      version: 1, // Schema doesn't have version field
      isSplit: false, // Schema doesn't have this field
      parentOrderId: undefined, // Schema doesn't have this field
      splitReason: undefined, // Schema doesn't have this field
      estimatedDeliveryDate: undefined, // Schema doesn't have this field
      actualDeliveryDate: undefined, // Schema doesn't have this field
      cancelledAt: order.cancelledAt,
      cancelledBy: undefined, // Schema doesn't have this field
      cancellationReason: order.cancelReason,
      refundedAt: undefined, // Schema doesn't have this field
      refundedBy: undefined, // Schema doesn't have this field
      refundAmount: undefined, // Schema doesn't have this field
      isActive: true, // Default value since schema doesn't have this field
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.userId, // Use userId as createdBy
      updatedBy: undefined, // Schema doesn't have this field
      // These will be populated from address relations
      shippingAddress: null as any,
      billingAddress: null as any,
    });
  }
}