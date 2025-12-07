export interface SalesReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  ordersByStatus: {
    pending: number;
    confirmed: number;
    preparing: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
  averageOrderValue: number;
  uniqueCustomers: number;
}

export interface RevenueReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalRevenue: number;
  grossRevenue: number;
  netRevenue: number;
  revenueByPaymentMethod: {
    cod: number;
    online: number;
  };
  totalTax: number;
  totalDeliveryFees: number;
  totalDiscounts: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface TopProductsReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  topByQuantity: TopProduct[];
  topByRevenue: TopProduct[];
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  period?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
}

export type ReportPeriod = 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
