import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Store as StoreIcon,
  People as PeopleIcon,
  AttachMoney as RevenueIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Block as BlockedIcon,
  PersonAdd as NewUsersIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { sellerService } from '../../services/sellerService';

interface DashboardStats {
  sellers: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    recentRegistrations: number;
    topCities: Array<{ city: string; count: number }>;
    businessTypeDistribution: Array<{ type: string; count: number }>;
  };
  buyers: {
    totalCustomers: number;
    activeCustomers: number;
    blockedCustomers: number;
    newCustomersLast30Days: number;
  };
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    monthlyGrowth: number;
  };
}

const COLORS = ['#FB6F92', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'];

const EnhancedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [sellerStats, buyerStats, salesMetrics] = await Promise.all([
        sellerService.getSellerStatistics(),
        dashboardService.getBuyerStatistics(),
        dashboardService.getSalesMetrics()
      ]);

      setStats({
        sellers: sellerStats,
        buyers: buyerStats,
        sales: {
          totalRevenue: salesMetrics.totalRevenue || 0,
          totalOrders: salesMetrics.totalOrders || 0,
          averageOrderValue: salesMetrics.averageOrderValue || 0,
          monthlyGrowth: 0,
        }
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Typography>Failed to load dashboard data</Typography>
      </Box>
    );
  }

  const sellerStatusData = [
    { name: 'Approved', value: stats.sellers.approved, color: '#4CAF50' },
    { name: 'Pending', value: stats.sellers.pending, color: '#FF9800' },
    { name: 'Rejected', value: stats.sellers.rejected, color: '#F44336' },
    { name: 'Suspended', value: stats.sellers.suspended, color: '#9E9E9E' },
  ];

  const businessTypeData = stats.sellers.businessTypeDistribution.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  const topCitiesData = stats.sellers.topCities.slice(0, 5);

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Enhanced Dashboard
        </Typography>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Seller Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StoreIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Total Sellers</Typography>
              </Box>
              <Typography variant="h3" color="primary.main">
                {stats.sellers.total}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={`${stats.sellers.recentRegistrations} new this month`} 
                  size="small" 
                  color="success" 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PendingIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">Pending Approval</Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {stats.sellers.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting verification
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Buyer Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6">Total Customers</Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {stats.buyers.totalCustomers}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={`${stats.buyers.newCustomersLast30Days} new this month`} 
                  size="small" 
                  color="info" 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RevenueIcon sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">Total Revenue</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                ₹{(stats.sales.totalRevenue / 100000).toFixed(1)}L
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.sales.totalOrders} orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Statistics */}
      <Grid container spacing={3}>
        {/* Seller Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Seller Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sellerStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sellerStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Business Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Business Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FB6F92" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Cities */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Cities by Sellers
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCitiesData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Customer Status Overview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Status Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <ApprovedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {stats.buyers.activeCustomers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Customers
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <BlockedIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h4" color="error.main">
                    {stats.buyers.blockedCustomers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Blocked Customers
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body1">
                Customer Retention Rate: {' '}
                <strong>
                  {((stats.buyers.activeCustomers / stats.buyers.totalCustomers) * 100).toFixed(1)}%
                </strong>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions Needed
            </Typography>
            <Grid container spacing={2}>
              {stats.sellers.pending > 0 && (
                <Grid item>
                  <Chip
                    icon={<PendingIcon />}
                    label={`${stats.sellers.pending} sellers awaiting approval`}
                    color="warning"
                    variant="outlined"
                    clickable
                  />
                </Grid>
              )}
              {stats.buyers.blockedCustomers > 0 && (
                <Grid item>
                  <Chip
                    icon={<BlockedIcon />}
                    label={`${stats.buyers.blockedCustomers} customers blocked`}
                    color="error"
                    variant="outlined"
                    clickable
                  />
                </Grid>
              )}
              <Grid item>
                <Chip
                  icon={<NewUsersIcon />}
                  label={`${stats.sellers.recentRegistrations + stats.buyers.newCustomersLast30Days} new users this month`}
                  color="success"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default EnhancedDashboard;