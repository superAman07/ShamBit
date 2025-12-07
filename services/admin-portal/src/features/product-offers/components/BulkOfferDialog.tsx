import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Chip,
  Box,
  Autocomplete,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays } from 'date-fns';

import { productService } from '../../../services/productService';
import { productOfferService } from '../../../services/productOfferService';
import { Product } from '../../../types/product';
import { BulkProductOfferRequest, ProductOfferDiscountType } from '../../../types/product-offer';
import { logger } from '../../../utils/logger';

interface BulkOfferDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkOfferDialog: React.FC<BulkOfferDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    offerTitle: '',
    offerDescription: '',
    discountType: 'Percentage' as ProductOfferDiscountType,
    discountValue: 0,
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    bannerUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const response = await productService.getProducts({ limit: 1000 });
      setProducts(response.items);
    } catch (err) {
      logger.error('Failed to load products', err as Error);
      setError('Failed to load products');
    }
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    if (!formData.offerTitle.trim()) {
      setError('Please enter an offer title');
      return;
    }

    if (formData.discountValue <= 0) {
      setError('Please enter a valid discount value');
      return;
    }

    if (formData.discountType === 'Percentage' && formData.discountValue > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    if (formData.startDate >= formData.endDate) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bulkRequest: BulkProductOfferRequest = {
        productIds: selectedProducts.map(p => p.id),
        offerData: {
          offerTitle: formData.offerTitle,
          offerDescription: formData.offerDescription,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          bannerUrl: formData.bannerUrl,
          isActive: formData.isActive,
        },
      };

      const createdOffers = await productOfferService.createBulkProductOffers(bulkRequest);
      
      logger.info('Bulk offers created successfully', { 
        totalRequested: selectedProducts.length,
        totalCreated: createdOffers.length 
      });

      onSuccess();
      handleClose();
    } catch (err) {
      logger.error('Failed to create bulk offers', err as Error);
      setError('Failed to create bulk offers. Some products may already have overlapping offers.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProducts([]);
    setFormData({
      offerTitle: '',
      offerDescription: '',
      discountType: 'Percentage',
      discountValue: 0,
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      bannerUrl: '',
      isActive: true,
    });
    setError(null);
    onClose();
  };

  const calculateSampleFinalPrice = (product: Product) => {
    const originalPrice = product.sellingPrice;
    let discountAmount = 0;
    
    if (formData.discountType === 'Percentage') {
      discountAmount = (originalPrice * formData.discountValue) / 100;
    } else {
      discountAmount = formData.discountValue;
    }
    
    return Math.max(0, originalPrice - discountAmount);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create Bulk Product Offers</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Product Selection */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={products}
              getOptionLabel={(product) => `${product.name} (SKU: ${product.sku})`}
              value={selectedProducts}
              onChange={(_, newValue) => setSelectedProducts(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Products"
                  placeholder="Search and select products..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((product, index) => {
                  const tagProps = getTagProps({ index });
                  return (
                    <Chip
                      {...tagProps}
                      key={product.id}
                      label={`${product.name} (${product.sku})`}
                      size="small"
                    />
                  );
                })
              }
            />
            <Typography variant="caption" color="text.secondary">
              {selectedProducts.length} product(s) selected
            </Typography>
          </Grid>

          {/* Offer Details */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Offer Title"
              value={formData.offerTitle}
              onChange={(e) => setFormData({ ...formData, offerTitle: e.target.value })}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Offer Description"
              value={formData.offerDescription}
              onChange={(e) => setFormData({ ...formData, offerDescription: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Discount Type</InputLabel>
              <Select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as ProductOfferDiscountType })}
                label="Discount Type"
              >
                <MenuItem value="Percentage">Percentage</MenuItem>
                <MenuItem value="Flat">Flat Amount</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label={`Discount Value ${formData.discountType === 'Percentage' ? '(%)' : '(₹)'}`}
              type="number"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="datetime-local"
              value={formData.startDate.toISOString().slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="End Date"
              type="datetime-local"
              value={formData.endDate.toISOString().slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Banner URL"
              value={formData.bannerUrl}
              onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Grid>

          {/* Preview */}
          {selectedProducts.length > 0 && formData.discountValue > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Price Preview (Sample)
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {selectedProducts.slice(0, 5).map((product) => {
                  const finalPrice = calculateSampleFinalPrice(product);
                  const savings = product.sellingPrice - finalPrice;
                  
                  return (
                    <Box key={product.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Original: ₹{product.sellingPrice} → Final: ₹{finalPrice.toFixed(2)} 
                        (Save ₹{savings.toFixed(2)})
                      </Typography>
                    </Box>
                  );
                })}
                {selectedProducts.length > 5 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {selectedProducts.length - 5} more products
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedProducts.length === 0}
        >
          {loading ? 'Creating...' : `Create ${selectedProducts.length} Offer(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkOfferDialog;