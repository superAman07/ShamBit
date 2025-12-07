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
import { exportSalesReportCSV } from '@/store/slices/reportsSlice';

interface SalesReportTabProps {
  onExportSuccess: () => void;
  onExportError: (error: string) => void;
}

export const SalesReportTab: React.FC<SalesReportTabProps> = ({
  onExportSuccess,
  onExportError,
}) => {
  const dispatch = useAppDispatch();
  const { salesReport, filters, loading, error } = useAppSelector((state) => state.reports);

  const handleExport = async () => {
    try {
      await dispatch(exportSalesReportCSV(filters)).unwrap();
      onExportSuccess();
    } catch (err: any) {
      onExportError(err);
    }
  };

  if (loading.sales) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error.sales) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error.sales}
      </Alert>
    );
  }

  if (!salesReport) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No data available for the selected date range
      </Alert>
    );
  }

  const metrics = [
    {
      label: 'Total Orders',
      value: salesReport.totalOrders,
      color: '#1976d2',
    },
    {
      label: 'Completed Orders',
      value: salesReport.completedOrders,
      color: '#2e7d32',
    },
    {
      label: 'Average Order Value',
      value: `₹${salesReport.averageOrderValue.toFixed(2)}`,
      color: '#ed6c02',
    },
    {
      label: 'Unique Customers',
      value: salesReport.uniqueCustomers,
      color: '#9c27b0',
    },
  ];

  const chartData = [
    { status: 'Pending', count: salesReport.ordersByStatus.pending, color: '#ff9800' },
    { status: 'Confirmed', count: salesReport.ordersByStatus.confirmed, color: '#2196f3' },
    { status: 'Preparing', count: salesReport.ordersByStatus.preparing, color: '#03a9f4' },
    { status: 'Out for Delivery', count: salesReport.ordersByStatus.out_for_delivery, color: '#00bcd4' },
    { status: 'Delivered', count: salesReport.ordersByStatus.delivered, color: '#4caf50' },
    { status: 'Cancelled', count: salesReport.ordersByStatus.cancelled, color: '#f44336' },
    { status: 'Returned', count: salesReport.ordersByStatus.returned, color: '#e91e63' },
  ].filter(item => item.count > 0);

  const hasData = salesReport.totalOrders > 0;

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

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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

      {/* Orders by Status Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Orders by Status
          </Typography>
          {hasData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="status" type="category" />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
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
