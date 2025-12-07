/**
 * Brand Selector Component
 * Searchable dropdown for selecting brands with professional UI
 */

import { useState, useCallback, useEffect, memo } from 'react'
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Business as BrandIcon,
} from '@mui/icons-material'

import { brandService } from '@/services/brandService'
import { Brand } from '@/types/brand'
import { debounce } from '@/utils/performance'

interface BrandSelectorProps {
  value: string | undefined
  onChange: (brandId: string | undefined, brandName?: string) => void
  error?: boolean
  helperText?: string
  required?: boolean
  label?: string
}

export const BrandSelector = memo<BrandSelectorProps>(({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = "Brand"
}) => {

  const [options, setOptions] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setLoading(true)
      try {
        const brands = await brandService.searchBrands(query, 20)
        setOptions(brands)
      } catch (error) {
        console.error('Failed to search brands:', error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 500), // Increased debounce time for better UX
    []
  )

  // Load initial brands on mount
  useEffect(() => {
    const loadInitialBrands = async () => {
      setLoading(true)
      try {
        const result = await brandService.getBrands({ limit: 10, isActive: true })
        setOptions(result.items)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to load brands:', error)
        setIsInitialized(true)
      } finally {
        setLoading(false)
      }
    }
    loadInitialBrands()
  }, [])

  // Handle search when input changes (only when user is actively typing)
  useEffect(() => {
    if (isInitialized && inputValue && inputValue.length >= 2 && !selectedBrand) {
      debouncedSearch(inputValue)
    } else if (inputValue.length < 2) {
      setIsSearching(false)
    }
  }, [inputValue, selectedBrand, isInitialized, debouncedSearch])

  // Find selected brand when value changes (only when not actively searching)
  useEffect(() => {
    if (value && isInitialized && !isSearching) {
      const brand = options.find(b => b.id === value)
      if (brand) {
        setSelectedBrand(brand)
        setInputValue(brand.name)
      } else {
        // If brand not found in options, fetch it directly
        const fetchSpecificBrand = async () => {
          try {
            const specificBrand = await brandService.getBrand(value)
            setSelectedBrand(specificBrand)
            setInputValue(specificBrand.name)
            // Also add it to options to avoid future fetches
            setOptions(prev => {
              const exists = prev.find(b => b.id === specificBrand.id)
              return exists ? prev : [specificBrand, ...prev]
            })
          } catch (error) {
            console.error('Failed to fetch specific brand:', error)
            // Reset selection if brand doesn't exist
            setSelectedBrand(null)
            setInputValue('')
          }
        }
        fetchSpecificBrand()
      }
    } else if (!value && !isSearching) {
      setSelectedBrand(null)
      setInputValue('')
    }
  }, [value, options, isInitialized, isSearching])

  const handleChange = useCallback((_event: any, newValue: Brand | null) => {
    setSelectedBrand(newValue)
    setIsSearching(false) // Reset search state when selection is made
    if (newValue) {
      setInputValue(newValue.name)
      onChange(newValue.id, newValue.name)
    } else {
      setInputValue('')
      onChange(undefined)
    }
  }, [onChange])

  const handleInputChange = useCallback((_event: any, newInputValue: string) => {
    setInputValue(newInputValue)
    // Clear selection when user starts typing something different
    if (selectedBrand && newInputValue !== selectedBrand.name) {
      setSelectedBrand(null)
    }
  }, [selectedBrand])

  const handleAddNewBrand = useCallback(() => {
    // Open brand creation page in new tab to avoid losing form data
    window.open('/brands/new', '_blank')
  }, [])

  return (
    <Autocomplete
        value={selectedBrand}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options}
        loading={loading}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            required={required}
            placeholder="Search brands..."
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
          <Box component="li" {...props}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Avatar
                src={option.logoUrl}
                alt={option.name}
                sx={{ width: 32, height: 32 }}
              >
                <BrandIcon fontSize="small" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {option.name}
                </Typography>
                {option.country && (
                  <Typography variant="caption" color="text.secondary">
                    {option.country}
                  </Typography>
                )}
              </Box>
              {!option.isActive && (
                <Chip label="Inactive" size="small" color="default" />
              )}
            </Stack>
          </Box>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.name}
              avatar={
                <Avatar src={option.logoUrl} sx={{ width: 24, height: 24 }}>
                  <BrandIcon fontSize="small" />
                </Avatar>
              }
            />
          ))
        }
        noOptionsText={
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {inputValue && inputValue.length >= 2 
                ? `No brands found for "${inputValue}"` 
                : inputValue && inputValue.length < 2
                ? 'Type at least 2 characters to search'
                : 'No brands available'}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddNewBrand}
              variant="outlined"
            >
              Add New Brand
            </Button>
          </Box>
        }
        filterOptions={(x) => x} // Disable built-in filtering since we handle it server-side
      />
  )
})

BrandSelector.displayName = 'BrandSelector'