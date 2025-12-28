import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { PaymentRepository } from '../../payment/repositories/payment.repository.js';
import { OrderRepository } from '../../order/repositories/order.repository';

export interface CalculateSettlementRequest {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
}

export interface SettlementTransactionData {
  paymentTransactionId: string;
  orderId: string;
  orderNumber: string;
  transactionAmount: number;
  platformFee: number;
  gatewayFee: number;
  tax: number;
  netAmount: number;
  transactionDate: Date;
  paymentMethod: string;
  customerId: string;
  customerEmail?: string;
  productDetails: any;
}

export interface SettlementCalculationResult {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  grossAmount: number;
  totalFees: number;
  totalTax: number;
  netAmount: number;
  transactionCount: number;
  transactions: SettlementTransactionData[];
  breakdown: {
    platformFees: number;
    gatewayFees: number;
    taxes: number;
    refunds: number;
    adjustments: number;
  };
}

@Injectable()
export class SettlementCalculationService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderRepository: OrderRepository,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // SETTLEMENT CALCULATION
  // ============================================================================

  async calculateSettlement(
    request: CalculateSettlementRequest
  ): Promise<SettlementCalculationResult> {
    this.logger.log('SettlementCalculationService.calculateSettlement', {
      sellerId: request.sellerId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      currency: request.currency,
    });

    // Get all successful payment transactions for the seller in the period
    const paymentTransactions = await this.getSettlementTransactions(request);

    if (paymentTransactions.length === 0) {
      return this.createEmptyResult(request);
    }

    // Calculate settlement amounts
    const result = await this.calculateAmounts(request, paymentTransactions);

    this.logger.log('Settlement calculation completed', {
      sellerId: request.sellerId,
      transactionCount: result.transactionCount,
      grossAmount: result.grossAmount,
      netAmount: result.netAmount,
    });

    return result;
  }

  // ============================================================================
  // TRANSACTION RETRIEVAL
  // ============================================================================

  private async getSettlementTransactions(
    request: CalculateSettlementRequest
  ): Promise<any[]> {
    // Get successful payment transactions for the seller in the period
    const transactions = await this.paymentRepository.findSuccessfulTransactionsForSettlement({
      sellerId: request.sellerId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      currency: request.currency,
    });

    this.logger.log('Retrieved settlement transactions', {
      sellerId: request.sellerId,
      count: transactions.length,
    });

    return transactions;
  }

  // ============================================================================
  // AMOUNT CALCULATIONS
  // ============================================================================

  private async calculateAmounts(
    request: CalculateSettlementRequest,
    paymentTransactions: any[]
  ): Promise<SettlementCalculationResult> {
    let grossAmount = 0;
    let totalPlatformFees = 0;
    let totalGatewayFees = 0;
    let totalTaxes = 0;
    let totalRefunds = 0;
    let totalAdjustments = 0;

    const settlementTransactions: SettlementTransactionData[] = [];

    // Process each payment transaction
    for (const transaction of paymentTransactions) {
      const calculatedTransaction = await this.calculateTransactionAmounts(transaction);
      
      grossAmount += calculatedTransaction.transactionAmount;
      totalPlatformFees += calculatedTransaction.platformFee;
      totalGatewayFees += calculatedTransaction.gatewayFee;
      totalTaxes += calculatedTransaction.tax;

      settlementTransactions.push(calculatedTransaction);
    }

    // Calculate refunds for the period
    const refundAmount = await this.calculateRefunds(request);
    totalRefunds = refundAmount;

    // Calculate any manual adjustments
    const adjustmentAmount = await this.calculateAdjustments(request);
    totalAdjustments = adjustmentAmount;

    // Calculate net settlement amount
    const totalFees = totalPlatformFees + totalGatewayFees;
    const netAmount = grossAmount - totalFees - totalTaxes - totalRefunds + totalAdjustments;

    return {
      sellerId: request.sellerId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      currency: request.currency,
      grossAmount,
      totalFees,
      totalTax: totalTaxes,
      netAmount,
      transactionCount: settlementTransactions.length,
      transactions: settlementTransactions,
      breakdown: {
        platformFees: totalPlatformFees,
        gatewayFees: totalGatewayFees,
        taxes: totalTaxes,
        refunds: totalRefunds,
        adjustments: totalAdjustments,
      },
    };
  }

  private async calculateTransactionAmounts(transaction: any): Promise<SettlementTransactionData> {
    // Get order details for fee calculation
    const order = await this.orderRepository.findById(transaction.orderId);
    
    // Calculate platform fee (e.g., 2.5% of transaction amount)
    const platformFeeRate = this.getPlatformFeeRate(order);
    const platformFee = Math.round(transaction.amount * platformFeeRate);

    // Calculate gateway fee (e.g., 2% + ₹3 for Razorpay)
    const gatewayFee = this.calculateGatewayFee(transaction.amount, transaction.paymentMethod);

    // Calculate tax on fees (e.g., 18% GST on platform fee)
    const taxRate = this.getTaxRate();
    const tax = Math.round(platformFee * taxRate);

    // Net amount for seller
    const netAmount = transaction.amount - platformFee - gatewayFee - tax;

    return {
      paymentTransactionId: transaction.id,
      orderId: transaction.orderId,
      orderNumber: order?.orderNumber || 'UNKNOWN',
      transactionAmount: transaction.amount,
      platformFee,
      gatewayFee,
      tax,
      netAmount,
      transactionDate: transaction.processedAt,
      paymentMethod: transaction.paymentMethod?.type || 'UNKNOWN',
      customerId: order?.customerId || 'UNKNOWN',
      customerEmail: 'unknown@example.com', // We don't have customer email in order entity
      productDetails: this.extractProductDetails(order),
    };
  }

  // ============================================================================
  // FEE CALCULATIONS
  // ============================================================================

  private getPlatformFeeRate(order: any): number {
    // Platform fee rate based on order category, seller tier, etc.
    // This could be configurable per seller or category
    
    // Default platform fee: 2.5%
    let feeRate = 0.025;

    // Apply category-specific rates
    if (order.items?.some((item: any) => item.product?.category?.name === 'Electronics')) {
      feeRate = 0.02; // 2% for electronics
    } else if (order.items?.some((item: any) => item.product?.category?.name === 'Fashion')) {
      feeRate = 0.03; // 3% for fashion
    }

    // Apply seller tier discounts
    const sellerTier = order.seller?.tier || 'STANDARD';
    if (sellerTier === 'PREMIUM') {
      feeRate *= 0.9; // 10% discount for premium sellers
    } else if (sellerTier === 'ENTERPRISE') {
      feeRate *= 0.8; // 20% discount for enterprise sellers
    }

    return feeRate;
  }

  private calculateGatewayFee(amount: number, paymentMethod: string): number {
    // Razorpay fee structure (example rates)
    const feeStructures = {
      CARD: {
        rate: 0.02, // 2%
        fixed: 300, // ₹3.00
      },
      NET_BANKING: {
        rate: 0.015, // 1.5%
        fixed: 200, // ₹2.00
      },
      UPI: {
        rate: 0.005, // 0.5%
        fixed: 100, // ₹1.00
      },
      WALLET: {
        rate: 0.01, // 1%
        fixed: 150, // ₹1.50
      },
      EMI: {
        rate: 0.025, // 2.5%
        fixed: 500, // ₹5.00
      },
    };

    const structure = feeStructures[paymentMethod] || feeStructures.CARD;
    const percentageFee = Math.round(amount * structure.rate);
    
    return percentageFee + structure.fixed;
  }

  private getTaxRate(): number {
    // GST rate on platform fees (18% in India)
    return 0.18;
  }

  // ============================================================================
  // REFUND & ADJUSTMENT CALCULATIONS
  // ============================================================================

  private async calculateRefunds(request: CalculateSettlementRequest): Promise<number> {
    // Get all refunds for the seller in the period
    const refunds = await this.paymentRepository.findRefundsForSettlement({
      sellerId: request.sellerId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      currency: request.currency,
    });

    const totalRefundAmount = refunds.reduce((sum, refund) => sum + refund.amount, 0);

    this.logger.log('Calculated refunds for settlement', {
      sellerId: request.sellerId,
      refundCount: refunds.length,
      totalRefundAmount,
    });

    return totalRefundAmount;
  }

  private async calculateAdjustments(request: CalculateSettlementRequest): Promise<number> {
    // Get any manual adjustments for the seller in the period
    // This could include promotional credits, penalty deductions, etc.
    
    // For now, return 0 - this would be implemented based on business requirements
    return 0;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createEmptyResult(request: CalculateSettlementRequest): SettlementCalculationResult {
    return {
      sellerId: request.sellerId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      currency: request.currency,
      grossAmount: 0,
      totalFees: 0,
      totalTax: 0,
      netAmount: 0,
      transactionCount: 0,
      transactions: [],
      breakdown: {
        platformFees: 0,
        gatewayFees: 0,
        taxes: 0,
        refunds: 0,
        adjustments: 0,
      },
    };
  }

  private extractProductDetails(order: any): any {
    // Extract relevant product information for settlement records
    if (!order) {
      return {
        items: [],
        totalItems: 0,
        totalAmount: 0,
      };
    }

    return {
      items: order.items?.map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.product?.category?.name,
      })) || [],
      totalItems: order.totalItems || 0,
      totalAmount: order.totalAmount || 0,
    };
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  async validateSettlementPeriod(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check period validity
    if (periodStart >= periodEnd) {
      errors.push('Period start must be before period end');
    }

    // Check if period is too far in the past
    const maxHistoryDays = 365; // 1 year
    const maxHistoryDate = new Date();
    maxHistoryDate.setDate(maxHistoryDate.getDate() - maxHistoryDays);
    
    if (periodStart < maxHistoryDate) {
      errors.push(`Period start cannot be more than ${maxHistoryDays} days in the past`);
    }

    // Check if period is in the future
    const now = new Date();
    if (periodEnd > now) {
      errors.push('Period end cannot be in the future');
    }

    // Check for minimum settlement period (e.g., at least 1 day)
    const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (periodDays < 1) {
      errors.push('Settlement period must be at least 1 day');
    }

    // Check for maximum settlement period (e.g., 90 days)
    const maxPeriodDays = 90;
    if (periodDays > maxPeriodDays) {
      errors.push(`Settlement period cannot exceed ${maxPeriodDays} days`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // REPORTING METHODS
  // ============================================================================

  async generateSettlementSummary(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    summary: any;
    transactions: SettlementTransactionData[];
  }> {
    const calculation = await this.calculateSettlement({
      sellerId,
      periodStart,
      periodEnd,
      currency: 'INR',
    });

    const summary = {
      sellerId,
      period: {
        start: periodStart,
        end: periodEnd,
        days: Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)),
      },
      amounts: {
        gross: calculation.grossAmount,
        fees: calculation.totalFees,
        tax: calculation.totalTax,
        net: calculation.netAmount,
      },
      breakdown: calculation.breakdown,
      statistics: {
        transactionCount: calculation.transactionCount,
        averageTransactionAmount: calculation.transactionCount > 0 
          ? Math.round(calculation.grossAmount / calculation.transactionCount)
          : 0,
        feePercentage: calculation.grossAmount > 0
          ? ((calculation.totalFees / calculation.grossAmount) * 100).toFixed(2)
          : '0.00',
      },
    };

    return {
      summary,
      transactions: calculation.transactions,
    };
  }
}