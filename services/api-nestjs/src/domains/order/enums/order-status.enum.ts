export enum OrderStatus {
  PENDING = 'PENDING',           // Order created, awaiting payment
  CONFIRMED = 'CONFIRMED',       // Payment confirmed, processing
  PROCESSING = 'PROCESSING',     // Order being prepared/fulfilled
  SHIPPED = 'SHIPPED',          // Order shipped to customer
  DELIVERED = 'DELIVERED',      // Order delivered successfully
  CANCELLED = 'CANCELLED',      // Order cancelled (before shipping)
  REFUNDED = 'REFUNDED',        // Order fully refunded
}

export enum OrderItemStatus {
  PENDING = 'PENDING',           // Item added to order
  RESERVED = 'RESERVED',         // Inventory reserved
  CONFIRMED = 'CONFIRMED',       // Payment confirmed for item
  SHIPPED = 'SHIPPED',          // Item shipped
  DELIVERED = 'DELIVERED',      // Item delivered
  CANCELLED = 'CANCELLED',      // Item cancelled
  REFUNDED = 'REFUNDED',        // Item refunded
}

export enum PaymentStatus {
  PENDING = 'PENDING',           // Payment initiated
  PROCESSING = 'PROCESSING',     // Payment being processed
  COMPLETED = 'COMPLETED',       // Payment successful
  FAILED = 'FAILED',            // Payment failed
  CANCELLED = 'CANCELLED',      // Payment cancelled
  REFUNDED = 'REFUNDED',        // Payment refunded
}

export enum RefundStatus {
  PENDING = 'PENDING',           // Refund requested
  PROCESSING = 'PROCESSING',     // Refund being processed
  COMPLETED = 'COMPLETED',       // Refund completed
  FAILED = 'FAILED',            // Refund failed
  CANCELLED = 'CANCELLED',      // Refund cancelled
}

// Order Status State Machine
export const OrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.DELIVERED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.CANCELLED]: [], // Terminal state
  [OrderStatus.REFUNDED]: [],  // Terminal state
};

// Order Item Status State Machine
export const OrderItemStatusTransitions: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.PENDING]: [
    OrderItemStatus.RESERVED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.RESERVED]: [
    OrderItemStatus.CONFIRMED,
    OrderItemStatus.CANCELLED,
  ],
  [OrderItemStatus.CONFIRMED]: [
    OrderItemStatus.SHIPPED,
    OrderItemStatus.CANCELLED,
    OrderItemStatus.REFUNDED,
  ],
  [OrderItemStatus.SHIPPED]: [
    OrderItemStatus.DELIVERED,
    OrderItemStatus.REFUNDED,
  ],
  [OrderItemStatus.DELIVERED]: [
    OrderItemStatus.REFUNDED,
  ],
  [OrderItemStatus.CANCELLED]: [], // Terminal state
  [OrderItemStatus.REFUNDED]: [],  // Terminal state
};

// Payment Status State Machine
export const PaymentStatusTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.CANCELLED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.COMPLETED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.COMPLETED]: [
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [
    PaymentStatus.PENDING, // Allow retry
  ],
  [PaymentStatus.CANCELLED]: [], // Terminal state
  [PaymentStatus.REFUNDED]: [],  // Terminal state
};

// Validation Functions
export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return OrderStatusTransitions[from].includes(to);
}

export function canTransitionOrderItemStatus(from: OrderItemStatus, to: OrderItemStatus): boolean {
  return OrderItemStatusTransitions[from].includes(to);
}

export function canTransitionPaymentStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  return PaymentStatusTransitions[from].includes(to);
}

export function getValidOrderTransitions(status: OrderStatus): OrderStatus[] {
  return OrderStatusTransitions[status];
}

export function getValidOrderItemTransitions(status: OrderItemStatus): OrderItemStatus[] {
  return OrderItemStatusTransitions[status];
}

export function getValidPaymentTransitions(status: PaymentStatus): PaymentStatus[] {
  return PaymentStatusTransitions[status];
}

// Status Checks
export function isOrderTerminal(status: OrderStatus): boolean {
  return [OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(status);
}

export function isOrderActive(status: OrderStatus): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
  ].includes(status);
}

export function isOrderFulfillable(status: OrderStatus): boolean {
  return [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
  ].includes(status);
}

export function isOrderCancellable(status: OrderStatus): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
  ].includes(status);
}

export function isOrderRefundable(status: OrderStatus): boolean {
  return [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ].includes(status);
}