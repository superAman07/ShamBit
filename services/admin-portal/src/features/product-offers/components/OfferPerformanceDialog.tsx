import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Visibility as ViewsIcon,
  ShoppingCart as OrdersIcon,
  AttachMoney as RevenueIcon,
  Percent as ConversionIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { ProductOffer } from '../../../types/product-offer';
import { formatCurrency } from '../../../utils/formatters';
import { offerAnalyticsService, OfferPerformanceStats } from '../../../services/offerAnalyticsService';

interface OfferPerformanceDialogProps {
  open: boolean;
  onClose: () => void;
  offer: ProductOffer | null;
}

const OfferPerformanceDialog: React.FC<OfferPerformanceDialogProps> = ({
  open,
  onClose,
  offer,
}) => {
  const [performance, setPerformance] = useState<OfferPerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && offer) {
      loadPerformanceData();
    }
  }, [open, offer]);

  const loadPerformanceData = async () => {
    if (!offer) return;
    
    setLoading(true);
    setError(null);
    try {
      const stats = await offerAnalyticsService.getOfferPerformance(offer.id);
      setPerformance(stats);
    } catch (error) {
      console.error('Failed to load performance data', error);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value: number, type: 'conversion' | 'revenue') => {
    if (type === 'conversion') {
      if (value >= 8) return 'success';
      if (value >= 4) return 'warning';
      return 'error';
    } else {
      if (value >= 1000) return 'success';
      if (value >= 500) return 'warning';
      return 'error';
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <TrendingUpIcon />
          <span>Offer Performance Analytics</span>
        </Box>
      </DialogTitle>
      <Box sx={{ px: 3, pb: 2 }}>
        <Typography variant="subtitle1" color="text.secondary">
          {offer.offerTitle}
        </Typography>
      </Box>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 4 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
              Loading performance data...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : performance ? (
          <Grid container spacing={2}>
            {/* Key Metrics Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ViewsIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">{performance.totalViews.toLocaleString()}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Views
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <OrdersIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">{performance.totalOrders}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Orders Generated
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ConversionIcon 
                      color={getPerformanceColor(performance.conversionRate, 'conversion')} 
                      sx={{ mr: 1 }} 
                    />
                    <Typography variant="h6">{performance.conversionRate.toFixed(2)}%</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Conversion Rate
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      performance.conversionRate >= 8 ? 'Excellent' :
                      performance.conversionRate >= 4 ? 'Good' : 'Needs Improvement'
                    }
                    color={getPerformanceColor(performance.conversionRate, 'conversion')}
                    sx={{ mt: 0.5 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <RevenueIcon 
                      color={getPerformanceColor(performance.totalRevenue, 'revenue')} 
                      sx={{ mr: 1 }} 
                    />
                    <Typography variant="h6">{formatCurrency(performance.totalRevenue, 'en-IN', '₹', false)}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Detailed Metrics */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Detailed Performance Metrics
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Average Order Value</TableCell>
                      <TableCell align="right">{formatCurrency(performance.averageOrderValue, 'en-IN', '₹', false)}</TableCell>
                      <TableCell>Average value per order with this offer</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Revenue per Day</TableCell>
                      <TableCell align="right">{formatCurrency(performance.revenuePerDay, 'en-IN', '₹', false)}</TableCell>
                      <TableCell>Daily revenue generated by this offer</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Days Active</TableCell>
                      <TableCell align="right">{performance.daysActive}</TableCell>
                      <TableCell>Number of days the offer has been running</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Offer Period</TableCell>
                      <TableCell align="right">
                        {format(new Date(performance.startDate), 'MMM dd')} - {format(new Date(performance.endDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>Complete offer duration</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Performance Insights */}
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Performance Insights
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {performance.conversionRate >= 8 ? (
                      <Typography variant="body2" color="success.main">
                        ✓ Excellent conversion rate! This offer is performing very well.
                      </Typography>
                    ) : performance.conversionRate >= 4 ? (
                      <Typography variant="body2" color="warning.main">
                        ⚠ Good conversion rate, but there's room for improvement.
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error.main">
                        ⚠ Low conversion rate. Consider adjusting the offer or targeting.
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    {performance.totalRevenue >= 1000 ? (
                      <Typography variant="body2" color="success.main">
                        ✓ Strong revenue generation from this offer.
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="warning.main">
                        ⚠ Revenue could be improved with better promotion or pricing.
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Recommendations:</strong>
                    {performance.conversionRate < 4 && ' Consider increasing the discount value or improving the offer visibility.'}
                    {performance.totalViews < 100 && ' Increase marketing efforts to drive more traffic to this offer.'}
                    {performance.conversionRate >= 8 && ' This offer is performing excellently - consider extending it or creating similar offers.'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No performance data available for this offer.
          </Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfferPerformanceDialog;