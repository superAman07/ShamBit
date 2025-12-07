/**
 * Product List Page
 * Main page for product management with enhanced search, filters, and actions
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  Typography,
  TablePagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchCategories,
  deleteProduct,
  toggleProductStatus,
  bulkUploadProducts,
} from '@/store/slices/productSlice'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { validateCsvFile } from '@/utils/validation'
import { SimpleEnhancedSearch } from './components/SimpleEnhancedSearch'
import { SearchFilters, SearchAggregations, FilterPreset } from '@/types/search'
import { SearchAnalytics } from './components/SearchAnalytics'
import { VirtualizedProductTable } from './components/VirtualizedProductTable'
import { adminSearchService, AdminSearchResult } from '@/services/adminSearchService'
import { productService } from '@/services/productService'
import { apiService } from '@/services/api'

export const ProductListPage = React.memo(() => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { categories } = useAppSelector(
    (state) => state.product
  )

  // Dynamic data states
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [, setBrandsLoading] = useState(false)



  // Enhanced search state
  const [currentTab, setCurrentTab] = useState(0)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20,
    // Don't filter by isActive by default - show all products
    isActive: undefined,
  })
  const [searchResults, setSearchResults] = useState<AdminSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [aggregations, setAggregations] = useState<SearchAggregations | undefined>()
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([])

  // Legacy state for compatibility
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  // Fetch brands from API - memoized to prevent unnecessary calls
  const fetchBrands = useCallback(async () => {
    if (brands.length > 0) return // Don't fetch if already loaded
    
    setBrandsLoading(true)
    try {
      const response = await apiService.get<Array<{ id: string; name: string }>>('/brands')
      setBrands(response || [])
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }, [brands.length])

  const performSearch = useCallback(async () => {
    if (currentTab !== 0) return // Only search on products tab

    setSearchLoading(true)
    setSearchError(null)

    try {
      const fallbackResult = await productService.getProducts({
        page: searchFilters.page,
        limit: searchFilters.pageSize,
        search: searchFilters.query,
        categoryId: searchFilters.categoryId,
        brandId: searchFilters.brandId,
        isActive: searchFilters.isActive,
        isFeatured: searchFilters.isFeatured,
        isSellable: searchFilters.isSellable,
        minPrice: searchFilters.minPrice,
        maxPrice: searchFilters.maxPrice,
      })
      
      setSearchResults({
        products: fallbackResult.items,
        total: fallbackResult.total,
        pagination: {
          page: fallbackResult.page,
          pageSize: fallbackResult.limit,
          totalItems: fallbackResult.total,
          totalPages: fallbackResult.totalPages,
        },
        meta: {
          query: searchFilters.query || '',
          executionTime: 0,
          cached: false,
          suggestions: [],
        },
        aggregations: {} as SearchAggregations,
      })
      setAggregations(undefined)
    } catch (error: any) {
      setSearchError(error.message || 'Failed to load products')
      console.error('Product loading failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [currentTab, searchFilters])

  useEffect(() => {
    dispatch(fetchCategories())
    fetchBrands()
    loadFilterPresets()
  }, [dispatch, fetchBrands])

  // Load products whenever filters change
  useEffect(() => {
    performSearch()
  }, [performSearch])

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
    try {
      const presets = await adminSearchService.getFilterPresets()
      setFilterPresets(presets)
    } catch (error) {
      console.error('Failed to load filter presets:', error)
    }
  }

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setSearchFilters(prev => {
      // Only update if filters actually changed to prevent unnecessary re-renders
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev
      }
      return { ...newFilters, page: 1 } // Reset to first page when filters change
    })
  }, [])

  const handlePageChange = useCallback((_event: unknown, newPage: number) => {
    setSearchFilters(prev => ({
      ...prev,
      page: newPage + 1,
    }))
  }, [])

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilters(prev => ({
      ...prev,
      pageSize: parseInt(event.target.value, 10),
      page: 1,
    }))
  }, [])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
    if (newValue === 1 && !analytics) {
      loadAnalytics()
    }
  }

  const handleSavePreset = async (name: string, description: string, filters: SearchFilters) => {
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
    setSearchFilters(preset.filters)
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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await dispatch(toggleProductStatus({ id, isActive: !currentStatus })).unwrap()
      
      // Immediately update local state
      if (searchResults) {
        setSearchResults({
          ...searchResults,
          products: searchResults.products.map(p => 
            p.id === id ? { ...p, isActive: !currentStatus } : p
          )
        })
      }
      
      setSnackbarMessage('Product status updated successfully')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Failed to toggle product status:', error)
      setSnackbarMessage('Failed to update product status')
      setSnackbarOpen(true)
    }
  }

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await dispatch(deleteProduct(productToDelete)).unwrap()
        
        // Immediately update local state
        if (searchResults && searchResults.pagination) {
          setSearchResults({
            ...searchResults,
            products: searchResults.products.filter(p => p.id !== productToDelete),
            total: searchResults.total - 1,
            pagination: {
              page: searchResults.pagination.page,
              pageSize: searchResults.pagination.pageSize,
              totalPages: searchResults.pagination.totalPages,
              totalItems: searchResults.pagination.totalItems - 1,
            }
          })
        }
        
        setDeleteDialogOpen(false)
        setProductToDelete(null)
        setSnackbarMessage('Product deleted successfully')
        setSnackbarOpen(true)
      } catch (error) {
        console.error('Failed to delete product:', error)
        setSnackbarMessage('Failed to delete product')
        setSnackbarOpen(true)
      }
    }
  }

  const handleBulkUpload = async () => {
    if (uploadFile) {
      try {
        const result = await dispatch(bulkUploadProducts(uploadFile)).unwrap()
        setBulkUploadDialogOpen(false)
        setUploadFile(null)
        
        // Refresh search results after bulk upload
        await performSearch()
        
        // Show detailed results
        let message = `Upload complete: ${result.success} succeeded`
        if (result.failed > 0) {
          message += `, ${result.failed} failed`
          console.error('Upload errors:', result.errors)
        }
        setSnackbarMessage(message)
        setSnackbarOpen(true)
      } catch (error: any) {
        console.error('Failed to upload products:', error)
        setSnackbarMessage(error.message || 'Failed to upload products')
        setSnackbarOpen(true)
      }
    }
  }



  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Product Management
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={performSearch}
              disabled={searchLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/products/categories')}
            >
              Manage Categories
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setBulkUploadDialogOpen(true)}
            >
              Bulk Upload
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportResults}
              disabled={!searchResults || searchResults.products.length === 0}
            >
              Export Results
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/products/new')}
            >
              Add Product
            </Button>
          </Stack>
        </Box>

        {/* Tabs for Products and Analytics */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Products" />
            <Tab label="Search Analytics" icon={<AnalyticsIcon />} />
          </Tabs>
        </Box>

        {/* Products Tab */}
        {currentTab === 0 && (
          <>
            {/* Enhanced Search Interface */}
            <Box sx={{ mb: 3 }}>
              <SimpleEnhancedSearch
                filters={searchFilters}
                onFiltersChange={handleFiltersChange}
                aggregations={aggregations}
                loading={searchLoading}
                categories={categories?.map(c => ({ id: c.id, name: c.name })) || []}
                brands={brands}
                onSavePreset={handleSavePreset}
                presets={filterPresets}
                onLoadPreset={handleLoadPreset}
              />
            </Box>

            {/* Error Display */}
            {searchError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {searchError}
              </Alert>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {currentTab === 1 && (
          <SearchAnalytics
            analytics={analytics}
            loading={analyticsLoading}
            onRefresh={loadAnalytics}
          />
        )}

        {/* Products Table - Only show on products tab */}
        {currentTab === 0 && (
          <Card>
            <VirtualizedProductTable
              products={searchResults?.products || []}
              loading={searchLoading}
              error={searchError}
              onEdit={(id) => navigate(`/products/${id}/edit`)}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
            />
            <TablePagination
              component="div"
              count={searchResults?.pagination?.totalItems || 0}
              page={(searchResults?.pagination?.page || 1) - 1}
              onPageChange={handlePageChange}
              rowsPerPage={searchResults?.pagination?.pageSize || 20}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this product? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog
          open={bulkUploadDialogOpen}
          onClose={() => setBulkUploadDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  How to use bulk upload:
                </Typography>
                <Typography variant="body2" component="div">
                  1. Download the CSV template below<br />
                  2. Fill in your product data (see example row in template)<br />
                  3. Upload the completed CSV file<br />
                  4. Review the results
                </Typography>
              </Alert>

              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={async () => {
                  try {
                    console.log('Downloading CSV template...')
                    const blob = await productService.downloadBulkUploadTemplate()
                    console.log('Template downloaded, blob size:', blob.size, 'type:', blob.type)
                    
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'product-bulk-upload-template.csv'
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                    
                    setSnackbarMessage('Template downloaded successfully')
                    setSnackbarOpen(true)
                  } catch (error: any) {
                    console.error('Failed to download template:', error)
                    setSnackbarMessage(error.response?.data?.error?.message || error.message || 'Failed to download template')
                    setSnackbarOpen(true)
                  }
                }}
                fullWidth
                sx={{ mb: 3 }}
              >
                Download CSV Template
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Required columns:</strong> name, mrp, sellingPrice<br />
                <strong>Optional columns:</strong> description, categoryId, brandId, sku, barcode, unitSize, unitType, 
                taxPercent, discountPercent, weight, dimensions, storageInfo, ingredients, nutritionInfo, 
                shelfLifeDays, searchKeywords, tags, isFeatured, isReturnable, isSellable, isActive, imageUrls
              </Typography>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const validation = validateCsvFile(file)
                    if (validation.valid) {
                      setUploadFile(file)
                    } else {
                      alert(`File validation error: ${validation.error}`)
                      e.target.value = ''
                    }
                  }
                }}
                style={{ width: '100%', marginTop: '16px' }}
              />
              {uploadFile && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  ✓ File selected: {uploadFile.name}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setBulkUploadDialogOpen(false)
              setUploadFile(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              variant="contained"
              disabled={!uploadFile}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success/Error Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
      </Box>
    </DashboardLayout>
  )
})
