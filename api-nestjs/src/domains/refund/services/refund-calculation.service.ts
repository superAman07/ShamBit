import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface RefundCalculationResult {
  maxRefundAmount: number;
  refundFees: number;
  netRefundAmount: number;
  breakdown: {
    itemsTotal: number;
    shippingRefund: number;
    taxRefund: number;
    discountAdjustment: number;
    fees: number;
  };
}

@Injectable()
export class RefundCalculationService {
  constructor(private readonly logger: LoggerService) {}

  async calculateRefundAmount(
    order: any,
    refundItems?: any[],
  ): Promise<RefundCalculationResult> {
    try {
      let itemsTotal = 0;
      let taxRefund = 0;

      if (refundItems && refundItems.length > 0) {
        // Calculate partial refund for specific items
        for (const refundItem of refundItems) {
          const orderItem = order.items?.find(
            (item: any) => item.id === refundItem.orderItemId,
          );
          if (orderItem) {
            const itemRefundAmount =
              (orderItem.unitPrice || 0) * refundItem.quantity;
            itemsTotal += itemRefundAmount;

            // Calculate proportional tax refund
            const taxRate = order.taxAmount / order.subtotal || 0;
            taxRefund += itemRefundAmount * taxRate;
          }
        }
      } else {
        // Full refund
        itemsTotal = Number(order.subtotal || 0);
        taxRefund = Number(order.taxAmount || 0);
      }

      // Calculate shipping refund (only for full refunds or if explicitly requested)
      const shippingRefund = refundItems
        ? 0
        : Number(order.shippingAmount || 0);

      // Calculate discount adjustment (proportional to refunded items)
      const discountRate =
        Number(order.discountAmount || 0) / Number(order.subtotal || 1);
      const discountAdjustment = itemsTotal * discountRate;

      // Calculate fees (typically a percentage of the refund amount)
      const grossRefundAmount =
        itemsTotal + shippingRefund + taxRefund - discountAdjustment;
      const refundFees = this.calculateRefundFees(grossRefundAmount);

      const netRefundAmount = grossRefundAmount - refundFees;

      return {
        maxRefundAmount: grossRefundAmount,
        refundFees,
        netRefundAmount,
        breakdown: {
          itemsTotal,
          shippingRefund,
          taxRefund,
          discountAdjustment,
          fees: refundFees,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate refund amount', error, {
        orderId: order.id,
      });
      throw error;
    }
  }

  async calculatePartialRefundAmount(
    order: any,
    amount: number,
  ): Promise<RefundCalculationResult> {
    try {
      const maxPossibleRefund = Number(order.totalAmount || 0);

      if (amount > maxPossibleRefund) {
        throw new Error(
          `Refund amount ${amount} exceeds order total ${maxPossibleRefund}`,
        );
      }

      const refundFees = this.calculateRefundFees(amount);
      const netRefundAmount = amount - refundFees;

      // Calculate proportional breakdown
      const totalOrderAmount = Number(order.totalAmount || 0);
      const proportion = amount / totalOrderAmount;

      return {
        maxRefundAmount: amount,
        refundFees,
        netRefundAmount,
        breakdown: {
          itemsTotal: Number(order.subtotal || 0) * proportion,
          shippingRefund: Number(order.shippingAmount || 0) * proportion,
          taxRefund: Number(order.taxAmount || 0) * proportion,
          discountAdjustment: Number(order.discountAmount || 0) * proportion,
          fees: refundFees,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate partial refund amount', error, {
        orderId: order.id,
        amount,
      });
      throw error;
    }
  }

  private calculateRefundFees(amount: number): number {
    // Default refund fee structure
    const feePercentage = 0.029; // 2.9%
    const fixedFee = 30; // $0.30 in cents

    return Math.round(amount * feePercentage + fixedFee);
  }

  async validateRefundAmount(
    order: any,
    requestedAmount: number,
  ): Promise<boolean> {
    try {
      const calculation = await this.calculateRefundAmount(order);
      return requestedAmount <= calculation.maxRefundAmount;
    } catch (error) {
      this.logger.error('Failed to validate refund amount', error, {
        orderId: order.id,
        requestedAmount,
      });
      return false;
    }
  }

  async getRefundBreakdown(
    order: any,
    refundType: string,
    refundData: any,
  ): Promise<RefundCalculationResult> {
    try {
      switch (refundType) {
        case 'FULL':
          return await this.calculateRefundAmount(order);

        case 'PARTIAL':
          return await this.calculatePartialRefundAmount(
            order,
            refundData.amount,
          );

        case 'ITEM_LEVEL':
          return await this.calculateRefundAmount(order, refundData.items);

        default:
          throw new Error(`Unsupported refund type: ${refundType}`);
      }
    } catch (error) {
      this.logger.error('Failed to get refund breakdown', error, {
        orderId: order.id,
        refundType,
      });
      throw error;
    }
  }
}
