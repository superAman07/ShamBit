import { getDatabase } from '@shambit/database';
import { createLogger } from '@shambit/shared';
import {
  SalesReport,
  RevenueReport,
  TopProductsReport,
  ReportFilters,
  ReportPeriod,
} from '../types/reports.types';
import { cacheService } from '../utils/cache';
import { createObjectCsvStringifier } from 'csv-writer';

const logger = createLogger('ReportsService');
const getDb = () => getDatabase();

class ReportsService {
  /**
   * Convert predefined period to date range
   * @param period Predefined period (today, last_7_days, etc.)
   * @returns Date range with startDate and endDate as ISO strings
   */
  private periodToDateRange(period: ReportPeriod): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;

      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;

      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0, 0);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return {
          startDate: startDate.toISOString(),
          endDate: lastMonthEnd.toISOString(),
        };

      case 'custom':
      default:
        throw new Error('Custom period requires explicit startDate and endDate');
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  /**
   * Generate cache key for reports
   * @param reportType Type of report (sales, revenue, products)
   * @param startDate Start date ISO string
   * @param endDate End date ISO string
   * @returns Cache key string
   */
  private getCacheKey(reportType: string, startDate: string, endDate: string): string {
    return cacheService.getCacheKey(reportType, startDate, endDate);
  }

  /**
   * Get sales report with order counts and metrics
   * @param filters Report filters (date range or period)
   * @returns Sales report data
   */
  async getSalesReport(filters: ReportFilters): Promise<SalesReport> {
    // Determine date range
    let startDate: string;
    let endDate: string;

    if (filters.period && filters.period !== 'custom') {
      const dateRange = this.periodToDateRange(filters.period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else if (filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else {
      throw new Error('Either period or both startDate and endDate must be provided');
    }

    // Check cache
    const cacheKey = this.getCacheKey('sales', startDate, endDate);
    const cachedReport = cacheService.get<SalesReport>(cacheKey);
    
    if (cachedReport) {
      logger.info('Sales report retrieved from cache', { startDate, endDate });
      return cachedReport;
    }

    // Query database
    const db = getDb();
    const result = await db('orders')
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw("COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders"),
        db.raw("COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders"),
        db.raw("COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_orders"),
        db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders"),
        db.raw("COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders"),
        db.raw("COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders"),
        db.raw("COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery_orders"),
        db.raw('COUNT(DISTINCT user_id) as unique_customers'),
        db.raw("AVG(CASE WHEN status = 'delivered' THEN total_amount END) as avg_order_value")
      )
      .first();

    // Handle empty results - return zeros
    const salesReport: SalesReport = {
      dateRange: {
        startDate,
        endDate,
      },
      totalOrders: parseInt(result?.total_orders || '0'),
      completedOrders: parseInt(result?.completed_orders || '0'),
      cancelledOrders: parseInt(result?.cancelled_orders || '0'),
      returnedOrders: parseInt(result?.returned_orders || '0'),
      ordersByStatus: {
        pending: parseInt(result?.pending_orders || '0'),
        confirmed: parseInt(result?.confirmed_orders || '0'),
        preparing: parseInt(result?.preparing_orders || '0'),
        out_for_delivery: parseInt(result?.out_for_delivery_orders || '0'),
        delivered: parseInt(result?.completed_orders || '0'),
        cancelled: parseInt(result?.cancelled_orders || '0'),
        returned: parseInt(result?.returned_orders || '0'),
      },
      averageOrderValue: (parseFloat(result?.avg_order_value || '0') || 0) / 100, // Convert from paise to rupees
      uniqueCustomers: parseInt(result?.unique_customers || '0'),
    };

    // Store in cache
    cacheService.set(cacheKey, salesReport);

    logger.info('Sales report generated', { startDate, endDate, totalOrders: salesReport.totalOrders });

    return salesReport;
  }

  /**
   * Get revenue report with financial breakdown
   * @param filters Report filters (date range or period)
   * @returns Revenue report data
   */
  async getRevenueReport(filters: ReportFilters): Promise<RevenueReport> {
    // Determine date range
    let startDate: string;
    let endDate: string;

    if (filters.period && filters.period !== 'custom') {
      const dateRange = this.periodToDateRange(filters.period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else if (filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else {
      throw new Error('Either period or both startDate and endDate must be provided');
    }

    // Check cache
    const cacheKey = this.getCacheKey('revenue', startDate, endDate);
    const cachedReport = cacheService.get<RevenueReport>(cacheKey);
    
    if (cachedReport) {
      logger.info('Revenue report retrieved from cache', { startDate, endDate });
      return cachedReport;
    }

    // Query database - only delivered orders
    const db = getDb();
    const result = await db('orders')
      .where('status', 'delivered')
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('SUM(subtotal + tax_amount + delivery_fee) as gross_revenue'),
        db.raw('SUM(total_amount) as net_revenue'),
        db.raw("SUM(CASE WHEN payment_method = 'cod' THEN total_amount ELSE 0 END) as cod_revenue"),
        db.raw("SUM(CASE WHEN payment_method = 'online' THEN total_amount ELSE 0 END) as online_revenue"),
        db.raw('SUM(tax_amount) as total_tax'),
        db.raw('SUM(delivery_fee) as total_delivery_fees'),
        db.raw('SUM(discount_amount) as total_discounts')
      )
      .first();

    // Handle empty results - return zeros (convert from paise to rupees)
    const revenueReport: RevenueReport = {
      dateRange: {
        startDate,
        endDate,
      },
      totalRevenue: (parseFloat(result?.total_revenue || '0') || 0) / 100,
      grossRevenue: (parseFloat(result?.gross_revenue || '0') || 0) / 100,
      netRevenue: (parseFloat(result?.net_revenue || '0') || 0) / 100,
      revenueByPaymentMethod: {
        cod: (parseFloat(result?.cod_revenue || '0') || 0) / 100,
        online: (parseFloat(result?.online_revenue || '0') || 0) / 100,
      },
      totalTax: (parseFloat(result?.total_tax || '0') || 0) / 100,
      totalDeliveryFees: (parseFloat(result?.total_delivery_fees || '0') || 0) / 100,
      totalDiscounts: (parseFloat(result?.total_discounts || '0') || 0) / 100,
    };

    // Store in cache
    cacheService.set(cacheKey, revenueReport);

    logger.info('Revenue report generated', { startDate, endDate, totalRevenue: revenueReport.totalRevenue });

    return revenueReport;
  }

  /**
   * Get top products by quantity and revenue
   * @param filters Report filters (date range or period)
   * @returns Top products report data
   */
  async getTopProductsReport(filters: ReportFilters): Promise<TopProductsReport> {
    // Determine date range
    let startDate: string;
    let endDate: string;

    if (filters.period && filters.period !== 'custom') {
      const dateRange = this.periodToDateRange(filters.period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else if (filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else {
      throw new Error('Either period or both startDate and endDate must be provided');
    }

    // Check cache
    const cacheKey = this.getCacheKey('products', startDate, endDate);
    const cachedReport = cacheService.get<TopProductsReport>(cacheKey);
    
    if (cachedReport) {
      logger.info('Top products report retrieved from cache', { startDate, endDate });
      return cachedReport;
    }

    // Query database
    const db = getDb();

    // Top 10 products by quantity sold
    const topByQuantity = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .where('orders.status', 'delivered')
      .whereBetween('orders.created_at', [startDate, endDate])
      .groupBy('order_items.product_id', 'order_items.product_name')
      .select(
        'order_items.product_id as productId',
        'order_items.product_name as productName',
        db.raw('SUM(order_items.quantity) as "quantitySold"'),
        db.raw('SUM(order_items.quantity * order_items.unit_price) as revenue')
      )
      .orderByRaw('SUM(order_items.quantity) DESC')
      .limit(10);

    // Top 10 products by revenue
    const topByRevenue = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .where('orders.status', 'delivered')
      .whereBetween('orders.created_at', [startDate, endDate])
      .groupBy('order_items.product_id', 'order_items.product_name')
      .select(
        'order_items.product_id as productId',
        'order_items.product_name as productName',
        db.raw('SUM(order_items.quantity) as "quantitySold"'),
        db.raw('SUM(order_items.quantity * order_items.unit_price) as revenue')
      )
      .orderByRaw('SUM(order_items.quantity * order_items.unit_price) DESC')
      .limit(10);

    // Map results to proper types
    const topProductsReport: TopProductsReport = {
      dateRange: {
        startDate,
        endDate,
      },
      topByQuantity: topByQuantity.map((row: any) => ({
        productId: row.productId,
        productName: row.productName,
        quantitySold: parseInt(row.quantitySold || '0'),
        revenue: (parseFloat(row.revenue || '0') || 0) / 100, // Convert from paise to rupees
      })),
      topByRevenue: topByRevenue.map((row: any) => ({
        productId: row.productId,
        productName: row.productName,
        quantitySold: parseInt(row.quantitySold || '0'),
        revenue: (parseFloat(row.revenue || '0') || 0) / 100, // Convert from paise to rupees
      })),
    };

    // Store in cache
    cacheService.set(cacheKey, topProductsReport);

    logger.info('Top products report generated', { 
      startDate, 
      endDate, 
      topByQuantityCount: topProductsReport.topByQuantity.length,
      topByRevenueCount: topProductsReport.topByRevenue.length,
    });

    return topProductsReport;
  }

  /**
   * Export sales report to CSV
   * @param filters Report filters (date range or period)
   * @returns CSV string
   */
  async exportSalesReportCSV(filters: ReportFilters): Promise<string> {
    // Get sales report data
    const report = await this.getSalesReport(filters);

    // Create CSV stringifier
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
      ],
    });

    // Format data as rows
    const records = [
      { metric: 'Date Range', value: `${report.dateRange.startDate} to ${report.dateRange.endDate}` },
      { metric: 'Total Orders', value: report.totalOrders.toString() },
      { metric: 'Completed Orders', value: report.completedOrders.toString() },
      { metric: 'Cancelled Orders', value: report.cancelledOrders.toString() },
      { metric: 'Returned Orders', value: report.returnedOrders.toString() },
      { metric: 'Pending Orders', value: report.ordersByStatus.pending.toString() },
      { metric: 'Confirmed Orders', value: report.ordersByStatus.confirmed.toString() },
      { metric: 'Preparing Orders', value: report.ordersByStatus.preparing.toString() },
      { metric: 'Out for Delivery Orders', value: report.ordersByStatus.out_for_delivery.toString() },
      { metric: 'Average Order Value', value: `₹${report.averageOrderValue.toFixed(2)}` },
      { metric: 'Unique Customers', value: report.uniqueCustomers.toString() },
    ];

    // Generate CSV string with UTF-8 BOM for Excel compatibility
    const csv = '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    logger.info('Sales report CSV exported', { 
      startDate: report.dateRange.startDate, 
      endDate: report.dateRange.endDate 
    });

    return csv;
  }

  /**
   * Export revenue report to CSV
   * @param filters Report filters (date range or period)
   * @returns CSV string
   */
  async exportRevenueReportCSV(filters: ReportFilters): Promise<string> {
    // Get revenue report data
    const report = await this.getRevenueReport(filters);

    // Create CSV stringifier
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
      ],
    });

    // Format data as rows
    const records = [
      { metric: 'Date Range', value: `${report.dateRange.startDate} to ${report.dateRange.endDate}` },
      { metric: 'Total Revenue', value: `₹${report.totalRevenue.toFixed(2)}` },
      { metric: 'Gross Revenue', value: `₹${report.grossRevenue.toFixed(2)}` },
      { metric: 'Net Revenue', value: `₹${report.netRevenue.toFixed(2)}` },
      { metric: 'COD Revenue', value: `₹${report.revenueByPaymentMethod.cod.toFixed(2)}` },
      { metric: 'Online Revenue', value: `₹${report.revenueByPaymentMethod.online.toFixed(2)}` },
      { metric: 'Total Tax', value: `₹${report.totalTax.toFixed(2)}` },
      { metric: 'Total Delivery Fees', value: `₹${report.totalDeliveryFees.toFixed(2)}` },
      { metric: 'Total Discounts', value: `₹${report.totalDiscounts.toFixed(2)}` },
    ];

    // Generate CSV string with UTF-8 BOM for Excel compatibility
    const csv = '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    logger.info('Revenue report CSV exported', { 
      startDate: report.dateRange.startDate, 
      endDate: report.dateRange.endDate 
    });

    return csv;
  }

  /**
   * Export products report to CSV
   * @param filters Report filters (date range or period)
   * @returns CSV string
   */
  async exportProductsReportCSV(filters: ReportFilters): Promise<string> {
    // Get products report data
    const report = await this.getTopProductsReport(filters);

    // Create CSV stringifier for products
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'productName', title: 'Product Name' },
        { id: 'quantitySold', title: 'Quantity Sold' },
        { id: 'revenue', title: 'Revenue (₹)' },
      ],
    });

    // Build CSV content with separate sections
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    
    // Add date range header
    csv += `Date Range: ${report.dateRange.startDate} to ${report.dateRange.endDate}\n\n`;
    
    // Top Products by Quantity section
    csv += 'Top Products by Quantity Sold\n';
    csv += csvStringifier.getHeaderString();
    
    if (report.topByQuantity.length > 0) {
      csv += csvStringifier.stringifyRecords(
        report.topByQuantity.map(product => ({
          productName: product.productName,
          quantitySold: product.quantitySold.toString(),
          revenue: product.revenue.toFixed(2),
        }))
      );
    } else {
      csv += 'No products sold in this period\n';
    }
    
    // Add separator
    csv += '\n';
    
    // Top Products by Revenue section
    csv += 'Top Products by Revenue\n';
    csv += csvStringifier.getHeaderString();
    
    if (report.topByRevenue.length > 0) {
      csv += csvStringifier.stringifyRecords(
        report.topByRevenue.map(product => ({
          productName: product.productName,
          quantitySold: product.quantitySold.toString(),
          revenue: product.revenue.toFixed(2),
        }))
      );
    } else {
      csv += 'No products sold in this period\n';
    }

    logger.info('Products report CSV exported', { 
      startDate: report.dateRange.startDate, 
      endDate: report.dateRange.endDate 
    });

    return csv;
  }
}

// Export singleton instance
export const reportsService = new ReportsService();
