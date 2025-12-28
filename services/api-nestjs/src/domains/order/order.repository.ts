import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Order, OrderStatus } from './order.service';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orderNumber: string;
    userId: string;
    status: OrderStatus;
    shippingAddressId: string;
    billingAddressId: string;
    notes?: string;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    totalAmount: number;
  }): Promise<Order> {
    const order = await this.prisma.order.create({
      data,
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderStatus,
      items: [], // Will be populated separately
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderStatus,
      items: [], // Would map order items here
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async update(id: string, data: any): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id },
      data,
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderStatus,
      items: [], // Will be populated separately
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({
      where: { id },
    });
  }

  async findByUser(userId: string, page: number, limit: number): Promise<Order[]> {
    const skip = (page - 1) * limit;
    
    const orders = await this.prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status as OrderStatus,
      items: [], // Would map order items here
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  async updateMetadata(id: string, metadata: any): Promise<void> {
    await this.prisma.order.update({
      where: { id },
      data: { metadata },
    });
  }

  async getMetadata(id: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { metadata: true },
    });
    
    return order?.metadata;
  }
}