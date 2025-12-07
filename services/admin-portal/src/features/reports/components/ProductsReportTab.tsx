import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { exportProductsReportCSV } from '@/store/slices/reportsSlice';

interface ProductsReportTabProps {
  onExportSuccess: () => void;
  onExportError: (error: string) => void;
}

export const ProductsReportTab: React.FC<ProductsReportTabProps> = ({
  onExportSuccess,
  onExportError,
}) => {
  const dispatch = useAppDispatch();
  const { productsReport, filters, loading, error } = useAppSelector((state) => state.reports);

  const handleExport = async () => {
    try {
      await dispatch(exportProductsReportCSV(filters)).unwrap();
      onExportSuccess();
    } catch (err: any) {
      onExportError(err);
    }
  };

  if (loading.products) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error.products) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error.products}
      </Alert>
    );
  }

  if (!productsReport) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No data available for the selected date range
      </Alert>
    );
  }

  const hasData = productsReport.topByQuantity.length > 0 || productsReport.topByRevenue.length > 0;

  const quantityChartData = productsReport.topByQuantity.map((product, index) => ({
    name: product.productName.length > 20 ? product.productName.substring(0, 20) + '...' : product.productName,
    fullName: product.productName,
    quantity: product.quantitySold,
    revenue: product.revenue,
    color: `hsl(${(index * 360) / productsReport.topByQuantity.length}, 70%, 50%)`,
  }));

  const revenueChartData = productsReport.topByRevenue.map((product, index) => ({
    name: product.productName.length > 20 ? product.productName.substring(0, 20) + '...' : product.productName,
    fullName: product.productName,
    quantity: product.quantitySold,
    revenue: product.revenue,
    color: `hsl(${(index * 360) / productsReport.topByRevenue.length}, 70%, 50%)`,
  }));

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

      {!hasData ? (
        <Alert severity="info">
          No products sold in the selected date range
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Top Products by Quantity */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Products by Quantity Sold
                </Typography>
                {quantityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={quantityChartData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <Box
                                sx={{
                                  bgcolor: 'background.paper',
                                  p: 1.5,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {data.fullName}
                                </Typography>
                                <Typography variant="body2">
                                  Quantity: {data.quantity}
                                </Typography>
                                <Typography variant="body2">
                                  Revenue: ₹{data.revenue.toFixed(2)}
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="quantity" radius={[0, 8, 8, 0]}>
                        {quantityChartData.map((entry, index) => (
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
          </Grid>

          {/* Top Products by Revenue */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Products by Revenue
                </Typography>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={revenueChartData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <Box
                                sx={{
                                  bgcolor: 'background.paper',
                                  p: 1.5,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {data.fullName}
                                </Typography>
                                <Typography variant="body2">
                                  Quantity: {data.quantity}
                                </Typography>
                                <Typography variant="body2">
                                  Revenue: ₹{data.revenue.toFixed(2)}
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                        {revenueChartData.map((entry, index) => (
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
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
