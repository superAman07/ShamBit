/**
 * Promotion Form Dialog
 * Dialog for creating and editing promotions
 */

import { useEffect, useState } from 'react'
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
  InputAdornment,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  createPromotion,
  updatePromotion,
  fetchPromotion,
  fetchPromotions,
  clearSelectedPromotion,
} from '@/store/slices/promotionSlice'
import { PromotionFormData } from '@/types/promotion'

interface PromotionFormDialogProps {
  open: boolean
  onClose: () => void
  promotionId: string | null
}

export const PromotionFormDialog = ({ open, onClose, promotionId }: PromotionFormDialogProps) => {
  const dispatch = useAppDispatch()
  const { selectedPromotion, loading, filters } = useAppSelector((state) => state.promotion)

  const [formData, setFormData] = useState<PromotionFormData>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: undefined,
    maxDiscountAmount: undefined,
    usageLimit: undefined,
    perUserLimit: undefined,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (promotionId && open) {
      dispatch(fetchPromotion(promotionId))
    } else if (!promotionId && open) {
      dispatch(clearSelectedPromotion())
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderValue: undefined,
        maxDiscountAmount: undefined,
        usageLimit: undefined,
        perUserLimit: undefined,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      })
      setErrors({})
    }
  }, [promotionId, open, dispatch])

  useEffect(() => {
    if (selectedPromotion && promotionId) {
      setFormData({
        code: selectedPromotion.code,
        description: selectedPromotion.description,
        discountType: selectedPromotion.discountType,
        discountValue: selectedPromotion.discountValue,
        minOrderValue: selectedPromotion.minOrderValue,
        maxDiscountAmount: selectedPromotion.maxDiscountAmount,
        usageLimit: selectedPromotion.usageLimit,
        perUserLimit: selectedPromotion.perUserLimit,
        startDate: selectedPromotion.startDate.split('T')[0],
        endDate: selectedPromotion.endDate.split('T')[0],
        isActive: selectedPromotion.isActive,
      })
    }
  }, [selectedPromotion, promotionId])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required'
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters and numbers'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be greater than 0'
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentage discount cannot exceed 100%'
    }

    if (formData.minOrderValue && formData.minOrderValue < 0) {
      newErrors.minOrderValue = 'Minimum order value cannot be negative'
    }

    if (formData.maxDiscountAmount && formData.maxDiscountAmount < 0) {
      newErrors.maxDiscountAmount = 'Maximum discount amount cannot be negative'
    }

    if (formData.usageLimit && formData.usageLimit < 1) {
      newErrors.usageLimit = 'Usage limit must be at least 1'
    }

    if (formData.perUserLimit && formData.perUserLimit < 1) {
      newErrors.perUserLimit = 'Per user limit must be at least 1'
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      if (promotionId) {
        await dispatch(updatePromotion({ id: promotionId, data: formData })).unwrap()
      } else {
        await dispatch(createPromotion(formData)).unwrap()
      }
      dispatch(fetchPromotions(filters))
      onClose()
    } catch (error) {
      console.error('Failed to save promotion:', error)
    }
  }

  const handleChange = (field: keyof PromotionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{promotionId ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Promotion Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              error={!!errors.code}
              helperText={errors.code || 'Use uppercase letters and numbers only'}
              disabled={!!promotionId}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Discount Type</InputLabel>
              <Select
                value={formData.discountType}
                label="Discount Type"
                onChange={(e) => handleChange('discountType', e.target.value)}
              >
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed Amount</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Discount Value"
              type="number"
              value={formData.discountValue}
              onChange={(e) => handleChange('discountValue', parseFloat(e.target.value) || 0)}
              error={!!errors.discountValue}
              helperText={errors.discountValue}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {formData.discountType === 'percentage' ? '%' : '₹'}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Minimum Order Value"
              type="number"
              value={formData.minOrderValue || ''}
              onChange={(e) =>
                handleChange('minOrderValue', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              error={!!errors.minOrderValue}
              helperText={errors.minOrderValue || 'Optional'}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
          {formData.discountType === 'percentage' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Discount Amount"
                type="number"
                value={formData.maxDiscountAmount || ''}
                onChange={(e) =>
                  handleChange('maxDiscountAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                error={!!errors.maxDiscountAmount}
                helperText={errors.maxDiscountAmount || 'Optional cap for percentage discounts'}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Total Usage Limit"
              type="number"
              value={formData.usageLimit || ''}
              onChange={(e) =>
                handleChange('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)
              }
              error={!!errors.usageLimit}
              helperText={errors.usageLimit || 'Optional'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Per User Limit"
              type="number"
              value={formData.perUserLimit || ''}
              onChange={(e) =>
                handleChange('perUserLimit', e.target.value ? parseInt(e.target.value) : undefined)
              }
              error={!!errors.perUserLimit}
              helperText={errors.perUserLimit || 'Optional'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              error={!!errors.endDate}
              helperText={errors.endDate}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
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
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {promotionId ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
