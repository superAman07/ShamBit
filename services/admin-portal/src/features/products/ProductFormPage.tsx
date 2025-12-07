/**
 * Product Form Page - Optimized with React Hook Form
 * Form for creating and editing products with zero typing lag
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  FormHelperText,
  Autocomplete,
  CircularProgress,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchProduct,
  fetchCategories,
  fetchProducts,
  createProduct,
  updateProduct,
  clearSelectedProduct,
} from '@/store/slices/productSlice'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProductFormData } from '@/types/product'
import { logger } from '@/utils/logger'
import { validateImageFile } from '@/utils/validation'
import { getImageUrl, getPlaceholderImage } from '@/utils/image'
import { apiService } from '@/services/api'

export const ProductFormPage = React.memo(() => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { selectedProduct, categories, loading } = useAppSelector((state) => state.product)
  const isEditMode = !!id

  // React Hook Form setup
  const {
    control,
    handleSubmit: handleFormSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ProductFormData>({
    mode: 'onBlur', // Validate on blur instead of onChange for better performance
    defaultValues: {
      categoryId: '',
      brandId: undefined,
      name: '',
      sku: '',
      barcode: '',
      description: '',
      detailedDescription: '',
      brand: '',
      unitSize: '',
      unitType: '',
      mrp: 0,
      sellingPrice: 0,
      taxPercent: 0,
      discountPercent: 0,
      weight: undefined,
      dimensions: '',
      storageInfo: '',
      ingredients: '',
      nutritionInfo: '',
      shelfLifeDays: undefined,
      searchKeywords: '',
      tags: '',
      isFeatured: false,
      isReturnable: true,
      isSellable: true,
      isActive: true,
    },
  })

  // Dropdown options
  const unitTypes = useMemo(() => [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'l', label: 'Liter (l)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'pack', label: 'Pack' },
    { value: 'box', label: 'Box' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'can', label: 'Can' },
    { value: 'jar', label: 'Jar' },
    { value: 'tube', label: 'Tube' },
    { value: 'sachet', label: 'Sachet' },
  ], [])

  const storageConditions = useMemo(() => [
    { value: 'room_temperature', label: 'Room Temperature (15-25°C)' },
    { value: 'cool_dry', label: 'Cool & Dry Place' },
    { value: 'refrigerated', label: 'Refrigerated (2-8°C)' },
    { value: 'frozen', label: 'Frozen (-18°C or below)' },
    { value: 'avoid_sunlight', label: 'Avoid Direct Sunlight' },
    { value: 'airtight', label: 'Store in Airtight Container' },
    { value: 'humidity_controlled', label: 'Humidity Controlled' },
  ], [])

  const taxRates = useMemo(() => [
    { value: 0, label: '0% - Exempt' },
    { value: 5, label: '5% - Essential Items' },
    { value: 12, label: '12% - Standard Rate' },
    { value: 18, label: '18% - Standard Rate' },
    { value: 28, label: '28% - Luxury Items' },
  ], [])

  const categoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) return []
    const parentCategories = categories.filter(cat => !cat.parentId)
    const childCategories = categories.filter(cat => cat.parentId)
    const options: Array<{ value: string; label: string; disabled?: boolean }> = []
    options.push({ value: '', label: 'Select a category' })
    parentCategories.forEach(parent => {
      options.push({ value: parent.id, label: `📁 ${parent.name}`, disabled: true })
      const children = childCategories.filter(child => child.parentId === parent.id)
      children.forEach(child => {
        options.push({ value: child.id, label: `└─ ${child.name}` })
      })
    })
    return options
  }, [categories])

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandInputValue, setBrandInputValue] = useState('')
  const brandSearchTimeoutRef = useRef<NodeJS.Timeout>()

  const fetchBrands = useCallback(async (searchQuery: string = '') => {
    setBrandsLoading(true)
    try {
      const url = searchQuery ? `/brands?search=${encodeURIComponent(searchQuery)}` : '/brands'
      const response = await apiService.get<Array<{ id: string; name: string }>>(url)
      setBrands(response || [])
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  const debouncedFetchBrands = useCallback((searchQuery: string) => {
    if (brandSearchTimeoutRef.current) {
      clearTimeout(brandSearchTimeoutRef.current)
    }
    brandSearchTimeoutRef.current = setTimeout(() => {
      fetchBrands(searchQuery)
    }, 300)
  }, [fetchBrands])

  useEffect(() => {
    dispatch(fetchCategories())
    fetchBrands() // Load initial brands
    if (isEditMode && id) {
      dispatch(fetchProduct(id))
    }
    return () => {
      dispatch(clearSelectedProduct())
      if (brandSearchTimeoutRef.current) {
        clearTimeout(brandSearchTimeoutRef.current)
      }
    }
  }, [dispatch, id, isEditMode, fetchBrands])

  useEffect(() => {
    if (selectedProduct && isEditMode) {
      reset({
        categoryId: selectedProduct.categoryId || '',
        brandId: selectedProduct.brandId || undefined,
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        barcode: selectedProduct.barcode || '',
        description: selectedProduct.description || '',
        detailedDescription: selectedProduct.detailedDescription || '',
        brand: selectedProduct.brand || '',
        unitSize: selectedProduct.unitSize || '',
        unitType: selectedProduct.unitType || '',
        mrp: selectedProduct.mrp,
        sellingPrice: selectedProduct.sellingPrice,
        taxPercent: selectedProduct.taxPercent,
        discountPercent: selectedProduct.discountPercent,
        weight: selectedProduct.weight || 0,
        dimensions: selectedProduct.dimensions || '',
        storageInfo: selectedProduct.storageInfo || '',
        ingredients: selectedProduct.ingredients || '',
        nutritionInfo: selectedProduct.nutritionInfo || '',
        shelfLifeDays: selectedProduct.shelfLifeDays || 0,
        searchKeywords: selectedProduct.searchKeywords || '',
        tags: selectedProduct.tags || '',
        isFeatured: selectedProduct.isFeatured,
        isReturnable: selectedProduct.isReturnable,
        isSellable: selectedProduct.isSellable,
        isActive: selectedProduct.isActive,
      })
      setExistingImages(selectedProduct.imageUrls)
    }
  }, [selectedProduct, isEditMode, reset])

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Check if online
    if (!navigator.onLine) {
      alert('No internet connection. Please check your network and try again.')
      event.target.value = ''
      return
    }

    // Validate all files first
    const validFiles: File[] = []
    const errors: string[] = []
    files.forEach((file) => {
      const validation = validateImageFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    })
    
    if (errors.length > 0) {
      logger.warn('Some files failed validation', { errors })
      alert(`File validation errors:\n${errors.join('\n')}`)
    }
    
    if (validFiles.length === 0) {
      event.target.value = ''
      return
    }

    // Upload immediately with progress tracking
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      validFiles.forEach(file => formData.append('images', file))
      
      const response = await apiService.uploadFile<{ images: Array<{ imageUrl: string }> }>(
        '/upload/images',
        formData,
        (progress) => {
          setUploadProgress(progress)
        }
      )
      
      const imageUrls = response.images.map((img) => img.imageUrl)
      setExistingImages((prev) => [...prev, ...imageUrls])
      logger.info('Images uploaded successfully', { count: imageUrls.length })
    } catch (error: any) {
      console.error('Upload failed:', error)
      logger.error('Failed to upload images', error as Error)
      
      // Provide specific error messages
      let errorMessage = 'Failed to upload images'
      if (error.message) {
        errorMessage = error.message
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please check your connection and try again.'
      } else if (error.response?.status === 413) {
        errorMessage = 'Files are too large. Please reduce image sizes and try again.'
      } else if (error.response?.status === 415) {
        errorMessage = 'Invalid file type. Please upload only image files.'
      } else if (!navigator.onLine) {
        errorMessage = 'Lost internet connection during upload. Please try again.'
      }
      
      alert(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
      event.target.value = ''
    }
  }

  const handleRemoveNewImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleRemoveExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async (data: ProductFormData) => {
    console.log('Form data received:', data)
    const cleanedData: any = { ...data }
    
    // Clean up optional string fields
    if (!cleanedData.brandId || (typeof cleanedData.brandId === 'string' && cleanedData.brandId.trim() === '')) {
      delete cleanedData.brandId
    }
    if (!cleanedData.sku || cleanedData.sku.trim() === '') {
      delete cleanedData.sku
    }
    if (!cleanedData.barcode || cleanedData.barcode.trim() === '') {
      delete cleanedData.barcode
    }
    
    // Handle categoryId - delete if empty string
    if (!cleanedData.categoryId || (typeof cleanedData.categoryId === 'string' && cleanedData.categoryId.trim() === '')) {
      delete cleanedData.categoryId
    }
    
    // Clean up empty string fields (except required ones)
    const requiredFields = ['name', 'sellingPrice', 'mrp']
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && cleanedData[key].trim() === '' && !requiredFields.includes(key)) {
        cleanedData[key] = undefined
      }
    })
    
    // Ensure numeric fields are properly set or undefined
    const numericFields = ['mrp', 'sellingPrice', 'weight', 'shelfLifeDays']
    numericFields.forEach(field => {
      if (cleanedData[field] === 0 || cleanedData[field] === '' || cleanedData[field] === null) {
        if (field === 'mrp' || field === 'sellingPrice') {
          // These are required, keep them as is for validation error
        } else {
          // Optional numeric fields should be undefined if 0
          delete cleanedData[field]
        }
      }
    })
    
    console.log('Cleaned data to be sent:', cleanedData)

    try {
      let productId = id

      if (isEditMode && id) {
        await dispatch(updateProduct({ id, data: cleanedData })).unwrap()
      } else {
        const result = await dispatch(createProduct(cleanedData)).unwrap()
        productId = result?.id
        logger.info('Product created successfully', { productId, productName: cleanedData.name })
      }

      // Add image URLs to product if we have any
      if (existingImages.length > 0 && productId) {
        try {
          for (let i = 0; i < existingImages.length; i++) {
            const imageUrl = existingImages[i]
            await apiService.getAxiosInstance().post(
              `/products/${productId}/images`,
              { 
                imageUrl,
                altText: `Product image ${i + 1}`,
                displayOrder: i,
                isPrimary: i === 0
              }
            )
          }
          logger.info('Product images added successfully', { productId, imageCount: existingImages.length })
        } catch (imageError) {
          logger.error('Failed to add product images', imageError as Error, { productId })
          alert('Product saved successfully, but failed to add some images. You can add images later by editing the product.')
        }
      }

      logger.info(`Product ${isEditMode ? 'updated' : 'created'} successfully`)
      dispatch(fetchProducts())
      navigate('/products', { replace: true, state: { from: 'product-form' } })
    } catch (error: any) {
      console.error('Full error object:', error)
      console.error('Error response:', error?.response)
      console.error('Error response data:', error?.response?.data)
      
      // Extract error message from various possible locations
      const errorMessage = error?.message || 'Unknown error occurred'
      const backendError = 
        error?.response?.data?.error?.message || 
        error?.response?.data?.message || 
        error?.response?.data?.error ||
        error?.data?.error?.message ||
        error?.data?.message ||
        error?.data?.error
      
      logger.error(`Failed to ${isEditMode ? 'update' : 'create'} product`, error as Error)
      
      let displayMessage = backendError || errorMessage
      
      if (error?.response?.status === 409) {
        displayMessage = 'A product with this barcode or SKU already exists. Please change the barcode/SKU and try again.'
        setValue('barcode', '')
        setValue('sku', '')
      } else if (error?.response?.status === 401) {
        displayMessage = 'Your session has expired. Please log in again.'
      } else if (error?.response?.status === 400) {
        // Show the actual validation error from backend
        displayMessage = backendError || 'Validation error. Please check all required fields.'
      }
      
      alert(`Failed to ${isEditMode ? 'update' : 'create'} product: ${displayMessage}`)
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/products')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </Typography>
        </Box>

        <form onSubmit={handleFormSubmit(handleSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Product name is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Product Name"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            required
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="sku"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="SKU (Stock Keeping Unit)"
                            helperText="Unique product identifier - Auto-generated if left empty"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="barcode"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Barcode (UPC/EAN)"
                            helperText="Universal Product Code / European Article Number"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Short Description"
                            multiline
                            rows={2}
                            helperText="Brief product description"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="detailedDescription"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Detailed Description"
                            multiline
                            rows={4}
                            helperText="Comprehensive product details"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Category & Brand
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="categoryId"
                        control={control}
                        rules={{ required: 'Category is required' }}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.categoryId} required>
                            <InputLabel>Category</InputLabel>
                            <Select {...field} label="Category">
                              {categoryOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.categoryId && (
                              <FormHelperText>{errors.categoryId.message}</FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="brandId"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Autocomplete
                            options={brands}
                            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                            value={brands.find(b => b.id === value) || null}
                            onChange={(_, newValue) => {
                              onChange(newValue?.id || '')
                              setValue('brand', newValue?.name || '')
                            }}
                            inputValue={brandInputValue}
                            onInputChange={(_, newInputValue) => {
                              setBrandInputValue(newInputValue)
                              if (newInputValue.length >= 2) {
                                debouncedFetchBrands(newInputValue)
                              } else if (newInputValue.length === 0) {
                                fetchBrands()
                              }
                            }}
                            loading={brandsLoading}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Brand (Optional)"
                                helperText="Start typing to search brands"
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {brandsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            noOptionsText={brandInputValue.length >= 2 ? "No brands found" : "Type to search brands"}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pricing & Units
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="sellingPrice"
                        control={control}
                        rules={{ 
                          required: 'Selling price is required',
                          min: { value: 0.01, message: 'Must be greater than 0' },
                          validate: (value) => {
                            const num = Number(value)
                            if (isNaN(num) || num <= 0) {
                              return 'Selling price must be greater than 0'
                            }
                            return true
                          }
                        }}
                        render={({ field: { onChange, value, ...field } }) => (
                          <TextField
                            {...field}
                            value={value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              onChange(val === '' ? undefined : Number(val))
                            }}
                            fullWidth
                            label="Selling Price (₹)"
                            type="number"
                            error={!!errors.sellingPrice}
                            helperText={errors.sellingPrice?.message}
                            required
                            inputProps={{ min: 0.01, step: 0.01 }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="mrp"
                        control={control}
                        rules={{ 
                          required: 'MRP is required',
                          min: { value: 0.01, message: 'Must be greater than 0' },
                          validate: (value) => {
                            const num = Number(value)
                            if (isNaN(num) || num <= 0) {
                              return 'MRP must be greater than 0'
                            }
                            return true
                          }
                        }}
                        render={({ field: { onChange, value, ...field } }) => (
                          <TextField
                            {...field}
                            value={value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              onChange(val === '' ? undefined : Number(val))
                            }}
                            fullWidth
                            label="MRP (Maximum Retail Price) ₹"
                            type="number"
                            error={!!errors.mrp}
                            helperText={errors.mrp?.message || "Maximum Retail Price as per regulations"}
                            required
                            inputProps={{ min: 0.01, step: 0.01 }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="taxPercent"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>GST (Goods & Services Tax) Rate</InputLabel>
                            <Select {...field} label="GST (Goods & Services Tax) Rate">
                              {taxRates.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="discountPercent"
                        control={control}
                        render={({ field: { onChange, value, ...field } }) => (
                          <TextField
                            {...field}
                            value={value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              onChange(val === '' ? 0 : Number(val))
                            }}
                            fullWidth
                            label="Discount Percentage (%)"
                            type="number"
                            error={!!errors.discountPercent}
                            helperText={errors.discountPercent?.message}
                            inputProps={{ min: 0, max: 100, step: 1 }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="unitSize"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Unit Size"
                            helperText="e.g., 1 kg, 500 ml"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="unitType"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Unit Type</InputLabel>
                            <Select {...field} label="Unit Type">
                              {unitTypes.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Physical Properties
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="weight"
                        control={control}
                        render={({ field: { onChange, value, ...field } }) => (
                          <TextField
                            {...field}
                            value={value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              onChange(val === '' ? undefined : Number(val))
                            }}
                            fullWidth
                            label="Weight (Kilograms)"
                            type="number"
                            helperText="Product weight in kilograms (for shipping calculations)"
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="dimensions"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Dimensions (L×W×H)"
                            helperText="Length × Width × Height (e.g., 10×5×3 cm)"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="storageInfo"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Storage Conditions</InputLabel>
                            <Select {...field} label="Storage Conditions">
                              {storageConditions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Food-Specific Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="ingredients"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Ingredients"
                            multiline
                            rows={3}
                            helperText="List of ingredients"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="nutritionInfo"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Nutrition Information"
                            multiline
                            rows={3}
                            helperText="Nutritional facts"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="shelfLifeDays"
                        control={control}
                        render={({ field: { onChange, value, ...field } }) => (
                          <TextField
                            {...field}
                            value={value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              onChange(val === '' ? undefined : Number(val))
                            }}
                            fullWidth
                            label="Shelf Life Duration (Days)"
                            type="number"
                            helperText="Product expiry duration from manufacturing date"
                            inputProps={{ min: 0, step: 1 }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Marketing & Search
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="searchKeywords"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="SEO (Search Engine Optimization) Keywords"
                            helperText="Keywords to improve product discoverability (space-separated)"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="tags"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Product Tags"
                            helperText="Comma-separated tags for categorization (e.g., organic, gluten-free, premium)"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Product Images
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload Images'}
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        disabled={uploading}
                      />
                    </Button>
                    {uploading && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block" color="primary">
                          Uploading images... {uploadProgress}%
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            height: 4,
                            bgcolor: 'grey.300',
                            borderRadius: 2,
                            mt: 0.5,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${uploadProgress}%`,
                              height: '100%',
                              bgcolor: 'primary.main',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {(existingImages.length > 0 || imageFiles.length > 0) && (
                    <ImageList cols={4} gap={8}>
                      {existingImages.map((url, index) => (
                        <ImageListItem key={`existing-${index}`}>
                          <img
                            src={getImageUrl(url)}
                            alt={`Product ${index + 1}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getPlaceholderImage(150, 150)
                            }}
                            style={{ height: 150, objectFit: 'cover' }}
                          />
                          <ImageListItemBar
                            actionIcon={
                              <IconButton
                                sx={{ color: 'white' }}
                                onClick={() => handleRemoveExistingImage(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                      {imageFiles.map((file, index) => (
                        <ImageListItem key={`new-${index}`}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${index + 1}`}
                            loading="lazy"
                            style={{ height: 150, objectFit: 'cover' }}
                          />
                          <ImageListItemBar
                            actionIcon={
                              <IconButton
                                sx={{ color: 'white' }}
                                onClick={() => handleRemoveNewImage(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Product Status & Settings
                  </Typography>
                  <Stack spacing={2}>
                    <Controller
                      name="isActive"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value} onChange={field.onChange} />}
                          label={
                            <Box>
                              <Typography>{field.value ? 'Active' : 'Inactive'}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {field.value ? 'Product is visible to customers' : 'Product is hidden from customers'}
                              </Typography>
                            </Box>
                          }
                        />
                      )}
                    />

                    <Controller
                      name="isFeatured"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value} onChange={field.onChange} />}
                          label={
                            <Box>
                              <Typography>{field.value ? 'Featured' : 'Not Featured'}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {field.value ? 'Product will be highlighted in featured sections' : 'Product will not appear in featured sections'}
                              </Typography>
                            </Box>
                          }
                        />
                      )}
                    />

                    <Controller
                      name="isSellable"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value} onChange={field.onChange} />}
                          label={
                            <Box>
                              <Typography>{field.value ? 'Sellable' : 'Not Sellable'}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {field.value ? 'Product can be purchased by customers' : 'Product cannot be purchased (display only)'}
                              </Typography>
                            </Box>
                          }
                        />
                      )}
                    />

                    <Controller
                      name="isReturnable"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value} onChange={field.onChange} />}
                          label={
                            <Box>
                              <Typography>{field.value ? 'Returnable' : 'Non-Returnable'}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {field.value ? 'Product can be returned by customers' : 'Product cannot be returned'}
                              </Typography>
                            </Box>
                          }
                        />
                      )}
                    />
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
                      disabled={loading}
                    >
                      {isEditMode ? 'Update Product' : 'Create Product'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => navigate('/products')}
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
})
