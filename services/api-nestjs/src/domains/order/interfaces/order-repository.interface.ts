export interface OrderFilters {
  customerId?: string;
  status?: string | string[];
  sellerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  orderNumber?: string;
  totalAmountMin?: number;
  totalAmountMax?: number;
  paymentStatus?: string;
  search?: string; // Search in order number, customer email, etc.
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderIncludeOptions {
  items?: boolean;
  customer?: boolean;
  payments?: boolean;
  refunds?: boolean;
  auditLogs?: boolean;
  statusHistory?: boolean;
  addresses?: boolean;
}

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
}

export interface OrderMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate?: number;
    cancelledOrders: number;
    refundedOrders: number;
  };
}

export interface BulkOrderOperation {
  orderIds: string[];
  operation: 'cancel' | 'fulfill' | 'update_status';
  data: any;
  userId: string;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    orderId: string;
    error: string;
  }>;
}