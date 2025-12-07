import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import { RecentOrder, OrderStatus } from '@/types/dashboard';
import { formatCurrency, formatDate, capitalizeWords } from '@/utils/formatters';
import { DASHBOARD_CONFIG, OrderStatusColor } from '@/config/dashboard.config';

interface RecentOrdersTableProps {
  orders: RecentOrder[];
  loading: boolean;
  error: string | null;
}

const getStatusColor = (status: OrderStatus): OrderStatusColor => {
  const statusUpper = status.toUpperCase().replace(/-/g, '_') as keyof typeof DASHBOARD_CONFIG.ORDER_STATUS_COLORS;
  return DASHBOARD_CONFIG.ORDER_STATUS_COLORS[statusUpper] || DASHBOARD_CONFIG.ORDER_STATUS_COLORS.DEFAULT;
};

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders = [], loading, error }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Orders
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : orders.length === 0 ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No orders found
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={capitalizeWords(order.status)}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
