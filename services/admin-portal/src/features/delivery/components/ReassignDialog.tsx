import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { Delivery, DeliveryPersonnel } from '@/types/delivery';

interface ReassignDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (deliveryId: string, personnelId: string) => Promise<void>;
  delivery: Delivery | null;
  availablePersonnel: DeliveryPersonnel[];
  loading?: boolean;
  error?: string | null;
}

export const ReassignDialog: React.FC<ReassignDialogProps> = ({
  open,
  onClose,
  onSubmit,
  delivery,
  availablePersonnel,
  loading = false,
  error = null,
}) => {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');

  useEffect(() => {
    if (delivery) {
      setSelectedPersonnelId(delivery.deliveryPersonnelId);
    }
  }, [delivery]);

  const handleSubmit = async () => {
    if (!delivery || !selectedPersonnelId) return;
    await onSubmit(delivery.id, selectedPersonnelId);
  };

  if (!delivery) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reassign Delivery</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Order Number
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {delivery.orderNumber}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Current Assignment
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              {delivery.deliveryPersonnel.name}
            </Typography>
            <Chip
              label={delivery.status.replace('_', ' ').toUpperCase()}
              size="small"
              color="primary"
            />
          </Box>
        </Box>

        <FormControl fullWidth>
          <InputLabel>New Delivery Personnel</InputLabel>
          <Select
            value={selectedPersonnelId}
            onChange={(e) => setSelectedPersonnelId(e.target.value)}
            label="New Delivery Personnel"
          >
            {availablePersonnel.map((personnel) => (
              <MenuItem
                key={personnel.id}
                value={personnel.id}
                disabled={personnel.id === delivery.deliveryPersonnelId}
              >
                <Box>
                  <Typography variant="body2">
                    {personnel.name}
                    {personnel.id === delivery.deliveryPersonnelId && ' (Current)'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {personnel.mobileNumber}
                    {personnel.vehicleType && ` • ${personnel.vehicleType}`}
                    {!personnel.isAvailable && ' • Busy'}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedPersonnelId || selectedPersonnelId === delivery.deliveryPersonnelId}
        >
          {loading ? 'Reassigning...' : 'Reassign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
