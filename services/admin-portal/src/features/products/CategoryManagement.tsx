/**
 * Category Management Page - Optimized with React Hook Form
 * Manages product categories with zero typing lag
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Category, CategoryFormData } from '@/types/product'
import { productService } from '@/services/productService'
import { validateImageFile } from '@/utils/validation'

interface CategoryFormDialogProps {
  open: boolean
  onClose: () => void
  category: Category | null
  categories: Category[]
  onSave: () => Promise<void>
}

const CategoryFormDialog = React.memo(({ open, onClose, category, categories, onSave }: CategoryFormDialogProps) => {
  const isEditMode = !!category

  const {
    control,
    handleSubmit: handleFormSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<CategoryFormData>({
    mode: 'onBlur',
    defaultValues: {
      parentId: '',
      name: '',
      description: '',
      imageUrl: '',
      displayOrder: 0,
      isFeatured: false,
      isActive: true,
    },
  })

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const categoryName = watch('name')
  const imageUrl = watch('imageUrl')

  // Get parent categories (categories without a parent)
  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parentId && (!category || cat.id !== category.id))
  }, [categories, category])

  useEffect(() => {
    if (open) {
      if (isEditMode && category) {
        reset({
          parentId: category.parentId || '',
          name: category.name,
          description: category.description || '',
          imageUrl: category.imageUrl || '',
          displayOrder: category.displayOrder || 0,
          isFeatured: category.isFeatured || false,
          isActive: category.isActive,
        })
      } else {
        reset({
          parentId: '',
          name: '',
          description: '',
          imageUrl: '',
          displayOrder: 0,
          isFeatured: false,
          isActive: true,
        })
      }
    }
  }, [open, isEditMode, category, reset])

  const handleImageSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(`File validation error: ${validation.error}`)
      event.target.value = ''
      return
    }

    // Check if online
    if (!navigator.onLine) {
      alert('No internet connection. Please check your network and try again.')
      event.target.value = ''
      return
    }

    // Upload immediately with progress tracking
    setUploading(true)
    try {
      const response = await productService.uploadImage(file, (progress) => {
        console.log(`Upload progress: ${progress}%`)
      })
      
      // Update form with the uploaded image URL
      reset((formValues) => ({
        ...formValues,
        imageUrl: response.imageUrl
      }))
      
      console.log('Image uploaded successfully:', response.imageUrl)
    } catch (error: any) {
      console.error('Upload failed:', error)
      
      // Provide specific error messages
      let errorMessage = 'Failed to upload image'
      if (error.message) {
        errorMessage = error.message
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please check your connection and try again.'
      } else if (error.response?.status === 413) {
        errorMessage = 'Image is too large. Please reduce the file size and try again.'
      } else if (error.response?.status === 415) {
        errorMessage = 'Invalid file type. Please upload only image files.'
      } else if (!navigator.onLine) {
        errorMessage = 'Lost internet connection during upload. Please try again.'
      }
      
      alert(errorMessage)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }, [reset])

  const handleSubmit = async (data: CategoryFormData) => {
    setLoading(true)
    try {
      // Clean up empty strings
      const cleanedData = {
        ...data,
        parentId: data.parentId || undefined,
        description: data.description || undefined,
      }

      if (isEditMode && category) {
        await productService.updateCategory(category.id, cleanedData)
      } else {
        await productService.createCategory(cleanedData)
      }

      await onSave()
      onClose()
    } catch (error: any) {
      console.error('Failed to save category:', error)
      alert(`Failed to ${isEditMode ? 'update' : 'create'} category: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Category' : 'Add New Category'}
      </DialogTitle>
      <form onSubmit={handleFormSubmit(handleSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Category name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Category Name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                    autoFocus
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Parent Category (Optional)</InputLabel>
                    <Select {...field} label="Parent Category (Optional)">
                      <MenuItem value="">
                        <em>None (Top Level Category)</em>
                      </MenuItem>
                      {parentCategories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Leave empty to create a top-level category, or select a parent to create a subcategory
                    </FormHelperText>
                  </FormControl>
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
                    label="Description"
                    multiline
                    rows={3}
                    helperText="Brief description of the category"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="displayOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Display Order"
                    type="number"
                    helperText="Lower numbers appear first"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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
                            {field.value
                              ? 'Category is visible and available'
                              : 'Category is hidden'}
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
                          <Typography>Featured</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Show in featured categories section
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Category Image
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={imageUrl}
                  alt={categoryName}
                  sx={{ width: 60, height: 60 }}
                  variant="rounded"
                >
                  <FolderIcon />
                </Avatar>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    component="label"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={uploading}
                    />
                  </Button>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    Recommended: Square image, max 2MB
                  </Typography>
                  {uploading && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" display="block" color="primary">
                        Uploading image...
                      </Typography>
                      <CircularProgress size={16} sx={{ ml: 1 }} />
                    </Box>
                  )}
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
})

CategoryFormDialog.displayName = 'CategoryFormDialog'

export const CategoryManagement = React.memo(() => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await productService.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleAddCategory = useCallback(() => {
    setSelectedCategory(null)
    setDialogOpen(true)
  }, [])

  const handleEditCategory = useCallback((category: Category) => {
    setSelectedCategory(category)
    setDialogOpen(true)
  }, [])

  const handleDeleteCategory = useCallback(async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await productService.deleteCategory(category.id)
      await loadCategories()
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      alert(`Failed to delete category: ${error.message}`)
    }
  }, [loadCategories])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)
    setSelectedCategory(null)
  }, [])

  const handleSave = useCallback(async () => {
    await loadCategories()
  }, [loadCategories])

  // Organize categories hierarchically
  const organizedCategories = useMemo(() => {
    const parentCategories = categories.filter(cat => !cat.parentId)
    const childCategories = categories.filter(cat => cat.parentId)

    return parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parentId === parent.id),
    }))
  }, [categories])

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/products')} sx={{ mr: 2 }}>
              <BackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Category Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCategory}
          >
            Add Category
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Products</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Order</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : organizedCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No categories found. Click "Add Category" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizedCategories.map((parent) => (
                      <React.Fragment key={parent.id}>
                        <TableRow>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <FolderIcon color="primary" />
                              <Typography variant="subtitle1" fontWeight="bold">
                                {parent.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{parent.description || '-'}</TableCell>
                          <TableCell align="center">{parent.productCount || 0}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={parent.isActive ? 'Active' : 'Inactive'}
                              color={parent.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{parent.displayOrder || 0}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditCategory(parent)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCategory(parent)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        {parent.children?.map((child) => (
                          <TableRow key={child.id}>
                            <TableCell sx={{ pl: 6 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <FolderOpenIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {child.name}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{child.description || '-'}</TableCell>
                            <TableCell align="center">{child.productCount || 0}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={child.isActive ? 'Active' : 'Inactive'}
                                color={child.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">{child.displayOrder || 0}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditCategory(child)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteCategory(child)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <CategoryFormDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          category={selectedCategory}
          categories={categories}
          onSave={handleSave}
        />
      </Box>
    </DashboardLayout>
  )
})

CategoryManagement.displayName = 'CategoryManagement'
