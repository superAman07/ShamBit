import React, { useEffect, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchCustomerOrders, setOrdersPage } from '@/store/slices/customerSlice';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface OrdersTabProps {
  customerId: string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ customerId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    customerOrders,
    ordersPage,
    ordersPageSize,
    ordersTotalItems,
    loading,
    error,
  } = useSelector((state: RootState) => state.customers);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadOrders();
  }, [customerId, ordersPage]);

  const loadOrders = () => {
    dispatch(fetchCustomerOrders({
      customerId,
      page: ordersPage,
      pageSize: ordersPageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }));
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    dispatch(setOrdersPage(newPage + 1));
  };

  const handleApplyFilter = () => {
    dispatch(setOrdersPage(1));
    loadOrders();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    dispatch(setOrdersPage(1));
    dispatch(fetchCustomerOrders({
      customerId,
      page: 1,
      pageSize: ordersPageSize,
    }));
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Filter by Date Range
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button variant="contained" onClick={handleApplyFilter} size="small">
            Apply Filter
          </Button>
          <Button variant="outlined" onClick={handleClearFilter} size="small">
            Clear
          </Button>
        </Box>
      </Paper>

      {/* Orders Table */}
      {loading.orders ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error.orders ? (
        <Alert severity="error">{error.orders}</Alert>
      ) : customerOrders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No orders found.
          </Typography>
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order Number</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        underline="hover"
                        color="primary"
                        sx={{ fontWeight: 'medium' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>
                        {order.paymentMethod}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={ordersTotalItems}
            page={ordersPage - 1}
            onPageChange={handlePageChange}
            rowsPerPage={ordersPageSize}
            rowsPerPageOptions={[ordersPageSize]}
          />
        </Paper>
      )}
    </Box>
  );
};
