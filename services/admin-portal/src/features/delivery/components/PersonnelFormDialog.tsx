import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
  InputAdornment,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Refresh,
} from '@mui/icons-material';
import { getDeliveryAppDisplayUrl } from '@/utils/deliveryAppUrl';
import { DeliveryPersonnel, VehicleType } from '@/types/delivery';

interface PersonnelFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  personnel?: DeliveryPersonnel | null;
  loading?: boolean;
  error?: string | null;
}

export const PersonnelFormDialog: React.FC<PersonnelFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  personnel,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    vehicleType: '' as VehicleType | '',
    vehicleNumber: '',
    password: '',
    isActive: true,
    isAvailable: true,
  });

  const [showPassword, setShowPassword] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (personnel) {
      setFormData({
        name: personnel.name,
        mobileNumber: personnel.mobileNumber,
        email: personnel.email || '',
        vehicleType: personnel.vehicleType || '',
        vehicleNumber: personnel.vehicleNumber || '',
        password: '', // Don't show existing password
        isActive: personnel.isActive,
        isAvailable: personnel.isAvailable,
      });
    } else {
      // Generate default password for new personnel
      const defaultPassword = generatePassword();
      setFormData({
        name: '',
        mobileNumber: '',
        email: '',
        vehicleType: '',
        vehicleNumber: '',
        password: defaultPassword,
        isActive: true,
        isAvailable: true,
      });
    }
    setFormErrors({});
    setShowPassword(false);
  }, [personnel, open]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.mobileNumber)) {
      errors.mobileNumber = 'Invalid mobile number format';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Only validate password for new personnel
    if (!personnel) {
      if (!formData.password.trim()) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const submitData: any = {
      name: formData.name,
      mobileNumber: formData.mobileNumber,
      isActive: formData.isActive,
      isAvailable: formData.isAvailable,
    };

    if (formData.email) {
      submitData.email = formData.email;
    }
    if (formData.vehicleType) {
      submitData.vehicleType = formData.vehicleType;
    }
    if (formData.vehicleNumber) {
      submitData.vehicleNumber = formData.vehicleNumber;
    }

    // Only include password for new personnel
    if (!personnel && formData.password) {
      submitData.password = formData.password;
    }

    await onSubmit(submitData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {personnel ? 'Edit Delivery Personnel' : 'Add Delivery Personnel'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mobile Number"
              value={formData.mobileNumber}
              onChange={(e) => handleChange('mobileNumber', e.target.value)}
              error={!!formErrors.mobileNumber}
              helperText={formErrors.mobileNumber}
              placeholder="+1234567890"
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
          </Grid>
          {!personnel && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password || 'This password will be used to log into the delivery app'}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <IconButton
                        onClick={() => handleChange('password', generatePassword())}
                        edge="end"
                        size="small"
                        title="Generate new password"
                      >
                        <Refresh />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                The delivery personnel will use this password to log into the delivery app at{' '}
                <strong>{getDeliveryAppDisplayUrl()}</strong>
              </Typography>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                value={formData.vehicleType}
                onChange={(e) => handleChange('vehicleType', e.target.value)}
                label="Vehicle Type"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="bike">Bike</MenuItem>
                <MenuItem value="scooter">Scooter</MenuItem>
                <MenuItem value="bicycle">Bicycle</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vehicle Number"
              value={formData.vehicleNumber}
              onChange={(e) => handleChange('vehicleNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                />
              }
              label="Active"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isAvailable}
                  onChange={(e) => handleChange('isAvailable', e.target.checked)}
                />
              }
              label="Available"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : personnel ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
