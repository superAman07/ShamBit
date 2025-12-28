// Order Domain Events - Following strict naming convention

export class OrderCreatedEvent {
  static readonly eventName = 'order.created';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly items: Array<{
      variantId: string;
      quantity: number;
      unitPrice: number;
    }>,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderUpdatedEvent {
  static readonly eventName = 'order.updated';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderStatusChangedEvent {
  static readonly eventName = 'order.status.changed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderConfirmedEvent {
  static readonly eventName = 'order.confirmed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly confirmedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderCancelledEvent {
  static readonly eventName = 'order.cancelled';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderShippedEvent {
  static readonly eventName = 'order.shipped';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly trackingNumber?: string,
    public readonly shippedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderDeliveredEvent {
  static readonly eventName = 'order.delivered';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly deliveredAt: Date,
    public readonly deliveredBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderExpiredEvent {
  static readonly eventName = 'order.expired';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly expiredAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderFailedEvent {
  static readonly eventName = 'order.failed';
  
  constructor(
    public readonly customerId: string,
    public readonly variantIds: string[],
    public readonly reason: string,
    public readonly attemptedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderPaymentProcessingEvent {
  static readonly eventName = 'order.payment.processing';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly paymentAmount: number,
    public readonly paymentMethod: string,
    public readonly paymentIntentId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderPaymentCompletedEvent {
  static readonly eventName = 'order.payment.completed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly paymentAmount: number,
    public readonly paymentMethod: string,
    public readonly paymentIntentId: string,
    public readonly transactionId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderPaymentFailedEvent {
  static readonly eventName = 'order.payment.failed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly paymentAmount: number,
    public readonly paymentMethod: string,
    public readonly failureReason: string,
    public readonly paymentIntentId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderRefundInitiatedEvent {
  static readonly eventName = 'order.refund.initiated';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly refundAmount: number,
    public readonly refundReason: string,
    public readonly refundNumber: string,
    public readonly initiatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderRefundCompletedEvent {
  static readonly eventName = 'order.refund.completed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly refundAmount: number,
    public readonly refundNumber: string,
    public readonly refundTransactionId: string,
    public readonly completedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderRefundFailedEvent {
  static readonly eventName = 'order.refund.failed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly refundAmount: number,
    public readonly refundNumber: string,
    public readonly failureReason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderItemCancelledEvent {
  static readonly eventName = 'order.item.cancelled';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly orderItemId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly reason: string,
    public readonly cancelledBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderItemRefundedEvent {
  static readonly eventName = 'order.item.refunded';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly orderItemId: string,
    public readonly variantId: string,
    public readonly refundedQuantity: number,
    public readonly refundedAmount: number,
    public readonly reason: string,
    public readonly refundedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderSplitEvent {
  static readonly eventName = 'order.split';
  
  constructor(
    public readonly parentOrderId: string,
    public readonly parentOrderNumber: string,
    public readonly customerId: string,
    public readonly childOrderIds: string[],
    public readonly sellerIds: string[],
    public readonly splitBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderInventoryReservedEvent {
  static readonly eventName = 'order.inventory.reserved';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly reservations: Array<{
      variantId: string;
      quantity: number;
      reservationKey: string;
    }>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderInventoryCommittedEvent {
  static readonly eventName = 'order.inventory.committed';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly commitments: Array<{
      variantId: string;
      quantity: number;
      reservationKey: string;
    }>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderInventoryReleasedEvent {
  static readonly eventName = 'order.inventory.released';
  
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly releases: Array<{
      variantId: string;
      quantity: number;
      reservationKey: string;
    }>,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}