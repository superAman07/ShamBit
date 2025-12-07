import { OrderStatus } from '@/types/order';

export interface OrderStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  description: string;
  icon?: string;
}

/**
 * Order Status Configuration
 * Defines display properties for each order status
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  // Payment & Confirmation
  pending: {
    label: 'Pending',
    color: 'default',
    description: 'Order created, awaiting payment',
    icon: 'schedule',
  },
  payment_processing: {
    label: 'Processing Payment',
    color: 'info',
    description: 'Payment gateway processing',
    icon: 'payment',
  },
  payment_failed: {
    label: 'Payment Failed',
    color: 'error',
    description: 'Payment failed, can retry',
    icon: 'error',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'success',
    description: 'Payment successful, order confirmed',
    icon: 'check_circle',
  },
  
  // Preparation & Delivery
  on_hold: {
    label: 'On Hold',
    color: 'warning',
    description: 'Temporarily paused',
    icon: 'pause_circle',
  },
  preparing: {
    label: 'Preparing',
    color: 'info',
    description: 'Order being prepared/packed',
    icon: 'inventory',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    color: 'primary',
    description: 'Packed and ready for delivery',
    icon: 'local_shipping',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'info',
    description: 'In transit to customer',
    icon: 'delivery_dining',
  },
  delivery_attempted: {
    label: 'Delivery Attempted',
    color: 'warning',
    description: 'Delivery failed, needs retry',
    icon: 'warning',
  },
  delivered: {
    label: 'Delivered',
    color: 'success',
    description: 'Successfully delivered',
    icon: 'done_all',
  },
  
  // Return & Refund
  return_requested: {
    label: 'Return Requested',
    color: 'warning',
    description: 'Customer requested return',
    icon: 'keyboard_return',
  },
  return_approved: {
    label: 'Return Approved',
    color: 'info',
    description: 'Return approved by admin',
    icon: 'check',
  },
  return_rejected: {
    label: 'Return Rejected',
    color: 'error',
    description: 'Return rejected by admin',
    icon: 'close',
  },
  return_pickup_scheduled: {
    label: 'Pickup Scheduled',
    color: 'primary',
    description: 'Return pickup scheduled',
    icon: 'event',
  },
  return_in_transit: {
    label: 'Return in Transit',
    color: 'info',
    description: 'Return being picked up',
    icon: 'local_shipping',
  },
  returned: {
    label: 'Returned',
    color: 'default',
    description: 'Return completed',
    icon: 'keyboard_return',
  },
  refund_pending: {
    label: 'Refund Pending',
    color: 'warning',
    description: 'Refund initiated, processing',
    icon: 'account_balance_wallet',
  },
  refunded: {
    label: 'Refunded',
    color: 'success',
    description: 'Refund completed',
    icon: 'done',
  },
  
  // Terminal States
  canceled: {
    label: 'Canceled',
    color: 'error',
    description: 'Order canceled',
    icon: 'cancel',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    description: 'Order failed',
    icon: 'error_outline',
  },
};

/**
 * Get status configuration
 */
export const getStatusConfig = (status: OrderStatus): OrderStatusConfig => {
  return ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
};

/**
 * Get status label
 */
export const getStatusLabel = (status: OrderStatus): string => {
  return getStatusConfig(status).label;
};

/**
 * Get status color
 */
export const getStatusColor = (status: OrderStatus): OrderStatusConfig['color'] => {
  return getStatusConfig(status).color;
};

/**
 * Get status description
 */
export const getStatusDescription = (status: OrderStatus): string => {
  return getStatusConfig(status).description;
};

/**
 * Check if status is terminal (cannot transition further)
 */
export const isTerminalStatus = (status: OrderStatus): boolean => {
  return ['canceled', 'failed', 'refunded', 'return_rejected'].includes(status);
};

/**
 * Check if status allows cancellation
 */
export const canCancelOrder = (status: OrderStatus): boolean => {
  return [
    'pending',
    'payment_processing',
    'payment_failed',
    'confirmed',
    'on_hold',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivery_attempted',
  ].includes(status);
};

/**
 * Check if status allows return request
 */
export const canRequestReturn = (status: OrderStatus): boolean => {
  return status === 'delivered';
};

/**
 * Check if status allows hold
 */
export const canPutOnHold = (status: OrderStatus): boolean => {
  return [
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivery_attempted',
  ].includes(status);
};

/**
 * Get available actions for a status
 */
export const getAvailableActions = (status: OrderStatus): string[] => {
  const actions: string[] = [];
  
  switch (status) {
    case 'confirmed':
      actions.push('start_preparing', 'put_on_hold', 'cancel');
      break;
    case 'on_hold':
      actions.push('release_hold', 'cancel');
      break;
    case 'preparing':
      actions.push('mark_ready', 'put_on_hold', 'cancel');
      break;
    case 'ready_for_pickup':
      actions.push('assign_delivery', 'put_on_hold', 'cancel');
      break;
    case 'out_for_delivery':
      actions.push('mark_delivered', 'record_attempt', 'contact_customer', 'cancel');
      break;
    case 'delivery_attempted':
      actions.push('retry_delivery', 'contact_customer', 'cancel');
      break;
    case 'return_requested':
      actions.push('approve_return', 'reject_return');
      break;
    case 'return_approved':
      actions.push('schedule_pickup');
      break;
    case 'returned':
      actions.push('initiate_refund');
      break;
    case 'refund_pending':
      actions.push('complete_refund');
      break;
  }
  
  // Add note is always available for non-terminal statuses
  if (!isTerminalStatus(status)) {
    actions.push('add_note');
  }
  
  return actions;
};

/**
 * Get status group for filtering
 */
export const getStatusGroup = (status: OrderStatus): 'active' | 'completed' | 'failed' | 'return' => {
  if (['delivered', 'refunded'].includes(status)) {
    return 'completed';
  }
  if (['canceled', 'failed', 'payment_failed'].includes(status)) {
    return 'failed';
  }
  if (status.startsWith('return_') || status === 'returned' || status === 'refund_pending') {
    return 'return';
  }
  return 'active';
};

/**
 * Format status for display
 */
export const formatStatus = (status: OrderStatus): string => {
  return getStatusLabel(status);
};
