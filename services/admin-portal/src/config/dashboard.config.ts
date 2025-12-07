/**
 * Dashboard Configuration
 * Centralized configuration for dashboard settings
 */

export const DASHBOARD_CONFIG = {
  // Data refresh settings
  REFRESH_INTERVAL_MS: 30000, // 30 seconds
  
  // Pagination settings
  RECENT_ORDERS_LIMIT: 10,
  LOW_STOCK_PRODUCTS_LIMIT: 10,
  
  // Date range presets (in days)
  DATE_RANGES: {
    TODAY: 0,
    WEEK: 7,
    MONTH: 30,
  },
  
  // Metric card colors
  METRIC_COLORS: {
    ORDERS: '#1976d2',
    REVENUE: '#2e7d32',
    AVERAGE_ORDER: '#ed6c02',
    PERIOD: '#9c27b0',
  },
  
  // Order status colors
  ORDER_STATUS_COLORS: {
    CONFIRMED: 'info',
    PREPARING: 'info',
    OUT_FOR_DELIVERY: 'primary',
    DELIVERED: 'success',
    CANCELED: 'error',
    FAILED: 'error',
    RETURNED: 'warning',
    DEFAULT: 'default',
  } as const,
  
  // Delivery status colors
  DELIVERY_STATUS_COLORS: {
    ASSIGNED: '#ed6c02',
    PICKED_UP: '#0288d1',
    IN_TRANSIT: '#1976d2',
    DELIVERED: '#2e7d32',
    FAILED: '#d32f2f',
  },
  
  // Stock alert thresholds
  STOCK_ALERT: {
    OUT_OF_STOCK: 0,
    LOW_STOCK_COLOR: 'warning',
    OUT_OF_STOCK_COLOR: 'error',
  } as const,
} as const;

export type OrderStatusColor = typeof DASHBOARD_CONFIG.ORDER_STATUS_COLORS[keyof typeof DASHBOARD_CONFIG.ORDER_STATUS_COLORS];
export type StockAlertColor = typeof DASHBOARD_CONFIG.STOCK_ALERT.LOW_STOCK_COLOR | typeof DASHBOARD_CONFIG.STOCK_ALERT.OUT_OF_STOCK_COLOR;
