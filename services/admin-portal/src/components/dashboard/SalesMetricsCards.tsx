import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  ShowChart,
} from '@mui/icons-material';
import { SalesMetrics } from '@/types/dashboard';
import { formatCurrency, formatNumber, capitalizeFirst } from '@/utils/formatters';
import { DASHBOARD_CONFIG } from '@/config/dashboard.config';

interface SalesMetricsCardsProps {
  metrics: SalesMetrics | null;
  loading: boolean;
  error: string | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ mt: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}20`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, { sx: { color, fontSize: 32 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const SalesMetricsCards: React.FC<SalesMetricsCardsProps> = ({ metrics, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Orders"
          value={formatNumber(metrics.totalOrders)}
          icon={<ShoppingCart />}
          color={DASHBOARD_CONFIG.METRIC_COLORS.ORDERS}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue, 'en-IN', '₹', false)}
          icon={<AttachMoney />}
          color={DASHBOARD_CONFIG.METRIC_COLORS.REVENUE}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(metrics.averageOrderValue, 'en-IN', '₹', false)}
          icon={<ShowChart />}
          color={DASHBOARD_CONFIG.METRIC_COLORS.AVERAGE_ORDER}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Period"
          value={capitalizeFirst(metrics.period)}
          icon={<TrendingUp />}
          color={DASHBOARD_CONFIG.METRIC_COLORS.PERIOD}
        />
      </Grid>
    </Grid>
  );
};
