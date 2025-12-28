import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

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
    totalAmount: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    finalAmount: number;
  }): Promise<Order> {
    const order = await this.prisma.order.create({
      data,
    });

    return this.mapToEntity(order);
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

    return this.mapToEntity(order);
  }

  async update(id: string, data: any): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id },
      data,
    });

    return this.mapToEntity(order);
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

    return orders.map(order => this.mapToEntity(order));
  }

  async findAll(
    filters: any = {},
    pagination: any = {},
    includes: any = {}
  ): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: this.buildWhereClause(filters),
      include: this.buildIncludeClause(includes),
      orderBy: { createdAt: 'desc' },
      skip: pagination.page ? (pagination.page - 1) * (pagination.limit || 10) : 0,
      take: pagination.limit || 10,
    });

    return orders.map(order => this.mapToEntity(order));
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        user: true,
      },
    });

    return order ? this.mapToEntity(order) : null;
  }

  async findByCustomer(customerId: string, pagination: any = {}): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId: customerId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.page ? (pagination.page - 1) * (pagination.limit || 10) : 0,
      take: pagination.limit || 10,
    });

    return orders.map(order => this.mapToEntity(order));
  }

  async updateStatus(orderId: string, status: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    return this.mapToEntity(order);
  }

  async findExpiredOrders(): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        // TODO: Add expiresAt field to Order model
        // expiresAt: {
        //   lt: new Date(),
        // },
      },
      include: {
        items: true,
      },
    });

    return orders.map(order => this.mapToEntity(order));
  }

  async updateShippingInfo(orderId: string, data: any): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // TODO: Add shipping fields to Order model
        // shippingMethod: data.shippingMethod,
        // trackingNumber: data.trackingNumber,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    return this.mapToEntity(order);
  }

  async updateDeliveryInfo(orderId: string, data: any): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // TODO: Add delivery fields to Order model
        // deliveredAt: data.deliveredAt,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    return this.mapToEntity(order);
  }

  async updateItemStatus(orderItemId: string, status: string): Promise<void> {
    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { 
        // TODO: Add status field to OrderItem model
        // status,
        updatedAt: new Date(),
      },
    });
  }

  private buildWhereClause(filters: any): any {
    const where: any = {};

    if (filters.customerId) {
      where.userId = filters.customerId;
    }

    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
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

    if (filters.orderNumber) {
      where.orderNumber = { contains: filters.orderNumber, mode: 'insensitive' };
    }

    return where;
  }

  private buildIncludeClause(includes: any): any {
    const include: any = {};

    if (includes.items) {
      include.items = {
        include: {
          variant: true,
          product: true,
        },
      };
    }

    if (includes.customer) {
      include.user = true;
    }

    return include;
  }

  private mapToEntity(order: any): Order {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.userId,
      status: order.status as OrderStatus,
      items: order.items?.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
        status: item.status || 'PENDING',
      })) || [],
      subtotal: Number(order.totalAmount || 0),
      shippingAmount: Number(order.shippingAmount || 0),
      taxAmount: Number(order.taxAmount || 0),
      discountAmount: Number(order.discountAmount || 0),
      totalAmount: Number(order.finalAmount || 0),
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      notes: order.notes || undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Add default values for missing properties
      currency: 'USD',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'PENDING',
      isSplit: false,
      parentOrderId: null,
      expiresAt: null,
      confirmedAt: null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      trackingNumber: null,
      shippingMethod: null,
      estimatedDeliveryDate: null,
      actualDeliveryDate: null,
      refundedAmount: 0,
      metadata: {},
      tags: [],
      internalNotes: null,
      customerNotes: null,
      sellerId: null,
      sellerName: null,
      commission: 0,
      platformFee: 0,
      processingFee: 0,
      refundableAmount: Number(order.finalAmount || 0),
      nonRefundableAmount: 0,
      partialRefundAllowed: true,
      refundDeadline: null,
      returnWindow: 30,
      warrantyPeriod: null,
      source: 'WEB',
      channel: 'DIRECT',
      campaignId: null,
      affiliateId: null,
      referralCode: null,
      loyaltyPointsEarned: 0,
      loyaltyPointsRedeemed: 0,
      giftMessage: null,
      specialInstructions: null,
      riskScore: 0,
      fraudFlags: [],
      reviewStatus: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      priority: 'NORMAL',
      urgencyLevel: 'STANDARD',
      escalationLevel: 0,
      assignedTo: null,
      lastStatusChange: order.updatedAt,
      statusHistory: [],
      auditTrail: [],
      integrationData: {},
      externalOrderId: null,
      externalOrderNumber: null,
      syncStatus: 'SYNCED',
      lastSyncAt: order.updatedAt,
      syncErrors: [],
      webhookEvents: [],
      notificationsSent: [],
      communicationPreferences: {},
      customFields: {},
      businessMetrics: {},
      performanceMetrics: {},
      qualityMetrics: {},
      complianceFlags: [],
      regulatoryData: {},
      taxExemptionData: null,
      billingCycle: null,
      subscriptionId: null,
      recurringOrderId: null,
      installmentPlan: null,
      paymentTerms: null,
      creditLimit: null,
      creditUsed: 0,
      paymentDueDate: null,
      invoiceNumber: null,
      invoiceDate: null,
      invoiceDueDate: null,
      purchaseOrderNumber: null,
      contractNumber: null,
      projectCode: null,
      costCenter: null,
      budgetCode: null,
      approvalRequired: false,
      approvedBy: null,
      approvedAt: null,
      approvalNotes: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      version: 1,
      lockedBy: null,
      lockedAt: null,
      lockReason: null,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      restoredAt: null,
      restoredBy: null,
      restoreReason: null,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      createdBy: order.userId,
      updatedBy: null,
    } as Order;
  }
}