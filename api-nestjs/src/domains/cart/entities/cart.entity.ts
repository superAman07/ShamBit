import Decimal from 'decimal.js';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
  ABANDONED = 'ABANDONED',
  MERGED = 'MERGED',
}

export class Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  status: CartStatus;

  // Pricing
  subtotal: InstanceType<typeof Decimal>;
  discountAmount: InstanceType<typeof Decimal>;
  taxAmount: InstanceType<typeof Decimal>;
  shippingAmount: InstanceType<typeof Decimal>;
  totalAmount: InstanceType<typeof Decimal>;

  // Promotions
  appliedPromotions: string[];
  availablePromotions: string[];

  // Localization
  currency: string;
  locale: string;
  timezone: string;

  // Lifecycle
  expiresAt?: Date;
  lastActivityAt: Date;
  convertedToOrderId?: string;

  // Optimistic locking
  version: number;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Relations
  items: CartItem[];
  appliedPromotionDetails: AppliedPromotion[];

  constructor(data: Partial<Cart>) {
    Object.assign(this, data);
    this.items = data.items || [];
    this.appliedPromotionDetails = data.appliedPromotionDetails || [];
  }

  // Business methods

  /**
   * Check if cart is active and not expired
   */
  isActive(): boolean {
    return (
      this.status === CartStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  /**
   * Check if cart belongs to user or session
   */
  belongsTo(userId?: string, sessionId?: string): boolean {
    if (this.userId) {
      return this.userId === userId;
    }
    return this.sessionId === sessionId;
  }

  /**
   * Get total item count
   */
  getTotalItemCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get unique seller count
   */
  getSellerCount(): number {
    const sellers = new Set(this.items.map((item) => item.sellerId));
    return sellers.size;
  }

  /**
   * Check if cart has items from specific seller
   */
  hasItemsFromSeller(sellerId: string): boolean {
    return this.items.some((item) => item.sellerId === sellerId);
  }

  /**
   * Get items grouped by seller
   */
  getItemsBySeller(): Map<string, CartItem[]> {
    const sellerGroups = new Map<string, CartItem[]>();

    for (const item of this.items) {
      if (!sellerGroups.has(item.sellerId)) {
        sellerGroups.set(item.sellerId, []);
      }
      sellerGroups.get(item.sellerId)!.push(item);
    }

    return sellerGroups;
  }

  /**
   * Find item by variant and seller
   */
  findItem(variantId: string, sellerId: string): CartItem | undefined {
    return this.items.find(
      (item) => item.variantId === variantId && item.sellerId === sellerId,
    );
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Mark cart as expired
   */
  markAsExpired(): void {
    this.status = CartStatus.EXPIRED;
  }

  /**
   * Mark cart as converted to order
   */
  markAsConverted(orderId: string): void {
    this.status = CartStatus.CONVERTED;
    this.convertedToOrderId = orderId;
  }

  /**
   * Mark cart as merged
   */
  markAsMerged(): void {
    this.status = CartStatus.MERGED;
  }
}

export class CartItem {
  id: string;
  cartId: string;
  variantId: string;
  sellerId: string;

  // Quantity and pricing
  quantity: number;
  unitPrice: InstanceType<typeof Decimal>;
  currentUnitPrice: InstanceType<typeof Decimal>;
  totalPrice: InstanceType<typeof Decimal>;
  discountAmount: InstanceType<typeof Decimal>;

  // Availability
  isAvailable: boolean;
  availabilityReason?: string;
  reservationId?: string;
  reservationExpiresAt?: Date;

  // Tracking
  addedAt: Date;
  lastCheckedAt: Date;

  // Snapshots
  variantSnapshot: any;
  pricingSnapshot: any;

  // Relations
  appliedPromotions: AppliedPromotion[];

  constructor(data: Partial<CartItem>) {
    Object.assign(this, data);
    this.appliedPromotions = data.appliedPromotions || [];
  }

  // Business methods

  /**
   * Check if price has changed since addition
   */
  hasPriceChanged(): boolean {
    return !this.unitPrice.equals(this.currentUnitPrice);
  }

  /**
   * Get price change percentage
   */
  getPriceChangePercentage(): number {
    if ((this.unitPrice as any).equals(0)) return 0;

    const change = (this.currentUnitPrice as any).sub(this.unitPrice);
    return change.div(this.unitPrice).mul(100).toNumber();
  }

  /**
   * Check if item has active reservation
   */
  hasActiveReservation(): boolean {
    return !!(
      this.reservationId &&
      this.reservationExpiresAt &&
      this.reservationExpiresAt > new Date()
    );
  }

  /**
   * Update quantity and recalculate total
   */
  updateQuantity(newQuantity: number): void {
    this.quantity = newQuantity;
    this.totalPrice = (this.currentUnitPrice as any).mul(newQuantity);
    this.lastCheckedAt = new Date();
  }

  /**
   * Update current price and recalculate total
   */
  updatePrice(newPrice: InstanceType<typeof Decimal>): void {
    this.currentUnitPrice = newPrice;
    this.totalPrice = (newPrice as any).mul(this.quantity);
    this.lastCheckedAt = new Date();
  }

  /**
   * Mark item as unavailable
   */
  markAsUnavailable(reason: string): void {
    this.isAvailable = false;
    this.availabilityReason = reason;
    this.lastCheckedAt = new Date();
  }

  /**
   * Mark item as available
   */
  markAsAvailable(): void {
    this.isAvailable = true;
    this.availabilityReason = undefined;
    this.lastCheckedAt = new Date();
  }

  /**
   * Get final price after discounts
   */
  getFinalPrice(): InstanceType<typeof Decimal> {
    return (this.totalPrice as any).sub(this.discountAmount);
  }
}

export class AppliedPromotion {
  id: string;
  promotionId: string;
  promotionCode: string;
  promotionName: string;

  // Context
  cartId?: string;
  cartItemId?: string;
  orderId?: string;

  // Discount details
  discountType: string;
  discountValue: InstanceType<typeof Decimal>;
  discountAmount: InstanceType<typeof Decimal>;
  maxDiscountAmount?: InstanceType<typeof Decimal>;

  // Metadata
  priority: number;
  eligibilitySnapshot: any;
  appliedAt: Date;
  appliedBy?: string;

  constructor(data: Partial<AppliedPromotion>) {
    Object.assign(this, data);
  }

  /**
   * Check if promotion is applied to specific cart item
   */
  isItemSpecific(): boolean {
    return !!this.cartItemId;
  }

  /**
   * Check if promotion is cart-wide
   */
  isCartWide(): boolean {
    return !!this.cartId && !this.cartItemId;
  }
}
