/**
 * Promotion Stats Dialog
 * Dialog for viewing promotion usage statistics
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
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchPromotion,
  fetchPromotionUsage,
  fetchPromotionStats,
  clearSelectedPromotion,
} from '@/store/slices/promotionSlice'
import { formatCurrency } from '@/utils/formatters'
import { format } from 'date-fns'

interface PromotionStatsDialogProps {
  open: boolean
  onClose: () => void
  promotionId: string | null
}

export const PromotionStatsDialog = ({ open, onClose, promotionId }: PromotionStatsDialogProps) => {
  const dispatch = useAppDispatch()
  const { selectedPromotion, promotionUsage, promotionStats, loading } = useAppSelector(
    (state) => state.promotion
  )

  useEffect(() => {
    if (promotionId && open) {
      dispatch(fetchPromotion(promotionId))
      dispatch(fetchPromotionUsage(promotionId))
      dispatch(fetchPromotionStats(promotionId))
    } else if (!open) {
      dispatch(clearSelectedPromotion())
    }
  }, [promotionId, open, dispatch])

  const handleClose = () => {
    dispatch(clearSelectedPromotion())
    onClose()
  }

  if (!selectedPromotion) {
    return null
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Promotion Statistics: {selectedPromotion.code}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Usage
                    </Typography>
                    <Typography variant="h5">
                      {promotionStats?.totalUsage || 0}
                    </Typography>
                    {selectedPromotion.usageLimit && (
                      <Typography variant="caption" color="text.secondary">
                        of {selectedPromotion.usageLimit} limit
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Discount
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(promotionStats?.totalDiscount || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Unique Users
                    </Typography>
                    <Typography variant="h5">
                      {promotionStats?.uniqueUsers || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Avg. Discount
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(promotionStats?.averageDiscount || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Recent Usage
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Discount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!Array.isArray(promotionUsage) || promotionUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No usage data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    promotionUsage.slice(0, 10).map((usage, index) => (
                      <TableRow key={usage.id || index}>
                        <TableCell>
                          {format(new Date(usage.usedAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{usage.orderNumber || usage.orderId}</TableCell>
                        <TableCell>{usage.userName || usage.userId}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(usage.discountAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {promotionUsage.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing 10 of {promotionUsage.length} total uses
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
