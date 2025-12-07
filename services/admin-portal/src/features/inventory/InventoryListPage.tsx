/**
 * Inventory List Page
 * Main page for inventory management with stock levels, filters, and actions
 */

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,

  Alert,
  LinearProgress,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  Edit as EditIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  History as HistoryIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { getImageUrl, getPlaceholderImage } from '@/utils/image'
import {
  fetchInventory,
  setFilters,
  clearError,
  exportInventoryCSV,
} from '@/store/slices/inventorySlice'
import { fetchCategories } from '@/store/slices/productSlice'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InventoryUpdateDialog } from '@/features/inventory/components/InventoryUpdateDialog'
import { RestockDialog } from '@/features/inventory/components/RestockDialog'
import { InventoryHistoryDialog } from '@/features/inventory/components/InventoryHistoryDialog'
import { BulkUploadDialog } from '@/features/inventory/components/BulkUploadDialog'
import { logger } from '@/utils/logger'

export const InventoryListPage = () => {
  const dispatch = useAppDispatch()
  const { 
    inventory, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useAppSelector((state) => state.inventory)
  const { categories } = useAppSelector((state) => state.product)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  
  // Dialog states
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchInventory(filters))
  }, [dispatch, filters])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, dispatch])

  const handleSearch = () => {
    dispatch(
      setFilters({
        ...filters,
        search: searchTerm,
        page: 1,
      })
    )
  }

  const handleCategoryFilter = (categoryId: string) => {
    setCategoryFilter(categoryId)
    dispatch(
      setFilters({
        ...filters,
        categoryId: categoryId || undefined,
        page: 1,
      })
    )
  }

  const handleLowStockFilter = (checked: boolean) => {
    setLowStockOnly(checked)
    dispatch(
      setFilters({
        ...filters,
        lowStock: checked || undefined,
        page: 1,
      })
    )
  }

  const handlePageChange = (_event: unknown, newPage: number) => {
    dispatch(
      setFilters({
        ...filters,
        page: newPage + 1,
      })
    )
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      setFilters({
        ...filters,
        limit: parseInt(event.target.value, 10),
        page: 1,
      })
    )
  }

  const handleUpdateClick = (productId: string) => {
    setSelectedProductId(productId)
    setUpdateDialogOpen(true)
  }

  const handleRestockClick = (productId: string) => {
    setSelectedProductId(productId)
    setRestockDialogOpen(true)
  }

  const handleHistoryClick = (productId: string) => {
    setSelectedProductId(productId)
    setHistoryDialogOpen(true)
  }

  const handleRefresh = () => {
    dispatch(fetchInventory(filters))
  }

  const handleExportCSV = async () => {
    try {
      // Try server-side export first (more efficient for large datasets)
      await dispatch(exportInventoryCSV(filters)).unwrap()
    } catch (error) {
      // Fallback to client-side export if server export fails
      logger.warn('Server export failed, using client-side export', { error })
      
      // Create CSV content
      const headers = ['Product Name', 'Category', 'Total Stock', 'Available Stock', 'Reserved Stock', 'Low Stock Threshold', 'Status', 'Last Updated']
      const csvContent = [
        headers.join(','),
        ...(inventory || []).map(item => [
          `"${item.product?.name || 'Unknown Product'}"`,
          `"${item.product?.category?.name || '-'}"`,
          item.totalStock,
          item.availableStock,
          item.reservedStock,
          item.lowStockThreshold,
          `"${getStockStatus(item).label}"`,
          `"${new Date(item.updatedAt).toLocaleDateString()}"`
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const getStockStatus = (item: any) => {
    if (item.availableStock === 0) {
      return { label: 'Out of Stock', color: 'error' as const, severity: 'high' }
    } else if (item.availableStock <= item.lowStockThreshold) {
      return { label: 'Low Stock', color: 'warning' as const, severity: 'medium' }
    } else {
      return { label: 'In Stock', color: 'success' as const, severity: 'low' }
    }
  }

  const getStockPercentage = (item: any) => {
    if (item.totalStock === 0) return 0
    return (item.availableStock / item.totalStock) * 100
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Inventory Management
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setBulkUploadDialogOpen(true)}
            >
              Bulk Upload
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                label="Search products"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={lowStockOnly}
                    onChange={(e) => handleLowStockFilter(e.target.checked)}
                  />
                }
                label="Low Stock Only"
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
              >
                Search
              </Button>
              <IconButton onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Total Stock</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell align="right">Reserved</TableCell>
                  <TableCell align="right">Threshold</TableCell>
                  <TableCell align="center">Stock Level</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (!inventory || inventory.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <LinearProgress />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading inventory...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : !inventory || inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No inventory records found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const stockStatus = getStockStatus(item)
                    const stockPercentage = getStockPercentage(item)
                    
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {item.product?.imageUrls?.[0] ? (
                              <Box
                                component="img"
                                src={getImageUrl(item.product.imageUrls[0])}
                                alt={item.product.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getPlaceholderImage(40, 40)
                                }}
                                sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  objectFit: 'cover', 
                                  borderRadius: 1 
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  bgcolor: 'grey.200',
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  No Image
                                </Typography>
                              </Box>
                            )}
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {item.product?.name || 'Unknown Product'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.product?.unitSize}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.product?.category?.name || '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {item.totalStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={stockStatus.severity === 'high' ? 'error' : 'inherit'}
                            fontWeight={stockStatus.severity !== 'low' ? 'medium' : 'normal'}
                          >
                            {item.availableStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.reservedStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.lowStockThreshold}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ width: 60 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(stockPercentage, 100)}
                              color={stockStatus.color}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(stockPercentage)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stockStatus.label}
                            color={stockStatus.color}
                            size="small"
                            icon={stockStatus.severity !== 'low' ? <WarningIcon /> : undefined}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="Update Stock">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateClick(item.productId)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Restock">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleRestockClick(item.productId)}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View History">
                              <IconButton
                                size="small"
                                onClick={() => handleHistoryClick(item.productId)}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pagination?.total || 0}
            page={Math.max(0, (pagination?.page || 1) - 1)}
            onPageChange={handlePageChange}
            rowsPerPage={pagination?.limit || 20}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>

        {/* Dialogs */}
        <InventoryUpdateDialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          productId={selectedProductId}
        />
        
        <RestockDialog
          open={restockDialogOpen}
          onClose={() => setRestockDialogOpen(false)}
          productId={selectedProductId}
        />
        
        <InventoryHistoryDialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          productId={selectedProductId}
        />
        
        <BulkUploadDialog
          open={bulkUploadDialogOpen}
          onClose={() => setBulkUploadDialogOpen(false)}
        />
      </Box>
    </DashboardLayout>
  )
}