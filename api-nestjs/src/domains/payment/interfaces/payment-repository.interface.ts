export interface PaymentFilters {
  orderId?: string;
  customerId?: string;
  status?: string | string[];
  gatewayProvider?: string;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: string;
  search?: string; // Search in order number, customer email, etc.
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentIncludeOptions {
  order?: boolean;
  transactions?: boolean;
  attempts?: boolean;
  webhooks?: boolean;
  auditLogs?: boolean;
  refunds?: boolean;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  averagePaymentAmount: number;
  paymentsByStatus: Record<string, number>;
  paymentsByGateway: Record<string, number>;
  successRate: number;
  failureRate: number;
}

export interface PaymentMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
    averageProcessingTime: number; // in milliseconds
    gatewayFees: number;
  };
}

export interface BulkPaymentOperation {
  paymentIntentIds: string[];
  operation: 'cancel' | 'retry' | 'refund';
  data: any;
  userId: string;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    paymentIntentId: string;
    error: string;
  }>;
}
