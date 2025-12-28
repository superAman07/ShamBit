import { Injectable } from '@nestjs/common';
import { OrderStatus } from './order.service';

@Injectable()
export class OrderStateMachine {
  private readonly transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.DRAFT]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
    [OrderStatus.PENDING_PAYMENT]: [
      OrderStatus.PAYMENT_CONFIRMED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAYMENT_CONFIRMED]: [
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
      OrderStatus.RETURNED,
    ],
    [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  };

  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.transitions[from]?.includes(to) || false;
  }

  getValidTransitions(from: OrderStatus): OrderStatus[] {
    return this.transitions[from] || [];
  }

  validateTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid transition from ${from} to ${to}`);
    }
  }
}