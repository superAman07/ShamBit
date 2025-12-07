/**
 * Simple Enhanced Product Search Component
 * Basic search interface with essential filtering capabilities
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,

  Chip,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Slider,
  Grid,

  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { SearchFilters, SearchAggregations, FilterPreset } from '@/types/search'

interface Props {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  aggregations?: SearchAggregations
  loading?: boolean
  categories?: Array<{ id: string; name: string }>
  brands?: Array<{ id: string; name: string }>
  onSavePreset?: (name: string, description: string, filters: SearchFilters) => void
  presets?: FilterPreset[]
  onLoadPreset?: (preset: FilterPreset) => void
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name', label: 'Name' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
  { value: 'price', label: 'Price' },
  { value: 'stock', label: 'Stock Level' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
]

export const SimpleEnhancedSearch: React.FC<Props> = ({
  filters,
  onFiltersChange,
  aggregations,
  loading: _loading = false,
  categories = [],
  brands = [],
  onSavePreset: _onSavePreset,
  presets: _presets = [],
  onLoadPreset: _onLoadPreset,
}) => {
  const [searchQuery, setSearchQuery] = useState(filters.query || '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Simple debounce implementation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.query) {
        onFiltersChange({ ...filters, query: searchQuery })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters, onFiltersChange])

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handlePriceRangeChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minPrice: value[0] > 0 ? value[0] : undefined,
      maxPrice: value[1] < 10000 ? value[1] : undefined,
    })
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    onFiltersChange({ query: '', sortBy: 'relevance', sortOrder: 'desc' })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.query) count++
    if (filters.categoryId) count++
    if (filters.brandId) count++
    if (filters.isActive !== undefined) count++
    if (filters.isFeatured !== undefined) count++
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++
    if (filters.stockLevel) count++
    return count
  }

  return (
    <Card>
      <CardContent>
        {/* Main Search Bar */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            label="Search products..."
            placeholder="Enter product name, SKU, barcode, or keywords"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.sortBy || 'relevance'}
              label="Sort By"
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={filters.sortOrder || 'desc'}
              label="Order"
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Advanced Filters">
            <IconButton
              onClick={() => setShowAdvanced(!showAdvanced)}
              color={showAdvanced ? 'primary' : 'default'}
            >
              <FilterIcon />
              {getActiveFiltersCount() > 0 && (
                <Chip
                  label={getActiveFiltersCount()}
                  size="small"
                  color="primary"
                  sx={{ position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20 }}
                />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear All Filters">
            <IconButton onClick={clearAllFilters} disabled={getActiveFiltersCount() === 0}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Active Filters Display */}
        {getActiveFiltersCount() > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {filters.query && (
              <Chip
                label={`Search: "${filters.query}"`}
                onDelete={() => handleFilterChange('query', '')}
                size="small"
              />
            )}
            {filters.categoryId && (
              <Chip
                label={`Category: ${categories.find(c => c.id === filters.categoryId)?.name || filters.categoryId}`}
                onDelete={() => handleFilterChange('categoryId', undefined)}
                size="small"
              />
            )}
            {filters.brandId && (
              <Chip
                label={`Brand: ${brands.find(b => b.id === filters.brandId)?.name || filters.brandId}`}
                onDelete={() => handleFilterChange('brandId', undefined)}
                size="small"
              />
            )}
            {filters.isActive !== undefined && (
              <Chip
                label={`Status: ${filters.isActive ? 'Active' : 'Inactive'}`}
                onDelete={() => handleFilterChange('isActive', undefined)}
                size="small"
              />
            )}
            {filters.isFeatured !== undefined && (
              <Chip
                label={`Featured: ${filters.isFeatured ? 'Yes' : 'No'}`}
                onDelete={() => handleFilterChange('isFeatured', undefined)}
                size="small"
              />
            )}
            {filters.stockLevel && (
              <Chip
                label={`Stock: ${filters.stockLevel}`}
                onDelete={() => handleFilterChange('stockLevel', undefined)}
                size="small"
              />
            )}
          </Stack>
        )}

        {/* Advanced Filters */}
        {showAdvanced && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Advanced Filters</Typography>
            <Grid container spacing={3}>
              {/* Category Filter */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.categoryId || ''}
                    label="Category"
                    onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Brand Filter */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Brand</InputLabel>
                  <Select
                    value={filters.brandId || ''}
                    label="Brand"
                    onChange={(e) => handleFilterChange('brandId', e.target.value || undefined)}
                  >
                    <MenuItem value="">All Brands</MenuItem>
                    {brands.map(brand => (
                      <MenuItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Boolean Filters */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Product Status</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.isActive === true}
                        indeterminate={filters.isActive === undefined}
                        onChange={(e) => handleFilterChange('isActive', 
                          e.target.checked ? true : filters.isActive === true ? undefined : false
                        )}
                      />
                    }
                    label="Active"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.isFeatured === true}
                        indeterminate={filters.isFeatured === undefined}
                        onChange={(e) => handleFilterChange('isFeatured',
                          e.target.checked ? true : filters.isFeatured === true ? undefined : false
                        )}
                      />
                    }
                    label="Featured"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.isSellable === true}
                        indeterminate={filters.isSellable === undefined}
                        onChange={(e) => handleFilterChange('isSellable',
                          e.target.checked ? true : filters.isSellable === true ? undefined : false
                        )}
                      />
                    }
                    label="Sellable"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.hasImages === true}
                        indeterminate={filters.hasImages === undefined}
                        onChange={(e) => handleFilterChange('hasImages',
                          e.target.checked ? true : filters.hasImages === true ? undefined : false
                        )}
                      />
                    }
                    label="Has Images"
                  />
                </Stack>
              </Grid>

              {/* Price Range */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Price Range: ₹{filters.minPrice || 0} - ₹{filters.maxPrice || 10000}
                </Typography>
                <Slider
                  value={[filters.minPrice || 0, filters.maxPrice || 10000]}
                  onChange={(_, value) => handlePriceRangeChange(value as number[])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={10000}
                  step={50}
                />
              </Grid>

              {/* Stock Level */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stock Level</InputLabel>
                  <Select
                    value={filters.stockLevel || ''}
                    label="Stock Level"
                    onChange={(e) => handleFilterChange('stockLevel', e.target.value || undefined)}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Out">Out of Stock</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Search Results Summary */}
        {aggregations && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Search Results Summary</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip label={`Total: ${aggregations.totalProducts || 0}`} size="small" />
              <Chip label={`Active: ${aggregations.activeProducts || 0}`} size="small" color="success" />
              <Chip label={`Inactive: ${aggregations.inactiveProducts || 0}`} size="small" color="default" />
              <Chip label={`Featured: ${aggregations.featuredProducts || 0}`} size="small" color="primary" />
              <Chip label={`Low Stock: ${aggregations.stockLevelCounts?.Low || 0}`} size="small" color="warning" />
              <Chip label={`Out of Stock: ${aggregations.stockLevelCounts?.Out || 0}`} size="small" color="error" />
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}