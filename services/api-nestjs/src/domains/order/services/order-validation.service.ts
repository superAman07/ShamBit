import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class OrderValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async validateOrder(orderData: any): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!orderData.customerId) {
        errors.push('Customer ID is required');
      }

      if (!orderData.items || orderData.items.length === 0) {
        errors.push('Order must have at least one item');
      }

      // Validate items
      if (orderData.items) {
        for (const item of orderData.items) {
          if (!item.variantId) {
            errors.push('Item variant ID is required');
          }
          if (!item.quantity || item.quantity <= 0) {
            errors.push('Item quantity must be greater than 0');
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Order validation failed', error, { orderData });
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings,
      };
    }
  }

  async validateOrderUpdate(orderId: string, updateData: any): Promise<OrderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if order exists and can be updated
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        errors.push('Order not found');
        return { isValid: false, errors, warnings };
      }

      // Check if order status allows updates
      const nonUpdatableStatuses = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (nonUpdatableStatuses.includes(order.status)) {
        errors.push(`Cannot update order with status: ${order.status}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Order update validation failed', error, { orderId, updateData });
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings,
      };
    }
  }
}