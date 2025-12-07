/**
 * Inventory Adjustment Page
 * Add or adjust inventory for products
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  IconButton,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { apiService } from '@/services/api'

interface AdjustmentFormData {
  productId: string
  adjustmentType: 'add' | 'set' | 'reduce'
  quantity: number
  reason: string
}

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  currentStock?: number
}

const InventoryAdjustmentPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const productIdFromUrl = searchParams.get('productId')

  const {
    control,
    handleSubmit: handleFormSubmit,
    watch,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    defaultValues: {
      productId: productIdFromUrl || '',
      adjustmentType: 'add',
      quantity: 0,
      reason: '',
    },
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const [currentStock, setCurrentStock] = useState<number | null>(null)

  const selectedProductId = watch('productId')
  const adjustmentType = watch('adjustmentType')
  const quantity = watch('quantity')

  // Load products once on mount
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true)
      try {
        const response = await apiService.getAxiosInstance().get('/products', {
          params: {
            page: 1,
            pageSize: 100,
            isActive: true,
          },
        })
        setProducts(response.data.data || [])
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        setProductsLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Load current stock when product is selected
  useEffect(() => {
    if (!selectedProductId) {
      setCurrentStock(null)
      return
    }

    const loadCurrentStock = async () => {
      setLoading(true)
      try {
        const response = await apiService.getAxiosInstance().get('/inventory', {
          params: { productId: selectedProductId },
        })

        if (response.data.inventory && response.data.inventory.length > 0) {
          const inventory = response.data.inventory[0]
          setCurrentStock(inventory.totalStock || 0)
        } else {
          setCurrentStock(0)
        }
      } catch (error: any) {
        console.error('Failed to load current stock:', error)
        setCurrentStock(0)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentStock()
  }, [selectedProductId])

  const calculateNewStock = (): number | null => {
    if (currentStock === null || !quantity) return null

    switch (adjustmentType) {
      case 'add':
        return currentStock + quantity
      case 'reduce':
        return Math.max(0, currentStock - quantity)
      case 'set':
        return quantity
      default:
        return currentStock
    }
  }

  const handleSubmit = async (data: AdjustmentFormData) => {
    if (!data.productId) {
      setError('Please select a product')
      return
    }

    if (!data.quantity || data.quantity <= 0) {
      setError('Please enter a valid quantity')
      return
    }

    if (!data.reason || data.reason.trim().length === 0) {
      setError('Please provide a reason for this adjustment')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const newStock = calculateNewStock()
      if (newStock === null || newStock < 0) {
        throw new Error('Invalid stock calculation')
      }

      // Check if inventory exists
      if (currentStock === 0 && adjustmentType !== 'add' && adjustmentType !== 'set') {
        // Create new inventory
        await apiService.post('/inventory', {
          productId: data.productId,
          totalStock: newStock,
          thresholdStock: 10,
        })
      } else {
        // Update existing inventory
        await apiService.put(`/inventory/${data.productId}`, {
          totalStock: newStock,
          reason: data.reason,
        })
      }

      setSuccess(`Inventory adjusted successfully! New stock: ${newStock}`)

      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/inventory')
      }, 1500)
    } catch (error: any) {
      console.error('Failed to adjust inventory:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to adjust inventory'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const newStock = calculateNewStock()

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate('/inventory')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Adjust Inventory
          </Typography>
        </Box>

        {/* Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleFormSubmit(handleSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {/* Selection Card */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Select Product
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="productId"
                        control={control}
                        rules={{ required: 'Product is required' }}
                        render={({ field: { onChange, value } }) => (
                          <Autocomplete
                            options={products}
                            getOptionLabel={(option) =>
                              `${option.name} (SKU: ${option.sku || 'N/A'})`
                            }
                            value={products.find((p) => p.id === value) || null}
                            onChange={(_, newValue) => {
                              onChange(newValue?.id || '')
                            }}
                            loading={productsLoading}
                            disabled={!!productIdFromUrl}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Product"
                                error={!!errors.productId}
                                helperText={errors.productId?.message}
                                required
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {productsLoading ? (
                                        <CircularProgress color="inherit" size={20} />
                                      ) : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Current Stock Info */}
              {selectedProduct && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Current Stock Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Product
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedProduct.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SKU: {selectedProduct.sku || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Current Stock
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {loading ? (
                            <CircularProgress size={24} />
                          ) : (
                            `${currentStock ?? 0} units`
                          )}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Adjustment Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Adjustment Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="adjustmentType"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Adjustment Type</InputLabel>
                            <Select {...field} label="Adjustment Type">
                              <MenuItem value="add">Add Stock (Restock)</MenuItem>
                              <MenuItem value="reduce">Reduce Stock (Damage/Loss)</MenuItem>
                              <MenuItem value="set">Set Stock (Correction)</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="quantity"
                        control={control}
                        rules={{
                          required: 'Quantity is required',
                          min: { value: 1, message: 'Quantity must be at least 1' },
                        }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label={
                              adjustmentType === 'set'
                                ? 'New Total Stock'
                                : 'Quantity to ' +
                                  (adjustmentType === 'add' ? 'Add' : 'Reduce')
                            }
                            type="number"
                            error={!!errors.quantity}
                            helperText={errors.quantity?.message}
                            required
                            inputProps={{ min: 1, step: 1 }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name="reason"
                        control={control}
                        rules={{ required: 'Reason is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Reason for Adjustment"
                            multiline
                            rows={3}
                            error={!!errors.reason}
                            helperText={errors.reason?.message}
                            required
                            placeholder="e.g., Weekly restock, Damaged goods, Stock audit correction"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              {/* Summary Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Adjustment Summary
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Stock
                      </Typography>
                      <Typography variant="h5">
                        {currentStock !== null ? `${currentStock} units` : '-'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Adjustment
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {adjustmentType === 'add' && '+'}
                        {adjustmentType === 'reduce' && '-'}
                        {adjustmentType === 'set' && '→ '}
                        {quantity || 0} units
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        New Stock
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {newStock !== null ? `${newStock} units` : '-'}
                      </Typography>
                    </Box>

                    {newStock !== null && newStock <= 10 && (
                      <Chip
                        label="Low Stock Warning"
                        color="warning"
                        size="small"
                        icon={<span>⚠️</span>}
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={saving || loading || !selectedProductId}
                      startIcon={<SaveIcon />}
                    >
                      {saving ? 'Saving...' : 'Apply Adjustment'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => navigate('/inventory')}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </Box>
    </DashboardLayout>
  )
}

export default InventoryAdjustmentPage
