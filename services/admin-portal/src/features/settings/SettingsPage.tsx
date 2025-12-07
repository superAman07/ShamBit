import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  InputAdornment,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import settingsService from '@/services/settingsService';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [taxRate, setTaxRate] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings();

      const taxRateSetting = data.find((s) => s.key === 'tax_rate');
      const deliveryFeeSetting = data.find((s) => s.key === 'delivery_fee');
      const freeDeliveryThresholdSetting = data.find((s) => s.key === 'free_delivery_threshold');

      if (taxRateSetting) setTaxRate(taxRateSetting.value);
      if (deliveryFeeSetting) setDeliveryFee((parseFloat(deliveryFeeSetting.value) / 100).toString());
      if (freeDeliveryThresholdSetting) setFreeDeliveryThreshold((parseFloat(freeDeliveryThresholdSetting.value) / 100).toString());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await settingsService.updateSetting('tax_rate', {
        value: taxRate,
        valueType: 'number',
      });

      await settingsService.updateSetting('delivery_fee', {
        value: (parseFloat(deliveryFee) * 100).toString(),
        valueType: 'number',
      });

      await settingsService.updateSetting('free_delivery_threshold', {
        value: (parseFloat(freeDeliveryThreshold) * 100).toString(),
        valueType: 'number',
      });

      setSuccess('Settings updated successfully');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Order & Delivery Settings
            </Typography>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Tax Rate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="GST percentage applied to orders"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Delivery Fee"
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Standard delivery charge"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Free Delivery Threshold"
                  type="number"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Minimum order for free delivery (0 to disable)"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outlined" onClick={loadSettings} disabled={saving}>
                Reset
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
