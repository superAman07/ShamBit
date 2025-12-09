import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Box,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import { OrderFilters, OrderStatus, PaymentStatus, PaymentMethod } from '@/types/order';

interface OrderFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
  currentFilters: OrderFilters;
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'payment_processing',
  'payment_failed',
  'confirmed',
  'on_hold',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivery_attempted',
  'delivered',
  'return_requested',
  'return_approved',
  'return_rejected',
  'return_pickup_scheduled',
  'return_in_transit',
  'returned',
  'refund_pending',
  'refunded',
  'canceled',
  'failed',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
  'refund_initiated',
  'refund_processing',
  'refund_completed',
  'refund_failed',
  'partially_refunded',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'card',
  'upi',
  'cod',
];

export const OrderFiltersDialog: React.FC<OrderFiltersDialogProps> = ({
  open,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<OrderFilters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, open]);

  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setFilters(prev => ({
      ...prev,
      status: value as OrderStatus[],
    }));
  };

  const handlePaymentStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setFilters(prev => ({
      ...prev,
      paymentStatus: value as PaymentStatus[],
    }));
  };

  const handlePaymentMethodChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setFilters(prev => ({
      ...prev,
      paymentMethod: value as PaymentMethod[],
    }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleNumberChange = (field: 'minValue' | 'maxValue') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFilters(prev => ({
      ...prev,
      [field]: value ? parseFloat(value) : undefined,
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: event.target.value || undefined,
    }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleClear = () => {
    setFilters({});
  };

  const renderMultiSelect = (
    label: string,
    value: string[] | undefined,
    options: string[],
    onChange: (event: SelectChangeEvent<string[]>) => void
  ) => (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value || []}
        onChange={onChange}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(selected as string[]).map((value) => (
              <Chip key={value} label={value.replace('_', ' ').toUpperCase()} size="small" />
            ))}
          </Box>
        )}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option.replace('_', ' ').toUpperCase()}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Filter Orders</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Search */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search (Order Number or Customer Name)"
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="Enter order number or customer name"
            />
          </Grid>

          {/* Order Status */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Order Status',
              filters.status,
              ORDER_STATUSES,
              handleStatusChange
            )}
          </Grid>

          {/* Payment Status */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Payment Status',
              filters.paymentStatus,
              PAYMENT_STATUSES,
              handlePaymentStatusChange
            )}
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Payment Method',
              filters.paymentMethod,
              PAYMENT_METHODS,
              handlePaymentMethodChange
            )}
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={filters.startDate || ''}
              onChange={handleDateChange('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={filters.endDate || ''}
              onChange={handleDateChange('endDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Order Value Range */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Minimum Order Value"
              type="number"
              value={filters.minValue || ''}
              onChange={handleNumberChange('minValue')}
              InputProps={{
                startAdornment: '₹',
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maximum Order Value"
              type="number"
              value={filters.maxValue || ''}
              onChange={handleNumberChange('maxValue')}
              InputProps={{
                startAdornment: '₹',
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="inherit">
          Clear All
        </Button>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};