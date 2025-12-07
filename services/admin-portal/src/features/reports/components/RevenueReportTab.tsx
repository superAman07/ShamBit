import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { exportRevenueReportCSV } from '@/store/slices/reportsSlice';

interface RevenueReportTabProps {
  onExportSuccess: () => void;
  onExportError: (error: string) => void;
}

export const RevenueReportTab: React.FC<RevenueReportTabProps> = ({
  onExportSuccess,
  onExportError,
}) => {
  const dispatch = useAppDispatch();
  const { revenueReport, filters, loading, error } = useAppSelector((state) => state.reports);

  const handleExport = async () => {
    try {
      await dispatch(exportRevenueReportCSV(filters)).unwrap();
      onExportSuccess();
    } catch (err: any) {
      onExportError(err);
    }
  };

  if (loading.revenue) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error.revenue) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error.revenue}
      </Alert>
    );
  }

  if (!revenueReport) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No data available for the selected date range
      </Alert>
    );
  }

  const mainMetrics = [
    {
      label: 'Total Revenue',
      value: `₹${revenueReport.totalRevenue.toFixed(2)}`,
      color: '#2e7d32',
    },
    {
      label: 'Gross Revenue',
      value: `₹${revenueReport.grossRevenue.toFixed(2)}`,
      color: '#1976d2',
    },
    {
      label: 'Net Revenue',
      value: `₹${revenueReport.netRevenue.toFixed(2)}`,
      color: '#ed6c02',
    },
  ];

  const breakdownMetrics = [
    {
      label: 'COD Revenue',
      value: `₹${revenueReport.revenueByPaymentMethod.cod.toFixed(2)}`,
      color: '#9c27b0',
    },
    {
      label: 'Online Revenue',
      value: `₹${revenueReport.revenueByPaymentMethod.online.toFixed(2)}`,
      color: '#0288d1',
    },
    {
      label: 'Total Tax',
      value: `₹${revenueReport.totalTax.toFixed(2)}`,
      color: '#f57c00',
    },
    {
      label: 'Delivery Fees',
      value: `₹${revenueReport.totalDeliveryFees.toFixed(2)}`,
      color: '#00796b',
    },
    {
      label: 'Discounts',
      value: `₹${revenueReport.totalDiscounts.toFixed(2)}`,
      color: '#c62828',
    },
  ];

  const chartData = [
    { label: 'COD', value: revenueReport.revenueByPaymentMethod.cod, color: '#9c27b0' },
    { label: 'Online', value: revenueReport.revenueByPaymentMethod.online, color: '#0288d1' },
    { label: 'Tax', value: revenueReport.totalTax, color: '#f57c00' },
    { label: 'Delivery Fees', value: revenueReport.totalDeliveryFees, color: '#00796b' },
    { label: 'Discounts', value: revenueReport.totalDiscounts, color: '#c62828' },
  ].filter(item => item.value > 0);

  const hasData = revenueReport.totalRevenue > 0;

  return (
    <Box>
      {/* Export Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={loading.export ? <CircularProgress size={20} /> : <Download />}
          onClick={handleExport}
          disabled={loading.export || !hasData}
        >
          Export to CSV
        </Button>
      </Box>

      {/* Main Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {mainMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: metric.color, fontWeight: 'bold' }}>
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Breakdown Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {breakdownMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Typography variant="h5" component="div" sx={{ color: metric.color, fontWeight: 'bold' }}>
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Breakdown Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Revenue Breakdown
          </Typography>
          {hasData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 120, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <Typography variant="body1" color="text.secondary">
                No data available
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
