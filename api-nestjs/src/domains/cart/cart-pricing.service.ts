import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { Cart, CartItem } from './entities/cart.entity';
import {
  PromotionEngineService,
  DiscountResult,
} from '../promotions/promotion-engine.service';

export interface CartPricing {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  shippingAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  itemPricings: ItemPricing[];
  promotionDiscounts: DiscountResult;
  currency: string;
  breakdown: PricingBreakdown;
}

export interface ItemPricing {
  itemId: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
  totalPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  finalPrice: Prisma.Decimal;
  priceChanged: boolean;
  previousUnitPrice?: Prisma.Decimal;
  itemDiscounts: ItemDiscount[];
  taxAmount: Prisma.Decimal;
}

export interface ItemDiscount {
  promotionId: string;
  promotionName: string;
  amount: Prisma.Decimal;
  type: string;
}

export interface PricingBreakdown {
  itemsSubtotal: Prisma.Decimal;
  promotionDiscounts: Prisma.Decimal;
  taxBreakdown: TaxBreakdown[];
  shippingBreakdown: ShippingBreakdown[];
  finalTotal: Prisma.Decimal;
}

export interface TaxBreakdown {
  taxType: string;
  taxRate: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  description: string;
}

export interface ShippingBreakdown {
  sellerId: string;
  sellerName: string;
  shippingMethod: string;
  shippingCost: Prisma.Decimal;
  estimatedDelivery: string;
}

export interface PriceChangeResult {
  hasChanges: boolean;
  changes: PriceChange[];
  totalImpact: Prisma.Decimal;
  affectedItemsCount: number;
}

export interface PriceChange {
  itemId: string;
  variantId: string;
  oldPrice: Prisma.Decimal;
  newPrice: Prisma.Decimal;
  priceIncrease: boolean;
  percentageChange: number;
  impact: Prisma.Decimal; // Total impact on cart (considering quantity)
}

@Injectable()
export class CartPricingService {
  private readonly logger = new Logger(CartPricingService.name);

  constructor(
    private readonly promotionEngine: PromotionEngineService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  // Helper method to convert decimal.js Decimal to Prisma.Decimal
  private toPrismaDecimal(value: any): Prisma.Decimal {
    if (value === null || value === undefined) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(value.toString());
  }

  /**
   * Calculate complete cart pricing with all components
   */
  async calculateCartPricing(
    cart: Cart,
    options?: {
      includePromotions?: boolean;
      includeTaxes?: boolean;
      includeShipping?: boolean;
    },
  ): Promise<CartPricing> {
    const opts = {
      includePromotions: true,
      includeTaxes: true,
      includeShipping: true,
      ...options,
    };

    // 1. Calculate item-level pricing
    const itemPricings = await Promise.all(
      cart.items.map((item) => this.calculateItemPricing(item)),
    );

    // 2. Calculate subtotal
    const subtotal = itemPricings.reduce(
      (sum, pricing) => sum.add(pricing.totalPrice),
      new Prisma.Decimal(0),
    );

    // 3. Apply promotions
    let promotionDiscounts: DiscountResult = {
      totalDiscount: 0,
      appliedPromotions: [],
    };
    let totalDiscountAmount = new Prisma.Decimal(0);

    if (opts.includePromotions) {
      promotionDiscounts = await this.promotionEngine.applyPromotions(cart);
      totalDiscountAmount = new Prisma.Decimal(promotionDiscounts.totalDiscount);
    }

    // 4. Calculate taxes
    let taxAmount = new Prisma.Decimal(0);
    let taxBreakdown: TaxBreakdown[] = [];

    if (opts.includeTaxes) {
      const taxResult = await this.calculateTaxes(
        cart,
        subtotal.sub(totalDiscountAmount),
      );
      taxAmount = taxResult.totalTax;
      taxBreakdown = taxResult.breakdown;
    }

    // 5. Calculate shipping
    let shippingAmount = new Prisma.Decimal(0);
    let shippingBreakdown: ShippingBreakdown[] = [];

    if (opts.includeShipping) {
      const shippingResult = await this.calculateShipping(cart);
      shippingAmount = shippingResult.totalShipping;
      shippingBreakdown = shippingResult.breakdown;
    }

    // 6. Calculate final total
    const totalAmount = subtotal
      .sub(totalDiscountAmount)
      .add(taxAmount)
      .add(shippingAmount);

    return {
      subtotal,
      discountAmount: totalDiscountAmount,
      taxAmount,
      shippingAmount,
      totalAmount,
      itemPricings,
      promotionDiscounts,
      currency: cart.currency,
      breakdown: {
        itemsSubtotal: subtotal,
        promotionDiscounts: totalDiscountAmount,
        taxBreakdown,
        shippingBreakdown,
        finalTotal: totalAmount,
      },
    };
  }

  /**
   * Calculate item-level pricing with real-time price checks
   */
  async calculateItemPricing(item: CartItem): Promise<ItemPricing> {
    // 1. Get current variant pricing
    const currentPricing = await this.getCurrentVariantPricing(item.variantId);

    // 2. Check for price changes
    const priceChanged = !currentPricing.sellingPrice.equals(this.toPrismaDecimal(item.unitPrice));

    // 3. Calculate totals
    const unitPrice = currentPricing.sellingPrice;
    const totalPrice = unitPrice.mul(item.quantity);

    // 4. Get item-level discounts
    const itemDiscounts = await this.getItemDiscounts(item);
    const discountAmount = itemDiscounts.reduce(
      (sum, discount) => sum.add(discount.amount),
      new Prisma.Decimal(0),
    );

    // 5. Calculate taxes for this item
    const taxAmount = await this.calculateItemTax(
      item,
      totalPrice.sub(discountAmount),
    );

    return {
      itemId: item.id,
      unitPrice,
      quantity: item.quantity,
      totalPrice,
      discountAmount,
      finalPrice: totalPrice.sub(discountAmount),
      priceChanged,
      previousUnitPrice: priceChanged ? this.toPrismaDecimal(item.unitPrice) : undefined,
      itemDiscounts,
      taxAmount,
    };
  }

  /**
   * Handle price changes in cart items
   */
  async handlePriceChanges(cart: Cart): Promise<PriceChangeResult> {
    const changes: PriceChange[] = [];
    let totalImpact = new Prisma.Decimal(0);

    for (const item of cart.items) {
      const currentPricing = await this.getCurrentVariantPricing(
        item.variantId,
      );

      if (!currentPricing.sellingPrice.equals(this.toPrismaDecimal(item.unitPrice))) {
        const oldTotal = this.toPrismaDecimal(item.unitPrice).mul(item.quantity);
        const newTotal = currentPricing.sellingPrice.mul(item.quantity);
        const impact = newTotal.sub(oldTotal);

        const change: PriceChange = {
          itemId: item.id,
          variantId: item.variantId,
          oldPrice: this.toPrismaDecimal(item.unitPrice),
          newPrice: currentPricing.sellingPrice,
          priceIncrease: currentPricing.sellingPrice.gt(this.toPrismaDecimal(item.unitPrice)),
          percentageChange: this.calculatePercentageChange(
            this.toPrismaDecimal(item.unitPrice),
            currentPricing.sellingPrice,
          ),
          impact,
        };

        changes.push(change);
        totalImpact = totalImpact.add(impact);

        // Update item with new price
        await this.updateItemPrice(item.id, currentPricing.sellingPrice);
      }
    }

    if (changes.length > 0) {
      // Emit price change event
      this.eventEmitter.emit('cart.price_changes_detected', {
        cartId: cart.id,
        changes,
        totalImpact: totalImpact.toNumber(),
      });

      // Recalculate cart totals
      await this.recalculateCartTotals(cart);
    }

    return {
      hasChanges: changes.length > 0,
      changes,
      totalImpact,
      affectedItemsCount: changes.length,
    };
  }

  /**
   * Recalculate and update cart totals
   */
  async recalculateCartTotals(cart: Cart): Promise<Cart> {
    const pricing = await this.calculateCartPricing(cart);

    // Update cart with new totals
    const updatedCart = await this.updateCartTotals(cart.id, {
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      taxAmount: pricing.taxAmount,
      shippingAmount: pricing.shippingAmount,
      totalAmount: pricing.totalAmount,
    });

    // Emit totals recalculated event
    this.eventEmitter.emit('cart.totals_recalculated', {
      cartId: cart.id,
      oldTotals: {
        subtotal: cart.subtotal.toNumber(),
        discountAmount: cart.discountAmount.toNumber(),
        taxAmount: cart.taxAmount.toNumber(),
        shippingAmount: cart.shippingAmount.toNumber(),
        totalAmount: cart.totalAmount.toNumber(),
      },
      newTotals: {
        subtotal: pricing.subtotal.toNumber(),
        discountAmount: pricing.discountAmount.toNumber(),
        taxAmount: pricing.taxAmount.toNumber(),
        shippingAmount: pricing.shippingAmount.toNumber(),
        totalAmount: pricing.totalAmount.toNumber(),
      },
    });

    return updatedCart;
  }

  /**
   * Calculate taxes based on location and product type
   */
  private async calculateTaxes(
    cart: Cart,
    taxableAmount: Prisma.Decimal,
  ): Promise<{
    totalTax: Prisma.Decimal;
    breakdown: TaxBreakdown[];
  }> {
    // Get user's tax location (shipping address or default)
    const taxLocation = await this.getTaxLocation(cart.userId);

    let totalTax = new Prisma.Decimal(0);
    const breakdown: TaxBreakdown[] = [];

    // Group items by tax category
    const taxGroups = this.groupItemsByTaxCategory(cart.items);

    for (const [taxCategory, items] of taxGroups) {
      const categoryAmount = items.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.totalPrice.toString())),
        new Prisma.Decimal(0),
      );

      const taxRates = await this.getTaxRates(taxCategory, taxLocation);

      for (const taxRate of taxRates) {
        const categoryTax = categoryAmount.mul(taxRate.rate).div(100);
        totalTax = totalTax.add(categoryTax);

        breakdown.push({
          taxType: taxRate.type,
          taxRate: taxRate.rate,
          taxableAmount: categoryAmount,
          taxAmount: categoryTax,
          description: taxRate.description,
        });
      }
    }

    return { totalTax, breakdown };
  }

  /**
   * Calculate shipping costs by seller
   */
  private async calculateShipping(cart: Cart): Promise<{
    totalShipping: Prisma.Decimal;
    breakdown: ShippingBreakdown[];
  }> {
    // Group items by seller for shipping calculation
    const sellerGroups = this.groupItemsBySeller(cart.items);

    let totalShipping = new Prisma.Decimal(0);
    const breakdown: ShippingBreakdown[] = [];

    const destination = await this.getShippingDestination(cart.userId);

    for (const [sellerId, items] of sellerGroups) {
      const shippingResult = await this.calculateSellerShipping({
        sellerId,
        items,
        destination,
      });

      totalShipping = totalShipping.add(shippingResult.cost);

      breakdown.push({
        sellerId,
        sellerName: shippingResult.sellerName,
        shippingMethod: shippingResult.method,
        shippingCost: shippingResult.cost,
        estimatedDelivery: shippingResult.estimatedDelivery,
      });
    }

    return { totalShipping, breakdown };
  }

  /**
   * Get item-level discounts from applied promotions
   */
  private async getItemDiscounts(item: CartItem): Promise<ItemDiscount[]> {
    // This would get discounts applied specifically to this item
    return (
      item.appliedPromotions?.map((promo) => ({
        promotionId: promo.promotionId,
        promotionName: promo.promotionName,
        amount: new Prisma.Decimal(promo.discountAmount.toString()),
        type: promo.discountType,
      })) || []
    );
  }

  /**
   * Calculate tax for individual item
   */
  private async calculateItemTax(
    item: CartItem,
    taxableAmount: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const taxCategory = await this.getItemTaxCategory(item.variantId);
    const taxLocation = await this.getTaxLocationFromItem(item);
    const taxRates = await this.getTaxRates(taxCategory, taxLocation);

    return taxRates.reduce(
      (total, rate) => total.add(taxableAmount.mul(rate.rate).div(100)),
      new Prisma.Decimal(0),
    );
  }

  // Helper methods

  private calculatePercentageChange(
    oldPrice: Prisma.Decimal,
    newPrice: Prisma.Decimal,
  ): number {
    if (oldPrice.equals(0)) return 0;

    const change = newPrice.sub(oldPrice);
    return change.div(oldPrice).mul(100).toNumber();
  }

  private groupItemsByTaxCategory(items: CartItem[]): Map<string, CartItem[]> {
    const groups = new Map<string, CartItem[]>();

    for (const item of items) {
      // This would get tax category from variant/product
      const taxCategory = 'STANDARD'; // Simplified

      if (!groups.has(taxCategory)) {
        groups.set(taxCategory, []);
      }
      groups.get(taxCategory)!.push(item);
    }

    return groups;
  }

  private groupItemsBySeller(items: CartItem[]): Map<string, CartItem[]> {
    const groups = new Map<string, CartItem[]>();

    for (const item of items) {
      if (!groups.has(item.sellerId)) {
        groups.set(item.sellerId, []);
      }
      groups.get(item.sellerId)!.push(item);
    }

    return groups;
  }

  // These methods would integrate with external services
  private async getCurrentVariantPricing(variantId: string): Promise<any> {
    // This would call the pricing service
    return {
      sellingPrice: new Prisma.Decimal(100),
      mrp: new Prisma.Decimal(120),
      discount: new Prisma.Decimal(20),
    };
  }

  private async getTaxLocation(userId?: string): Promise<any> {
    // This would get user's tax location from address service
    return {
      country: 'IN',
      state: 'MH',
      city: 'Mumbai',
    };
  }

  private async getTaxRates(
    taxCategory: string,
    location: any,
  ): Promise<any[]> {
    // This would get tax rates from tax service
    return [
      {
        type: 'GST',
        rate: new Prisma.Decimal(18),
        description: 'Goods and Services Tax',
      },
    ];
  }

  private async getShippingDestination(userId?: string): Promise<any> {
    // This would get shipping destination from address service
    return {
      pincode: '400001',
      city: 'Mumbai',
      state: 'MH',
    };
  }

  private async calculateSellerShipping(params: any): Promise<any> {
    // This would call shipping service
    return {
      cost: new Prisma.Decimal(50),
      method: 'Standard Delivery',
      estimatedDelivery: '3-5 days',
      sellerName: 'Seller Name',
    };
  }

  private async getItemTaxCategory(variantId: string): Promise<string> {
    // This would get tax category from variant/product
    return 'STANDARD';
  }

  private async getTaxLocationFromItem(item: CartItem): Promise<any> {
    // This would get tax location based on item's seller location
    return {
      country: 'IN',
      state: 'MH',
    };
  }

  private async updateItemPrice(
    itemId: string,
    newPrice: Prisma.Decimal,
  ): Promise<void> {
    // This would update the cart item price
  }

  private async updateCartTotals(cartId: string, totals: any): Promise<Cart> {
    // This would update the cart totals in database
    return {} as Cart;
  }
}
