import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Paper,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  blockCustomer,
  unblockCustomer,
  updateVerificationStatus,
  fetchCustomerById,
} from '@/store/slices/customerSlice';
import { CustomerDetails, VerificationStatus } from '@/types/customer';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import { ActivityLogTimeline } from './ActivityLogTimeline';

interface ProfileTabProps {
  customer: CustomerDetails;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ customer }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.customers);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [newVerificationStatus, setNewVerificationStatus] = useState<VerificationStatus>(customer.verificationStatus);

  const handleBlockCustomer = async () => {
    if (!reason.trim()) return;
    
    await dispatch(blockCustomer({ customerId: customer.id, reason }));
    if (!error.blockAction) {
      setBlockDialogOpen(false);
      setReason('');
      dispatch(fetchCustomerById(customer.id));
    }
  };

  const handleUnblockCustomer = async () => {
    if (!reason.trim()) return;
    
    await dispatch(unblockCustomer({ customerId: customer.id, reason }));
    if (!error.blockAction) {
      setUnblockDialogOpen(false);
      setReason('');
      dispatch(fetchCustomerById(customer.id));
    }
  };

  const handleUpdateVerificationStatus = async () => {
    await dispatch(updateVerificationStatus({ 
      customerId: customer.id, 
      verificationStatus: newVerificationStatus 
    }));
    if (!error.blockAction) {
      setVerificationDialogOpen(false);
      dispatch(fetchCustomerById(customer.id));
    }
  };

  return (
    <Box>
      {/* Customer Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Customer Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Name
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {customer.name}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Mobile Number
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {customer.mobileNumber}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Email
            </Typography>
            <Typography variant="body1">
              {customer.email || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Account Status
            </Typography>
            <Typography variant="body1" color={customer.isBlocked ? 'error.main' : 'success.main'} fontWeight="medium">
              {customer.isBlocked ? 'Blocked' : 'Active'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Registered
            </Typography>
            <Typography variant="body1">
              {formatDate(customer.createdAt)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Last Login
            </Typography>
            <Typography variant="body1">
              {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Order Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Total Orders
            </Typography>
            <Typography variant="h5" fontWeight="medium">
              {customer.totalOrders}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Total Spent
            </Typography>
            <Typography variant="h5" fontWeight="medium">
              {formatCurrency(customer.totalSpent)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Last Order Date
            </Typography>
            <Typography variant="h5" fontWeight="medium">
              {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {customer.isBlocked ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<UnblockIcon />}
              onClick={() => setUnblockDialogOpen(true)}
              disabled={loading.blockAction}
            >
              Unblock Customer
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => setBlockDialogOpen(true)}
              disabled={loading.blockAction}
            >
              Block Customer
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              setNewVerificationStatus(customer.verificationStatus);
              setVerificationDialogOpen(true);
            }}
            disabled={loading.blockAction}
          >
            Change Verification Status
          </Button>
        </Box>
      </Paper>

      {/* Activity Log */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Activity Log
        </Typography>
        <ActivityLogTimeline activityLog={customer.activityLog} />
      </Paper>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Block Customer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Please provide a reason for blocking this customer. This action will prevent them from placing new orders.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Multiple failed payment attempts"
            required
          />
          {error.blockAction && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.blockAction}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBlockCustomer}
            variant="contained"
            color="error"
            disabled={!reason.trim() || loading.blockAction}
          >
            Block Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unblock Dialog */}
      <Dialog open={unblockDialogOpen} onClose={() => setUnblockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unblock Customer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Please provide a reason for unblocking this customer. This will restore their ability to place orders.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Issue resolved"
            required
          />
          {error.blockAction && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.blockAction}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnblockDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUnblockCustomer}
            variant="contained"
            color="success"
            disabled={!reason.trim() || loading.blockAction}
          >
            Unblock Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification Status Dialog */}
      <Dialog open={verificationDialogOpen} onClose={() => setVerificationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Verification Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Update the verification status for this customer account.
          </Typography>
          <TextField
            fullWidth
            select
            label="Verification Status"
            value={newVerificationStatus}
            onChange={(e) => setNewVerificationStatus(e.target.value as VerificationStatus)}
          >
            <MenuItem value="verified">Verified</MenuItem>
            <MenuItem value="not_verified">Not Verified</MenuItem>
            <MenuItem value="suspicious">Suspicious</MenuItem>
          </TextField>
          {error.blockAction && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.blockAction}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateVerificationStatus}
            variant="contained"
            disabled={newVerificationStatus === customer.verificationStatus || loading.blockAction}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
