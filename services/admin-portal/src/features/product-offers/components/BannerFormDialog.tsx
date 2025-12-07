import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUploadField } from '../../../components/ImageUploadField';
import { ProductAutocomplete } from '../../../components/ProductAutocomplete';
import { CategoryAutocomplete } from '../../../components/CategoryAutocomplete';
import {
  ProductOffer,
} from '../../../types/product-offer';

const bannerSchema = z.object({
  offerTitle: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  offerDescription: z.string().optional(),
  discountType: z.enum(['Flat', 'Percentage']),
  discountValue: z.number().min(0, 'Discount must be positive'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  bannerUrl: z.string().optional(),
  mobileImageUrl: z.string().optional(),
  bannerType: z.enum(['hero', 'promotional', 'category', 'product']),
  actionType: z.enum(['product', 'category', 'url', 'search', 'none']),
  actionValue: z.string().optional(),
  displayOrder: z.number().min(0).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  isActive: z.boolean().optional(),
  productId: z.string().optional(),
});

type BannerFormData = z.infer<typeof bannerSchema>;

interface BannerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BannerFormData) => Promise<void>;
  banner?: ProductOffer | null;
  loading?: boolean;
}

export const BannerFormDialog: React.FC<BannerFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  banner,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      offerTitle: '',
      offerDescription: '',
      discountType: 'Percentage',
      discountValue: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      bannerType: 'promotional',
      actionType: 'none',
      actionValue: '',
      displayOrder: 0,
      backgroundColor: '#FF6B6B',
      textColor: '#FFFFFF',
      isActive: true,
    },
  });

  const actionType = watch('actionType');

  useEffect(() => {
    if (banner) {
      reset({
        offerTitle: banner.offerTitle,
        offerDescription: banner.offerDescription || '',
        discountType: banner.discountType,
        discountValue: banner.discountValue,
        startDate: banner.startDate.split('T')[0],
        endDate: banner.endDate.split('T')[0],
        bannerUrl: banner.bannerUrl || '',
        mobileImageUrl: banner.mobileImageUrl || '',
        bannerType: banner.bannerType || 'promotional',
        actionType: banner.actionType || 'none',
        actionValue: banner.actionValue || '',
        displayOrder: banner.displayOrder || 0,
        backgroundColor: banner.backgroundColor || '#FF6B6B',
        textColor: banner.textColor || '#FFFFFF',
        isActive: banner.isActive,
        productId: banner.productId || '',
      });
    } else {
      reset({
        offerTitle: '',
        offerDescription: '',
        discountType: 'Percentage',
        discountValue: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bannerType: 'promotional',
        actionType: 'none',
        actionValue: '',
        displayOrder: 0,
        backgroundColor: '#FF6B6B',
        textColor: '#FFFFFF',
        isActive: true,
      });
    }
  }, [banner, reset]);

  const handleFormSubmit = async (data: BannerFormData) => {
    try {
      // Map actionValue to productId if actionType is 'product'
      const submitData: any = {
        ...data,
        productId: data.actionType === 'product' ? data.actionValue : undefined,
        // Convert date strings to ISO format
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      
      console.log('Submitting banner data:', submitData);
      await onSubmit(submitData);
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      console.error('Error response:', error?.response?.data);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle>
          {banner ? 'Edit Banner' : 'Create New Banner'}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <Controller
                  name="offerTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Banner Title"
                      fullWidth
                      required
                      error={!!errors.offerTitle}
                      helperText={errors.offerTitle?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="offerDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={2}
                      error={!!errors.offerDescription}
                      helperText={errors.offerDescription?.message}
                    />
                  )}
                />
              </Grid>

              {/* Banner Type */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="bannerType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Banner Type"
                      fullWidth
                      required
                      error={!!errors.bannerType}
                      helperText={errors.bannerType?.message}
                    >
                      <MenuItem value="hero">Hero (Home Carousel)</MenuItem>
                      <MenuItem value="promotional">Promotional</MenuItem>
                      <MenuItem value="category">Category</MenuItem>
                      <MenuItem value="product">Product</MenuItem>
                    </TextField>
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
                      type="number"
                      label="Display Order"
                      fullWidth
                      error={!!errors.displayOrder}
                      helperText={errors.displayOrder?.message || 'Lower numbers appear first'}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  )}
                />
              </Grid>

              {/* Action Type */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="actionType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Click Action"
                      fullWidth
                      required
                      error={!!errors.actionType}
                      helperText={errors.actionType?.message}
                    >
                      <MenuItem value="none">No Action</MenuItem>
                      <MenuItem value="product">Navigate to Product</MenuItem>
                      <MenuItem value="category">Navigate to Category</MenuItem>
                      <MenuItem value="url">Open URL</MenuItem>
                      <MenuItem value="search">Search Products</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              {actionType !== 'none' && (
                <Grid item xs={12} sm={6}>
                  {actionType === 'product' ? (
                    <Controller
                      name="actionValue"
                      control={control}
                      render={({ field }) => (
                        <ProductAutocomplete
                          value={field.value}
                          onChange={(productId) => {
                            field.onChange(productId || '');
                          }}
                          label="Select Product"
                          error={!!errors.actionValue}
                          helperText={errors.actionValue?.message || 'Search by name, SKU, or brand'}
                        />
                      )}
                    />
                  ) : actionType === 'category' ? (
                    <Controller
                      name="actionValue"
                      control={control}
                      render={({ field }) => (
                        <CategoryAutocomplete
                          value={field.value}
                          onChange={(categoryId) => {
                            field.onChange(categoryId || '');
                          }}
                          label="Select Category"
                          error={!!errors.actionValue}
                          helperText={errors.actionValue?.message || 'Search by category name'}
                        />
                      )}
                    />
                  ) : (
                    <Controller
                      name="actionValue"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={
                            actionType === 'url' ? 'URL' :
                            'Search Query'
                          }
                          fullWidth
                          error={!!errors.actionValue}
                          helperText={errors.actionValue?.message}
                        />
                      )}
                    />
                  )}
                </Grid>
              )}

              {/* Discount Info */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="discountType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Discount Type"
                      fullWidth
                      required
                      error={!!errors.discountType}
                      helperText={errors.discountType?.message}
                    >
                      <MenuItem value="Percentage">Percentage</MenuItem>
                      <MenuItem value="Flat">Flat Amount</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Controller
                  name="discountValue"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Discount Value"
                      fullWidth
                      required
                      error={!!errors.discountValue}
                      helperText={errors.discountValue?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Start Date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="End Date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.endDate}
                      helperText={errors.endDate?.message}
                    />
                  )}
                />
              </Grid>

              {/* Colors */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="backgroundColor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="color"
                      label="Background Color"
                      fullWidth
                      error={!!errors.backgroundColor}
                      helperText={errors.backgroundColor?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="textColor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="color"
                      label="Text Color"
                      fullWidth
                      error={!!errors.textColor}
                      helperText={errors.textColor?.message}
                    />
                  )}
                />
              </Grid>

              {/* Image Upload */}
              <Grid item xs={12}>
                <Controller
                  name="bannerUrl"
                  control={control}
                  render={({ field }) => (
                    <ImageUploadField
                      label="Banner Image"
                      value={field.value}
                      onChange={(url, mobileUrl) => {
                        field.onChange(url);
                        if (mobileUrl) {
                          setValue('mobileImageUrl', mobileUrl);
                        }
                      }}
                      helperText="Recommended: 1920x600px. Will auto-generate mobile variant."
                    />
                  )}
                />
              </Grid>

              {errors.bannerUrl && (
                <Grid item xs={12}>
                  <Alert severity="error">{errors.bannerUrl.message}</Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : banner ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
