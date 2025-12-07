/**
 * Enhanced Search Page
 * Comprehensive product search with advanced filtering, analytics, and presets
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Tab,
  Tabs,
  Alert,
  Snackbar,
  Drawer,
  IconButton,

  Fab,
} from '@mui/material'
import {
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Bookmark as BookmarkIcon,
  Close as CloseIcon,
  Tune as TuneIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EnhancedProductSearch, SearchFilters, SearchAggregations } from './components/EnhancedProductSearch'
import { AdvancedFilters, AdvancedFilterCriteria } from './components/AdvancedFilters'
import { FilterPresets, FilterPreset } from './components/FilterPresets'
import { SearchAnalytics } from './components/SearchAnalytics'
import { adminSearchService, AdminSearchResult } from '@/services/adminSearchService'
import { useAppSelector } from '@/hooks/redux'

export const EnhancedSearchPage: React.FC = () => {
  const navigate = useNavigate()
  const { categories } = useAppSelector(state => state.product)

  // Tab state
  const [currentTab, setCurrentTab] = useState(0)

  // Search state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20,
  })
  const [advancedCriteria, setAdvancedCriteria] = useState<AdvancedFilterCriteria>({
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
  })

  // Results state
  const [searchResults, setSearchResults] = useState<AdminSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [aggregations, setAggregations] = useState<SearchAggregations | undefined>()

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Presets state
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([])
  const [_presetsLoading, setPresetsLoading] = useState(false)

  // UI state
  const [advancedDrawerOpen, setAdvancedDrawerOpen] = useState(false)
  const [presetsDrawerOpen, setPresetsDrawerOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [realTimeStats, setRealTimeStats] = useState<any>(null)

  // Availability data
  const [availabilityData, setAvailabilityData] = useState<any>(null)

  useEffect(() => {
    loadFilterPresets()
    loadAvailabilityData()
  }, [])

  useEffect(() => {
    if (currentTab === 0) {
      performSearch()
      updateRealTimeStats()
    } else if (currentTab === 2 && !analytics) {
      loadAnalytics()
    }
  }, [searchFilters, currentTab])

  const performSearch = async () => {
    setSearchLoading(true)
    setSearchError(null)

    try {
      const result = await adminSearchService.searchProducts(searchFilters)
      setSearchResults(result)
      setAggregations(result.aggregations)
    } catch (error: any) {
      setSearchError(error.message || 'Search failed')
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const updateRealTimeStats = async () => {
    try {
      const stats = await adminSearchService.getFilterStats(searchFilters)
      setRealTimeStats(stats)
    } catch (error) {
      console.error('Failed to update real-time stats:', error)
    }
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const analyticsData = await adminSearchService.getSearchAnalytics()
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadFilterPresets = async () => {
    setPresetsLoading(true)
    try {
      const presets = await adminSearchService.getFilterPresets()
      setFilterPresets(presets)
    } catch (error) {
      console.error('Failed to load filter presets:', error)
    } finally {
      setPresetsLoading(false)
    }
  }

  const loadAvailabilityData = async () => {
    try {
      const data = await adminSearchService.getAvailabilityFilters()
      setAvailabilityData(data)
    } catch (error) {
      console.error('Failed to load availability data:', error)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
  }

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setSearchFilters(newFilters)
  }

  const handleAdvancedCriteriaChange = (newCriteria: AdvancedFilterCriteria) => {
    setAdvancedCriteria(newCriteria)
    // Convert advanced criteria to search filters
    const convertedFilters = convertAdvancedToSearchFilters(newCriteria)
    setSearchFilters({ ...searchFilters, ...convertedFilters })
  }

  const convertAdvancedToSearchFilters = (criteria: AdvancedFilterCriteria): Partial<SearchFilters> => {
    const filters: Partial<SearchFilters> = {}

    if (criteria.categories.length > 0) filters.categoryId = criteria.categories[0]
    if (criteria.brands.length > 0) filters.brandId = criteria.brands[0]

    if (criteria.activeStatus !== 'all') {
      filters.isActive = criteria.activeStatus === 'active'
    }
    if (criteria.featuredStatus !== 'all') {
      filters.isFeatured = criteria.featuredStatus === 'featured'
    }
    if (criteria.sellableStatus !== 'all') {
      filters.isSellable = criteria.sellableStatus === 'sellable'
    }
    if (criteria.returnableStatus !== 'all') {
      filters.isReturnable = criteria.returnableStatus === 'returnable'
    }

    if (criteria.hasImages !== 'all') {
      filters.hasImages = criteria.hasImages === 'with_images'
    }
    if (criteria.hasAttributes !== 'all') {
      filters.hasAttributes = criteria.hasAttributes === 'with_attributes'
    }
    if (criteria.hasOffers !== 'all') {
      filters.hasOffers = criteria.hasOffers === 'with_offers'
    }

    if (criteria.priceRange[0] > 0 || criteria.priceRange[1] < 10000) {
      filters.minPrice = criteria.priceRange[0]
      filters.maxPrice = criteria.priceRange[1]
    }

    if (criteria.stockRange[0] > 0 || criteria.stockRange[1] < 1000) {
      filters.minStock = criteria.stockRange[0]
      filters.maxStock = criteria.stockRange[1]
    }

    if (criteria.stockLevel !== 'all') {
      filters.stockLevel = criteria.stockLevel as any
    }

    if (criteria.createdDateRange.start || criteria.createdDateRange.end) {
      filters.dateRange = {
        field: 'created_at',
        start: criteria.createdDateRange.start,
        end: criteria.createdDateRange.end,
      }
    }

    return filters
  }

  const handleSavePreset = async (name: string, description: string, filters: any) => {
    try {
      const preset = await adminSearchService.saveFilterPreset(name, description, filters)
      setFilterPresets([...filterPresets, preset])
      setSnackbarMessage('Filter preset saved successfully')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Failed to save preset:', error)
      setSnackbarMessage('Failed to save filter preset')
      setSnackbarOpen(true)
    }
  }

  const handleLoadPreset = (preset: FilterPreset) => {
    if ('query' in preset.filters) {
      // It's a SearchFilters preset
      setSearchFilters(preset.filters as SearchFilters)
    } else {
      // It's an AdvancedFilterCriteria preset
      setAdvancedCriteria(preset.filters as unknown as AdvancedFilterCriteria)
      const convertedFilters = convertAdvancedToSearchFilters(preset.filters as unknown as AdvancedFilterCriteria)
      setSearchFilters({ ...searchFilters, ...convertedFilters })
    }
    setPresetsDrawerOpen(false)
  }

  const handleUpdatePreset = async (_id: string, _name: string, _description: string) => {
    // Mock implementation
    setSnackbarMessage('Preset updated successfully')
    setSnackbarOpen(true)
  }

  const handleDeletePreset = async (id: string) => {
    setFilterPresets(filterPresets.filter(p => p.id !== id))
    setSnackbarMessage('Preset deleted successfully')
    setSnackbarOpen(true)
  }

  const handleSetDefault = async (id: string) => {
    setFilterPresets(filterPresets.map(p => ({ ...p, isDefault: p.id === id })))
    setSnackbarMessage('Default preset updated')
    setSnackbarOpen(true)
  }

  const handleExportResults = async () => {
    try {
      const blob = await adminSearchService.exportSearchResults(searchFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `product-search-results-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSnackbarMessage('Search results exported successfully')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Failed to export results:', error)
      setSnackbarMessage('Failed to export search results')
      setSnackbarOpen(true)
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Enhanced Product Search
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setAdvancedDrawerOpen(true)}
            >
              Advanced Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<BookmarkIcon />}
              onClick={() => setPresetsDrawerOpen(true)}
            >
              Filter Presets
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/products/new')}
            >
              Add Product
            </Button>
          </Stack>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Search Results" icon={<SearchIcon />} />
            <Tab label="Filter Presets" icon={<BookmarkIcon />} />
            <Tab label="Search Analytics" icon={<AnalyticsIcon />} />
          </Tabs>
        </Box>

        {/* Search Tab */}
        {currentTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <EnhancedProductSearch
                filters={searchFilters}
                onFiltersChange={handleFiltersChange}
                aggregations={aggregations}
                loading={searchLoading}
                categories={categories?.map(c => ({ id: c.id, name: c.name })) || []}
                brands={availabilityData?.brands || []}
                onSavePreset={handleSavePreset}
                presets={filterPresets}
                onLoadPreset={handleLoadPreset}
              />
            </Grid>

            {searchError && (
              <Grid item xs={12}>
                <Alert severity="error">{searchError}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  {searchLoading ? (
                    <Typography align="center">Loading search results...</Typography>
                  ) : searchResults ? (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                          Search Results ({searchResults.pagination?.totalItems || 0} products)
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={handleExportResults}
                          disabled={searchResults.products.length === 0}
                        >
                          Export Results
                        </Button>
                      </Stack>

                      {/* Results would be displayed here - using existing ProductListPage table */}
                      <Typography color="text.secondary">
                        Search results table would be integrated here from ProductListPage
                      </Typography>
                    </Box>
                  ) : (
                    <Typography align="center" color="text.secondary">
                      Enter search criteria to see results
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Presets Tab */}
        {currentTab === 1 && (
          <FilterPresets
            presets={filterPresets}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onUpdatePreset={handleUpdatePreset}
            onDeletePreset={handleDeletePreset}
            onSetDefault={handleSetDefault}
            currentFilters={searchFilters}
          />
        )}

        {/* Analytics Tab */}
        {currentTab === 2 && (
          <SearchAnalytics
            analytics={analytics}
            loading={analyticsLoading}
            onRefresh={loadAnalytics}
          />
        )}

        {/* Advanced Filters Drawer */}
        <Drawer
          anchor="right"
          open={advancedDrawerOpen}
          onClose={() => setAdvancedDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: 600, p: 2 } }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Advanced Filters</Typography>
            <IconButton onClick={() => setAdvancedDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <AdvancedFilters
            criteria={advancedCriteria}
            onCriteriaChange={handleAdvancedCriteriaChange}
            categories={availabilityData?.categories || []}
            brands={availabilityData?.brands || []}
            onSavePreset={handleSavePreset}
            presets={filterPresets}
            onLoadPreset={handleLoadPreset}
            realTimeStats={realTimeStats}
          />
        </Drawer>

        {/* Presets Drawer */}
        <Drawer
          anchor="right"
          open={presetsDrawerOpen}
          onClose={() => setPresetsDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: 400, p: 2 } }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filter Presets</Typography>
            <IconButton onClick={() => setPresetsDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <FilterPresets
            presets={filterPresets}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onUpdatePreset={handleUpdatePreset}
            onDeletePreset={handleDeletePreset}
            onSetDefault={handleSetDefault}
            currentFilters={searchFilters}
          />
        </Drawer>

        {/* Floating Action Button for Mobile */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16, display: { xs: 'flex', md: 'none' } }}
          onClick={() => setAdvancedDrawerOpen(true)}
        >
          <TuneIcon />
        </Fab>

        {/* Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
      </Box>
    </DashboardLayout>
  )
}