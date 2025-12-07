/**
 * Restock Dialog
 * Dialog for adding stock to existing inventory
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchInventoryByProduct,
  restockInventory,
  clearSelectedInventory,
} from '@/store/slices/inventorySlice'
import { RestockData } from '@/types/inventory'

interface RestockDialogProps {
  open: boolean
  onClose: () => void
  productId: string | null
}

export const RestockDialog = ({ open, onClose, productId }: RestockDialogProps) => {
  const dispatch = useAppDispatch()
  const { selectedInventory, loading, error } = useAppSelector((state) => state.inventory)

  const [formData, setFormData] = useState<RestockData>({
    quantity: 0,
    reason: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && productId) {
      dispatch(fetchInventoryByProduct(productId))
    }
  }, [open, productId, dispatch])

  const handleClose = () => {
    setFormData({
      quantity: 0,
      reason: '',
    })
    setFormErrors({})
    dispatch(clearSelectedInventory())
    onClose()
  }

  const handleInputChange = (field: keyof RestockData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'reason' ? event.target.value : Number(event.target.value)
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.quantity || formData.quantity <= 0) {
      errors.quantity = 'Quantity must be a positive number'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !productId) return

    try {
      await dispatch(restockInventory({ 
        productId, 
        data: formData 
      })).unwrap()
      handleClose()
    } catch (error) {
      // Error is handled by the slice
    }
  }

  const newTotalStock = selectedInventory 
    ? selectedInventory.totalStock + (formData.quantity || 0)
    : 0

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Restock Inventory</DialogTitle>
      <DialogContent>
        {loading && !selectedInventory ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : selectedInventory ? (
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Product Info */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                {selectedInventory.product?.name}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock: {selectedInventory.totalStock}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Available: {selectedInventory.availableStock}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reserved: {selectedInventory.reservedStock}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Last Restocked: {selectedInventory.lastRestockedAt 
                      ? new Date(selectedInventory.lastRestockedAt).toLocaleDateString()
                      : 'Never'
                    }
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Form Fields */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantity to Add"
                  type="number"
                  value={formData.quantity || ''}
                  onChange={handleInputChange('quantity')}
                  error={!!formErrors.quantity}
                  helperText={formErrors.quantity}
                  inputProps={{ min: 1 }}
                />
                {formData.quantity > 0 && (
                  <Typography 
                    variant="caption" 
                    color="success.main"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    New total stock will be: {newTotalStock}
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Restock"
                  multiline
                  rows={3}
                  value={formData.reason || ''}
                  onChange={handleInputChange('reason')}
                  placeholder="Optional: Explain the reason for this restock (e.g., new shipment, return processing)"
                />
              </Grid>
            </Grid>

            {/* Restock Preview */}
            {formData.quantity > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Restock Summary
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Adding: +{formData.quantity}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      New Total: {newTotalStock}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedInventory || !formData.quantity}
        >
          {loading ? 'Restocking...' : 'Restock'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}