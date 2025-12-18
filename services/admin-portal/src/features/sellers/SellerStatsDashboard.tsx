import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Block as SuspendedIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { SellerStatistics } from '../../services/sellerService';

interface SellerStatsDashboardProps {
  statistics: SellerStatistics;
}

const SellerStatsDashboard: React.FC<SellerStatsDashboardProps> = ({ statistics }) => {
  const getApprovalRate = () => {
    const total = statistics.total;
    if (total === 0) return 0;
    return Math.round((statistics.approved / total) * 100);
  };

  const getPendingRate = () => {
    const total = statistics.total;
    if (total === 0) return 0;
    return Math.round((statistics.pending / total) * 100);
  };

  return (
    <Grid container spacing={3}>
      {/* Main Statistics Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <StoreIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
              <Box>
                <Typography variant="h4" color="primary">
                  {statistics.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Sellers
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PendingIcon sx={{ mr: 2, color: 'info.main', fontSize: 40 }} />
              <Box>
                <Typography variant="h4" color="info.main">
                  {statistics.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Approval
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={getPendingRate()} 
                  color="info"
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getPendingRate()}% of total
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ApprovedIcon sx={{ mr: 2, color: 'success.main', fontSize: 40 }} />
              <Box>
                <Typography variant="h4" color="success.main">
                  {statistics.approved}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved Sellers
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={getApprovalRate()} 
                  color="success"
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getApprovalRate()}% approval rate
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 2, color: 'warning.main', fontSize: 40 }} />
              <Box>
                <Typography variant="h4" color="warning.main">
                  {statistics.recentRegistrations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  New This Month
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status Breakdown
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ApprovedIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2">Approved</Typography>
                </Box>
                <Typography variant="h5" color="success.main">
                  {statistics.approved}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PendingIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body2">Pending</Typography>
                </Box>
                <Typography variant="h5" color="info.main">
                  {statistics.pending}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <RejectedIcon sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="body2">Rejected</Typography>
                </Box>
                <Typography variant="h5" color="error.main">
                  {statistics.rejected}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SuspendedIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="body2">Suspended</Typography>
                </Box>
                <Typography variant="h5" color="warning.main">
                  {statistics.suspended}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Cities */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Top Cities</Typography>
            </Box>
            <List dense>
              {statistics.topCities.slice(0, 5).map((city, index) => (
                <ListItem key={city.city} sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {index + 1}. {city.city}
                        </Typography>
                        <Chip 
                          label={city.count} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Business Type Distribution */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Business Type Distribution</Typography>
            </Box>
            <Grid container spacing={2}>
              {statistics.businessTypeDistribution.map((type) => (
                <Grid item xs={12} sm={6} md={3} key={type.type}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="primary">
                        {type.count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {type.type.replace('_', ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {statistics.total > 0 ? Math.round((type.count / statistics.total) * 100) : 0}% of total
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SellerStatsDashboard;