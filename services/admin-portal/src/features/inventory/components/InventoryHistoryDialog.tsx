/**
 * Inventory History Dialog
 * Dialog for viewing inventory change history
 */

import { useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material'
import {
  TrendingUp as IncreaseIcon,
  TrendingDown as DecreaseIcon,
  SwapHoriz as AdjustmentIcon,
  Undo as ReturnIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchInventoryByProduct,
  fetchInventoryHistory,
  clearSelectedInventory,
} from '@/store/slices/inventorySlice'
import { formatDateTime } from '@/utils/dateUtils'

interface InventoryHistoryDialogProps {
  open: boolean
  onClose: () => void
  productId: string | null
}

export const InventoryHistoryDialog = ({ open, onClose, productId }: InventoryHistoryDialogProps) => {
  const dispatch = useAppDispatch()
  const { 
    selectedInventory, 
    inventoryHistory, 
    loading, 
    historyLoading, 
    error 
  } = useAppSelector((state) => state.inventory)

  useEffect(() => {
    if (open && productId) {
      dispatch(fetchInventoryByProduct(productId))
      dispatch(fetchInventoryHistory(productId))
    }
  }, [open, productId, dispatch])

  const handleClose = () => {
    dispatch(clearSelectedInventory())
    onClose()
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return <IncreaseIcon fontSize="small" />
      case 'sale':
        return <DecreaseIcon fontSize="small" />
      case 'return':
        return <ReturnIcon fontSize="small" />
      case 'adjustment':
        return <AdjustmentIcon fontSize="small" />
      default:
        return null
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return 'success'
      case 'sale':
        return 'primary'
      case 'return':
        return 'info'
      case 'adjustment':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return 'Restock'
      case 'sale':
        return 'Sale'
      case 'return':
        return 'Return'
      case 'adjustment':
        return 'Adjustment'
      default:
        return changeType
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Inventory History</DialogTitle>
      <DialogContent>
        {loading && !selectedInventory ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : selectedInventory ? (
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Product Info */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                {selectedInventory.product?.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock
                  </Typography>
                  <Typography variant="h6">
                    {selectedInventory.totalStock}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Available
                  </Typography>
                  <Typography variant="h6">
                    {selectedInventory.availableStock}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Reserved
                  </Typography>
                  <Typography variant="h6">
                    {selectedInventory.reservedStock}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* History Table */}
            <Typography variant="h6" gutterBottom>
              Change History
            </Typography>
            
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading history...
                </Typography>
              </Box>
            ) : inventoryHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No history records found
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Previous</TableCell>
                      <TableCell align="right">New Stock</TableCell>
                      <TableCell>Performed By</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryHistory.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(record.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getChangeTypeIcon(record.changeType) || undefined}
                            label={getChangeTypeLabel(record.changeType)}
                            color={getChangeTypeColor(record.changeType) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={record.quantityChange > 0 ? 'success.main' : 'error.main'}
                            fontWeight="medium"
                          >
                            {record.quantityChange > 0 ? '+' : ''}{record.quantityChange}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {record.previousStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {record.newStock}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {record.performedByName || record.performedBy}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {record.reason || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}