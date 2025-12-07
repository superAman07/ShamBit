/**
 * Advanced Filters Component
 * Multi-criteria filtering with real-time inventory and availability-based filtering
 */

import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,

  Slider,
  TextField,
  Button,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,

  IconButton,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,

  ListItemSecondaryAction,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import { FilterPreset } from './FilterPresets'


export interface AdvancedFilterCriteria {
  // Basic filters
  categories: string[]
  brands: string[]
  
  // Status filters
  activeStatus: 'all' | 'active' | 'inactive'
  featuredStatus: 'all' | 'featured' | 'regular'
  sellableStatus: 'all' | 'sellable' | 'not_sellable'
  returnableStatus: 'all' | 'returnable' | 'not_returnable'
  
  // Content filters
  hasImages: 'all' | 'with_images' | 'without_images'
  hasAttributes: 'all' | 'with_attributes' | 'without_attributes'
  hasOffers: 'all' | 'with_offers' | 'without_offers'
  hasNutritionInfo: 'all' | 'with_nutrition' | 'without_nutrition'
  
  // Price filters
  priceRange: [number, number]
  priceComparison: 'all' | 'below_mrp' | 'at_mrp' | 'discounted'
  
  // Inventory filters
  stockRange: [number, number]
  stockLevel: 'all' | 'normal' | 'low' | 'out'
  stockComparison: 'all' | 'above_threshold' | 'below_threshold'
  
  // Date filters
  createdDateRange: { start: Date | null; end: Date | null }
  updatedDateRange: { start: Date | null; end: Date | null }
  lastRestockDateRange: { start: Date | null; end: Date | null }
  
  // Performance filters
  salesPerformance: 'all' | 'high_sales' | 'medium_sales' | 'low_sales' | 'no_sales'
  viewsPerformance: 'all' | 'high_views' | 'medium_views' | 'low_views' | 'no_views'
  conversionRate: 'all' | 'high_conversion' | 'medium_conversion' | 'low_conversion'
  
  // Quality filters
  hasReviews: 'all' | 'with_reviews' | 'without_reviews'
  averageRating: [number, number]
  hasComplaints: 'all' | 'with_complaints' | 'without_complaints'
  
  // Compliance filters
  hasExpiryDate: 'all' | 'with_expiry' | 'without_expiry'
  expiryStatus: 'all' | 'fresh' | 'expiring_soon' | 'expired'
  batchTracking: 'all' | 'tracked' | 'not_tracked'
}

interface Props {
  criteria: AdvancedFilterCriteria
  onCriteriaChange: (criteria: AdvancedFilterCriteria) => void
  categories?: Array<{ id: string; name: string; productCount?: number }>
  brands?: Array<{ id: string; name: string; productCount?: number }>
  onSavePreset?: (name: string, description: string, criteria: AdvancedFilterCriteria) => void
  presets?: FilterPreset[]
  onLoadPreset?: (preset: FilterPreset) => void
  realTimeStats?: {
    totalProducts: number
    matchingProducts: number
    averagePrice: number
    totalStock: number
  }
}

const defaultCriteria: AdvancedFilterCriteria = {
  categories: [],
  brands: [],
  activeStatus: 'all',
  featuredStatus: 'all',
  sellableStatus: 'all',
  returnableStatus: 'all',
  hasImages: 'all',
  hasAttributes: 'all',
  hasOffers: 'all',
  hasNutritionInfo: 'all',
  priceRange: [0, 10000],
  priceComparison: 'all',
  stockRange: [0, 1000],
  stockLevel: 'all',
  stockComparison: 'all',
  createdDateRange: { start: null, end: null },
  updatedDateRange: { start: null, end: null },
  lastRestockDateRange: { start: null, end: null },
  salesPerformance: 'all',
  viewsPerformance: 'all',
  conversionRate: 'all',
  hasReviews: 'all',
  averageRating: [0, 5],
  hasComplaints: 'all',
  hasExpiryDate: 'all',
  expiryStatus: 'all',
  batchTracking: 'all',
}

export const AdvancedFilters: React.FC<Props> = ({
  criteria,
  onCriteriaChange,
  categories = [],
  brands = [],
  onSavePreset,
  presets = [],
  onLoadPreset,
  realTimeStats,
}) => {
  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic'])

  const handleCriteriaChange = (key: keyof AdvancedFilterCriteria, value: any) => {
    onCriteriaChange({ ...criteria, [key]: value })
  }



  const clearAllFilters = () => {
    onCriteriaChange(defaultCriteria)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (criteria.categories.length > 0) count++
    if (criteria.brands.length > 0) count++
    if (criteria.activeStatus !== 'all') count++
    if (criteria.featuredStatus !== 'all') count++
    if (criteria.hasImages !== 'all') count++
    if (criteria.stockLevel !== 'all') count++
    if (criteria.priceRange[0] > 0 || criteria.priceRange[1] < 10000) count++
    if (criteria.stockRange[0] > 0 || criteria.stockRange[1] < 1000) count++
    if (criteria.createdDateRange.start || criteria.createdDateRange.end) count++
    if (criteria.salesPerformance !== 'all') count++
    return count
  }

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleSavePreset = () => {
    if (onSavePreset && presetName.trim()) {
      onSavePreset(presetName.trim(), '', criteria)
      setSavePresetOpen(false)
      setPresetName('')
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterIcon />
              <Typography variant="h6">Advanced Filters</Typography>
              {getActiveFiltersCount() > 0 && (
                <Chip
                  label={`${getActiveFiltersCount()} active`}
                  size="small"
                  color="primary"
                />
              )}
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setSavePresetOpen(true)}
                disabled={getActiveFiltersCount() === 0}
              >
                Save Preset
              </Button>
              <Button
                size="small"
                onClick={() => setPresetsOpen(true)}
                disabled={presets.length === 0}
              >
                Load Preset
              </Button>
              <IconButton
                size="small"
                onClick={clearAllFilters}
                disabled={getActiveFiltersCount() === 0}
              >
                <ClearIcon />
              </IconButton>
            </Stack>
          }
        />
        <CardContent>
          {/* Real-time Stats */}
          {realTimeStats && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter Results</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  label={`${realTimeStats.matchingProducts} / ${realTimeStats.totalProducts} products`}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={`Avg Price: ₹${realTimeStats.averagePrice.toFixed(2)}`}
                  size="small"
                />
                <Chip
                  label={`Total Stock: ${realTimeStats.totalStock}`}
                  size="small"
                />
              </Stack>
            </Box>
          )}

          {/* Basic Filters */}
          <Accordion
            expanded={expandedSections.includes('basic')}
            onChange={() => handleSectionToggle('basic')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CategoryIcon />
                <Typography>Basic Filters</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Categories */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categories</InputLabel>
                    <Select
                      multiple
                      value={criteria.categories}
                      label="Categories"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip
                              key={value}
                              label={categories.find(c => c.id === value)?.name || value}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {categories.map(category => (
                        <MenuItem key={category.id} value={category.id}>
                          <Checkbox checked={criteria.categories.includes(category.id)} />
                          <ListItemText
                            primary={category.name}
                            secondary={category.productCount ? `${category.productCount} products` : undefined}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Brands */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Brands</InputLabel>
                    <Select
                      multiple
                      value={criteria.brands}
                      label="Brands"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip
                              key={value}
                              label={brands.find(b => b.id === value)?.name || value}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {brands.map(brand => (
                        <MenuItem key={brand.id} value={brand.id}>
                          <Checkbox checked={criteria.brands.includes(brand.id)} />
                          <ListItemText
                            primary={brand.name}
                            secondary={brand.productCount ? `${brand.productCount} products` : undefined}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Status Filters */}
          <Accordion
            expanded={expandedSections.includes('status')}
            onChange={() => handleSectionToggle('status')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <VisibilityIcon />
                <Typography>Status & Visibility</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Active Status</InputLabel>
                    <Select
                      value={criteria.activeStatus}
                      label="Active Status"
                      onChange={(e) => handleCriteriaChange('activeStatus', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="active">Active Only</MenuItem>
                      <MenuItem value="inactive">Inactive Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Featured Status</InputLabel>
                    <Select
                      value={criteria.featuredStatus}
                      label="Featured Status"
                      onChange={(e) => handleCriteriaChange('featuredStatus', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="featured">Featured Only</MenuItem>
                      <MenuItem value="regular">Regular Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sellable Status</InputLabel>
                    <Select
                      value={criteria.sellableStatus}
                      label="Sellable Status"
                      onChange={(e) => handleCriteriaChange('sellableStatus', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="sellable">Sellable Only</MenuItem>
                      <MenuItem value="not_sellable">Not Sellable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Returnable Status</InputLabel>
                    <Select
                      value={criteria.returnableStatus}
                      label="Returnable Status"
                      onChange={(e) => handleCriteriaChange('returnableStatus', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="returnable">Returnable Only</MenuItem>
                      <MenuItem value="not_returnable">Not Returnable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Inventory Filters */}
          <Accordion
            expanded={expandedSections.includes('inventory')}
            onChange={() => handleSectionToggle('inventory')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <InventoryIcon />
                <Typography>Inventory & Stock</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Stock Range: {criteria.stockRange[0]} - {criteria.stockRange[1]}
                  </Typography>
                  <Slider
                    value={criteria.stockRange}
                    onChange={(_, value) => handleCriteriaChange('stockRange', value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={1000}
                    step={10}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Stock Level</InputLabel>
                    <Select
                      value={criteria.stockLevel}
                      label="Stock Level"
                      onChange={(e) => handleCriteriaChange('stockLevel', e.target.value)}
                    >
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="normal">Normal Stock</MenuItem>
                      <MenuItem value="low">Low Stock</MenuItem>
                      <MenuItem value="out">Out of Stock</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Price Filters */}
          <Accordion
            expanded={expandedSections.includes('price')}
            onChange={() => handleSectionToggle('price')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon />
                <Typography>Price & Offers</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Price Range: ₹{criteria.priceRange[0]} - ₹{criteria.priceRange[1]}
                  </Typography>
                  <Slider
                    value={criteria.priceRange}
                    onChange={(_, value) => handleCriteriaChange('priceRange', value)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={10000}
                    step={50}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Price Comparison</InputLabel>
                    <Select
                      value={criteria.priceComparison}
                      label="Price Comparison"
                      onChange={(e) => handleCriteriaChange('priceComparison', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="below_mrp">Below MRP</MenuItem>
                      <MenuItem value="at_mrp">At MRP</MenuItem>
                      <MenuItem value="discounted">Discounted</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Has Offers</InputLabel>
                    <Select
                      value={criteria.hasOffers}
                      label="Has Offers"
                      onChange={(e) => handleCriteriaChange('hasOffers', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="with_offers">With Offers</MenuItem>
                      <MenuItem value="without_offers">Without Offers</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Performance Filters */}
          <Accordion
            expanded={expandedSections.includes('performance')}
            onChange={() => handleSectionToggle('performance')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon />
                <Typography>Performance Metrics</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sales Performance</InputLabel>
                    <Select
                      value={criteria.salesPerformance}
                      label="Sales Performance"
                      onChange={(e) => handleCriteriaChange('salesPerformance', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="high_sales">High Sales</MenuItem>
                      <MenuItem value="medium_sales">Medium Sales</MenuItem>
                      <MenuItem value="low_sales">Low Sales</MenuItem>
                      <MenuItem value="no_sales">No Sales</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Views Performance</InputLabel>
                    <Select
                      value={criteria.viewsPerformance}
                      label="Views Performance"
                      onChange={(e) => handleCriteriaChange('viewsPerformance', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="high_views">High Views</MenuItem>
                      <MenuItem value="medium_views">Medium Views</MenuItem>
                      <MenuItem value="low_views">Low Views</MenuItem>
                      <MenuItem value="no_views">No Views</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Conversion Rate</InputLabel>
                    <Select
                      value={criteria.conversionRate}
                      label="Conversion Rate"
                      onChange={(e) => handleCriteriaChange('conversionRate', e.target.value)}
                    >
                      <MenuItem value="all">All Products</MenuItem>
                      <MenuItem value="high_conversion">High Conversion</MenuItem>
                      <MenuItem value="medium_conversion">Medium Conversion</MenuItem>
                      <MenuItem value="low_conversion">Low Conversion</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Save Preset Dialog */}
      <Dialog open={savePresetOpen} onClose={() => setSavePresetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSavePresetOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained" disabled={!presetName.trim()}>
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Presets Dialog */}
      <Dialog open={presetsOpen} onClose={() => setPresetsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Filter Preset</DialogTitle>
        <DialogContent>
          <List>
            {presets.map(preset => (
              <ListItem key={preset.id} divider>
                <ListItemText primary={preset.name} />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    onClick={() => {
                      if (onLoadPreset) {
                        onLoadPreset(preset)
                        setPresetsOpen(false)
                      }
                    }}
                  >
                    Load
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}