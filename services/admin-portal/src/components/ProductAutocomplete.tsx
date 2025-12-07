import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Avatar,
} from '@mui/material';
import axios from 'axios';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  brandName?: string;
  sellingPrice?: number | string;
  imageUrls?: string[];
  isActive: boolean;
}

interface ProductAutocompleteProps {
  value?: string;
  onChange: (productId: string | null, product: Product | null) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  label = 'Search Product',
  error = false,
  helperText,
  disabled = false,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const getAuthToken = (): string => {
    return localStorage.getItem('accessToken') || '';
  };

  const searchProducts = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get<{
          success: boolean;
          data: Product[];
          pagination: any;
        }>(`${API_BASE_URL}/products`, {
          params: {
            search: searchTerm,
            pageSize: 20,
            isActive: true,
          },
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          setOptions(response.data.data);
        } else {
          setOptions([]);
        }
      } catch (error) {
        console.error('Product search error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      searchProducts(searchTerm);
    }, 300),
    [searchProducts]
  );

  // Load selected product if value is provided
  useEffect(() => {
    if (value && !selectedProduct) {
      const loadProduct = async () => {
        try {
          const response = await axios.get<{
            success: boolean;
            data: Product;
          }>(`${API_BASE_URL}/products/${value}`, {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          });

          if (response.data.success && response.data.data) {
            setSelectedProduct(response.data.data);
          }
        } catch (error) {
          console.error('Error loading product:', error);
        }
      };
      loadProduct();
    }
  }, [value, selectedProduct]);

  useEffect(() => {
    if (inputValue) {
      debouncedSearch(inputValue);
    } else {
      setOptions([]);
    }
  }, [inputValue, debouncedSearch]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selectedProduct}
      onChange={(_, newValue) => {
        setSelectedProduct(newValue);
        onChange(newValue?.id || null, newValue);
      }}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={options || []}
      loading={loading}
      disabled={disabled}
      getOptionLabel={(option) => option.name || ''}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Avatar
              src={option.imageUrls?.[0]}
              alt={option.name}
              variant="rounded"
              sx={{ width: 48, height: 48 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                SKU: {option.sku} | {option.brandName || option.brand || 'No Brand'}
              </Typography>
              <Typography variant="caption" color="primary" display="block">
                ₹{option.sellingPrice ? Number(option.sellingPrice).toFixed(2) : '0.00'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      noOptionsText={
        inputValue.length < 2
          ? 'Type at least 2 characters to search'
          : 'No products found'
      }
    />
  );
};
