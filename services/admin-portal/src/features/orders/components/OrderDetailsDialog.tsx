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

// Import status utilities
import { getStatusColor, getStatusLabel, canCancelOrder as canCancelOrderUtil } from '@/utils/orderStatus';
import { orderService } from '@/services/orderService';

// Status color mapping - using utility function
const getOrderStatusColor = (status: OrderStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const color = getStatusColor(status);
  // Map our color names to MUI chip colors
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    default: 'default',
    primary: 'primary',
    secondary: 'secondary',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  };
  return colorMap[color] || 'default';
};

// Status labels - using utility function
const getOrderStatusLabel = (status: OrderStatus): string => {
  return getStatusLabel(status);
};

// Valid status transitions - Production-ready
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_processing', 'canceled'],
  payment_processing: ['confirmed', 'payment_failed', 'failed'],
  payment_failed: ['payment_processing', 'canceled'],
  confirmed: ['preparing', 'on_hold', 'canceled'],
  on_hold: ['preparing', 'ready_for_pickup', 'canceled'],
  preparing: ['ready_for_pickup', 'on_hold', 'canceled'],
  ready_for_pickup: ['out_for_delivery', 'on_hold', 'canceled'],
  out_for_delivery: ['delivered', 'delivery_attempted', 'on_hold', 'canceled'],
  delivery_attempted: ['out_for_delivery', 'on_hold', 'canceled', 'failed'],
  delivered: ['return_requested'],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved: ['return_pickup_scheduled'],
  return_rejected: [],
  return_pickup_scheduled: ['return_in_transit'],
  return_in_transit: ['returned'],
  returned: ['refund_pending'],
  refund_pending: ['refunded'],
  canceled: [],
  failed: [],
  refunded: [],
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
  
  // New dialog states for enhanced order management
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReason, setHoldReason] = useState<string>('');
  const [holdNotes, setHoldNotes] = useState<string>('');
  
  const [showDeliveryAttemptDialog, setShowDeliveryAttemptDialog] = useState(false);
  const [deliveryAttemptReason, setDeliveryAttemptReason] = useState<string>('');
  const [deliveryAttemptNotes, setDeliveryAttemptNotes] = useState<string>('');
  
  const [showRetryDeliveryDialog, setShowRetryDeliveryDialog] = useState(false);
  const [retryDeliveryTime, setRetryDeliveryTime] = useState<string>('');
  
  const [showApproveReturnDialog, setShowApproveReturnDialog] = useState(false);
  const [approveReturnNotes, setApproveReturnNotes] = useState<string>('');
  const [restockItems, setRestockItems] = useState<boolean>(true);
  
  const [showRejectReturnDialog, setShowRejectReturnDialog] = useState(false);
  const [rejectReturnReason, setRejectReturnReason] = useState<string>('');
  
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [refundReference, setRefundReference] = useState<string>('');
  
  const [showContactCustomerDialog, setShowContactCustomerDialog] = useState(false);
  const [contactMethod, setContactMethod] = useState<'phone' | 'sms' | 'whatsapp' | 'email'>('phone');
  const [contactMessage, setContactMessage] = useState<string>('');
  
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

  // ============================================================================
  // NEW HANDLER FUNCTIONS FOR ENHANCED ORDER MANAGEMENT
  // ============================================================================

  const handlePutOnHold = async () => {
    if (!selectedOrder || !holdReason.trim()) return;

    try {
      await orderService.putOnHold(selectedOrder.id, holdReason.trim(), holdNotes.trim() || undefined);
      setSnackbar({ open: true, message: 'Order put on hold successfully', severity: 'success' });
      setShowHoldDialog(false);
      setHoldReason('');
      setHoldNotes('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to put order on hold', severity: 'error' });
    }
  };

  const handleReleaseHold = async () => {
    if (!selectedOrder) return;

    try {
      await orderService.releaseHold(selectedOrder.id);
      setSnackbar({ open: true, message: 'Order hold released successfully', severity: 'success' });
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to release hold', severity: 'error' });
    }
  };

  const handleMarkReadyForPickup = async () => {
    if (!selectedOrder) return;

    try {
      await orderService.markReadyForPickup(selectedOrder.id);
      setSnackbar({ open: true, message: 'Order marked as ready for pickup', severity: 'success' });
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to mark order ready', severity: 'error' });
    }
  };

  const handleRecordDeliveryAttempt = async () => {
    if (!selectedOrder || !deliveryAttemptReason.trim()) return;

    try {
      await orderService.recordDeliveryAttempt(
        selectedOrder.id,
        deliveryAttemptReason.trim(),
        deliveryAttemptNotes.trim() || undefined
      );
      setSnackbar({ open: true, message: 'Delivery attempt recorded successfully', severity: 'success' });
      setShowDeliveryAttemptDialog(false);
      setDeliveryAttemptReason('');
      setDeliveryAttemptNotes('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to record delivery attempt', severity: 'error' });
    }
  };

  const handleRetryDelivery = async () => {
    if (!selectedOrder) return;

    try {
      await orderService.retryDelivery(
        selectedOrder.id,
        retryDeliveryTime || undefined,
        selectedDeliveryPerson || undefined
      );
      setSnackbar({ open: true, message: 'Delivery retry scheduled successfully', severity: 'success' });
      setShowRetryDeliveryDialog(false);
      setRetryDeliveryTime('');
      setSelectedDeliveryPerson('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to retry delivery', severity: 'error' });
    }
  };

  const handleApproveReturn = async () => {
    if (!selectedOrder) return;

    try {
      await orderService.approveReturn(selectedOrder.id, approveReturnNotes.trim() || undefined, restockItems);
      setSnackbar({ open: true, message: 'Return approved successfully', severity: 'success' });
      setShowApproveReturnDialog(false);
      setApproveReturnNotes('');
      setRestockItems(true);
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to approve return', severity: 'error' });
    }
  };

  const handleRejectReturn = async () => {
    if (!selectedOrder || !rejectReturnReason.trim()) return;

    try {
      await orderService.rejectReturn(selectedOrder.id, rejectReturnReason.trim());
      setSnackbar({ open: true, message: 'Return rejected successfully', severity: 'success' });
      setShowRejectReturnDialog(false);
      setRejectReturnReason('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to reject return', severity: 'error' });
    }
  };

  const handleInitiateRefund = async () => {
    if (!selectedOrder) return;

    try {
      const amount = refundAmount ? Number(refundAmount) * 100 : undefined; // Convert to paise
      await orderService.initiateRefund(selectedOrder.id, amount);
      setSnackbar({ open: true, message: 'Refund initiated successfully', severity: 'success' });
      setShowRefundDialog(false);
      setRefundAmount('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to initiate refund', severity: 'error' });
    }
  };

  const handleCompleteRefund = async () => {
    if (!selectedOrder || !refundReference.trim()) return;

    try {
      await orderService.completeRefund(selectedOrder.id, refundReference.trim());
      setSnackbar({ open: true, message: 'Refund completed successfully', severity: 'success' });
      setShowRefundDialog(false);
      setRefundReference('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to complete refund', severity: 'error' });
    }
  };

  const handleContactCustomer = async () => {
    if (!selectedOrder || !contactMessage.trim()) return;

    try {
      await orderService.contactCustomer(selectedOrder.id, contactMethod, contactMessage.trim());
      setSnackbar({ open: true, message: 'Customer contact logged successfully', severity: 'success' });
      setShowContactCustomerDialog(false);
      setContactMessage('');
      dispatch(fetchOrderById(selectedOrder.id));
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to log customer contact', severity: 'error' });
    }
  };

  const getValidTransitions = (currentStatus: OrderStatus): OrderStatus[] => {
    return VALID_TRANSITIONS[currentStatus] || [];
  };

  // Helper function for cancellation
  const canCancelOrder = (status: OrderStatus): boolean => {
    return canCancelOrderUtil(status);
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
                label={getOrderStatusLabel(selectedOrder.status)}
                color={getOrderStatusColor(selectedOrder.status)}
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
                              {getOrderStatusLabel(status)}
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
                            {entry.actionType === 'payment_status_change' && `Payment status changed from ${entry.oldValue} to ${entry.newValue}`}
                            {entry.actionType === 'delivery_assignment' && 'Assigned to delivery person'}
                            {entry.actionType === 'delivery_attempt' && `Delivery attempt: ${entry.reason}`}
                            {entry.actionType === 'on_hold' && `Order put on hold: ${entry.reason}`}
                            {entry.actionType === 'hold_released' && 'Hold released'}
                            {entry.actionType === 'cancellation' && `Order cancelled: ${entry.reason}`}
                            {entry.actionType === 'return_request' && `Return requested: ${entry.reason}`}
                            {entry.actionType === 'return_approval' && 'Return approved'}
                            {entry.actionType === 'return_rejection' && `Return rejected: ${entry.reason}`}
                            {entry.actionType === 'return_pickup' && 'Return pickup scheduled'}
                            {entry.actionType === 'return_complete' && 'Return completed'}
                            {entry.actionType === 'refund_initiated' && 'Refund initiated'}
                            {entry.actionType === 'refund_completed' && 'Refund completed'}
                            {entry.actionType === 'customer_contact' && `Customer contacted: ${entry.note}`}
                            {entry.actionType === 'item_substitution' && `Item substitution: ${entry.note}`}
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

        {/* Dialog Actions - Production-Ready Status-Specific Actions */}
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={handleClose} disabled={isActionInProgress()}>
            Close
          </Button>
          
          {/* Status-specific action buttons */}
          {selectedOrder.status === 'confirmed' && (
            <>
              <Button variant="contained" onClick={() => handleUpdateStatus()} disabled={isActionInProgress()}>
                Start Preparing
              </Button>
              <Button variant="outlined" onClick={() => setShowHoldDialog(true)} disabled={isActionInProgress()}>
                Put on Hold
              </Button>
            </>
          )}

          {selectedOrder.status === 'on_hold' && (
            <Button variant="contained" color="success" onClick={handleReleaseHold} disabled={isActionInProgress()}>
              Release Hold & Continue
            </Button>
          )}

          {selectedOrder.status === 'preparing' && (
            <>
              <Button variant="contained" onClick={handleMarkReadyForPickup} disabled={isActionInProgress()}>
                Mark Ready for Pickup
              </Button>
              <Button variant="outlined" onClick={() => setShowHoldDialog(true)} disabled={isActionInProgress()}>
                Put on Hold
              </Button>
            </>
          )}

          {selectedOrder.status === 'out_for_delivery' && (
            <>
              <Button variant="outlined" onClick={() => setShowDeliveryAttemptDialog(true)} disabled={isActionInProgress()}>
                Record Delivery Attempt
              </Button>
              <Button variant="outlined" startIcon={<PhoneIcon />} onClick={() => setShowContactCustomerDialog(true)} disabled={isActionInProgress()}>
                Contact Customer
              </Button>
            </>
          )}

          {selectedOrder.status === 'delivery_attempted' && (
            <>
              <Button variant="contained" onClick={() => setShowRetryDeliveryDialog(true)} disabled={isActionInProgress()}>
                Retry Delivery
              </Button>
              <Button variant="outlined" startIcon={<PhoneIcon />} onClick={() => setShowContactCustomerDialog(true)} disabled={isActionInProgress()}>
                Contact Customer
              </Button>
            </>
          )}

          {selectedOrder.status === 'return_requested' && (
            <>
              <Button variant="contained" color="success" onClick={() => setShowApproveReturnDialog(true)} disabled={isActionInProgress()}>
                Approve Return
              </Button>
              <Button variant="outlined" color="error" onClick={() => setShowRejectReturnDialog(true)} disabled={isActionInProgress()}>
                Reject Return
              </Button>
            </>
          )}

          {selectedOrder.status === 'returned' && (
            <Button variant="contained" onClick={() => setShowRefundDialog(true)} disabled={isActionInProgress()}>
              Initiate Refund
            </Button>
          )}

          {selectedOrder.status === 'refund_pending' && (
            <Button variant="contained" color="success" onClick={() => setShowRefundDialog(true)} disabled={isActionInProgress()}>
              Mark Refund Complete
            </Button>
          )}

          {/* Cancel button - available for most statuses */}
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

      {/* Hold Order Dialog */}
      <Dialog open={showHoldDialog} onClose={() => setShowHoldDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Put Order on Hold</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Hold Reason</InputLabel>
            <Select
              value={holdReason}
              label="Hold Reason"
              onChange={(e: SelectChangeEvent) => setHoldReason(e.target.value)}
            >
              <MenuItem value="payment_verification">Payment Verification Required</MenuItem>
              <MenuItem value="address_verification">Address Verification Required</MenuItem>
              <MenuItem value="inventory_check">Inventory Check</MenuItem>
              <MenuItem value="customer_request">Customer Request</MenuItem>
              <MenuItem value="quality_check">Quality Check</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes (Optional)"
            placeholder="Add any additional notes..."
            value={holdNotes}
            onChange={(e) => setHoldNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHoldDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handlePutOnHold}
            disabled={!holdReason.trim()}
          >
            Put on Hold
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Attempt Dialog */}
      <Dialog open={showDeliveryAttemptDialog} onClose={() => setShowDeliveryAttemptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Delivery Attempt</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Failure Reason</InputLabel>
            <Select
              value={deliveryAttemptReason}
              label="Failure Reason"
              onChange={(e: SelectChangeEvent) => setDeliveryAttemptReason(e.target.value)}
            >
              <MenuItem value="customer_not_available">Customer Not Available</MenuItem>
              <MenuItem value="wrong_address">Wrong Address</MenuItem>
              <MenuItem value="customer_refused">Customer Refused</MenuItem>
              <MenuItem value="address_not_found">Address Not Found</MenuItem>
              <MenuItem value="customer_rescheduled">Customer Requested Reschedule</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes (Optional)"
            placeholder="Add any additional details..."
            value={deliveryAttemptNotes}
            onChange={(e) => setDeliveryAttemptNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeliveryAttemptDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRecordDeliveryAttempt}
            disabled={!deliveryAttemptReason.trim()}
          >
            Record Attempt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Retry Delivery Dialog */}
      <Dialog open={showRetryDeliveryDialog} onClose={() => setShowRetryDeliveryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Retry Delivery</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="datetime-local"
            label="New Delivery Time (Optional)"
            value={retryDeliveryTime}
            onChange={(e) => setRetryDeliveryTime(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth>
            <InputLabel>Reassign Delivery Person (Optional)</InputLabel>
            <Select
              value={selectedDeliveryPerson}
              label="Reassign Delivery Person (Optional)"
              onChange={(e: SelectChangeEvent) => setSelectedDeliveryPerson(e.target.value)}
            >
              <MenuItem value="">Keep Current Assignment</MenuItem>
              {availableDeliveryPersonnel.map((person) => (
                <MenuItem key={person.id} value={person.id}>
                  {person.name} - {person.mobileNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRetryDeliveryDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRetryDelivery}>
            Retry Delivery
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Return Dialog */}
      <Dialog open={showApproveReturnDialog} onClose={() => setShowApproveReturnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Return Request</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            Approving this return will allow the customer to schedule a pickup.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            placeholder="Add any notes about the return approval..."
            value={approveReturnNotes}
            onChange={(e) => setApproveReturnNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="checkbox"
              id="restockItems"
              checked={restockItems}
              onChange={(e) => setRestockItems(e.target.checked)}
            />
            <label htmlFor="restockItems">
              <Typography variant="body2">Restock items after return</Typography>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveReturnDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApproveReturn}>
            Approve Return
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Return Dialog */}
      <Dialog open={showRejectReturnDialog} onClose={() => setShowRejectReturnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Return Request</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            Please provide a clear reason for rejecting this return request.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            placeholder="Explain why the return is being rejected..."
            value={rejectReturnReason}
            onChange={(e) => setRejectReturnReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectReturnDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectReturn}
            disabled={!rejectReturnReason.trim()}
          >
            Reject Return
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onClose={() => setShowRefundDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedOrder?.status === 'refund_pending' ? 'Complete Refund' : 'Initiate Refund'}
        </DialogTitle>
        <DialogContent>
          {selectedOrder?.status === 'returned' ? (
            <>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                Total order amount: {selectedOrder ? formatCurrency(selectedOrder.totalAmount) : ''}
              </Alert>
              <TextField
                fullWidth
                type="number"
                label="Refund Amount (Optional)"
                placeholder="Leave empty for full refund"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value ? Number(e.target.value) : '')}
                helperText="Enter amount in rupees. Leave empty to refund full amount."
                sx={{ mb: 2 }}
              />
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                Mark the refund as completed once the payment has been processed.
              </Alert>
              <TextField
                fullWidth
                label="Refund Reference/Transaction ID"
                placeholder="Enter refund transaction reference..."
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRefundDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={selectedOrder?.status === 'refund_pending' ? handleCompleteRefund : handleInitiateRefund}
            disabled={selectedOrder?.status === 'refund_pending' && !refundReference.trim()}
          >
            {selectedOrder?.status === 'refund_pending' ? 'Complete Refund' : 'Initiate Refund'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Customer Dialog */}
      <Dialog open={showContactCustomerDialog} onClose={() => setShowContactCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contact Customer</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Contact Method</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(['phone', 'sms', 'whatsapp', 'email'] as const).map((method) => (
                <Button
                  key={method}
                  variant={contactMethod === method ? 'contained' : 'outlined'}
                  onClick={() => setContactMethod(method)}
                  size="small"
                >
                  {method.toUpperCase()}
                </Button>
              ))}
            </Box>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message/Notes"
            placeholder="Describe the conversation or message sent..."
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowContactCustomerDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleContactCustomer}
            disabled={!contactMessage.trim()}
          >
            Log Contact
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
