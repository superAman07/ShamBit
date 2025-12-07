import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Alert,
} from '@mui/material';
import {
  SwapHoriz as ReassignIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Delivery, DeliveryStatus } from '@/types/delivery';
import { formatDate } from '@/utils/formatters';

interface ActiveDeliveriesPanelProps {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  onReassign: (delivery: Delivery) => void;
  onViewDetails: (delivery: Delivery) => void;
}

const DELIVERY_STATUS_COLORS: Record<
  DeliveryStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  pending: 'default',
  assigned: 'info',
  out_for_delivery: 'primary',
  delivered: 'success',
};

export const ActiveDeliveriesPanel: React.FC<ActiveDeliveriesPanelProps> = ({
  deliveries,
  loading,
  error,
  onReassign,
  onViewDetails,
}) => {
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Active Deliveries</Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order Number</TableCell>
              <TableCell>Delivery Personnel</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Pickup Location</TableCell>
              <TableCell>Delivery Location</TableCell>
              <TableCell>Distance</TableCell>
              <TableCell>Assigned At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading active deliveries...
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No active deliveries
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => (
                <TableRow key={delivery.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {delivery.orderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {delivery.deliveryPersonnel.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {delivery.deliveryPersonnel.mobileNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={delivery.status.replace('_', ' ').toUpperCase()}
                      color={DELIVERY_STATUS_COLORS[delivery.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {delivery.pickupLocation.address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {delivery.deliveryLocation.address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    N/A
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(delivery.assignedAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => onViewDetails(delivery)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {delivery.status !== 'delivered' && (
                        <Tooltip title="Reassign">
                          <IconButton size="small" onClick={() => onReassign(delivery)}>
                            <ReassignIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
