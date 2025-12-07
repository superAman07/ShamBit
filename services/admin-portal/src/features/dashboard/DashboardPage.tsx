import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, IconButton, Tooltip } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary';
import { SalesMetricsCards } from '@/components/dashboard/SalesMetricsCards';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts';
import { DeliveryStatusOverview } from '@/components/dashboard/DeliveryStatusOverview';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import { dashboardService } from '@/services';
import { DateRange } from '@/types/dashboard';
import { DASHBOARD_CONFIG } from '@/config/dashboard.config';

export const DashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [deliveryStatusOverview, setDeliveryStatusOverview] = useState<any>(null);
  const [loading, setLoading] = useState({
    salesMetrics: false,
    recentOrders: false,
    lowStockProducts: false,
    deliveryStatusOverview: false,
  });
  const [error, setError] = useState({
    salesMetrics: null as string | null,
    recentOrders: null as string | null,
    lowStockProducts: null as string | null,
    deliveryStatusOverview: null as string | null,
  });

  const loadDashboardData = async () => {
    // Load sales metrics
    setLoading(prev => ({ ...prev, salesMetrics: true }));
    try {
      const metrics = await dashboardService.getSalesMetrics(dateRange || undefined);
      setSalesMetrics(metrics);
      setError(prev => ({ ...prev, salesMetrics: null }));
    } catch (err: any) {
      setError(prev => ({ ...prev, salesMetrics: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, salesMetrics: false }));
    }

    // Load recent orders
    setLoading(prev => ({ ...prev, recentOrders: true }));
    try {
      const orders = await dashboardService.getRecentOrders(DASHBOARD_CONFIG.RECENT_ORDERS_LIMIT);
      setRecentOrders(orders);
      setError(prev => ({ ...prev, recentOrders: null }));
    } catch (err: any) {
      setError(prev => ({ ...prev, recentOrders: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, recentOrders: false }));
    }

    // Load low stock products
    setLoading(prev => ({ ...prev, lowStockProducts: true }));
    try {
      const products = await dashboardService.getLowStockProducts(DASHBOARD_CONFIG.LOW_STOCK_PRODUCTS_LIMIT);
      setLowStockProducts(products);
      setError(prev => ({ ...prev, lowStockProducts: null }));
    } catch (err: any) {
      setError(prev => ({ ...prev, lowStockProducts: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, lowStockProducts: false }));
    }

    // Load delivery status
    setLoading(prev => ({ ...prev, deliveryStatusOverview: true }));
    try {
      const overview = await dashboardService.getDeliveryStatusOverview();
      setDeliveryStatusOverview(overview);
      setError(prev => ({ ...prev, deliveryStatusOverview: null }));
    } catch (err: any) {
      setError(prev => ({ ...prev, deliveryStatusOverview: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, deliveryStatusOverview: false }));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const handleDateRangeChange = (newDateRange: DateRange | null) => {
    setDateRange(newDateRange);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Date Range Selector */}
        <DateRangeSelector onDateRangeChange={handleDateRangeChange} currentRange={dateRange} />

        {/* Sales Metrics Cards */}
        <Box sx={{ mb: 3 }}>
          <ComponentErrorBoundary componentName="Sales Metrics">
            <SalesMetricsCards
              metrics={salesMetrics}
              loading={loading.salesMetrics}
              error={error.salesMetrics}
            />
          </ComponentErrorBoundary>
        </Box>

        {/* Recent Orders and Low Stock Alerts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} lg={8}>
            <ComponentErrorBoundary componentName="Recent Orders">
              <RecentOrdersTable
                orders={recentOrders || []}
                loading={loading.recentOrders}
                error={error.recentOrders}
              />
            </ComponentErrorBoundary>
          </Grid>
          <Grid item xs={12} lg={4}>
            <ComponentErrorBoundary componentName="Low Stock Alerts">
              <LowStockAlerts
                products={lowStockProducts || []}
                loading={loading.lowStockProducts}
                error={error.lowStockProducts}
              />
            </ComponentErrorBoundary>
          </Grid>
        </Grid>

        {/* Delivery Status Overview */}
        <Box>
          <ComponentErrorBoundary componentName="Delivery Status">
            <DeliveryStatusOverview
              overview={deliveryStatusOverview}
              loading={loading.deliveryStatusOverview}
              error={error.deliveryStatusOverview}
            />
          </ComponentErrorBoundary>
        </Box>
      </Box>
    </DashboardLayout>
  );
};