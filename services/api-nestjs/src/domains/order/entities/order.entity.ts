import { OrderStatus, isOrderTerminal, isOrderActive, isOrderCancellable, isOrderRefundable } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
import { OrderPayment } from './order-payment.entity';
import { OrderRefund } from './order-refund.entity';

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderMetadata {
  source?: string; // WEB, MOBILE, API, ADMIN
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  couponCodes?: string[];
  giftMessage?: string;
  specialInstructions?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class Order {
  id: string;
  orderNumber: string;
  customerId: string;
  
  // Status & Lifecycle
  status: OrderStatus;
  
  // Multi-seller Support
  isSplit: boolean;
  parentOrderId?: string;
  
  // Pricing (Immutable snapshot)
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  
  // Addresses (Immutable snapshot)
  shippingAddress: Address;
  billingAddress: Address;
  
  // Fulfillment
  shippingMethod?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  
  // Expiry & Timeouts
  expiresAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  
  // Metadata
  metadata?: OrderMetadata;
  notes?: string;
  
  // Versioning
  version: number;
  
  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
  
  // Relations
  childOrders?: Order[];
  items?: OrderItem[];
  payments?: OrderPayment[];
  refunds?: OrderRefund[];
  
  constructor(data: Partial<Order>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // STATUS & LIFECYCLE METHODS
  // ============================================================================
  
  isActive(): boolean {
    return isOrderActive(this.status) && !this.deletedAt;
  }
  
  isTerminal(): boolean {
    return isOrderTerminal(this.status);
  }
  
  isPending(): boolean {
    return this.status === OrderStatus.PENDING;
  }
  
  isConfirmed(): boolean {
    return this.status === OrderStatus.CONFIRMED;
  }
  
  isProcessing(): boolean {
    return this.status === OrderStatus.PROCESSING;
  }
  
  isShipped(): boolean {
    return this.status === OrderStatus.SHIPPED;
  }
  
  isDelivered(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }
  
  isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }
  
  isRefunded(): boolean {
    return this.status === OrderStatus.REFUNDED;
  }
  
  canBeCancelled(): boolean {
    return isOrderCancellable(this.status);
  }
  
  canBeRefunded(): boolean {
    return isOrderRefundable(this.status);
  }
  
  hasExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }
  
  // ============================================================================
  // MULTI-SELLER METHODS
  // ============================================================================
  
  isMultiSeller(): boolean {
    if (!this.items?.length) return false;
    const sellerIds = new Set(this.items.map(item => item.sellerId));
    return sellerIds.size > 1;
  }
  
  getSellers(): string[] {
    if (!this.items?.length) return [];
    return Array.from(new Set(this.items.map(item => item.sellerId)));
  }
  
  getItemsBySeller(sellerId: string): OrderItem[] {
    return this.items?.filter(item => item.sellerId === sellerId) || [];
  }
  
  getSubtotalBySeller(sellerId: string): number {
    return this.getItemsBySeller(sellerId)
      .reduce((sum, item) => sum + item.totalPrice, 0);
  }
  
  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================
  
  getTotalPaid(): number {
    return this.payments?.filter(p => p.isCompleted())
      .reduce((sum, payment) => sum + payment.amount, 0) || 0;
  }
  
  getTotalRefunded(): number {
    return this.refunds?.filter(r => r.isCompleted())
      .reduce((sum, refund) => sum + refund.amount, 0) || 0;
  }
  
  getOutstandingAmount(): number {
    return Math.max(0, this.totalAmount - this.getTotalPaid() + this.getTotalRefunded());
  }
  
  isFullyPaid(): boolean {
    return this.getTotalPaid() >= this.totalAmount;
  }
  
  isFullyRefunded(): boolean {
    return this.getTotalRefunded() >= this.getTotalPaid();
  }
  
  hasPartialRefund(): boolean {
    const refunded = this.getTotalRefunded();
    return refunded > 0 && refunded < this.getTotalPaid();
  }
  
  // ============================================================================
  // ITEM METHODS
  // ============================================================================
  
  getTotalItems(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
  
  getTotalUniqueItems(): number {
    return this.items?.length || 0;
  }
  
  hasItem(variantId: string): boolean {
    return this.items?.some(item => item.variantId === variantId) || false;
  }
  
  getItem(variantId: string): OrderItem | undefined {
    return this.items?.find(item => item.variantId === variantId);
  }
  
  getItemQuantity(variantId: string): number {
    return this.getItem(variantId)?.quantity || 0;
  }
  
  // ============================================================================
  // FULFILLMENT METHODS
  // ============================================================================
  
  canBeShipped(): boolean {
    return [OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(this.status);
  }
  
  canBeDelivered(): boolean {
    return this.status === OrderStatus.SHIPPED;
  }
  
  isOverdue(): boolean {
    if (!this.estimatedDelivery) return false;
    return this.estimatedDelivery < new Date() && !this.isDelivered();
  }
  
  getDaysUntilDelivery(): number | null {
    if (!this.estimatedDelivery) return null;
    const now = new Date();
    const diffTime = this.estimatedDelivery.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validatePricing(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Calculate expected subtotal from items
    const expectedSubtotal = this.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    
    if (Math.abs(this.subtotal - expectedSubtotal) > 0.01) {
      errors.push(`Subtotal mismatch: expected ${expectedSubtotal}, got ${this.subtotal}`);
    }
    
    // Validate total calculation
    const expectedTotal = this.subtotal + this.taxAmount + this.shippingAmount - this.discountAmount;
    
    if (Math.abs(this.totalAmount - expectedTotal) > 0.01) {
      errors.push(`Total amount mismatch: expected ${expectedTotal}, got ${this.totalAmount}`);
    }
    
    // Validate amounts are non-negative
    if (this.subtotal < 0) errors.push('Subtotal cannot be negative');
    if (this.taxAmount < 0) errors.push('Tax amount cannot be negative');
    if (this.shippingAmount < 0) errors.push('Shipping amount cannot be negative');
    if (this.discountAmount < 0) errors.push('Discount amount cannot be negative');
    if (this.totalAmount < 0) errors.push('Total amount cannot be negative');
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  validateItems(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.items || this.items.length === 0) {
      errors.push('Order must have at least one item');
      return { isValid: false, errors };
    }
    
    // Validate each item
    for (const item of this.items) {
      const itemValidation = item.validate();
      if (!itemValidation.isValid) {
        errors.push(...itemValidation.errors.map(e => `Item ${item.id}: ${e}`));
      }
    }
    
    // Check for duplicate variants
    const variantIds = this.items.map(item => item.variantId);
    const uniqueVariantIds = new Set(variantIds);
    if (variantIds.length !== uniqueVariantIds.size) {
      errors.push('Order contains duplicate variants');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  validateAddresses(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate shipping address
    if (!this.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      const shippingValidation = this.validateAddress(this.shippingAddress, 'Shipping');
      errors.push(...shippingValidation);
    }
    
    // Validate billing address
    if (!this.billingAddress) {
      errors.push('Billing address is required');
    } else {
      const billingValidation = this.validateAddress(this.billingAddress, 'Billing');
      errors.push(...billingValidation);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  private validateAddress(address: Address, type: string): string[] {
    const errors: string[] = [];
    
    if (!address.firstName?.trim()) errors.push(`${type} address first name is required`);
    if (!address.lastName?.trim()) errors.push(`${type} address last name is required`);
    if (!address.addressLine1?.trim()) errors.push(`${type} address line 1 is required`);
    if (!address.city?.trim()) errors.push(`${type} address city is required`);
    if (!address.state?.trim()) errors.push(`${type} address state is required`);
    if (!address.postalCode?.trim()) errors.push(`${type} address postal code is required`);
    if (!address.country?.trim()) errors.push(`${type} address country is required`);
    
    return errors;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  updateMetadata(metadata: Partial<OrderMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  incrementVersion(): void {
    this.version += 1;
  }
  
  getDisplayStatus(): string {
    if (this.hasExpired() && this.isPending()) {
      return 'EXPIRED';
    }
    return this.status;
  }
  
  getFormattedTotal(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.totalAmount);
  }
  
  getEstimatedDeliveryRange(): { min: Date; max: Date } | null {
    if (!this.estimatedDelivery) return null;
    
    const baseDate = this.estimatedDelivery;
    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() - 1);
    
    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + 1);
    
    return { min: minDate, max: maxDate };
  }
  
  // ============================================================================
  // FACTORY METHODS
  // ============================================================================
  
  static createPendingOrder(data: {
    customerId: string;
    items: Partial<OrderItem>[];
    shippingAddress: Address;
    billingAddress: Address;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency?: string;
    expiresAt?: Date;
    metadata?: OrderMetadata;
    createdBy: string;
  }): Order {
    return new Order({
      ...data,
      status: OrderStatus.PENDING,
      isSplit: false,
      currency: data.currency || 'USD',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}