import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface SettlementCalculationResult {
  sellerId: string;
  sellerAccountId: string;
  periodStart: Date;
  periodEnd: Date;
  grossAmount: number;
  commissionAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  currency: string;
  transactionCount: number;
  orderCount: number;
  breakdown: SettlementBreakdown[];
}

export interface SettlementBreakdown {
  orderId: string;
  orderItemId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  netAmount: number;
  transactionDate: Date;
}

export interface CommissionRule {
  id: string;
  type: string;
  entityType: string;
  entityId?: string;
  rate?: number;
  fixedAmount?: number;
  tiers?: any;
  minAmount?: number;
  maxAmount?: number;
  priority: number;
}

@Injectable()
export class SettlementCalculationService {
  private readonly logger = new Logger(SettlementCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  // ============================================================================
  // MAIN CALCULATION METHODS
  // ============================================================================

  async calculateSettlement(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string = 'INR',
  ): Promise<SettlementCalculationResult> {
    this.loggerService.log('SettlementCalculationService.calculateSettlement', {
      sellerId,
      periodStart,
      periodEnd,
      currency,
    });

    // Get seller account
    const sellerAccount = await this.prisma.sellerAccount.findUnique({
      where: { sellerId },
    });

    if (!sellerAccount) {
      throw new Error(`Seller account not found for seller: ${sellerId}`);
    }

    // Get completed orders in the period
    const orders = await this.getCompletedOrders(
      sellerId,
      periodStart,
      periodEnd,
    );

    if (orders.length === 0) {
      return this.createEmptyResult(
        sellerId,
        sellerAccount.id,
        periodStart,
        periodEnd,
        currency,
      );
    }

    // Calculate settlement for each order item
    const breakdown: SettlementBreakdown[] = [];
    let totalGrossAmount = 0;
    let totalCommissionAmount = 0;
    let totalPlatformFeeAmount = 0;
    let totalTaxAmount = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const itemCalculation = await this.calculateOrderItemSettlement(
          item,
          order,
        );

        breakdown.push({
          orderId: order.id,
          orderItemId: item.id,
          grossAmount: itemCalculation.grossAmount,
          commissionRate: itemCalculation.commissionRate,
          commissionAmount: itemCalculation.commissionAmount,
          platformFeeAmount: itemCalculation.platformFeeAmount,
          taxAmount: itemCalculation.taxAmount,
          netAmount: itemCalculation.netAmount,
          transactionDate: order.createdAt,
        });

        totalGrossAmount += itemCalculation.grossAmount;
        totalCommissionAmount += itemCalculation.commissionAmount;
        totalPlatformFeeAmount += itemCalculation.platformFeeAmount;
        totalTaxAmount += itemCalculation.taxAmount;
      }
    }

    // Calculate adjustments (refunds, chargebacks, etc.)
    const adjustmentAmount = await this.calculateAdjustments(
      sellerId,
      periodStart,
      periodEnd,
    );

    // Calculate net amount
    const netAmount =
      totalGrossAmount -
      totalCommissionAmount -
      totalPlatformFeeAmount -
      totalTaxAmount +
      adjustmentAmount;

    return {
      sellerId,
      sellerAccountId: sellerAccount.id,
      periodStart,
      periodEnd,
      grossAmount: totalGrossAmount,
      commissionAmount: totalCommissionAmount,
      platformFeeAmount: totalPlatformFeeAmount,
      taxAmount: totalTaxAmount,
      adjustmentAmount,
      netAmount,
      currency,
      transactionCount: breakdown.length,
      orderCount: orders.length,
      breakdown,
    };
  }

  async calculateOrderItemSettlement(
    orderItem: any,
    order: any,
  ): Promise<{
    grossAmount: number;
    commissionRate: number;
    commissionAmount: number;
    platformFeeAmount: number;
    taxAmount: number;
    netAmount: number;
  }> {
    const grossAmount = parseFloat(orderItem.totalPrice.toString());

    // Get commission rate (use stored rate or calculate dynamically)
    let commissionRate = parseFloat(
      orderItem.commissionRate?.toString() || '0',
    );
    let commissionAmount = parseFloat(
      orderItem.commissionAmount?.toString() || '0',
    );

    // If no stored commission, calculate dynamically
    if (commissionRate === 0 || commissionAmount === 0) {
      const calculatedCommission = await this.calculateCommission(
        orderItem,
        order,
      );
      commissionRate = calculatedCommission.rate;
      commissionAmount = calculatedCommission.amount;
    }

    // Calculate platform fee (if applicable)
    const platformFeeAmount = await this.calculatePlatformFee(orderItem, order);

    // Calculate tax (GST, etc.)
    const taxAmount = await this.calculateTax(orderItem, order);

    // Calculate net amount
    const netAmount =
      grossAmount - commissionAmount - platformFeeAmount - taxAmount;

    return {
      grossAmount,
      commissionRate,
      commissionAmount,
      platformFeeAmount,
      taxAmount,
      netAmount,
    };
  }

  // ============================================================================
  // COMMISSION CALCULATION
  // ============================================================================

  async calculateCommission(
    orderItem: any,
    order: any,
  ): Promise<{
    rate: number;
    amount: number;
    ruleId?: string;
  }> {
    // Get applicable commission rules
    const rules = await this.getApplicableCommissionRules(orderItem, order);

    if (rules.length === 0) {
      // Use default commission rate
      const defaultRate = 0.05; // 5% default
      const amount = parseFloat(orderItem.totalPrice.toString()) * defaultRate;

      return {
        rate: defaultRate,
        amount: Math.round(amount * 100) / 100,
      };
    }

    // Use the highest priority rule
    const rule = rules[0];
    const grossAmount = parseFloat(orderItem.totalPrice.toString());

    let rate = 0;
    let amount = 0;

    switch (rule.type) {
      case 'PERCENTAGE':
        rate = parseFloat(rule.rate?.toString() || '0');
        amount = grossAmount * rate;
        break;

      case 'FIXED':
        amount = parseFloat(rule.fixedAmount?.toString() || '0');
        rate = grossAmount > 0 ? amount / grossAmount : 0;
        break;

      case 'TIERED':
        const tieredResult = this.calculateTieredCommission(
          grossAmount,
          rule.tiers,
        );
        rate = tieredResult.rate;
        amount = tieredResult.amount;
        break;

      default:
        throw new Error(`Unknown commission rule type: ${rule.type}`);
    }

    // Apply min/max limits
    if (rule.minAmount && amount < parseFloat(rule.minAmount.toString())) {
      amount = parseFloat(rule.minAmount.toString());
      rate = grossAmount > 0 ? amount / grossAmount : 0;
    }

    if (rule.maxAmount && amount > parseFloat(rule.maxAmount.toString())) {
      amount = parseFloat(rule.maxAmount.toString());
      rate = grossAmount > 0 ? amount / grossAmount : 0;
    }

    return {
      rate,
      amount: Math.round(amount * 100) / 100,
      ruleId: rule.id,
    };
  }

  private calculateTieredCommission(
    amount: number,
    tiers: any,
  ): { rate: number; amount: number } {
    if (!tiers || !Array.isArray(tiers)) {
      return { rate: 0, amount: 0 };
    }

    // Sort tiers by threshold
    const sortedTiers = tiers.sort((a, b) => a.threshold - b.threshold);

    let totalCommission = 0;
    let remainingAmount = amount;

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];

      const tierMax = nextTier ? nextTier.threshold : Infinity;
      const tierAmount = Math.min(remainingAmount, tierMax - tier.threshold);

      if (tierAmount > 0) {
        totalCommission += tierAmount * tier.rate;
        remainingAmount -= tierAmount;
      }

      if (remainingAmount <= 0) break;
    }

    return {
      rate: amount > 0 ? totalCommission / amount : 0,
      amount: totalCommission,
    };
  }

  // ============================================================================
  // FEE CALCULATIONS
  // ============================================================================

  async calculatePlatformFee(orderItem: any, order: any): Promise<number> {
    // Platform fee calculation logic
    // This could be based on various factors like seller tier, product category, etc.

    const grossAmount = parseFloat(orderItem.totalPrice.toString());
    const platformFeeRate = 0.01; // 1% platform fee

    return Math.round(grossAmount * platformFeeRate * 100) / 100;
  }

  async calculateTax(orderItem: any, order: any): Promise<number> {
    // Tax calculation logic (GST, VAT, etc.)
    // This should integrate with tax calculation service

    const grossAmount = parseFloat(orderItem.totalPrice.toString());
    const taxRate = 0.18; // 18% GST (example)

    // Tax is usually calculated on the commission amount, not gross amount
    const commissionAmount = parseFloat(
      orderItem.commissionAmount?.toString() || '0',
    );

    return Math.round(commissionAmount * taxRate * 100) / 100;
  }

  async calculateAdjustments(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Calculate refunds, chargebacks, and other adjustments
    let totalAdjustments = 0;

    // Get refunds in the period
    const refunds = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            variant: {
              product: {
                sellerId,
              },
            },
          },
        },
        status: 'REFUNDED',
        updatedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
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

    // Calculate refund adjustments (negative)
    for (const refund of refunds) {
      for (const item of refund.items) {
        if (item.variant.product.sellerId === sellerId) {
          const refundAmount = parseFloat(item.totalPrice.toString());
          const commissionAmount = parseFloat(
            item.commissionAmount?.toString() || '0',
          );

          // Seller gets back the commission on refunded items
          totalAdjustments += commissionAmount;

          // But loses the net amount they would have received
          totalAdjustments -= refundAmount - commissionAmount;
        }
      }
    }

    // Add other adjustments (manual adjustments, promotional credits, etc.)
    // This could be stored in a separate adjustments table

    return Math.round(totalAdjustments * 100) / 100;
  }

  // ============================================================================
  // DATA RETRIEVAL METHODS
  // ============================================================================

  private async getCompletedOrders(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<any[]> {
    return this.prisma.order.findMany({
      where: {
        items: {
          some: {
            variant: {
              product: {
                sellerId,
              },
            },
          },
        },
        status: 'DELIVERED', // Only delivered orders are eligible for settlement
        paymentStatus: 'PAID',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        items: {
          where: {
            variant: {
              product: {
                sellerId,
              },
            },
          },
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
  }

  private async getApplicableCommissionRules(
    orderItem: any,
    order: any,
  ): Promise<CommissionRule[]> {
    const now = new Date();

    const rules = await this.prisma.commissionRule.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        AND: {
          OR: [
            // Global rules
            { entityType: 'GLOBAL' },
            // Seller-specific rules
            {
              entityType: 'SELLER',
              entityId: orderItem.variant.product.sellerId,
            },
            // Category-specific rules
            {
              entityType: 'CATEGORY',
              entityId: orderItem.variant.product.categoryId,
            },
            // Product-specific rules
            {
              entityType: 'PRODUCT',
              entityId: orderItem.variant.productId,
            },
          ],
        },
      },
      orderBy: { priority: 'desc' },
    });

    // Map Prisma result to CommissionRule entities
    return rules.map((rule) => ({
      ...rule,
      entityId: rule.entityId || undefined, // Convert null to undefined
      rate: rule.rate ? parseFloat(rule.rate.toString()) : undefined,
      fixedAmount: rule.fixedAmount
        ? parseFloat(rule.fixedAmount.toString())
        : undefined,
      minAmount: rule.minAmount
        ? parseFloat(rule.minAmount.toString())
        : undefined,
      maxAmount: rule.maxAmount
        ? parseFloat(rule.maxAmount.toString())
        : undefined,
    })) as CommissionRule[];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private createEmptyResult(
    sellerId: string,
    sellerAccountId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string,
  ): SettlementCalculationResult {
    return {
      sellerId,
      sellerAccountId,
      periodStart,
      periodEnd,
      grossAmount: 0,
      commissionAmount: 0,
      platformFeeAmount: 0,
      taxAmount: 0,
      adjustmentAmount: 0,
      netAmount: 0,
      currency,
      transactionCount: 0,
      orderCount: 0,
      breakdown: [],
    };
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  async validateSettlementPeriod(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if period is valid
    if (periodStart >= periodEnd) {
      errors.push('Period start must be before period end');
    }

    // Check if period is not in the future
    const now = new Date();
    if (periodEnd > now) {
      errors.push('Period end cannot be in the future');
    }

    // Check for existing settlements in the period
    const existingSettlements = await this.prisma.settlement.findMany({
      where: {
        sellerId,
        OR: [
          {
            periodStart: { lte: periodStart },
            periodEnd: { gte: periodStart },
          },
          {
            periodStart: { lte: periodEnd },
            periodEnd: { gte: periodEnd },
          },
          {
            periodStart: { gte: periodStart },
            periodEnd: { lte: periodEnd },
          },
        ],
      },
    });

    if (existingSettlements.length > 0) {
      warnings.push(
        `Found ${existingSettlements.length} existing settlements overlapping with this period`,
      );
    }

    // Check for minimum hold period
    const holdPeriodDays = 7; // 7 days hold period
    const holdPeriodEnd = new Date(
      periodEnd.getTime() + holdPeriodDays * 24 * 60 * 60 * 1000,
    );

    if (now < holdPeriodEnd) {
      const remainingDays = Math.ceil(
        (holdPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      warnings.push(
        `Settlement is in hold period. ${remainingDays} days remaining.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // REPORTING METHODS
  // ============================================================================

  async getSettlementSummary(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    totalOrders: number;
    totalItems: number;
    grossRevenue: number;
    totalCommission: number;
    totalFees: number;
    totalTax: number;
    netRevenue: number;
    averageOrderValue: number;
    averageCommissionRate: number;
  }> {
    const calculation = await this.calculateSettlement(
      sellerId,
      periodStart,
      periodEnd,
    );

    return {
      totalOrders: calculation.orderCount,
      totalItems: calculation.transactionCount,
      grossRevenue: calculation.grossAmount,
      totalCommission: calculation.commissionAmount,
      totalFees: calculation.platformFeeAmount,
      totalTax: calculation.taxAmount,
      netRevenue: calculation.netAmount,
      averageOrderValue:
        calculation.orderCount > 0
          ? calculation.grossAmount / calculation.orderCount
          : 0,
      averageCommissionRate:
        calculation.grossAmount > 0
          ? calculation.commissionAmount / calculation.grossAmount
          : 0,
    };
  }
}
