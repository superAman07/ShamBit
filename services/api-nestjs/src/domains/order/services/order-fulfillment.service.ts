import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface FulfillmentRequest {
  orderId: string;
  shippingMethod?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  userId: string;
}

export interface FulfillmentResult {
  success: boolean;
  trackingNumber?: string;
  error?: string;
}

@Injectable()
export class OrderFulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async fulfillOrder(request: FulfillmentRequest): Promise<FulfillmentResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: request.orderId },
      });

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      if (order.status !== 'CONFIRMED') {
        return {
          success: false,
          error: `Cannot fulfill order with status: ${order.status}`,
        };
      }

      // Update order status to SHIPPED
      const updatedOrder = await this.prisma.order.update({
        where: { id: request.orderId },
        data: {
          status: 'SHIPPED',
          // TODO: Add these fields to the Order model
          // shippingMethod: request.shippingMethod,
          // trackingNumber: request.trackingNumber,
          // estimatedDelivery: request.estimatedDelivery,
          // shippedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Emit fulfillment event
      this.eventEmitter.emit('order.fulfilled', {
        orderId: request.orderId,
        trackingNumber: request.trackingNumber,
        userId: request.userId,
      });

      this.logger.log('Order fulfilled successfully', {
        orderId: request.orderId,
        trackingNumber: request.trackingNumber,
      });

      return {
        success: true,
        trackingNumber: request.trackingNumber,
      };
    } catch (error) {
      this.logger.error('Order fulfillment failed', error, { request });
      return {
        success: false,
        error: 'Fulfillment failed due to system error',
      };
    }
  }

  async updateTrackingInfo(orderId: string, trackingNumber: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          // TODO: Add trackingNumber field to Order model
          // trackingNumber,
          updatedAt: new Date(),
        },
      });

      this.eventEmitter.emit('order.tracking_updated', {
        orderId,
        trackingNumber,
        userId,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to update tracking info', error, { orderId, trackingNumber });
      return false;
    }
  }

  async markAsDelivered(orderId: string, userId: string): Promise<boolean> {
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          // TODO: Add deliveredAt field to Order model
          // deliveredAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.eventEmitter.emit('order.delivered', {
        orderId,
        userId,
        deliveredAt: new Date(),
      });

      this.logger.log('Order marked as delivered', { orderId });
      return true;
    } catch (error) {
      this.logger.error('Failed to mark order as delivered', error, { orderId });
      return false;
    }
  }

  async shipOrder(order: any, shippedBy: string, trackingNumber?: string): Promise<any> {
    try {
      this.logger.log('Shipping order', { orderId: order.id, shippedBy });

      const shippingDetails = {
        shippingMethod: 'STANDARD',
        trackingNumber,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const fulfillmentRequest: FulfillmentRequest = {
        orderId: order.id,
        shippingMethod: shippingDetails.shippingMethod,
        trackingNumber: shippingDetails.trackingNumber,
        estimatedDelivery: shippingDetails.estimatedDelivery,
        userId: shippedBy,
      };

      const result = await this.fulfillOrder(fulfillmentRequest);
      
      // Return the updated order instead of FulfillmentResult
      if (result.success) {
        return { ...order, status: 'SHIPPED', trackingNumber, shippedBy, shippedAt: new Date() };
      } else {
        throw new Error(result.error || 'Failed to ship order');
      }
    } catch (error) {
      this.logger.error('Failed to ship order', error, { orderId: order.id, shippedBy });
      throw error;
    }
  }
}