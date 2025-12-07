import { useEffect, useState } from 'react'
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
  Avatar,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { brandService } from '@/services/brandService'
import { Brand, BrandFormData, CreateBrandDto, UpdateBrandDto } from '@/types/brand'
import { validateImageFile } from '@/utils/validation'

export function BrandFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const {
    control,
    handleSubmit: handleFormSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<BrandFormData>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
      website: '',
      country: '',
      isActive: true,
    },
  })

  const brandName = watch('name')
  const logoUrl = watch('logoUrl')

  const [loading, setLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    if (isEditMode && id) {
      const loadBrand = async () => {
        setLoading(true)
        try {
          const brandData = await brandService.getBrand(id)
          reset({
            name: brandData.name,
            description: brandData.description || '',
            logoUrl: brandData.logoUrl || '',
            website: brandData.website || '',
            country: brandData.country || '',
            isActive: brandData.isActive,
          })
        } catch (error) {
          console.error('Failed to load brand:', error)
        } finally {
          setLoading(false)
        }
      }
      loadBrand()
    }
  }, [isEditMode, id, reset])

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validation = validateImageFile(file)
      if (validation.valid) {
        setLogoFile(file)
      } else {
        alert(`File validation error: ${validation.error}`)
        event.target.value = ''
      }
    }
  }

  const handleSubmit = async (data: BrandFormData) => {
    setLoading(true)
    try {
      let result: Brand

      if (isEditMode && id) {
        const updateData: UpdateBrandDto = {
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          country: data.country || undefined,
          isActive: data.isActive,
        }
        result = await brandService.updateBrand(id, updateData)
      } else {
        const createData: CreateBrandDto = {
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          country: data.country || undefined,
          isActive: data.isActive,
        }
        result = await brandService.createBrand(createData)
      }

      if (logoFile && result.id) {
        try {
          await brandService.uploadBrandLogo(result.id, logoFile, (progress) => {
            console.log(`Logo upload progress: ${progress}%`)
          })
        } catch (logoError: any) {
          console.error('Failed to upload logo:', logoError)
          let errorMessage = 'Brand saved successfully, but logo upload failed.'
          if (logoError.message) {
            errorMessage += ` ${logoError.message}`
          }
          errorMessage += ' You can add a logo later by editing the brand.'
          alert(errorMessage)
        }
      }

      navigate('/brands', { state: { refresh: true } })
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error'
      alert(`Failed to ${isEditMode ? 'update' : 'create'} brand: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/brands')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Brand' : 'Add New Brand'}
          </Typography>
        </Box>

        <form onSubmit={handleFormSubmit(handleSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Brand Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Brand name is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Brand Name"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            required
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
                            label="Description"
                            multiline
                            rows={3}
                            helperText="Brief description of the brand"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="website"
                        control={control}
                        rules={{
                          pattern: {
                            value: /^https?:\/\/.+/,
                            message: 'Website must be a valid URL (starting with http:// or https://)'
                          }
                        }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Website"
                            error={!!errors.website}
                            helperText={errors.website?.message || "Brand's official website URL"}
                            placeholder="https://example.com"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="country"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Country"
                            helperText="Country of origin"
                            placeholder="e.g., India, USA, Germany"
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
                    Brand Logo
                  </Typography>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                      src={logoFile ? URL.createObjectURL(logoFile) : logoUrl}
                      alt={brandName}
                      sx={{ width: 80, height: 80 }}
                    >
                      {brandName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        component="label"
                      >
                        Upload Logo
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleLogoSelect}
                        />
                      </Button>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Recommended: Square image, max 2MB
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Brand Settings
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
                                {field.value
                                  ? 'Brand is available for selection in products'
                                  : 'Brand is hidden from product selection'}
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
                      {isEditMode ? 'Update Brand' : 'Create Brand'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => navigate('/brands')}
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
