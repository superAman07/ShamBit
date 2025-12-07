/**
 * Production-Ready Order Status System
 */
export type OrderStatus =
  // Payment & Confirmation
  | 'pending'
  | 'payment_processing'
  | 'payment_failed'
  | 'confirmed'
  
  // Preparation & Delivery
  | 'on_hold'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivery_attempted'
  | 'delivered'
  
  // Return & Refund
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'return_pickup_scheduled'
  | 'return_in_transit'
  | 'returned'
  | 'refund_pending'
  | 'refunded'
  
  // Terminal States
  | 'canceled'
  | 'failed';

/**
 * Enhanced Payment Status System
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refund_initiated'
  | 'refund_processing'
  | 'refund_completed'
  | 'refund_failed'
  | 'partially_refunded';
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

export type OrderHistoryActionType =
  | 'order_created'
  | 'status_change'
  | 'payment_status_change'
  | 'delivery_assignment'
  | 'delivery_attempt'
  | 'on_hold'
  | 'hold_released'
  | 'cancellation'
  | 'return_request'
  | 'return_approval'
  | 'return_rejection'
  | 'return_pickup'
  | 'return_complete'
  | 'refund_initiated'
  | 'refund_completed'
  | 'note'
  | 'customer_contact'
  | 'item_substitution';

export interface OrderHistoryEntry {
  id: string;
  actionType: OrderHistoryActionType;
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
  
  // Hold Management
  onHoldReason?: string;
  onHoldAt?: string;
  
  // Enhanced Delivery Tracking
  readyForPickupAt?: string;
  deliveryAttemptedAt?: string;
  deliveryAttemptCount?: number;
  deliveryFailureReason?: string;
  deliveryInstructions?: string;
  deliveryInstructionsUpdatedAt?: string;
  
  // Return Management
  returnRequestedAt?: string;
  returnApprovedAt?: string;
  returnRejectedAt?: string;
  returnReason?: string;
  returnNotes?: string;
  returnApprovedBy?: string;
  
  // Refund Tracking
  refundInitiatedAt?: string;
  refundCompletedAt?: string;
  refundAmount?: number;
  refundReference?: string;
  refundNotes?: string;
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