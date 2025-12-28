import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface OrderRefundRequest {
  orderId: string;
  amount?: number; // If not provided, refund full amount
  reason: string;
  userId: string;
  items?: Array<{
    orderItemId: string;
    quantity: number;
    reason?: string;
  }>;
}

export interface OrderRefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

@Injectable()
export class OrderRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async initiateRefund(request: OrderRefundRequest): Promise<OrderRefundResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: request.orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      // Check if order can be refunded
      const refundableStatuses = ['DELIVERED', 'SHIPPED', 'CONFIRMED'];
      if (!refundableStatuses.includes(order.status)) {
        return {
          success: false,
          error: `Cannot refund order with status: ${order.status}`,
        };
      }

      // Calculate refund amount
      const refundAmount = request.amount || Number(order.totalAmount);

      // TODO: Create refund record once Refund model is properly integrated
      // For now, just update order status
      await this.prisma.order.update({
        where: { id: request.orderId },
        data: {
          status: 'REFUNDED',
          updatedAt: new Date(),
        },
      });

      // Emit refund initiated event
      this.eventEmitter.emit('order.refund_initiated', {
        orderId: request.orderId,
        amount: refundAmount,
        reason: request.reason,
        userId: request.userId,
      });

      this.logger.log('Order refund initiated', {
        orderId: request.orderId,
        amount: refundAmount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: `refund_${Date.now()}`, // Temporary ID
      };
    } catch (error) {
      this.logger.error('Order refund initiation failed', error, { request });
      return {
        success: false,
        error: 'Refund initiation failed due to system error',
      };
    }
  }

  async processItemRefund(orderId: string, orderItemId: string, quantity: number, reason: string, userId: string): Promise<boolean> {
    try {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          id: orderItemId,
          orderId: orderId,
        },
      });

      if (!orderItem) {
        this.logger.error('Order item not found for refund', undefined, { orderId, orderItemId });
        return false;
      }

      if (quantity > orderItem.quantity) {
        this.logger.error('Refund quantity exceeds order item quantity', undefined, {
          orderId,
          orderItemId,
          requestedQuantity: quantity,
          availableQuantity: orderItem.quantity,
        });
        return false;
      }

      // TODO: Update refunded quantity once the field is added to OrderItem model
      // await this.prisma.orderItem.update({
      //   where: { id: orderItemId },
      //   data: {
      //     refundedQuantity: { increment: quantity },
      //   },
      // });

      this.eventEmitter.emit('order.item_refunded', {
        orderId,
        orderItemId,
        quantity,
        reason,
        userId,
      });

      return true;
    } catch (error) {
      this.logger.error('Item refund processing failed', error, {
        orderId,
        orderItemId,
        quantity,
      });
      return false;
    }
  }

  async getRefundEligibility(orderId: string): Promise<{
    eligible: boolean;
    reason?: string;
    maxRefundAmount?: number;
  }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return {
          eligible: false,
          reason: 'Order not found',
        };
      }

      const refundableStatuses = ['DELIVERED', 'SHIPPED', 'CONFIRMED'];
      if (!refundableStatuses.includes(order.status)) {
        return {
          eligible: false,
          reason: `Order status ${order.status} is not eligible for refund`,
        };
      }

      // TODO: Add more sophisticated eligibility checks
      // - Check refund window (e.g., 30 days from delivery)
      // - Check if already refunded
      // - Check refund policy

      return {
        eligible: true,
        maxRefundAmount: Number(order.totalAmount),
      };
    } catch (error) {
      this.logger.error('Failed to check refund eligibility', error, { orderId });
      return {
        eligible: false,
        reason: 'System error while checking eligibility',
      };
    }
  }

  async processRefund(order: any, refundDto: any, refundedBy: string): Promise<any> {
    try {
      this.logger.log('Processing order refund', { orderId: order.id, refundedBy });

      const refundRequest: OrderRefundRequest = {
        orderId: order.id,
        amount: refundDto.amount,
        reason: refundDto.reason || 'REQUESTED_BY_CUSTOMER',
        userId: refundedBy,
        items: refundDto.items,
      };

      const result = await this.initiateRefund(refundRequest);
      
      // Return the updated order instead of OrderRefundResult
      if (result.success) {
        return { ...order, status: 'REFUNDED', refundedBy, refundedAt: new Date() };
      } else {
        throw new Error(result.error || 'Failed to process refund');
      }
    } catch (error) {
      this.logger.error('Failed to process refund', error, { orderId: order.id, refundedBy });
      throw error;
    }
  }
}