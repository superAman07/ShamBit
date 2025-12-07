import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalShipping,
  CheckCircle,
  Error,
  Schedule,
  DirectionsBike,
} from '@mui/icons-material';
import { DeliveryStatusOverview as DeliveryStatusData } from '@/types/dashboard';
import { DASHBOARD_CONFIG } from '@/config/dashboard.config';

interface DeliveryStatusOverviewProps {
  overview: DeliveryStatusData | null;
  loading: boolean;
  error: string | null;
}

interface StatusItemProps {
  label: string;
  count: number;
  icon: React.ReactElement;
  color: string;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, count, icon, color }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: 2,
      borderRadius: 2,
      backgroundColor: `${color}10`,
    }}
  >
    <Box
      sx={{
        backgroundColor: `${color}20`,
        borderRadius: '50%',
        p: 1.5,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
    </Box>
    <Typography variant="h5" fontWeight="bold">
      {count || 0}
    </Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
      {label}
    </Typography>
  </Box>
);

export const DeliveryStatusOverview: React.FC<DeliveryStatusOverviewProps> = ({
  overview,
  loading,
  error,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Delivery Status Overview
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !overview ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No delivery data available
          </Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={4}>
              <StatusItem
                label="Assigned"
                count={overview.assigned || 0}
                icon={<Schedule />}
                color={DASHBOARD_CONFIG.DELIVERY_STATUS_COLORS.ASSIGNED}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatusItem
                label="Picked Up"
                count={overview.picked_up || 0}
                icon={<DirectionsBike />}
                color={DASHBOARD_CONFIG.DELIVERY_STATUS_COLORS.PICKED_UP}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatusItem
                label="In Transit"
                count={overview.in_transit || 0}
                icon={<LocalShipping />}
                color={DASHBOARD_CONFIG.DELIVERY_STATUS_COLORS.IN_TRANSIT}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatusItem
                label="Delivered"
                count={overview.delivered || 0}
                icon={<CheckCircle />}
                color={DASHBOARD_CONFIG.DELIVERY_STATUS_COLORS.DELIVERED}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatusItem
                label="Failed"
                count={overview.failed || 0}
                icon={<Error />}
                color={DASHBOARD_CONFIG.DELIVERY_STATUS_COLORS.FAILED}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: '#f5f5f5',
                  height: '100%',
                }}
              >
                <Typography variant="h5" fontWeight="bold">
                  {(overview.assigned || 0) + (overview.picked_up || 0) + (overview.in_transit || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  Active
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};
