export type OrderStatus =
  | 'pending'
  | 'payment_processing'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'canceled'
  | 'returned'
  | 'failed';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'upi' | 'cod';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface UserAddress {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude: number;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
}

export interface DeliveryPersonnel {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  vehicleType: 'bike' | 'scooter' | 'bicycle';
  vehicleNumber?: string;
  isActive: boolean;
  isAvailable: boolean;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
}

export interface OrderHistoryEntry {
  id: string;
  actionType: 'order_created' | 'status_change' | 'delivery_assignment' | 'cancellation' | 'return' | 'note';
  oldValue?: string;
  newValue?: string;
  reason?: string;
  note?: string;
  adminId?: string;
  adminEmail?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customer?: Customer;
  status: OrderStatus;
  
  // Address
  deliveryAddressId: string;
  deliveryAddress: UserAddress;
  
  // Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  
  // Promotion
  promoCode?: string;
  
  // Delivery
  deliveryPersonnelId?: string;
  deliveryPersonnel?: DeliveryPersonnel;
  deliveryPerson?: DeliveryPerson;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  
  // Timeline
  timeline?: OrderHistoryEntry[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  canceledAt?: string;
}

export interface OrderFilters {
  status?: OrderStatus[];
  startDate?: string;
  endDate?: string;
  minValue?: number;
  maxValue?: number;
  paymentStatus?: PaymentStatus[];
  paymentMethod?: PaymentMethod[];
  search?: string; // Search by order number or customer name
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentDiscrepancy {
  id: string;
  orderId: string;
  orderNumber: string;
  paymentGatewayId: string;
  internalAmount: number;
  gatewayAmount: number;
  discrepancyAmount: number;
  status: 'pending' | 'resolved' | 'ignored';
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  notes?: string;
}

export interface OrderAssignment {
  orderId: string;
  deliveryPersonnelId: string;
  estimatedDeliveryTime?: string;
}

export interface OrderCancellation {
  orderId: string;
  reason: string;
  refundAmount?: number;
}

export interface OrderReturn {
  orderId: string;
  reason: string;
  refundAmount?: number;
  restockItems: boolean;
}

export interface OrderNote {
  orderId: string;
  note: string;
}