import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  CheckCircle as SuccessIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { deliveryService } from '@/services/deliveryService';
import { DeliveryMetrics } from '@/types/delivery';

interface PersonnelMetricsDialogProps {
  open: boolean;
  onClose: () => void;
  personnelId: string | null;
  personnelName: string;
}

export const PersonnelMetricsDialog: React.FC<PersonnelMetricsDialogProps> = ({
  open,
  onClose,
  personnelId,
  personnelName,
}) => {
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && personnelId) {
      fetchMetrics();
    }
  }, [open, personnelId]);

  const fetchMetrics = async () => {
    if (!personnelId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryService.getDeliveryMetrics(personnelId);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Performance Metrics - {personnelName}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : metrics ? (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DeliveryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Total Deliveries
                    </Typography>
                  </Box>
                  <Typography variant="h4">{metrics.totalDeliveries}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SuccessIcon color="success" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Completed
                    </Typography>
                  </Box>
                  <Typography variant="h4">{metrics.completedDeliveries}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {metrics.failedDeliveries} failed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon color="info" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Avg. Time
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatTime(metrics.averageDeliveryTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Success Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {(metrics.successRate * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average Distance
                  </Typography>
                  <Typography variant="h5">
                    {metrics.averageDistance.toFixed(1)} km
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    On-Time Delivery Rate
                  </Typography>
                  <Typography variant="h5">
                    {(metrics.onTimeDeliveryRate * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {metrics.customerRating && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Customer Rating
                    </Typography>
                    <Typography variant="h5">
                      {metrics.customerRating.toFixed(1)} / 5.0
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
