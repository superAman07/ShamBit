import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Chip,
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

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  parentName?: string;
  isActive: boolean;
  level?: number;
}

interface CategoryAutocompleteProps {
  value?: string;
  onChange: (categoryId: string | null, category: Category | null) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  value,
  onChange,
  label = 'Search Category',
  error = false,
  helperText,
  disabled = false,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const getAuthToken = (): string => {
    return localStorage.getItem('accessToken') || '';
  };

  const searchCategories = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const response = await axios.get<{
          success: boolean;
          data: Category[];
          pagination: any;
        }>(`${API_BASE_URL}/categories`, {
          params: {
            search: searchTerm || undefined,
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
        console.error('Category search error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      searchCategories(searchTerm);
    }, 300),
    [searchCategories]
  );

  // Load selected category if value is provided
  useEffect(() => {
    if (value && !selectedCategory) {
      const loadCategory = async () => {
        try {
          const response = await axios.get<{
            success: boolean;
            data: Category;
          }>(`${API_BASE_URL}/categories/${value}`, {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          });

          if (response.data.success && response.data.data) {
            setSelectedCategory(response.data.data);
          }
        } catch (error) {
          console.error('Error loading category:', error);
        }
      };
      loadCategory();
    }
  }, [value, selectedCategory]);

  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue, debouncedSearch]);

  // Load initial options when opening
  useEffect(() => {
    if (open && options.length === 0) {
      searchCategories('');
    }
  }, [open, options.length, searchCategories]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selectedCategory}
      onChange={(_, newValue) => {
        setSelectedCategory(newValue);
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {option.name}
              </Typography>
              {option.level !== undefined && (
                <Chip
                  label={`Level ${option.level}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            {option.parentName && (
              <Typography variant="caption" color="text.secondary">
                Parent: {option.parentName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Slug: {option.slug}
            </Typography>
          </Box>
        </Box>
      )}
      noOptionsText="No categories found"
    />
  );
};
