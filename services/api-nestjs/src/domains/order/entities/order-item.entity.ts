import { OrderItemStatus } from '../enums/order-status.enum';

export interface ProductSnapshot {
  productId: string;
  variantId: string;
  productName: string;
  variantName?: string;
  sku: string;
  description?: string;
  images: string[];
  attributes: Record<string, string>;
  brand: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    path: string;
  };
  seller: {
    id: string;
    name: string;
    businessName?: string;
  };
  specifications?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface OrderItemMetadata {
  promotionIds?: string[];
  discountApplied?: number;
  originalPrice?: number;
  notes?: string;
  customization?: Record<string, any>;
  giftWrap?: boolean;
  giftMessage?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class OrderItem {
  id: string;
  orderId: string;
  
  // Product Information (Immutable snapshot)
  variantId: string;
  productId: string;
  sellerId: string;
  sku: string;
  productName: string;
  variantName?: string;
  
  // Quantity & Pricing (Immutable snapshot)
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // Inventory Integration
  reservationKey?: string;
  
  // Fulfillment Status
  status: OrderItemStatus;
  
  // Refund Tracking
  refundedQuantity: number;
  refundedAmount: number;
  
  // Product Snapshot (Complete immutable data)
  productSnapshot: ProductSnapshot;
  
  // Metadata
  metadata?: OrderItemMetadata;
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
  
  constructor(data: Partial<OrderItem>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // STATUS METHODS
  // ============================================================================
  
  isPending(): boolean {
    return this.status === OrderItemStatus.PENDING;
  }
  
  isReserved(): boolean {
    return this.status === OrderItemStatus.RESERVED;
  }
  
  isConfirmed(): boolean {
    return this.status === OrderItemStatus.CONFIRMED;
  }
  
  isShipped(): boolean {
    return this.status === OrderItemStatus.SHIPPED;
  }
  
  isDelivered(): boolean {
    return this.status === OrderItemStatus.DELIVERED;
  }
  
  isCancelled(): boolean {
    return this.status === OrderItemStatus.CANCELLED;
  }
  
  isRefunded(): boolean {
    return this.status === OrderItemStatus.REFUNDED;
  }
  
  isActive(): boolean {
    return ![OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED].includes(this.status);
  }
  
  canBeCancelled(): boolean {
    return [
      OrderItemStatus.PENDING,
      OrderItemStatus.RESERVED,
      OrderItemStatus.CONFIRMED,
    ].includes(this.status);
  }
  
  canBeRefunded(): boolean {
    return [
      OrderItemStatus.CONFIRMED,
      OrderItemStatus.SHIPPED,
      OrderItemStatus.DELIVERED,
    ].includes(this.status);
  }
  
  // ============================================================================
  // INVENTORY METHODS
  // ============================================================================
  
  hasReservation(): boolean {
    return !!this.reservationKey;
  }
  
  getReservationKey(): string {
    return this.reservationKey || `order_item_${this.id}`;
  }
  
  canReserveInventory(): boolean {
    return this.isPending() && !this.hasReservation();
  }
  
  canReleaseReservation(): boolean {
    return this.hasReservation() && (this.isCancelled() || this.isRefunded());
  }
  
  canCommitReservation(): boolean {
    return this.hasReservation() && this.isConfirmed();
  }
  
  // ============================================================================
  // PRICING METHODS
  // ============================================================================
  
  getEffectiveUnitPrice(): number {
    const discount = this.metadata?.discountApplied || 0;
    return Math.max(0, this.unitPrice - discount);
  }
  
  getOriginalTotalPrice(): number {
    const originalPrice = this.metadata?.originalPrice || this.unitPrice;
    return originalPrice * this.quantity;
  }
  
  getTotalDiscount(): number {
    return this.getOriginalTotalPrice() - this.totalPrice;
  }
  
  getDiscountPercentage(): number {
    const originalTotal = this.getOriginalTotalPrice();
    if (originalTotal === 0) return 0;
    return (this.getTotalDiscount() / originalTotal) * 100;
  }
  
  // ============================================================================
  // REFUND METHODS
  // ============================================================================
  
  getRemainingQuantity(): number {
    return Math.max(0, this.quantity - this.refundedQuantity);
  }
  
  getRemainingAmount(): number {
    return Math.max(0, this.totalPrice - this.refundedAmount);
  }
  
  canRefundQuantity(quantity: number): boolean {
    return quantity > 0 && quantity <= this.getRemainingQuantity();
  }
  
  canRefundAmount(amount: number): boolean {
    return amount > 0 && amount <= this.getRemainingAmount();
  }
  
  isPartiallyRefunded(): boolean {
    return this.refundedQuantity > 0 && this.refundedQuantity < this.quantity;
  }
  
  isFullyRefunded(): boolean {
    return this.refundedQuantity >= this.quantity;
  }
  
  calculateRefundAmount(quantity: number): number {
    if (quantity <= 0 || quantity > this.getRemainingQuantity()) {
      throw new Error('Invalid refund quantity');
    }
    
    // Calculate proportional refund amount
    const unitRefundAmount = this.totalPrice / this.quantity;
    return Math.round(unitRefundAmount * quantity * 100) / 100; // Round to 2 decimal places
  }
  
  // ============================================================================
  // PRODUCT SNAPSHOT METHODS
  // ============================================================================
  
  getProductImage(): string | undefined {
    return this.productSnapshot.images[0];
  }
  
  getProductImages(): string[] {
    return this.productSnapshot.images || [];
  }
  
  getProductAttribute(attributeName: string): string | undefined {
    return this.productSnapshot.attributes[attributeName];
  }
  
  getProductAttributes(): Record<string, string> {
    return this.productSnapshot.attributes || {};
  }
  
  getBrandName(): string {
    return this.productSnapshot.brand.name;
  }
  
  getCategoryName(): string {
    return this.productSnapshot.category.name;
  }
  
  getCategoryPath(): string {
    return this.productSnapshot.category.path;
  }
  
  getSellerName(): string {
    return this.productSnapshot.seller.name;
  }
  
  getSellerBusinessName(): string {
    return this.productSnapshot.seller.businessName || this.productSnapshot.seller.name;
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required fields
    if (!this.variantId) errors.push('Variant ID is required');
    if (!this.productId) errors.push('Product ID is required');
    if (!this.sellerId) errors.push('Seller ID is required');
    if (!this.sku) errors.push('SKU is required');
    if (!this.productName?.trim()) errors.push('Product name is required');
    
    // Validate quantities
    if (this.quantity <= 0) errors.push('Quantity must be positive');
    if (!Number.isInteger(this.quantity)) errors.push('Quantity must be an integer');
    if (this.refundedQuantity < 0) errors.push('Refunded quantity cannot be negative');
    if (this.refundedQuantity > this.quantity) {
      errors.push('Refunded quantity cannot exceed total quantity');
    }
    
    // Validate pricing
    if (this.unitPrice < 0) errors.push('Unit price cannot be negative');
    if (this.totalPrice < 0) errors.push('Total price cannot be negative');
    if (this.refundedAmount < 0) errors.push('Refunded amount cannot be negative');
    if (this.refundedAmount > this.totalPrice) {
      errors.push('Refunded amount cannot exceed total price');
    }
    
    // Validate price calculation
    const expectedTotal = Math.round(this.unitPrice * this.quantity * 100) / 100;
    if (Math.abs(this.totalPrice - expectedTotal) > 0.01) {
      errors.push(`Total price mismatch: expected ${expectedTotal}, got ${this.totalPrice}`);
    }
    
    // Validate product snapshot
    if (!this.productSnapshot) {
      errors.push('Product snapshot is required');
    } else {
      const snapshotValidation = this.validateProductSnapshot();
      errors.push(...snapshotValidation);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  private validateProductSnapshot(): string[] {
    const errors: string[] = [];
    const snapshot = this.productSnapshot;
    
    if (!snapshot.productId) errors.push('Product snapshot must include product ID');
    if (!snapshot.variantId) errors.push('Product snapshot must include variant ID');
    if (!snapshot.sku) errors.push('Product snapshot must include SKU');
    if (!snapshot.productName?.trim()) errors.push('Product snapshot must include product name');
    
    if (!snapshot.brand?.id) errors.push('Product snapshot must include brand ID');
    if (!snapshot.brand?.name?.trim()) errors.push('Product snapshot must include brand name');
    
    if (!snapshot.category?.id) errors.push('Product snapshot must include category ID');
    if (!snapshot.category?.name?.trim()) errors.push('Product snapshot must include category name');
    
    if (!snapshot.seller?.id) errors.push('Product snapshot must include seller ID');
    if (!snapshot.seller?.name?.trim()) errors.push('Product snapshot must include seller name');
    
    // Validate consistency with item data
    if (snapshot.productId !== this.productId) {
      errors.push('Product snapshot product ID must match item product ID');
    }
    if (snapshot.variantId !== this.variantId) {
      errors.push('Product snapshot variant ID must match item variant ID');
    }
    if (snapshot.sku !== this.sku) {
      errors.push('Product snapshot SKU must match item SKU');
    }
    if (snapshot.seller.id !== this.sellerId) {
      errors.push('Product snapshot seller ID must match item seller ID');
    }
    
    return errors;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  updateMetadata(metadata: Partial<OrderItemMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  getDisplayName(): string {
    if (this.variantName) {
      return `${this.productName} - ${this.variantName}`;
    }
    return this.productName;
  }
  
  getFormattedPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // This should come from order currency
    }).format(this.totalPrice);
  }
  
  getFormattedUnitPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // This should come from order currency
    }).format(this.unitPrice);
  }
  
  // ============================================================================
  // FACTORY METHODS
  // ============================================================================
  
  static createFromVariant(data: {
    orderId: string;
    variantId: string;
    productId: string;
    sellerId: string;
    quantity: number;
    unitPrice: number;
    productSnapshot: ProductSnapshot;
    metadata?: OrderItemMetadata;
  }): OrderItem {
    const totalPrice = Math.round(data.unitPrice * data.quantity * 100) / 100;
    
    return new OrderItem({
      ...data,
      sku: data.productSnapshot.sku,
      productName: data.productSnapshot.productName,
      variantName: data.productSnapshot.variantName,
      totalPrice,
      status: OrderItemStatus.PENDING,
      refundedQuantity: 0,
      refundedAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}