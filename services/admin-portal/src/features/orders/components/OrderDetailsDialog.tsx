import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Card,
  CardContent,
  IconButton,
  Link,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Phone as PhoneIcon,
  LocalShipping as DeliveryIcon,
  Cancel as CancelIcon,
  Undo as ReturnIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  fetchOrderById,
  updateOrderStatus,
  assignOrderToDelivery,
  cancelOrder,
  processOrderReturn,
  addOrderNote,
  fetchAvailableDeliveryPersonnel,
  clearSelectedOrder,
} from '@/store/slices/orderSlice';
import { OrderStatus } from '@/types/order';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface OrderDetailsDialogProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

// Status color mapping based on requirements
const ORDER_STATUS_COLORS: Record<OrderStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning', // yellow
  payment_processing: 'info',
  confirmed: 'primary', // blue
  preparing: 'secondary', // indigo
  out_for_delivery: 'warning', // orange (using warning as closest)
  delivered: 'success', // green
  canceled: 'error', // red
  returned: 'secondary', // purple (using secondary)
  failed: 'error',
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  payment_processing: 'Payment Processing',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  canceled: 'Cancelled',
  returned: 'Returned',
  failed: 'Failed',
};

// Valid status transitions based on requirements
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'canceled'],
  payment_processing: ['confirmed', 'failed'],
  confirmed: ['preparing', 'canceled'],
  preparing: ['out_for_delivery', 'canceled'],
  out_for_delivery: ['delivered', 'canceled'],
  delivered: ['returned'],
  canceled: [],
  returned: [],
  failed: [],
};

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  orderId,
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedOrder, availableDeliveryPersonnel, loading, error } = useSelector(
    (state: RootState) => state.orders
  );

  // State for actions
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [returnReason, setReturnReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch order details and delivery personnel when dialog opens
  useEffect(() => {
    if (open && orderId) {
      dispatch(fetchOrderById(orderId));
      dispatch(fetchAvailableDeliveryPersonnel());
    }
  }, [dispatch, orderId, open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearSelectedOrder());
    };
  }, [dispatch]);

  const handleClose = () => {
    // Reset all state
    setSelectedStatus('');
    setSelectedDeliveryPerson('');
    setCancelReason('');
    setReturnReason('');
    setNote('');
    setShowCancelDialog(false);
    setShowReturnDialog(false);
    onClose();
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !selectedStatus) return;

    try {
      await dispatch(updateOrderStatus({
        orderId: selectedOrder.id,
        status: selectedStatus,
      })).unwrap();
      
      setSnackbar({ open: true, message: 'Order status updated successfully', severity: 'success' });
      setSelectedStatus('');
      // Refresh order details
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: typeof err === 'string' ? err : err?.message || 'Failed to update status', severity: 'error' });
    }
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrder || !selectedDeliveryPerson) return;

    try {
      await dispatch(assignOrderToDelivery({
        orderId: selectedOrder.id,
        deliveryPersonnelId: selectedDeliveryPerson,
      })).unwrap();
      
      setSnackbar({ open: true, message: 'Delivery person assigned successfully', severity: 'success' });
      setSelectedDeliveryPerson('');
      // Refresh order details
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: typeof err === 'string' ? err : err?.message || 'Failed to assign delivery person', severity: 'error' });
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;

    try {
      await dispatch(cancelOrder({
        orderId: selectedOrder.id,
        reason: cancelReason,
      })).unwrap();
      
      setSnackbar({ open: true, message: 'Order cancelled successfully', severity: 'success' });
      setShowCancelDialog(false);
      setCancelReason('');
      // Close dialog after successful cancellation
      setTimeout(() => handleClose(), 1500);
    } catch (err: any) {
      setSnackbar({ open: true, message: typeof err === 'string' ? err : err?.message || 'Failed to cancel order', severity: 'error' });
    }
  };

  const handleProcessReturn = async () => {
    if (!selectedOrder || !returnReason.trim()) return;

    try {
      await dispatch(processOrderReturn({
        orderId: selectedOrder.id,
        reason: returnReason,
        restockItems: true,
      })).unwrap();
      
      setSnackbar({ open: true, message: 'Return processed successfully', severity: 'success' });
      setShowReturnDialog(false);
      setReturnReason('');
      // Close dialog after successful return
      setTimeout(() => handleClose(), 1500);
    } catch (err: any) {
      setSnackbar({ open: true, message: typeof err === 'string' ? err : err?.message || 'Failed to process return', severity: 'error' });
    }
  };

  const handleAddNote = async () => {
    if (!selectedOrder || !note.trim()) return;

    try {
      await dispatch(addOrderNote({
        orderId: selectedOrder.id,
        note: note.trim(),
      })).unwrap();
      
      setSnackbar({ open: true, message: 'Note added successfully', severity: 'success' });
      setNote('');
      // Refresh order details to update timeline
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: typeof err === 'string' ? err : err?.message || 'Failed to add note', severity: 'error' });
    }
  };

  const getValidTransitions = (currentStatus: OrderStatus): OrderStatus[] => {
    return VALID_TRANSITIONS[currentStatus] || [];
  };

  const canCancelOrder = (status: OrderStatus): boolean => {
    return !['delivered', 'canceled', 'returned'].includes(status);
  };

  const canProcessReturn = (status: OrderStatus): boolean => {
    return status === 'delivered';
  };

  const showDeliveryAssignment = (status: OrderStatus): boolean => {
    return ['preparing', 'out_for_delivery'].includes(status);
  };

  const isActionInProgress = (): boolean => {
    return loading.updateStatus || loading.assignDelivery || loading.cancelOrder || loading.processReturn || loading.addNote;
  };

  // Loading state
  if (loading.orderDetails) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error.orderDetails) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen>
        <DialogTitle>Error Loading Order</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>{error.orderDetails}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatch(fetchOrderById(orderId))} variant="outlined">
            Retry
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!selectedOrder) {
    return null;
  }

  return (
    <ComponentErrorBoundary componentName="OrderDetailsDialog">
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen>
        {/* Dialog Title with Order Number and Status */}
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5">Order #{selectedOrder.orderNumber}</Typography>
              <Chip
                label={ORDER_STATUS_LABELS[selectedOrder.status]}
                color={ORDER_STATUS_COLORS[selectedOrder.status]}
                size="medium"
              />
            </Box>
            <IconButton onClick={handleClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Customer Information Section - Subtask 5.2 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Customer Information</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Name:</strong> {selectedOrder.customer?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Mobile:</strong>{' '}
                    {selectedOrder.customer?.mobileNumber ? (
                      <Link href={`tel:${selectedOrder.customer.mobileNumber}`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        {selectedOrder.customer.mobileNumber}
                        <PhoneIcon fontSize="small" />
                      </Link>
                    ) : 'N/A'}
                  </Typography>
                  {selectedOrder.customer?.email && (
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedOrder.customer.email}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Delivery Address Section - Subtask 5.2 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Delivery Address</Typography>
                  <Typography variant="body2">{selectedOrder.deliveryAddress.addressLine1}</Typography>
                  {selectedOrder.deliveryAddress.addressLine2 && (
                    <Typography variant="body2">{selectedOrder.deliveryAddress.addressLine2}</Typography>
                  )}
                  <Typography variant="body2">
                    {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} - {selectedOrder.deliveryAddress.pincode}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Order Items Section - Subtask 5.3 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Order Items</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                              />
                            )}
                            <Typography variant="body2">{item.productName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Pricing Breakdown Section - Subtask 5.3 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Pricing Breakdown</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2">{formatCurrency(selectedOrder.subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Tax:</Typography>
                    <Typography variant="body2">{formatCurrency(selectedOrder.taxAmount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Delivery Fee:</Typography>
                    <Typography variant="body2">{formatCurrency(selectedOrder.deliveryFee)}</Typography>
                  </Box>
                  {selectedOrder.discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="success.main">Discount:</Typography>
                      <Typography variant="body2" color="success.main">-{formatCurrency(selectedOrder.discountAmount)}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">{formatCurrency(selectedOrder.totalAmount)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Payment Information Section - Subtask 5.4 */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Payment Information</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Method:</strong> {selectedOrder.paymentMethod.toUpperCase()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" component="span">
                      <strong>Status:</strong>
                    </Typography>
                    <Chip
                      label={selectedOrder.paymentStatus.toUpperCase()}
                      size="small"
                      color={
                        selectedOrder.paymentStatus === 'completed' ? 'success' :
                        selectedOrder.paymentStatus === 'failed' ? 'error' :
                        'warning'
                      }
                    />
                  </Box>
                  {selectedOrder.paymentId && selectedOrder.paymentMethod !== 'cod' && (
                    <Typography variant="body2">
                      <strong>Transaction ID:</strong> {selectedOrder.paymentId}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Status Update Section - Subtask 5.5 */}
            {getValidTransitions(selectedOrder.status).length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Update Order Status</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>New Status</InputLabel>
                        <Select
                          value={selectedStatus}
                          label="New Status"
                          onChange={(e: SelectChangeEvent) => setSelectedStatus(e.target.value as OrderStatus)}
                          disabled={isActionInProgress()}
                        >
                          {getValidTransitions(selectedOrder.status).map((status) => (
                            <MenuItem key={status} value={status}>
                              {ORDER_STATUS_LABELS[status]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={handleUpdateStatus}
                        disabled={!selectedStatus || isActionInProgress()}
                      >
                        {loading.updateStatus ? <CircularProgress size={24} /> : 'Update Status'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Delivery Assignment Section - Subtask 5.6 */}
            {showDeliveryAssignment(selectedOrder.status) && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Delivery Assignment</Typography>
                    {selectedOrder.deliveryPerson ? (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Assigned to:</strong> {selectedOrder.deliveryPerson.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Contact:</strong>{' '}
                          <Link href={`tel:${selectedOrder.deliveryPerson.mobileNumber}`}>
                            {selectedOrder.deliveryPerson.mobileNumber}
                          </Link>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          You can reassign to a different delivery person below
                        </Typography>
                      </Box>
                    ) : null}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <FormControl sx={{ minWidth: 300 }}>
                        <InputLabel>Select Delivery Person</InputLabel>
                        <Select
                          value={selectedDeliveryPerson}
                          label="Select Delivery Person"
                          onChange={(e: SelectChangeEvent) => setSelectedDeliveryPerson(e.target.value)}
                          disabled={isActionInProgress() || availableDeliveryPersonnel.length === 0}
                        >
                          {availableDeliveryPersonnel.length === 0 ? (
                            <MenuItem value="" disabled>No delivery personnel available</MenuItem>
                          ) : (
                            availableDeliveryPersonnel.map((person) => (
                              <MenuItem key={person.id} value={person.id}>
                                {person.name} - {person.mobileNumber}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        startIcon={<DeliveryIcon />}
                        onClick={handleAssignDelivery}
                        disabled={!selectedDeliveryPerson || isActionInProgress()}
                      >
                        {loading.assignDelivery ? <CircularProgress size={24} /> : 'Assign'}
                      </Button>
                    </Box>
                    {availableDeliveryPersonnel.length === 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        No delivery personnel available at the moment
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Order Timeline Section - Subtask 5.9 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Order Timeline</Typography>
                  {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? (
                    <Box sx={{ pl: 2 }}>
                      {selectedOrder.timeline.map((entry, index) => (
                        <Box key={entry.id} sx={{ mb: 2, pb: 2, borderBottom: index < (selectedOrder.timeline?.length || 0) - 1 ? '1px solid #e0e0e0' : 'none' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {entry.actionType === 'order_created' && 'Order Created'}
                            {entry.actionType === 'status_change' && `Status changed from ${entry.oldValue} to ${entry.newValue}`}
                            {entry.actionType === 'delivery_assignment' && `Assigned to delivery person`}
                            {entry.actionType === 'cancellation' && `Order cancelled: ${entry.reason}`}
                            {entry.actionType === 'return' && `Order returned: ${entry.reason}`}
                            {entry.actionType === 'note' && entry.note}
                          </Typography>
                          {entry.adminEmail && (
                            <Typography variant="caption" color="text.secondary">
                              By: {entry.adminEmail}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDate(entry.createdAt)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No timeline entries available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Add Note Section - Subtask 5.10 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Add Note</Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Add a note to the order timeline..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={isActionInProgress()}
                      helperText={`${note.length}/500 characters`}
                      inputProps={{ maxLength: 500 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<NoteAddIcon />}
                      onClick={handleAddNote}
                      disabled={!note.trim() || isActionInProgress()}
                      sx={{ mt: 1 }}
                    >
                      {loading.addNote ? <CircularProgress size={24} /> : 'Add Note'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        {/* Dialog Actions - Subtask 5.7 and 5.8 */}
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={isActionInProgress()}>
            Close
          </Button>
          
          {canCancelOrder(selectedOrder.status) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setShowCancelDialog(true)}
              disabled={isActionInProgress()}
            >
              Cancel Order
            </Button>
          )}

          {canProcessReturn(selectedOrder.status) && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ReturnIcon />}
              onClick={() => setShowReturnDialog(true)}
              disabled={isActionInProgress()}
            >
              Process Return
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog - Subtask 5.7 */}
      <Dialog open={showCancelDialog} onClose={() => !loading.cancelOrder && setShowCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Cancellation Reason"
            placeholder="Please provide a reason for cancelling this order..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)} disabled={loading.cancelOrder}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={!cancelReason.trim() || loading.cancelOrder}
          >
            {loading.cancelOrder ? <CircularProgress size={24} /> : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Order Dialog - Subtask 5.8 */}
      <Dialog open={showReturnDialog} onClose={() => !loading.processReturn && setShowReturnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Return</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Return Reason"
            placeholder="Please provide a reason for this return..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnDialog(false)} disabled={loading.processReturn}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleProcessReturn}
            disabled={!returnReason.trim() || loading.processReturn}
          >
            {loading.processReturn ? <CircularProgress size={24} /> : 'Process Return'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications - Subtask 5.11 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ComponentErrorBoundary>
  );
};
