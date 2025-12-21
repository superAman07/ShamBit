// Common types used across services

// Export seller registration types
export * from './seller-registration.types';

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

export type DeliveryStatus = 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export type AdminRole =
  | 'super_admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'delivery_manager'
  | 'analyst';

export type DiscountType = 'percentage' | 'fixed';

export type InventoryChangeType = 'restock' | 'sale' | 'return' | 'adjustment';

export type VehicleType = 'bike' | 'scooter' | 'bicycle';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}
