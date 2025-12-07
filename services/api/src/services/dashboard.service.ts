import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';

// Dashboard types
interface DateRange {
  startDate: string;
  endDate: string;
}

interface SalesMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

interface ProductManagementMetrics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
  totalBrands: number;
}

interface ProductPerformanceMetrics {
  topSellingProducts: TopSellingProduct[];
  lowPerformingProducts: LowPerformingProduct[];
  categoryPerformance: CategoryPerformance[];
  brandPerformance: BrandPerformance[];
}

interface TopSellingProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  imageUrl?: string;
}

interface LowPerformingProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  totalSales: number;
  totalRevenue: number;
  daysWithoutSale: number;
  currentStock: number;
  imageUrl?: string;
}

interface CategoryPerformance {
  id: string;
  name: string;
  productCount: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  growthRate: number;
}

interface BrandPerformance {
  id: string;
  name: string;
  productCount: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  growthRate: number;
  logoUrl?: string;
}

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired';
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  threshold?: number;
  expiryDate?: string;
  warehouseName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

interface BulkOperationSummary {
  totalProducts: number;
  selectedProducts: number;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
}

interface ProductManagementDashboard {
  metrics: ProductManagementMetrics;
  performance: ProductPerformanceMetrics;
  inventoryAlerts: InventoryAlert[];
  bulkOperations: BulkOperationSummary;
  recentActivity: ProductActivity[];
}

interface ProductActivity {
  id: string;
  type: 'created' | 'updated' | 'deleted' | 'stock_updated' | 'price_changed';
  productId: string;
  productName: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  details?: Record<string, any>;
}

const logger = createLogger('dashboard-service');

class DashboardService {
  private get db() {
    return getDatabase();
  }

  /**
   * Get sales metrics
   */
  async getSalesMetrics(dateRange?: DateRange): Promise<SalesMetrics> {
    try {
      // Determine date range
      let startDate: Date;
      let endDate: Date;
      let period: 'daily' | 'weekly' | 'monthly' = 'daily';

      if (dateRange) {
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
        
        // Determine period based on date range
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          period = 'daily';
        } else if (daysDiff <= 7) {
          period = 'weekly';
        } else {
          period = 'monthly';
        }
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        period = 'monthly';
      }

      // Get order metrics
      const orderMetrics = await this.db('orders')
        .whereBetween('created_at', [startDate, endDate])
        .whereIn('status', ['confirmed', 'preparing', 'out_for_delivery', 'delivered'])
        .select(
          this.db.raw('COUNT(*) as total_orders'),
          this.db.raw('COALESCE(SUM(total_amount), 0) as total_revenue')
        )
        .first();

      const totalOrders = parseInt(orderMetrics?.total_orders as string) || 0;
      const totalRevenue = parseFloat(orderMetrics?.total_revenue as string) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching sales metrics:', { error });
      throw new AppError('Failed to fetch sales metrics', 500, 'SALES_METRICS_ERROR');
    }
  }

  /**
   * Get comprehensive product management dashboard data
   */
  async getProductManagementDashboard(dateRange?: DateRange): Promise<ProductManagementDashboard> {
    try {
      const [metrics, performance, inventoryAlerts, bulkOperations, recentActivity] = await Promise.all([
        this.getProductManagementMetrics(),
        this.getProductPerformanceMetrics(dateRange),
        this.getInventoryAlerts(10),
        this.getBulkOperationSummary(),
        this.getProductActivity(20),
      ]);

      return {
        metrics,
        performance,
        inventoryAlerts,
        bulkOperations,
        recentActivity,
      };
    } catch (error) {
      logger.error('Error fetching product management dashboard:', { error });
      throw new AppError('Failed to fetch dashboard data', 500, 'DASHBOARD_ERROR');
    }
  }

  /**
   * Get product management metrics
   */
  async getProductManagementMetrics(): Promise<ProductManagementMetrics> {
    try {
      // Get product metrics
      const productResult = await this.db('products')
        .select(
          this.db.raw('COUNT(*) as total_products'),
          this.db.raw("COUNT(CASE WHEN is_active = true THEN 1 END) as active_products"),
          this.db.raw("COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products"),
          this.db.raw("COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_products")
        )
        .first();

      // Get category count
      const categoryResult = await this.db('categories')
        .where('is_active', true)
        .count('* as count')
        .first();

      // Get brand count
      const brandResult = await this.db('brands')
        .where('is_active', true)
        .count('* as count')
        .first();

      // Get inventory metrics
      const inventoryResult = await this.db('inventory')
        .where('status', 'Active')
        .select(
          this.db.raw("COUNT(CASE WHEN stock_level = 'Low' THEN 1 END) as low_stock_products"),
          this.db.raw("COUNT(CASE WHEN stock_level = 'Out' THEN 1 END) as out_of_stock_products")
        )
        .first();

      return {
        totalProducts: parseInt(productResult?.total_products as string) || 0,
        activeProducts: parseInt(productResult?.active_products as string) || 0,
        inactiveProducts: parseInt(productResult?.inactive_products as string) || 0,
        featuredProducts: parseInt(productResult?.featured_products as string) || 0,
        lowStockProducts: parseInt(inventoryResult?.low_stock_products as string) || 0,
        outOfStockProducts: parseInt(inventoryResult?.out_of_stock_products as string) || 0,
        totalCategories: parseInt(categoryResult?.count as string) || 0,
        totalBrands: parseInt(brandResult?.count as string) || 0,
      };
    } catch (error) {
      logger.error('Error fetching product management metrics:', { error });
      throw new AppError('Failed to fetch product metrics', 500, 'METRICS_ERROR');
    }
  }

  /**
   * Get product performance metrics
   */
  async getProductPerformanceMetrics(dateRange?: DateRange): Promise<ProductPerformanceMetrics> {
    try {
      // For now, return mock data since complex joins with order data would require
      // the orders table structure which may not be fully implemented
      const topSellingProducts: TopSellingProduct[] = [];
      const lowPerformingProducts: LowPerformingProduct[] = [];
      
      // Get category performance (simplified)
      const categories = await this.db('categories')
        .leftJoin('products', 'categories.id', 'products.category_id')
        .where('categories.is_active', true)
        .where('products.is_active', true)
        .groupBy('categories.id', 'categories.name')
        .select(
          'categories.id',
          'categories.name',
          this.db.raw('COUNT(products.id) as product_count')
        )
        .limit(10);

      const categoryPerformance: CategoryPerformance[] = categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        productCount: parseInt(cat.product_count) || 0,
        totalSales: 0,
        totalRevenue: 0,
        averagePrice: 0,
        growthRate: 0,
      }));

      // Get brand performance (simplified)
      const brands = await this.db('brands')
        .leftJoin('products', 'brands.id', 'products.brand_id')
        .where('brands.is_active', true)
        .where('products.is_active', true)
        .groupBy('brands.id', 'brands.name', 'brands.logo_url')
        .select(
          'brands.id',
          'brands.name',
          'brands.logo_url',
          this.db.raw('COUNT(products.id) as product_count')
        )
        .limit(10);

      const brandPerformance: BrandPerformance[] = brands.map((brand: any) => ({
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logo_url,
        productCount: parseInt(brand.product_count) || 0,
        totalSales: 0,
        totalRevenue: 0,
        averagePrice: 0,
        growthRate: 0,
      }));

      return {
        topSellingProducts,
        lowPerformingProducts,
        categoryPerformance,
        brandPerformance,
      };
    } catch (error) {
      logger.error('Error fetching product performance metrics:', { error });
      throw new AppError('Failed to fetch product performance metrics', 500, 'PERFORMANCE_ERROR');
    }
  }

  /**
   * Get inventory alerts
   */
  async getInventoryAlerts(limit?: number): Promise<InventoryAlert[]> {
    try {
      // Get low stock alerts
      let lowStockQuery = this.db('inventory as inv')
        .join('products as p', 'inv.product_id', 'p.id')
        .join('categories as c', 'p.category_id', 'c.id')
        .join('warehouses as w', 'inv.warehouse_id', 'w.id')
        .whereIn('inv.stock_level', ['Low', 'Out'])
        .where('inv.status', 'Active')
        .where('p.is_active', true)
        .select(
          this.db.raw("'low_stock' as type"),
          'p.id as product_id',
          'p.name as product_name',
          'p.sku',
          'c.name as category',
          'inv.available_stock as current_stock',
          'inv.threshold_stock as threshold',
          this.db.raw('null as expiry_date'),
          'w.name as warehouse_name',
          this.db.raw(`
            CASE 
              WHEN inv.available_stock = 0 THEN 'critical'
              WHEN inv.available_stock <= inv.threshold_stock * 0.5 THEN 'high'
              WHEN inv.available_stock <= inv.threshold_stock * 0.8 THEN 'medium'
              ELSE 'low'
            END as severity
          `),
          'inv.updated_at as created_at',
          this.db.raw("CONCAT('low_stock_', inv.id) as id")
        );

      if (limit) {
        lowStockQuery = lowStockQuery.limit(limit);
      }

      const alerts = await lowStockQuery;
      
      return alerts.map((row: any) => ({
        id: row.id,
        type: row.type as 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired',
        productId: row.product_id,
        productName: row.product_name,
        sku: row.sku,
        category: row.category,
        currentStock: parseInt(row.current_stock) || 0,
        threshold: row.threshold ? parseInt(row.threshold) : undefined,
        expiryDate: row.expiry_date,
        warehouseName: row.warehouse_name,
        severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching inventory alerts:', { error });
      throw new AppError('Failed to fetch inventory alerts', 500, 'ALERTS_ERROR');
    }
  }

  /**
   * Get bulk operation summary
   */
  async getBulkOperationSummary(): Promise<BulkOperationSummary> {
    try {
      const result = await this.db('products')
        .where('is_active', true)
        .count('* as count')
        .first();

      return {
        totalProducts: parseInt(result?.count as string) || 0,
        selectedProducts: 0,
        pendingOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
      };
    } catch (error) {
      logger.error('Error fetching bulk operation summary:', { error });
      throw new AppError('Failed to fetch bulk operation summary', 500, 'BULK_OPERATIONS_ERROR');
    }
  }

  /**
   * Get recent product activity
   */
  async getProductActivity(limit?: number): Promise<ProductActivity[]> {
    try {
      // Get recent product updates
      let query = this.db('products')
        .where('updated_at', '>', this.db.raw("NOW() - INTERVAL '7 days'"))
        .select(
          this.db.raw("'updated' as type"),
          'id as product_id',
          'name as product_name',
          this.db.raw("'Product updated' as description"),
          this.db.raw("'system' as user_id"),
          this.db.raw("'System' as user_name"),
          'updated_at as timestamp',
          this.db.raw('null as details'),
          this.db.raw("CONCAT('product_', id, '_', EXTRACT(epoch FROM updated_at)) as id")
        )
        .orderBy('updated_at', 'desc');

      if (limit) {
        query = query.limit(limit);
      }

      const activities = await query;
      
      return activities.map((row: any) => ({
        id: row.id,
        type: row.type as 'created' | 'updated' | 'deleted' | 'stock_updated' | 'price_changed',
        productId: row.product_id,
        productName: row.product_name,
        description: row.description,
        userId: row.user_id,
        userName: row.user_name,
        timestamp: row.timestamp,
        details: row.details,
      }));
    } catch (error) {
      logger.error('Error fetching product activity:', { error });
      throw new AppError('Failed to fetch product activity', 500, 'ACTIVITY_ERROR');
    }
  }

  /**
   * Dismiss inventory alert
   */
  async dismissInventoryAlert(alertId: string): Promise<void> {
    try {
      // For now, we'll just log the dismissal
      // In a real implementation, you might want to store dismissed alerts
      logger.info('Inventory alert dismissed', { alertId });
    } catch (error) {
      logger.error('Error dismissing inventory alert:', { error, alertId });
      throw new AppError('Failed to dismiss alert', 500, 'DISMISS_ALERT_ERROR');
    }
  }

  /**
   * Export product performance report as CSV
   */
  async exportProductPerformanceReport(dateRange?: DateRange, format: 'csv' = 'csv'): Promise<string> {
    try {
      const performance = await this.getProductPerformanceMetrics(dateRange);
      
      // Create CSV content
      let csvContent = 'Product Name,SKU,Category,Brand,Total Sales,Total Revenue,Average Price\n';
      
      performance.topSellingProducts.forEach((product: any) => {
        csvContent += `"${product.name}","${product.sku}","${product.category}","${product.brand || ''}",${product.totalSales},${product.totalRevenue},${product.averagePrice}\n`;
      });
      
      return csvContent;
    } catch (error) {
      logger.error('Error exporting product performance report:', { error });
      throw new AppError('Failed to export report', 500, 'EXPORT_ERROR');
    }
  }
}

export const dashboardService = new DashboardService();