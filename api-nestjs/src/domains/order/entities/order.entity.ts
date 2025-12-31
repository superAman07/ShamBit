import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderMetadata {
  source?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utm?: Record<string, string>;
  [key: string]: any;
}

export class Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  shippingAddressId: string;
  billingAddressId: string;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  metadata: OrderMetadata;
  version: number;
  isSplit: boolean;
  parentOrderId?: string;
  splitReason?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  refundedAt?: Date;
  refundedBy?: string;
  refundAmount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;

  constructor(data: Partial<Order>) {
    Object.assign(this, data);
  }

  static create(data: {
    customerId: string;
    items: OrderItem[];
    shippingAddress: Address;
    billingAddress?: Address;
    paymentMethod?: string;
    notes?: string;
    metadata?: OrderMetadata;
    createdBy: string;
  }): Order {
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    return new Order({
      ...data,
      orderNumber,
      status: OrderStatus.PENDING,
      isSplit: false,
      currency: 'USD',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get isTerminal(): boolean {
    return [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ].includes(this.status);
  }

  get canBeCancelled(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ].includes(this.status);
  }

  get canBeRefunded(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }

  getTotalPaid(): number {
    // TODO: Calculate from payments
    return this.totalAmount;
  }

  isFullyPaid(): boolean {
    return this.getTotalPaid() >= this.totalAmount;
  }

  get confirmedAt(): Date | undefined {
    // TODO: Get from order history/audit log
    return this.status === OrderStatus.CONFIRMED ? this.updatedAt : undefined;
  }

  get deliveredAt(): Date | undefined {
    return this.actualDeliveryDate;
  }

  get refunds(): any[] {
    // TODO: Load refunds from repository
    return [];
  }

  isMultiSeller(): boolean {
    const sellers = new Set(this.items.map((item) => item.sellerId));
    return sellers.size > 1;
  }

  getSellers(): string[] {
    return Array.from(new Set(this.items.map((item) => item.sellerId)));
  }

  getItemsBySeller(sellerId: string): OrderItem[] {
    return this.items.filter((item) => item.sellerId === sellerId);
  }

  getSubtotalBySeller(sellerId: string): number {
    return this.getItemsBySeller(sellerId).reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
  }

  get expiresAt(): Date | undefined {
    // TODO: Calculate expiry date based on business rules
    return undefined;
  }

  get trackingNumber(): string | undefined {
    // TODO: Get from shipment data
    return undefined;
  }

  calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount =
      this.subtotal +
      this.shippingAmount +
      this.taxAmount -
      this.discountAmount;
  }

  addItem(item: OrderItem): void {
    this.items.push(item);
    this.calculateTotals();
    this.version++;
    this.updatedAt = new Date();
  }

  removeItem(itemId: string): void {
    this.items = this.items.filter((item) => item.id !== itemId);
    this.calculateTotals();
    this.version++;
    this.updatedAt = new Date();
  }

  updateStatus(
    newStatus: OrderStatus,
    updatedBy: string,
    reason?: string,
  ): void {
    this.status = newStatus;
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
    this.version++;

    if (newStatus === OrderStatus.CANCELLED) {
      this.cancelledAt = new Date();
      this.cancelledBy = updatedBy;
      this.cancellationReason = reason;
    }

    if (newStatus === OrderStatus.DELIVERED) {
      this.actualDeliveryDate = new Date();
    }
  }

  validateProductSnapshot(): string[] {
    const errors: string[] = [];

    for (const item of this.items) {
      const itemErrors = item.validateProductSnapshot();
      errors.push(...itemErrors);
    }

    return errors;
  }
}
