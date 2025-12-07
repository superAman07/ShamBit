import { z } from 'zod';

// ============================================================================
// Core Report Interfaces
// ============================================================================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SalesReport {
  dateRange: DateRange;
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
  dateRange: DateRange;
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
  dateRange: DateRange;
  topByQuantity: TopProduct[];
  topByRevenue: TopProduct[];
}

// ============================================================================
// Request Types
// ============================================================================

export type ReportPeriod = 
  | 'today' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  period?: ReportPeriod;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const reportPeriodSchema = z.enum([
  'today',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'custom'
]);

export const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: reportPeriodSchema.optional()
}).refine(
  (data) => {
    // Either period OR both startDate and endDate must be provided
    if (data.period && data.period !== 'custom') {
      return true;
    }
    return data.startDate && data.endDate;
  },
  {
    message: 'Either period or both startDate and endDate must be provided'
  }
).refine(
  (data) => {
    // If both dates are provided, startDate must be before or equal to endDate
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'startDate must be before or equal to endDate'
  }
);

export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

export const topProductSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantitySold: z.number().int().nonnegative(),
  revenue: z.number().nonnegative()
});

export const salesReportSchema = z.object({
  dateRange: dateRangeSchema,
  totalOrders: z.number().int().nonnegative(),
  completedOrders: z.number().int().nonnegative(),
  cancelledOrders: z.number().int().nonnegative(),
  returnedOrders: z.number().int().nonnegative(),
  ordersByStatus: z.object({
    pending: z.number().int().nonnegative(),
    confirmed: z.number().int().nonnegative(),
    preparing: z.number().int().nonnegative(),
    out_for_delivery: z.number().int().nonnegative(),
    delivered: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative()
  }),
  averageOrderValue: z.number().nonnegative(),
  uniqueCustomers: z.number().int().nonnegative()
});

export const revenueReportSchema = z.object({
  dateRange: dateRangeSchema,
  totalRevenue: z.number().nonnegative(),
  grossRevenue: z.number().nonnegative(),
  netRevenue: z.number().nonnegative(),
  revenueByPaymentMethod: z.object({
    cod: z.number().nonnegative(),
    online: z.number().nonnegative()
  }),
  totalTax: z.number().nonnegative(),
  totalDeliveryFees: z.number().nonnegative(),
  totalDiscounts: z.number().nonnegative()
});

export const topProductsReportSchema = z.object({
  dateRange: dateRangeSchema,
  topByQuantity: z.array(topProductSchema),
  topByRevenue: z.array(topProductSchema)
});
