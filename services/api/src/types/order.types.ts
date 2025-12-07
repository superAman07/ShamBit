/**
 * Production-Ready Order Status System
 * 
 * Status Flow:
 * 1. Normal: pending → payment_processing → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered
 * 2. Failed Delivery: out_for_delivery → delivery_attempted → out_for_delivery (retry) → delivered
 * 3. Return: delivered → return_requested → return_approved → return_pickup_scheduled → return_in_transit → returned → refund_pending → refunded
 * 4. Hold: any active status → on_hold → resume to previous flow
 * 5. Cancel: any pre-delivery status → canceled
 */
export type OrderStatus =
  // Payment & Confirmation
  | 'pending'                    // Order created, awaiting payment
  | 'payment_processing'         // Payment gateway processing
  | 'payment_failed'             // Payment failed (can retry)
  | 'confirmed'                  // Payment successful, order confirmed
  
  // Preparation & Delivery
  | 'on_hold'                    // Temporarily paused (payment verification, stock issues, customer request)
  | 'preparing'                  // Order being prepared/packed
  | 'ready_for_pickup'           // Packed and ready for delivery personnel
  | 'out_for_delivery'           // Assigned to delivery personnel, in transit
  | 'delivery_attempted'         // Delivery failed (customer unavailable, address issue)
  | 'delivered'                  // Successfully delivered
  
  // Return & Refund
  | 'return_requested'           // Customer requested return
  | 'return_approved'            // Admin approved return
  | 'return_rejected'            // Admin rejected return
  | 'return_pickup_scheduled'    // Pickup scheduled
  | 'return_in_transit'          // Return being picked up
  | 'returned'                   // Return completed, items received
  | 'refund_pending'             // Refund initiated, processing
  | 'refunded'                   // Refund completed
  
  // Terminal States
  | 'canceled'                   // Order canceled before delivery
  | 'failed';                    // Order failed (cannot be fulfilled)

/**
 * Enhanced Payment Status System
 */
export type PaymentStatus = 
  | 'pending'                    // Awaiting payment
  | 'processing'                 // Payment gateway processing
  | 'completed'                  // Payment successful
  | 'failed'                     // Payment failed
  | 'refund_initiated'           // Refund requested
  | 'refund_processing'          // Refund in progress
  | 'refund_completed'           // Refund successful
  | 'refund_failed'              // Refund failed (needs manual intervention)
  | 'partially_refunded';        // Partial refund completed

export type PaymentMethod = 'card' | 'upi' | 'cod';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  deliveryAddressId: string;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  offerId?: string; // Track which offer led to this order
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  deliveryAddressId: string;
  deliveryAddress: any;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  promoCode?: string;
  offerId?: string;
  deliveryPersonnelId?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
  
  // Hold Management
  onHoldReason?: string;
  onHoldAt?: Date;
  
  // Enhanced Delivery Tracking
  readyForPickupAt?: Date;
  deliveryAttemptedAt?: Date;
  deliveryAttemptCount?: number;
  deliveryFailureReason?: string;
  deliveryInstructions?: string;
  deliveryInstructionsUpdatedAt?: Date;
  
  // Return Management
  returnRequestedAt?: Date;
  returnApprovedAt?: Date;
  returnRejectedAt?: Date;
  returnReason?: string;
  returnNotes?: string;
  returnApprovedBy?: string;
  
  // Refund Tracking
  refundInitiatedAt?: Date;
  refundCompletedAt?: Date;
  refundAmount?: number;
  refundReference?: string;
  refundNotes?: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderWithItems extends Order {
  items: OrderItemRecord[];
  timeline?: OrderHistoryEntry[];
}

export interface PaymentGatewayOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface PaymentWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        receipt: string;
      };
    };
  };
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface ReturnOrderRequest {
  reason: string;
  restockItems: boolean;
}

export interface ReconciliationRecord {
  id: string;
  orderId?: string;
  paymentGatewayId: string;
  gatewayAmount: number;
  internalAmount: number;
  status: 'matched' | 'discrepancy' | 'resolved';
  notes?: string;
  reconciledAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Order Details Dialog Types
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
  createdAt: Date;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
}

export interface OrderDetails extends OrderWithItems {
  customer: {
    id: string;
    name: string;
    mobileNumber: string;
    email?: string;
  };
  deliveryPerson?: DeliveryPerson;
  timeline: OrderHistoryEntry[];
}

export interface AssignDeliveryRequest {
  deliveryPersonId: string;
}

export interface AddNoteRequest {
  note: string;
}

// New Request Types for Enhanced Order Management

export interface PutOnHoldRequest {
  reason: string;
  notes?: string;
}

export interface ReleaseHoldRequest {
  notes?: string;
}

export interface RecordDeliveryAttemptRequest {
  reason: string;
  notes?: string;
  rescheduleTime?: Date;
}

export interface RetryDeliveryRequest {
  newDeliveryTime?: Date;
  deliveryPersonnelId?: string;
  notes?: string;
}

export interface RequestReturnRequest {
  reason: string;
  items?: Array<{
    productId: string;
    quantity: number;
    reason?: string;
  }>;
}

export interface ApproveReturnRequest {
  notes?: string;
  refundAmount?: number;
  restockItems?: boolean;
}

export interface RejectReturnRequest {
  reason: string;
}

export interface ScheduleReturnPickupRequest {
  pickupTime: Date;
  notes?: string;
}

export interface CompleteReturnRequest {
  restockItems: boolean;
  notes?: string;
  refundAmount?: number;
}

export interface InitiateRefundRequest {
  amount?: number; // If not provided, use full order amount
  reason?: string;
}

export interface CompleteRefundRequest {
  refundReference: string;
  notes?: string;
}

export interface ContactCustomerRequest {
  method: 'phone' | 'sms' | 'whatsapp' | 'email';
  message: string;
  responseReceived?: boolean;
  followUpRequired?: boolean;
}

export interface UpdateDeliveryInstructionsRequest {
  instructions: string;
}
