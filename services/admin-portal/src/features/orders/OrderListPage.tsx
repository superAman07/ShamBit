import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  LocalShipping as DeliveryIcon,
  Cancel as CancelIcon,
  Undo as ReturnIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  fetchOrders,
  setFilters,
  setPage,
  setPageSize,
  setSorting,
  clearErrors,
} from '@/store/slices/orderSlice';
import { OrderStatus, PaymentStatus, OrderFilters } from '@/types/order';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { OrderDetailsDialog } from './components/OrderDetailsDialog';
import { OrderFiltersDialog } from './components/OrderFiltersDialog';

const ORDER_STATUS_COLORS: Record<OrderStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  payment_processing: 'info',
  payment_failed: 'error',
  confirmed: 'primary',
  on_hold: 'warning',
  preparing: 'info',
  ready_for_pickup: 'info',
  out_for_delivery: 'secondary',
  delivery_attempted: 'warning',
  delivered: 'success',
  return_requested: 'warning',
  return_approved: 'info',
  return_rejected: 'error',
  return_pickup_scheduled: 'info',
  return_in_transit: 'secondary',
  returned: 'default',
  refund_pending: 'warning',
  refunded: 'info',
  canceled: 'error',
  failed: 'error',
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  refund_initiated: 'warning',
  refund_processing: 'info',
  refund_completed: 'success',
  refund_failed: 'error',
  partially_refunded: 'info',
};

export const OrderListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    orders,
    totalOrders,
    currentPage,
    pageSize,
    filters,
    sortBy,
    sortOrder,
    loading,
    error,
  } = useSelector((state: RootState) => state.orders);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders({
      page: currentPage,
      pageSize,
      filters,
      sortBy,
      sortOrder,
    }));
  }, [dispatch, currentPage, pageSize, filters, sortBy, sortOrder]);

  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    dispatch(setPage(newPage + 1)); // MUI uses 0-based indexing
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setPageSize(parseInt(event.target.value, 10)));
  };

  const handleSort = (field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch(setSorting({ sortBy: field, sortOrder: newSortOrder }));
  };

  const handleApplyFilters = (newFilters: OrderFilters) => {
    dispatch(setFilters(newFilters));
    setFiltersDialogOpen(false);
  };

  const handleClearFilters = () => {
    dispatch(setFilters({}));
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof OrderFilters];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : value !== '');
  });

  const getStatusActions = (order: any) => {
    const actions = [];

    // View details - always available
    actions.push(
      <Tooltip key="view" title="View Details">
        <IconButton
          size="small"
          onClick={() => setSelectedOrderId(order.id)}
        >
          <ViewIcon />
        </IconButton>
      </Tooltip>
    );

    // Status-specific actions
    if (order.status === 'confirmed' || order.status === 'preparing') {
      actions.push(
        <Tooltip key="assign" title="Assign to Delivery">
          <IconButton
            size="small"
            onClick={() => setSelectedOrderId(order.id)}
          >
            <DeliveryIcon />
          </IconButton>
        </Tooltip>
      );
    }

    if (['confirmed', 'preparing'].includes(order.status)) {
      actions.push(
        <Tooltip key="cancel" title="Cancel Order">
          <IconButton
            size="small"
            color="error"
            onClick={() => setSelectedOrderId(order.id)}
          >
            <CancelIcon />
          </IconButton>
        </Tooltip>
      );
    }

    if (order.status === 'delivered') {
      actions.push(
        <Tooltip key="return" title="Process Return">
          <IconButton
            size="small"
            color="warning"
            onClick={() => setSelectedOrderId(order.id)}
          >
            <ReturnIcon />
          </IconButton>
        </Tooltip>
      );
    }

    return actions;
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Order Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFiltersDialogOpen(true)}
              color={hasActiveFilters ? 'primary' : 'inherit'}
            >
              Filters {hasActiveFilters && `(${Object.keys(filters).length})`}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Orders
                </Typography>
                <Typography variant="h5">
                  {(totalOrders || 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Orders
                </Typography>
                <Typography variant="h5">
                  {(orders || []).filter(o => ['pending', 'payment_processing', 'confirmed'].includes(o.status)).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h5">
                  {(orders || []).filter(o => ['preparing', 'out_for_delivery'].includes(o.status)).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Delivered Today
                </Typography>
                <Typography variant="h5">
                  {(orders || []).filter(o => o.status === 'delivered' && 
                    new Date(o.deliveredAt || '').toDateString() === new Date().toDateString()).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Orders Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('orderNumber')}
                  >
                    Order Number
                  </TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total Amount
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('createdAt')}
                  >
                    Order Date
                  </TableCell>
                  <TableCell>Delivery</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.orders ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : error.orders ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'error.main' }}>
                      Error: {error.orders}
                    </TableCell>
                  </TableRow>
                ) : (orders || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  (orders || []).map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {order.orderNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {order.customer?.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {order.customer?.mobileNumber || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.replace('_', ' ').toUpperCase()}
                          color={ORDER_STATUS_COLORS[order.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip
                            label={order.paymentStatus.toUpperCase()}
                            color={PAYMENT_STATUS_COLORS[order.paymentStatus]}
                            size="small"
                          />
                          <Typography variant="caption" display="block" color="textSecondary">
                            {order.paymentMethod.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(order.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(order.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {order.deliveryPersonnel ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {order.deliveryPersonnel.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {order.deliveryPersonnel.mobileNumber}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {getStatusActions(order)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalOrders}
            page={currentPage - 1} // MUI uses 0-based indexing
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Paper>

        {/* Dialogs */}
        <OrderFiltersDialog
          open={filtersDialogOpen}
          onClose={() => setFiltersDialogOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={filters}
        />

        {selectedOrderId && (
          <OrderDetailsDialog
            orderId={selectedOrderId}
            open={!!selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
      </Box>
    </DashboardLayout>
  );
};