# Enterprise Cart & Promotions System Design

## Table of Contents
1. [System Overview](#system-overview)
2. [Domain Models](#domain-models)
3. [Cart Management](#cart-management)
4. [Promotions Engine](#promotions-engine)
5. [Price Calculation Pipeline](#price-calculation-pipeline)
6. [Inventory Reservation](#inventory-reservation)
7. [Security & Validation](#security--validation)
8. [Performance & Scalability](#performance--scalability)
9. [Implementation Plan](#implementation-plan)

---

## System Overview

### Architecture Principles
- **Domain-Driven Design**: Clear separation between cart and promotions domains
- **Event-Driven**: Emit events for all state changes
- **Multi-Seller Support**: Handle items from different sellers
- **Scalable**: Support high-concurrency operations
- **Secure**: Prevent abuse and manipulation
- **Extensible**: Easy to add new promotion types

### Key Features
- Guest and authenticated cart persistence
- Soft inventory reservations (30 minutes)
- Complex promotion rules and stacking
- Real-time price calculations
- Cart merging on authentication
- Multi-seller order splitting
- Comprehensive audit trails

---

## Domain Models

### Enhanced Cart Domain

```typescript
// Enhanced Cart Entity
export class Cart {
  id: string;
  userId?: string;           // null for guest carts
  sessionId?: string;        // for guest identification
  status: CartStatus;        // ACTIVE, EXPIRED, CONVERTED, ABANDONED
  
  // Pricing
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  shippingAmount: Decimal;
  totalAmount: Decimal;
  
  // Promotions
  appliedPromotions: AppliedPromotion[];
  availablePromotions: string[];  // cached eligible promotion IDs
  
  // Metadata
  currency: string;
  locale: string;
  timezone: string;
  
  // Lifecycle
  expiresAt: Date;          // 24 hours for guests, 30 days for users
  lastActivityAt: Date;
  convertedToOrderId?: string;
  
  // Relations
  items: CartItem[];
  reservations: InventoryReservation[];
  
  // Audit
  version: number;          // optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',    // converted to order
  ABANDONED = 'ABANDONED',    // user left without converting
  MERGED = 'MERGED'          // merged into another cart
}
```

### Enhanced CartItem Entity

```typescript
export class CartItem {
  id: string;
  cartId: string;
  variantId: string;
  sellerId: string;
  
  // Quantity & Pricing
  quantity: number;
  unitPrice: Decimal;        // price at time of addition
  currentUnitPrice: Decimal; // current price (may differ)
  totalPrice: Decimal;       // quantity * currentUnitPrice
  discountAmount: Decimal;   // item-level discounts
  
  // Availability
  isAvailable: boolean;
  availabilityReason?: string;
  reservationId?: string;    // soft reservation
  reservationExpiresAt?: Date;
  
  // Promotions
  appliedPromotions: AppliedPromotion[];
  
  // Metadata
  addedAt: Date;
  lastCheckedAt: Date;       // last availability check
  
  // Snapshots (for price change detection)
  variantSnapshot: VariantSnapshot;
  pricingSnapshot: PricingSnapshot;
  
  // Relations
  cart: Cart;
  variant: ProductVariant;
  seller: User;
}
```

### Applied Promotion Entity

```typescript
export class AppliedPromotion {
  id: string;
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  
  // Application Context
  cartId?: string;
  cartItemId?: string;       // for item-specific promotions
  orderId?: string;          // when converted to order
  
  // Discount Details
  discountType: PromotionType;
  discountValue: Decimal;
  discountAmount: Decimal;   // calculated discount
  maxDiscountAmount?: Decimal;
  
  // Eligibility
  eligibilitySnapshot: EligibilitySnapshot;
  
  // Metadata
  appliedAt: Date;
  appliedBy?: string;        // user ID or 'SYSTEM'
  priority: number;          // for stacking order
  
  // Relations
  promotion: Promotion;
}
```

---

## Cart Management

### Cart Lifecycle Management

```typescript
@Injectable()
export class CartService {
  
  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(
    userId?: string, 
    sessionId?: string
  ): Promise<Cart> {
    // 1. Try to find existing active cart
    let cart = await this.findActiveCart(userId, sessionId);
    
    if (!cart) {
      // 2. Create new cart
      cart = await this.createCart(userId, sessionId);
    } else {
      // 3. Check if cart needs refresh
      await this.refreshCartIfNeeded(cart);
    }
    
    return cart;
  }
  
  /**
   * Add item to cart with validation
   */
  async addItem(
    cartId: string,
    variantId: string,
    quantity: number,
    userId?: string
  ): Promise<CartItem> {
    
    // 1. Validate cart ownership
    const cart = await this.validateCartAccess(cartId, userId);
    
    // 2. Validate variant and availability
    const variant = await this.validateVariantAvailability(variantId, quantity);
    
    // 3. Check existing item
    const existingItem = await this.findCartItem(cartId, variantId, variant.product.sellerId);
    
    if (existingItem) {
      // 4a. Update existing item
      return await this.updateItemQuantity(
        existingItem.id, 
        existingItem.quantity + quantity
      );
    } else {
      // 4b. Create new item
      return await this.createCartItem(cart, variant, quantity);
    }
  }
  
  /**
   * Update item quantity with validation
   */
  async updateItemQuantity(
    itemId: string,
    newQuantity: number,
    userId?: string
  ): Promise<CartItem> {
    
    // 1. Validate item access
    const item = await this.validateItemAccess(itemId, userId);
    
    if (newQuantity <= 0) {
      // 2a. Remove item if quantity is 0 or negative
      await this.removeItem(itemId, userId);
      return null;
    }
    
    // 2b. Validate new quantity availability
    await this.validateQuantityAvailability(item.variantId, newQuantity);
    
    // 3. Update item
    const updatedItem = await this.cartRepository.updateItem(itemId, {
      quantity: newQuantity,
      totalPrice: item.currentUnitPrice.mul(newQuantity),
      lastCheckedAt: new Date()
    });
    
    // 4. Refresh cart totals and promotions
    await this.refreshCart(item.cartId);
    
    // 5. Emit event
    this.eventEmitter.emit('cart.item_quantity_updated', 
      new CartItemQuantityUpdatedEvent(updatedItem, item.quantity, newQuantity)
    );
    
    return updatedItem;
  }
  
  /**
   * Merge guest cart into user cart on authentication
   */
  async mergeGuestCart(
    guestSessionId: string,
    userId: string
  ): Promise<Cart> {
    
    // 1. Find guest and user carts
    const guestCart = await this.findActiveCart(null, guestSessionId);
    const userCart = await this.findActiveCart(userId);
    
    if (!guestCart) {
      return userCart || await this.createCart(userId);
    }
    
    if (!userCart) {
      // 2a. Convert guest cart to user cart
      return await this.convertGuestCartToUser(guestCart, userId);
    }
    
    // 2b. Merge guest items into user cart
    return await this.mergeCartItems(guestCart, userCart);
  }
  
  private async mergeCartItems(sourceCart: Cart, targetCart: Cart): Promise<Cart> {
    for (const item of sourceCart.items) {
      try {
        await this.addItem(targetCart.id, item.variantId, item.quantity);
      } catch (error) {
        // Log merge conflicts but continue
        this.logger.warn(`Failed to merge cart item ${item.id}: ${error.message}`);
      }
    }
    
    // Mark source cart as merged
    await this.cartRepository.updateStatus(sourceCart.id, CartStatus.MERGED);
    
    return await this.getCart(targetCart.id);
  }
}
```

### Cart Validation & Business Rules

```typescript
@Injectable()
export class CartValidators {
  
  static validateCartLimits(cart: Cart): void {
    const MAX_ITEMS = 100;
    const MAX_QUANTITY_PER_ITEM = 999;
    const MAX_CART_VALUE = new Decimal(1000000); // 10 lakh
    
    if (cart.items.length > MAX_ITEMS) {
      throw new BadRequestException(`Cart cannot have more than ${MAX_ITEMS} items`);
    }
    
    for (const item of cart.items) {
      if (item.quantity > MAX_QUANTITY_PER_ITEM) {
        throw new BadRequestException(
          `Item quantity cannot exceed ${MAX_QUANTITY_PER_ITEM}`
        );
      }
    }
    
    if (cart.totalAmount.gt(MAX_CART_VALUE)) {
      throw new BadRequestException('Cart value exceeds maximum limit');
    }
  }
  
  static validateItemCompatibility(items: CartItem[]): void {
    // Check for conflicting items (e.g., different shipping zones)
    const shippingZones = new Set();
    const sellers = new Set();
    
    for (const item of items) {
      shippingZones.add(item.variant.product.shippingZone);
      sellers.add(item.sellerId);
    }
    
    // Business rule: Maximum 5 different sellers per cart
    if (sellers.size > 5) {
      throw new BadRequestException('Cart cannot have items from more than 5 sellers');
    }
  }
  
  static validateCartExpiry(cart: Cart): void {
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      throw new BadRequestException('Cart has expired');
    }
  }
}
```

---

## Promotions Engine

### Promotion Eligibility Engine

```typescript
@Injectable()
export class PromotionEligibilityService {
  
  /**
   * Find all eligible promotions for cart
   */
  async findEligiblePromotions(cart: Cart): Promise<Promotion[]> {
    // 1. Get active promotions
    const activePromotions = await this.promotionRepository.findActive();
    
    // 2. Filter by eligibility
    const eligiblePromotions = [];
    
    for (const promotion of activePromotions) {
      if (await this.isPromotionEligible(promotion, cart)) {
        eligiblePromotions.push(promotion);
      }
    }
    
    // 3. Sort by priority and potential discount
    return this.sortPromotionsByValue(eligiblePromotions, cart);
  }
  
  /**
   * Check if promotion is eligible for cart
   */
  async isPromotionEligible(promotion: Promotion, cart: Cart): Promise<boolean> {
    try {
      // 1. Basic checks
      if (!this.isPromotionActive(promotion)) return false;
      if (!this.isPromotionValid(promotion)) return false;
      
      // 2. Usage limit checks
      if (!(await this.checkUsageLimits(promotion, cart.userId))) return false;
      
      // 3. Minimum order amount
      if (!this.checkMinimumOrderAmount(promotion, cart)) return false;
      
      // 4. Scope-based eligibility
      if (!this.checkScopeEligibility(promotion, cart)) return false;
      
      // 5. Product/category eligibility
      if (!this.checkProductEligibility(promotion, cart)) return false;
      
      // 6. User eligibility
      if (!this.checkUserEligibility(promotion, cart)) return false;
      
      // 7. Stacking rules
      if (!this.checkStackingRules(promotion, cart)) return false;
      
      return true;
      
    } catch (error) {
      this.logger.error(`Error checking promotion eligibility: ${error.message}`);
      return false;
    }
  }
  
  private checkScopeEligibility(promotion: Promotion, cart: Cart): boolean {
    switch (promotion.scope) {
      case PromotionScope.GLOBAL:
        return true;
        
      case PromotionScope.CATEGORY:
        return cart.items.some(item => 
          promotion.applicableCategories.includes(item.variant.product.categoryId)
        );
        
      case PromotionScope.PRODUCT:
        return cart.items.some(item => 
          promotion.applicableProducts.includes(item.variant.productId)
        );
        
      case PromotionScope.SELLER:
        return cart.items.some(item => 
          promotion.applicableSellers.includes(item.sellerId)
        );
        
      case PromotionScope.USER:
        return cart.userId && promotion.applicableUsers.includes(cart.userId);
        
      default:
        return false;
    }
  }
  
  private async checkUsageLimits(promotion: Promotion, userId?: string): Promise<boolean> {
    // Global usage limit
    if (promotion.usageLimit && promotion.currentUsage >= promotion.usageLimit) {
      return false;
    }
    
    // Per-user usage limit
    if (promotion.usageLimitPerUser && userId) {
      const userUsage = await this.promotionRepository.getUserUsageCount(
        promotion.id, 
        userId
      );
      if (userUsage >= promotion.usageLimitPerUser) {
        return false;
      }
    }
    
    return true;
  }
}
```

### Promotion Application Engine

```typescript
@Injectable()
export class PromotionApplicationService {
  
  /**
   * Apply promotions to cart
   */
  async applyPromotions(cart: Cart, promotionCodes?: string[]): Promise<Cart> {
    // 1. Clear existing promotions
    await this.clearAppliedPromotions(cart.id);
    
    // 2. Find eligible promotions
    let eligiblePromotions = await this.eligibilityService.findEligiblePromotions(cart);
    
    // 3. Add manually applied promotions (coupon codes)
    if (promotionCodes?.length) {
      const manualPromotions = await this.validatePromotionCodes(promotionCodes, cart);
      eligiblePromotions = [...eligiblePromotions, ...manualPromotions];
    }
    
    // 4. Apply stacking rules
    const applicablePromotions = this.resolveStackingConflicts(eligiblePromotions);
    
    // 5. Calculate and apply discounts
    const appliedPromotions = [];
    for (const promotion of applicablePromotions) {
      const applied = await this.applyPromotion(promotion, cart);
      if (applied) {
        appliedPromotions.push(applied);
      }
    }
    
    // 6. Update cart totals
    await this.recalculateCartTotals(cart);
    
    // 7. Emit event
    this.eventEmitter.emit('cart.promotions_applied', 
      new CartPromotionsAppliedEvent(cart.id, appliedPromotions)
    );
    
    return cart;
  }
  
  /**
   * Apply single promotion to cart
   */
  private async applyPromotion(promotion: Promotion, cart: Cart): Promise<AppliedPromotion | null> {
    try {
      const calculator = this.getPromotionCalculator(promotion.type);
      const discountResult = await calculator.calculate(promotion, cart);
      
      if (discountResult.amount.lte(0)) {
        return null; // No discount applicable
      }
      
      // Create applied promotion record
      const appliedPromotion = await this.appliedPromotionRepository.create({
        promotionId: promotion.id,
        promotionCode: promotion.code,
        promotionName: promotion.name,
        cartId: cart.id,
        discountType: promotion.type,
        discountValue: promotion.discountValue,
        discountAmount: discountResult.amount,
        maxDiscountAmount: promotion.maxDiscountAmount,
        priority: promotion.priority,
        eligibilitySnapshot: discountResult.eligibilitySnapshot,
        appliedAt: new Date(),
        appliedBy: 'SYSTEM'
      });
      
      // Apply to specific items if needed
      if (discountResult.itemDiscounts) {
        await this.applyItemDiscounts(discountResult.itemDiscounts);
      }
      
      return appliedPromotion;
      
    } catch (error) {
      this.logger.error(`Failed to apply promotion ${promotion.id}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Resolve stacking conflicts based on rules
   */
  private resolveStackingConflicts(promotions: Promotion[]): Promotion[] {
    // Sort by priority (higher priority first)
    const sorted = promotions.sort((a, b) => b.priority - a.priority);
    
    const applicable = [];
    const usedCategories = new Set<string>();
    
    for (const promotion of sorted) {
      // Check if promotion can stack with already selected ones
      if (this.canStackWithSelected(promotion, applicable)) {
        applicable.push(promotion);
        
        // Mark categories as used for non-stackable promotions
        if (!promotion.isStackable) {
          this.markCategoriesAsUsed(promotion, usedCategories);
        }
      }
    }
    
    return applicable;
  }
}
```

### Promotion Calculators

```typescript
// Base calculator interface
interface IPromotionCalculator {
  calculate(promotion: Promotion, cart: Cart): Promise<DiscountResult>;
}

// Percentage discount calculator
@Injectable()
export class PercentageDiscountCalculator implements IPromotionCalculator {
  
  async calculate(promotion: Promotion, cart: Cart): Promise<DiscountResult> {
    const eligibleItems = this.getEligibleItems(promotion, cart);
    const eligibleAmount = eligibleItems.reduce(
      (sum, item) => sum.add(item.totalPrice), 
      new Decimal(0)
    );
    
    let discountAmount = eligibleAmount.mul(promotion.discountValue).div(100);
    
    // Apply maximum discount cap
    if (promotion.maxDiscountAmount) {
      discountAmount = Decimal.min(discountAmount, promotion.maxDiscountAmount);
    }
    
    return {
      amount: discountAmount,
      eligibleAmount,
      eligibleItems: eligibleItems.map(item => item.id),
      eligibilitySnapshot: this.createEligibilitySnapshot(promotion, cart)
    };
  }
}

// Buy X Get Y calculator
@Injectable()
export class BuyXGetYCalculator implements IPromotionCalculator {
  
  async calculate(promotion: Promotion, cart: Cart): Promise<DiscountResult> {
    const eligibleItems = this.getEligibleItems(promotion, cart);
    
    // Group items by product for BXGY calculation
    const productGroups = this.groupItemsByProduct(eligibleItems);
    
    let totalDiscount = new Decimal(0);
    const itemDiscounts = [];
    
    for (const [productId, items] of productGroups) {
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const freeQuantity = Math.floor(totalQuantity / promotion.buyQuantity) * promotion.getQuantity;
      
      if (freeQuantity > 0) {
        // Apply discount to cheapest items first
        const sortedItems = items.sort((a, b) => 
          a.currentUnitPrice.cmp(b.currentUnitPrice)
        );
        
        let remainingFreeQty = freeQuantity;
        for (const item of sortedItems) {
          if (remainingFreeQty <= 0) break;
          
          const discountQty = Math.min(remainingFreeQty, item.quantity);
          const discountAmount = item.currentUnitPrice
            .mul(discountQty)
            .mul(promotion.getDiscountPercentage || 100)
            .div(100);
          
          totalDiscount = totalDiscount.add(discountAmount);
          itemDiscounts.push({
            itemId: item.id,
            discountAmount,
            discountQuantity: discountQty
          });
          
          remainingFreeQty -= discountQty;
        }
      }
    }
    
    return {
      amount: totalDiscount,
      itemDiscounts,
      eligibilitySnapshot: this.createEligibilitySnapshot(promotion, cart)
    };
  }
}
```

---

## Price Calculation Pipeline

### Cart Pricing Engine

```typescript
@Injectable()
export class CartPricingService {
  
  /**
   * Calculate complete cart pricing
   */
  async calculateCartPricing(cart: Cart): Promise<CartPricing> {
    // 1. Calculate item-level pricing
    const itemPricings = await Promise.all(
      cart.items.map(item => this.calculateItemPricing(item))
    );
    
    // 2. Calculate subtotal
    const subtotal = itemPricings.reduce(
      (sum, pricing) => sum.add(pricing.totalPrice),
      new Decimal(0)
    );
    
    // 3. Apply promotions
    const promotionDiscounts = await this.calculatePromotionDiscounts(cart);
    const totalDiscountAmount = promotionDiscounts.reduce(
      (sum, discount) => sum.add(discount.amount),
      new Decimal(0)
    );
    
    // 4. Calculate taxes
    const taxAmount = await this.calculateTaxes(cart, subtotal.sub(totalDiscountAmount));
    
    // 5. Calculate shipping
    const shippingAmount = await this.calculateShipping(cart);
    
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
      currency: cart.currency
    };
  }
  
  /**
   * Calculate item-level pricing with real-time price checks
   */
  private async calculateItemPricing(item: CartItem): Promise<ItemPricing> {
    // 1. Get current variant pricing
    const currentPricing = await this.variantPricingService.getCurrentPricing(
      item.variantId
    );
    
    // 2. Check for price changes
    const priceChanged = !currentPricing.sellingPrice.eq(item.unitPrice);
    
    // 3. Calculate totals
    const unitPrice = currentPricing.sellingPrice;
    const totalPrice = unitPrice.mul(item.quantity);
    
    // 4. Apply item-level promotions
    const itemDiscounts = await this.getItemDiscounts(item);
    const discountAmount = itemDiscounts.reduce(
      (sum, discount) => sum.add(discount.amount),
      new Decimal(0)
    );
    
    return {
      itemId: item.id,
      unitPrice,
      quantity: item.quantity,
      totalPrice,
      discountAmount,
      finalPrice: totalPrice.sub(discountAmount),
      priceChanged,
      previousUnitPrice: item.unitPrice,
      itemDiscounts
    };
  }
  
  /**
   * Calculate taxes based on location and product type
   */
  private async calculateTaxes(cart: Cart, taxableAmount: Decimal): Promise<Decimal> {
    // Get user's tax location (shipping address or default)
    const taxLocation = await this.getTaxLocation(cart.userId);
    
    let totalTax = new Decimal(0);
    
    // Group items by tax category
    const taxGroups = this.groupItemsByTaxCategory(cart.items);
    
    for (const [taxCategory, items] of taxGroups) {
      const categoryAmount = items.reduce(
        (sum, item) => sum.add(item.totalPrice),
        new Decimal(0)
      );
      
      const taxRate = await this.taxService.getTaxRate(taxCategory, taxLocation);
      const categoryTax = categoryAmount.mul(taxRate).div(100);
      
      totalTax = totalTax.add(categoryTax);
    }
    
    return totalTax;
  }
  
  /**
   * Calculate shipping costs by seller
   */
  private async calculateShipping(cart: Cart): Promise<Decimal> {
    // Group items by seller for shipping calculation
    const sellerGroups = this.groupItemsBySeller(cart.items);
    
    let totalShipping = new Decimal(0);
    
    for (const [sellerId, items] of sellerGroups) {
      const sellerShipping = await this.shippingService.calculateShipping({
        sellerId,
        items,
        destination: await this.getShippingDestination(cart.userId)
      });
      
      totalShipping = totalShipping.add(sellerShipping);
    }
    
    return totalShipping;
  }
}
```

### Price Change Handling

```typescript
@Injectable()
export class PriceChangeService {
  
  /**
   * Handle price changes in cart items
   */
  async handlePriceChanges(cart: Cart): Promise<PriceChangeResult> {
    const changes = [];
    
    for (const item of cart.items) {
      const currentPricing = await this.variantPricingService.getCurrentPricing(
        item.variantId
      );
      
      if (!currentPricing.sellingPrice.eq(item.unitPrice)) {
        const change = {
          itemId: item.id,
          variantId: item.variantId,
          oldPrice: item.unitPrice,
          newPrice: currentPricing.sellingPrice,
          priceIncrease: currentPricing.sellingPrice.gt(item.unitPrice),
          percentageChange: this.calculatePercentageChange(
            item.unitPrice, 
            currentPricing.sellingPrice
          )
        };
        
        changes.push(change);
        
        // Update item with new price
        await this.cartRepository.updateItem(item.id, {
          unitPrice: currentPricing.sellingPrice,
          currentUnitPrice: currentPricing.sellingPrice,
          totalPrice: currentPricing.sellingPrice.mul(item.quantity),
          lastCheckedAt: new Date()
        });
      }
    }
    
    if (changes.length > 0) {
      // Emit price change event
      this.eventEmitter.emit('cart.price_changes_detected', 
        new CartPriceChangesEvent(cart.id, changes)
      );
      
      // Recalculate cart totals
      await this.cartPricingService.recalculateCartTotals(cart);
    }
    
    return {
      hasChanges: changes.length > 0,
      changes,
      totalImpact: this.calculateTotalPriceImpact(changes)
    };
  }
}
```

---

## Inventory Reservation

### Soft Reservation System

```typescript
@Injectable()
export class InventoryReservationService {
  
  /**
   * Create soft reservation for cart items
   */
  async createCartReservations(cart: Cart): Promise<InventoryReservation[]> {
    const reservations = [];
    
    for (const item of cart.items) {
      try {
        const reservation = await this.createSoftReservation({
          variantId: item.variantId,
          quantity: item.quantity,
          referenceType: 'CART',
          referenceId: cart.id,
          expiresAt: this.calculateReservationExpiry(),
          priority: ReservationPriority.CART
        });
        
        reservations.push(reservation);
        
        // Update cart item with reservation
        await this.cartRepository.updateItem(item.id, {
          reservationId: reservation.id,
          reservationExpiresAt: reservation.expiresAt
        });
        
      } catch (error) {
        // Handle reservation failure
        await this.handleReservationFailure(item, error);
      }
    }
    
    return reservations;
  }
  
  /**
   * Create soft reservation with availability check
   */
  private async createSoftReservation(
    request: ReservationRequest
  ): Promise<InventoryReservation> {
    
    // 1. Check current availability
    const inventory = await this.inventoryService.getAvailableQuantity(
      request.variantId
    );
    
    if (inventory < request.quantity) {
      throw new InsufficientInventoryException(
        `Only ${inventory} units available for variant ${request.variantId}`
      );
    }
    
    // 2. Create reservation
    const reservation = await this.reservationRepository.create({
      ...request,
      status: ReservationStatus.ACTIVE,
      createdAt: new Date()
    });
    
    // 3. Update inventory reserved quantity
    await this.inventoryService.addReservedQuantity(
      request.variantId,
      request.quantity
    );
    
    // 4. Schedule cleanup job
    await this.scheduleReservationCleanup(reservation);
    
    return reservation;
  }
  
  /**
   * Convert soft reservations to hard reservations (on order creation)
   */
  async convertToHardReservations(
    cartId: string,
    orderId: string
  ): Promise<InventoryReservation[]> {
    
    const cartReservations = await this.reservationRepository.findByReference(
      'CART',
      cartId
    );
    
    const hardReservations = [];
    
    for (const reservation of cartReservations) {
      // Create hard reservation
      const hardReservation = await this.reservationRepository.create({
        variantId: reservation.variantId,
        quantity: reservation.quantity,
        referenceType: 'ORDER',
        referenceId: orderId,
        status: ReservationStatus.CONFIRMED,
        priority: ReservationPriority.ORDER,
        expiresAt: null, // Hard reservations don't expire
        parentReservationId: reservation.id
      });
      
      // Mark soft reservation as converted
      await this.reservationRepository.update(reservation.id, {
        status: ReservationStatus.CONVERTED,
        convertedToReservationId: hardReservation.id
      });
      
      hardReservations.push(hardReservation);
    }
    
    return hardReservations;
  }
  
  /**
   * Release expired reservations
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async cleanupExpiredReservations(): Promise<void> {
    const expiredReservations = await this.reservationRepository.findExpired();
    
    for (const reservation of expiredReservations) {
      await this.releaseReservation(reservation.id, 'EXPIRED');
    }
    
    this.logger.log(`Cleaned up ${expiredReservations.length} expired reservations`);
  }
  
  private calculateReservationExpiry(): Date {
    // 30 minutes for cart reservations
    return new Date(Date.now() + 30 * 60 * 1000);
  }
}
```

### Inventory Availability Service

```typescript
@Injectable()
export class InventoryAvailabilityService {
  
  /**
   * Check real-time availability for cart items
   */
  async checkCartAvailability(cart: Cart): Promise<AvailabilityResult> {
    const results = await Promise.all(
      cart.items.map(item => this.checkItemAvailability(item))
    );
    
    const unavailableItems = results.filter(result => !result.isAvailable);
    const partiallyAvailableItems = results.filter(result => 
      result.isAvailable && result.availableQuantity < result.requestedQuantity
    );
    
    return {
      isFullyAvailable: unavailableItems.length === 0 && partiallyAvailableItems.length === 0,
      unavailableItems,
      partiallyAvailableItems,
      itemResults: results
    };
  }
  
  /**
   * Check availability for single cart item
   */
  private async checkItemAvailability(item: CartItem): Promise<ItemAvailabilityResult> {
    const inventory = await this.inventoryService.getInventory(item.variantId);
    
    if (!inventory) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        isAvailable: false,
        reason: 'VARIANT_NOT_FOUND'
      };
    }
    
    const availableQuantity = inventory.quantity - inventory.reservedQuantity;
    
    if (availableQuantity <= 0) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        isAvailable: false,
        reason: 'OUT_OF_STOCK'
      };
    }
    
    if (availableQuantity < item.quantity) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity,
        isAvailable: true,
        reason: 'PARTIAL_AVAILABILITY',
        suggestedQuantity: availableQuantity
      };
    }
    
    return {
      itemId: item.id,
      variantId: item.variantId,
      requestedQuantity: item.quantity,
      availableQuantity,
      isAvailable: true,
      reason: 'AVAILABLE'
    };
  }
}
```

---

## Security & Validation

### Cart Security Policies

```typescript
@Injectable()
export class CartSecurityService {
  
  /**
   * Validate cart ownership and access
   */
  async validateCartAccess(cartId: string, userId?: string, sessionId?: string): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId);
    
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    
    // Check ownership
    if (cart.userId) {
      // User cart - must match user ID
      if (!userId || cart.userId !== userId) {
        throw new ForbiddenException('Access denied to cart');
      }
    } else {
      // Guest cart - must match session ID
      if (!sessionId || cart.sessionId !== sessionId) {
        throw new ForbiddenException('Access denied to cart');
      }
    }
    
    // Check cart status
    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException(`Cart is ${cart.status.toLowerCase()}`);
    }
    
    // Check expiry
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      throw new BadRequestException('Cart has expired');
    }
    
    return cart;
  }
  
  /**
   * Rate limiting for cart operations
   */
  async checkRateLimit(userId?: string, sessionId?: string): Promise<void> {
    const identifier = userId || sessionId;
    if (!identifier) return;
    
    const key = `cart_operations:${identifier}`;
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) > 100) { // 100 operations per hour
      throw new TooManyRequestsException('Rate limit exceeded for cart operations');
    }
    
    await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hour
  }
  
  /**
   * Prevent cart manipulation attacks
   */
  async validateCartIntegrity(cart: Cart): Promise<void> {
    // 1. Validate pricing consistency
    const recalculatedTotal = cart.items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Decimal(0)
    );
    
    if (!recalculatedTotal.eq(cart.subtotal)) {
      this.logger.warn(`Cart ${cart.id} has pricing inconsistency`);
      await this.recalculateCartTotals(cart);
    }
    
    // 2. Validate promotion applications
    for (const appliedPromotion of cart.appliedPromotions) {
      const isStillValid = await this.promotionEligibilityService.isPromotionEligible(
        await this.promotionRepository.findById(appliedPromotion.promotionId),
        cart
      );
      
      if (!isStillValid) {
        await this.removeAppliedPromotion(appliedPromotion.id);
      }
    }
    
    // 3. Validate item availability
    const availability = await this.inventoryAvailabilityService.checkCartAvailability(cart);
    if (!availability.isFullyAvailable) {
      await this.handleAvailabilityIssues(cart, availability);
    }
  }
}
```

### Abuse Prevention

```typescript
@Injectable()
export class CartAbusePreventionService {
  
  /**
   * Detect and prevent cart abuse patterns
   */
  async detectAbusePatterns(userId?: string, sessionId?: string): Promise<AbuseDetectionResult> {
    const identifier = userId || sessionId;
    if (!identifier) return { isAbusive: false };
    
    const patterns = await Promise.all([
      this.detectRapidCartCreation(identifier),
      this.detectExcessiveItemAdditions(identifier),
      this.detectPromotionAbuse(identifier),
      this.detectInventoryHoarding(identifier)
    ]);
    
    const abusivePatterns = patterns.filter(p => p.isAbusive);
    
    if (abusivePatterns.length > 0) {
      await this.logAbuseAttempt(identifier, abusivePatterns);
      
      // Apply temporary restrictions
      await this.applyTemporaryRestrictions(identifier, abusivePatterns);
    }
    
    return {
      isAbusive: abusivePatterns.length > 0,
      patterns: abusivePatterns,
      restrictionsApplied: abusivePatterns.length > 0
    };
  }
  
  private async detectInventoryHoarding(identifier: string): Promise<AbusePattern> {
    // Check if user is hoarding inventory by creating multiple carts
    const activeCarts = await this.cartRepository.findActiveByIdentifier(identifier);
    
    const totalReservedQuantity = activeCarts.reduce((total, cart) => {
      return total + cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
    
    const HOARDING_THRESHOLD = 1000; // Adjust based on business needs
    
    return {
      type: 'INVENTORY_HOARDING',
      isAbusive: totalReservedQuantity > HOARDING_THRESHOLD,
      severity: totalReservedQuantity > HOARDING_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
      details: {
        totalReservedQuantity,
        activeCartsCount: activeCarts.length,
        threshold: HOARDING_THRESHOLD
      }
    };
  }
  
  private async detectPromotionAbuse(identifier: string): Promise<AbusePattern> {
    // Check for promotion code abuse (trying multiple invalid codes)
    const recentAttempts = await this.redis.get(`promo_attempts:${identifier}`);
    const attemptCount = recentAttempts ? parseInt(recentAttempts) : 0;
    
    const ABUSE_THRESHOLD = 20; // 20 failed attempts in 1 hour
    
    return {
      type: 'PROMOTION_ABUSE',
      isAbusive: attemptCount > ABUSE_THRESHOLD,
      severity: attemptCount > ABUSE_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
      details: {
        attemptCount,
        threshold: ABUSE_THRESHOLD,
        timeWindow: '1 hour'
      }
    };
  }
}
```

---

## Performance & Scalability

### Caching Strategy

```typescript
@Injectable()
export class CartCacheService {
  
  /**
   * Cache cart data with TTL
   */
  async cacheCart(cart: Cart): Promise<void> {
    const cacheKey = `cart:${cart.id}`;
    const ttl = cart.userId ? 86400 : 3600; // 24h for users, 1h for guests
    
    await this.redis.setex(cacheKey, ttl, JSON.stringify(cart));
  }
  
  /**
   * Get cart from cache
   */
  async getCachedCart(cartId: string): Promise<Cart | null> {
    const cacheKey = `cart:${cartId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  /**
   * Cache promotion eligibility results
   */
  async cachePromotionEligibility(
    cartId: string, 
    eligiblePromotions: Promotion[]
  ): Promise<void> {
    const cacheKey = `cart_promotions:${cartId}`;
    const ttl = 300; // 5 minutes
    
    await this.redis.setex(
      cacheKey, 
      ttl, 
      JSON.stringify(eligiblePromotions.map(p => p.id))
    );
  }
  
  /**
   * Invalidate cart-related caches
   */
  async invalidateCartCaches(cartId: string): Promise<void> {
    const keys = [
      `cart:${cartId}`,
      `cart_promotions:${cartId}`,
      `cart_pricing:${cartId}`,
      `cart_availability:${cartId}`
    ];
    
    await this.redis.del(...keys);
  }
}
```

### Database Optimization

```typescript
// Optimized cart queries with proper indexing
@Injectable()
export class OptimizedCartRepository {
  
  /**
   * Find cart with optimized includes
   */
  async findCartWithItems(cartId: string): Promise<Cart | null> {
    return await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sellerId: true,
                    categoryId: true,
                    status: true
                  }
                },
                pricing: {
                  where: {
                    validFrom: { lte: new Date() },
                    OR: [
                      { validTo: null },
                      { validTo: { gte: new Date() } }
                    ]
                  },
                  orderBy: { validFrom: 'desc' },
                  take: 1
                },
                inventory: true
              }
            }
          },
          orderBy: { addedAt: 'asc' }
        },
        appliedPromotions: {
          include: {
            promotion: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                status: true
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Batch update cart items
   */
  async batchUpdateItems(updates: CartItemUpdate[]): Promise<void> {
    const transaction = updates.map(update => 
      this.prisma.cartItem.update({
        where: { id: update.itemId },
        data: update.data
      })
    );
    
    await this.prisma.$transaction(transaction);
  }
}
```

---

## Implementation Plan

### Phase 1: Core Cart Management (Week 1-2)
1. ✅ Enhanced cart and cart item entities
2. ✅ Cart service with CRUD operations
3. ✅ Cart validation and business rules
4. ✅ Guest cart handling and merging
5. ✅ Basic event emission

### Phase 2: Inventory Integration (Week 2-3)
1. ✅ Soft reservation system
2. ✅ Inventory availability checking
3. ✅ Reservation cleanup jobs
4. ✅ Hard reservation conversion

### Phase 3: Promotions Engine (Week 3-4)
1. ✅ Promotion eligibility service
2. ✅ Promotion calculators for different types
3. ✅ Promotion application engine
4. ✅ Stacking rules implementation

### Phase 4: Pricing Pipeline (Week 4-5)
1. ✅ Cart pricing service
2. ✅ Price change detection and handling
3. ✅ Tax calculation integration
4. ✅ Shipping cost calculation

### Phase 5: Security & Performance (Week 5-6)
1. ✅ Security policies and validation
2. ✅ Abuse prevention mechanisms
3. ✅ Caching implementation
4. ✅ Database optimization

### Phase 6: Testing & Deployment (Week 6-7)
1. Unit tests for all services
2. Integration tests for workflows
3. Performance testing
4. Security testing
5. Production deployment

---

## Next Steps

1. **Review and approve this design document**
2. **Set up development environment and database migrations**
3. **Begin implementation with Phase 1**
4. **Establish monitoring and alerting**
5. **Plan integration testing with existing systems**

This design provides a comprehensive, enterprise-grade cart and promotions system that integrates seamlessly with your existing marketplace architecture while providing the scalability, security, and flexibility needed for a multi-seller platform.