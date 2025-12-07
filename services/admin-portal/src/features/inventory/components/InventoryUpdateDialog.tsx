/**
 * Inventory Update Dialog
 * Dialog for updating inventory stock levels and thresholds
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
  updateInventory,
  clearSelectedInventory,
} from '@/store/slices/inventorySlice'
import { InventoryUpdateData } from '@/types/inventory'

interface InventoryUpdateDialogProps {
  open: boolean
  onClose: () => void
  productId: string | null
}

export const InventoryUpdateDialog = ({ open, onClose, productId }: InventoryUpdateDialogProps) => {
  const dispatch = useAppDispatch()
  const { selectedInventory, loading, error } = useAppSelector((state) => state.inventory)

  const [formData, setFormData] = useState<InventoryUpdateData>({
    totalStock: 0,
    lowStockThreshold: 10,
    reason: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && productId) {
      dispatch(fetchInventoryByProduct(productId))
    }
  }, [open, productId, dispatch])

  useEffect(() => {
    if (selectedInventory) {
      setFormData({
        totalStock: selectedInventory.totalStock,
        lowStockThreshold: selectedInventory.lowStockThreshold,
        reason: '',
      })
    }
  }, [selectedInventory])

  const handleClose = () => {
    setFormData({
      totalStock: 0,
      lowStockThreshold: 10,
      reason: '',
    })
    setFormErrors({})
    dispatch(clearSelectedInventory())
    onClose()
  }

  const handleInputChange = (field: keyof InventoryUpdateData) => (
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

    if (!formData.totalStock || formData.totalStock < 0) {
      errors.totalStock = 'Total stock must be a positive number'
    }

    if (!formData.lowStockThreshold || formData.lowStockThreshold < 0) {
      errors.lowStockThreshold = 'Low stock threshold must be a positive number'
    }

    if (formData.lowStockThreshold && formData.totalStock && formData.lowStockThreshold > formData.totalStock) {
      errors.lowStockThreshold = 'Threshold cannot be greater than total stock'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !productId) return

    try {
      await dispatch(updateInventory({ 
        productId, 
        data: formData 
      })).unwrap()
      handleClose()
    } catch (error) {
      // Error is handled by the slice
    }
  }

  const stockDifference = selectedInventory 
    ? (formData.totalStock || 0) - selectedInventory.totalStock 
    : 0

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Inventory</DialogTitle>
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
                    Threshold: {selectedInventory.lowStockThreshold}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Form Fields */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total Stock"
                  type="number"
                  value={formData.totalStock || ''}
                  onChange={handleInputChange('totalStock')}
                  error={!!formErrors.totalStock}
                  helperText={formErrors.totalStock}
                  inputProps={{ min: 0 }}
                />
                {stockDifference !== 0 && (
                  <Typography 
                    variant="caption" 
                    color={stockDifference > 0 ? 'success.main' : 'error.main'}
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {stockDifference > 0 ? '+' : ''}{stockDifference} from current stock
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Low Stock Threshold"
                  type="number"
                  value={formData.lowStockThreshold || ''}
                  onChange={handleInputChange('lowStockThreshold')}
                  error={!!formErrors.lowStockThreshold}
                  helperText={formErrors.lowStockThreshold || 'Alert when stock falls below this level'}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Update"
                  multiline
                  rows={3}
                  value={formData.reason || ''}
                  onChange={handleInputChange('reason')}
                  placeholder="Optional: Explain the reason for this inventory update"
                />
              </Grid>
            </Grid>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedInventory}
        >
          {loading ? 'Updating...' : 'Update Inventory'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}