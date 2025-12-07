import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { brandService } from '@/services/brandService'
import { Brand, BrandFilters } from '@/types/brand'
import { PaginatedResponse } from '@/types/api'
import { BrandTable } from './components/BrandTable'

export function BrandListPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [brands, setBrands] = useState<PaginatedResponse<Brand> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<BrandFilters>({
    page: 1,
    limit: 20,
    search: '',
    isActive: undefined,
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const loadBrands = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await brandService.getBrands(filters)
      setBrands(result)
    } catch (error: any) {
      setError(error.message || 'Failed to load brands')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrands()
    if (location.state?.refresh) {
      window.history.replaceState({}, document.title)
    }
  }, [filters.page, filters.limit, filters.search, filters.isActive, location.state])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: event.target.value,
      page: 1,
    }))
  }

  const handlePageChange = (_event: unknown, newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage + 1,
    }))
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1,
    }))
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await brandService.toggleBrandStatus(id, !currentStatus)
      setSnackbarMessage('Brand status updated successfully')
      setSnackbarOpen(true)
      await loadBrands()
    } catch (error) {
      setSnackbarMessage('Failed to update brand status')
      setSnackbarOpen(true)
    }
  }

  const handleDeleteClick = (id: string) => {
    setBrandToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!brandToDelete) return

    try {
      await brandService.deleteBrand(brandToDelete)
      setDeleteDialogOpen(false)
      setBrandToDelete(null)
      setSnackbarMessage('Brand deleted successfully')
      setSnackbarOpen(true)
      await loadBrands()
    } catch (error: any) {
      setSnackbarMessage(error.response?.data?.error?.message || 'Failed to delete brand')
      setSnackbarOpen(true)
      setDeleteDialogOpen(false)
      setBrandToDelete(null)
    }
  }

  const handleFilterByStatus = (status: boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      isActive: status,
      page: 1,
    }))
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Brand Management
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadBrands}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/brands/new')}
            >
              Add Brand
            </Button>
          </Stack>
        </Box>

        {/* Search and Filters */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Search brands..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <Stack direction="row" spacing={1}>
              <Chip
                label="All"
                onClick={() => handleFilterByStatus(undefined)}
                color={filters.isActive === undefined ? 'primary' : 'default'}
                variant={filters.isActive === undefined ? 'filled' : 'outlined'}
              />
              <Chip
                label="Active"
                onClick={() => handleFilterByStatus(true)}
                color={filters.isActive === true ? 'success' : 'default'}
                variant={filters.isActive === true ? 'filled' : 'outlined'}
              />
              <Chip
                label="Inactive"
                onClick={() => handleFilterByStatus(false)}
                color={filters.isActive === false ? 'error' : 'default'}
                variant={filters.isActive === false ? 'filled' : 'outlined'}
              />
            </Stack>
          </Stack>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Brands Table */}
        <Card>
          <BrandTable
            brands={brands?.items || []}
            loading={loading}
            error={error}
            onEdit={(id) => navigate(`/brands/${id}/edit`)}
            onDelete={handleDeleteClick}
            onToggleStatus={handleToggleStatus}
          />
          
          <TablePagination
            component="div"
            count={brands?.total || 0}
            page={(brands?.page || 1) - 1}
            onPageChange={handlePageChange}
            rowsPerPage={brands?.limit || 20}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this brand? This action cannot be undone.
              Products using this brand will need to be updated.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
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
}