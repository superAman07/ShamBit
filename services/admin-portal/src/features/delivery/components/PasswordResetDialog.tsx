import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ContentCopy,
  Refresh,
} from '@mui/icons-material';
import { DeliveryPersonnel } from '@/types/delivery';
import { getDeliveryAppDisplayUrl } from '@/utils/deliveryAppUrl';

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  personnel: DeliveryPersonnel | null;
  loading?: boolean;
  error?: string | null;
}

export const PasswordResetDialog: React.FC<PasswordResetDialogProps> = ({
  open,
  onClose,
  onSubmit,
  personnel,
  loading = false,
  error = null,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      // Generate a default password when dialog opens
      generatePassword();
    } else {
      // Reset state when dialog closes
      setPassword('');
      setPasswordError('');
      setCopied(false);
      setShowPassword(false);
    }
  }, [open]);

  const generatePassword = () => {
    // Generate a secure random password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setPasswordError('');
    setCopied(false);
  };

  const validatePassword = (pwd: string) => {
    if (!pwd) {
      return 'Password is required';
    }
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (pwd.length > 50) {
      return 'Password must be less than 50 characters';
    }
    return '';
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(validatePassword(value));
    setCopied(false);
  };

  const handleSubmit = async () => {
    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }

    await onSubmit(password);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Reset Password - {personnel?.name}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Mobile Number: {personnel?.mobileNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set a new password for this delivery personnel. They will use this password to log into the delivery app.
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          error={!!passwordError}
          helperText={passwordError || 'Minimum 6 characters required'}
          sx={{ mb: 2 }}
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
                  onClick={copyToClipboard}
                  edge="end"
                  size="small"
                  color={copied ? 'success' : 'default'}
                  title="Copy password"
                >
                  <ContentCopy />
                </IconButton>
                <IconButton
                  onClick={generatePassword}
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

        {copied && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password copied to clipboard!
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Make sure to share this password securely with the delivery personnel. 
            They will need it to log into the delivery app at{' '}
            <strong>{getDeliveryAppDisplayUrl()}</strong>
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !!passwordError || !password}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};