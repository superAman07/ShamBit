export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ProductManagementMetrics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
  totalBrands: number;
}

export interface ProductPerformanceMetrics {
  topSellingProducts: TopSellingProduct[];
  lowPerformingProducts: LowPerformingProduct[];
  categoryPerformance: CategoryPerformance[];
  brandPerformance: BrandPerformance[];
}

export interface TopSellingProduct {
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

export interface LowPerformingProduct {
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

export interface CategoryPerformance {
  id: string;
  name: string;
  productCount: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  growthRate: number;
}

export interface BrandPerformance {
  id: string;
  name: string;
  productCount: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  growthRate: number;
  logoUrl?: string;
}

export interface InventoryAlert {
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

export interface BulkOperationSummary {
  totalProducts: number;
  selectedProducts: number;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
}

export interface ProductManagementDashboard {
  metrics: ProductManagementMetrics;
  performance: ProductPerformanceMetrics;
  inventoryAlerts: InventoryAlert[];
  bulkOperations: BulkOperationSummary;
  recentActivity: ProductActivity[];
}

export interface ProductActivity {
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