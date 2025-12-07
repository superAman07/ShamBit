import { apiService } from './api';
import {
  SalesMetrics,
  RecentOrder,
  LowStockProduct,
  DeliveryStatusOverview,
  DateRange,
  ProductManagementMetrics,
  ProductPerformanceMetrics,
  InventoryAlert,
  BulkOperationSummary,
  ProductActivity,
  ProductManagementDashboard,
} from '@/types/dashboard';

class DashboardService {
  /**
   * Get sales metrics for the dashboard
   */
  async getSalesMetrics(dateRange?: DateRange): Promise<SalesMetrics> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    return apiService.get<SalesMetrics>('/dashboard/sales-metrics', params);
  }

  /**
   * Get recent orders
   * @param limit Number of orders to fetch
   */
  async getRecentOrders(limit: number): Promise<RecentOrder[]> {
    const response = await apiService.get<RecentOrder[]>(
      '/orders/admin/all',
      { page: 1, pageSize: limit, sortBy: 'created_at', sortOrder: 'desc' }
    );
    return response;
  }

  /**
   * Get low stock products
   * @param limit Number of products to fetch
   */
  async getLowStockProducts(limit: number): Promise<LowStockProduct[]> {
    return apiService.get<LowStockProduct[]>('/inventory/low-stock', { limit });
  }

  /**
   * Get delivery status overview
   */
  async getDeliveryStatusOverview(): Promise<DeliveryStatusOverview> {
    return apiService.get<DeliveryStatusOverview>('/delivery/status-overview');
  }

  // Enhanced Product Management Dashboard Methods

  /**
   * Get comprehensive product management dashboard data
   */
  async getProductManagementDashboard(dateRange?: DateRange): Promise<ProductManagementDashboard> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    return apiService.get<ProductManagementDashboard>('/dashboard/product-management', params);
  }

  /**
   * Get product management metrics
   */
  async getProductManagementMetrics(): Promise<ProductManagementMetrics> {
    return apiService.get<ProductManagementMetrics>('/dashboard/product-metrics');
  }

  /**
   * Get product performance metrics
   */
  async getProductPerformanceMetrics(dateRange?: DateRange): Promise<ProductPerformanceMetrics> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    return apiService.get<ProductPerformanceMetrics>('/dashboard/product-performance', params);
  }

  /**
   * Get inventory alerts
   */
  async getInventoryAlerts(limit?: number): Promise<InventoryAlert[]> {
    const params: any = {};
    if (limit) {
      params.limit = limit;
    }
    return apiService.get<InventoryAlert[]>('/dashboard/inventory-alerts', params);
  }

  /**
   * Get bulk operation summary
   */
  async getBulkOperationSummary(): Promise<BulkOperationSummary> {
    return apiService.get<BulkOperationSummary>('/dashboard/bulk-operations');
  }

  /**
   * Get recent product activity
   */
  async getProductActivity(limit?: number): Promise<ProductActivity[]> {
    const params: any = {};
    if (limit) {
      params.limit = limit;
    }
    return apiService.get<ProductActivity[]>('/dashboard/product-activity', params);
  }

  /**
   * Dismiss inventory alert
   */
  async dismissInventoryAlert(alertId: string): Promise<void> {
    return apiService.post<void>(`/dashboard/inventory-alerts/${alertId}/dismiss`);
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateProductStatus(productIds: string[], isActive: boolean): Promise<{ success: number; failed: number }> {
    return apiService.post<{ success: number; failed: number }>('/products/bulk-status', {
      productIds,
      isActive,
    });
  }

  /**
   * Bulk update product prices
   */
  async bulkUpdateProductPrices(updates: Array<{ productId: string; sellingPrice: number; mrp?: number }>): Promise<{ success: number; failed: number }> {
    return apiService.post<{ success: number; failed: number }>('/products/bulk-prices', {
      updates,
    });
  }

  /**
   * Export product performance report
   */
  async exportProductPerformanceReport(dateRange?: DateRange, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const params: any = { format };
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await apiService.getAxiosInstance().get('/dashboard/product-performance/export', {
      params,
      responseType: 'blob',
    });
    
    return response.data;
  }
}

export const dashboardService = new DashboardService();
