import { OrderItemStatus } from '../enums/order-status.enum';

export interface ProductSnapshot {
  id: string;
  name: string;
  description?: string;
  images: string[];
  brand?: string;
  category?: string;
  attributes: Record<string, any>;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface VariantSnapshot {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, any>;
  price: number;
  compareAtPrice?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface OrderItemMetadata {
  promotionId?: string;
  discountCode?: string;
  commissionRate?: number;
  sellerId?: string;
  [key: string]: any;
}

export class OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
  taxAmount: number;
  status: OrderItemStatus;
  productSnapshot: ProductSnapshot;
  variantSnapshot: VariantSnapshot;
  metadata: OrderItemMetadata;
  notes?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  refundedAt?: Date;
  refundedBy?: string;
  refundAmount?: number;
  returnedAt?: Date;
  returnReason?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  constructor(data: Partial<OrderItem>) {
    Object.assign(this, data);
  }

  static create(data: {
    orderId: string;
    productId: string;
    variantId: string;
    sellerId: string;
    quantity: number;
    unitPrice: number;
    productSnapshot: ProductSnapshot;
    variantSnapshot: VariantSnapshot;
    metadata?: OrderItemMetadata;
    createdBy: string;
  }): OrderItem {
    const totalPrice = data.quantity * data.unitPrice;

    return new OrderItem({
      ...data,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      totalPrice,
      discountAmount: 0,
      taxAmount: 0,
      status: OrderItemStatus.PENDING,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get canBeCancelled(): boolean {
    return [
      OrderItemStatus.PENDING,
      OrderItemStatus.CONFIRMED,
      OrderItemStatus.PROCESSING,
    ].includes(this.status);
  }

  get canBeRefunded(): boolean {
    return this.status === OrderItemStatus.DELIVERED;
  }

  get canBeReturned(): boolean {
    return this.status === OrderItemStatus.DELIVERED && !this.returnedAt;
  }

  get sku(): string {
    return this.variantSnapshot?.sku || `${this.productId}-${this.variantId}`;
  }

  get productName(): string {
    return this.productSnapshot?.name || 'Unknown Product';
  }

  get variantName(): string {
    return this.variantSnapshot?.name || 'Default Variant';
  }

  get reservationKey(): string | undefined {
    return this.metadata?.reservationKey;
  }

  calculateTotalPrice(): void {
    this.totalPrice =
      this.quantity * this.unitPrice - this.discountAmount + this.taxAmount;
    this.updatedAt = new Date();
    this.version++;
  }

  updateQuantity(newQuantity: number, updatedBy: string): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    this.quantity = newQuantity;
    this.calculateTotalPrice();
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;
  }

  updateStatus(
    newStatus: OrderItemStatus,
    updatedBy: string,
    reason?: string,
  ): void {
    this.status = newStatus;
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;

    const now = new Date();

    switch (newStatus) {
      case OrderItemStatus.SHIPPED:
        this.shippedAt = now;
        break;
      case OrderItemStatus.DELIVERED:
        this.deliveredAt = now;
        break;
      case OrderItemStatus.CANCELLED:
        this.cancelledAt = now;
        this.cancelledBy = updatedBy;
        this.cancellationReason = reason;
        break;
      case OrderItemStatus.RETURNED:
        this.returnedAt = now;
        this.returnReason = reason;
        break;
    }
  }

  applyDiscount(discountAmount: number, updatedBy: string): void {
    this.discountAmount = Math.max(0, discountAmount);
    this.calculateTotalPrice();
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;
  }

  validateProductSnapshot(): string[] {
    const errors: string[] = [];

    if (!this.productSnapshot) {
      errors.push('Product snapshot is required');
      return errors;
    }

    if (!this.productSnapshot.id) {
      errors.push('Product snapshot must have an ID');
    }

    if (!this.productSnapshot.name) {
      errors.push('Product snapshot must have a name');
    }

    if (!this.variantSnapshot) {
      errors.push('Variant snapshot is required');
      return errors;
    }

    if (!this.variantSnapshot.id) {
      errors.push('Variant snapshot must have an ID');
    }

    if (!this.variantSnapshot.sku) {
      errors.push('Variant snapshot must have a SKU');
    }

    if (this.variantSnapshot.price !== this.unitPrice) {
      errors.push('Unit price does not match variant snapshot price');
    }

    return errors;
  }
}
