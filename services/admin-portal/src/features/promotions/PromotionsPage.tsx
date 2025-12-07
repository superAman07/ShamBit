/**
 * Promotions Page
 * Main page for managing promotional discount codes
 */

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  BarChart as StatsIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchPromotions,
  deletePromotion,
  togglePromotionStatus,
  setFilters,
  clearError,
} from '@/store/slices/promotionSlice'
import { PromotionFormDialog } from './components/PromotionFormDialog'
import { PromotionStatsDialog } from './components/PromotionStatsDialog'
import { formatCurrency } from '@/utils/formatters'
import { format } from 'date-fns'

export const PromotionsPage = () => {
  const dispatch = useAppDispatch()
  const { promotions, loading, error, filters } = useAppSelector((state) => state.promotion)

  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    dispatch(fetchPromotions(filters))
  }, [dispatch, filters])

  const handleCreatePromotion = () => {
    setSelectedPromotionId(null)
    setFormDialogOpen(true)
  }

  const handleEditPromotion = (id: string) => {
    setSelectedPromotionId(id)
    setFormDialogOpen(true)
  }

  const handleDeletePromotion = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      await dispatch(deletePromotion(id))
      dispatch(fetchPromotions(filters))
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await dispatch(togglePromotionStatus({ id, isActive: !currentStatus }))
    dispatch(fetchPromotions(filters))
  }

  const handleViewStats = (id: string) => {
    setSelectedPromotionId(id)
    setStatsDialogOpen(true)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  const handleSearch = () => {
    dispatch(setFilters({ ...filters, search: searchTerm, page: 1 }))
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    const isActive = value === 'all' ? undefined : value === 'active'
    dispatch(setFilters({ ...filters, isActive, page: 1 }))
  }

  const getDiscountDisplay = (promotion: any) => {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}%`
    }
    return formatCurrency(promotion.discountValue)
  }

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date()
  }

  const isUpcoming = (startDate: string) => {
    return new Date(startDate) > new Date()
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Promotions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreatePromotion}
          >
            Create Promotion
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Search by code or description"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                sx={{ flexGrow: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleSearch}>
                Search
              </Button>
            </Box>
          </CardContent>
        </Card>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Valid Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && promotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No promotions found
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                promotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {promotion.code}
                        </Typography>
                        <Tooltip title="Copy code">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyCode(promotion.code)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{promotion.description}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getDiscountDisplay(promotion)}
                      </Typography>
                      {promotion.minOrderValue && (
                        <Typography variant="caption" color="text.secondary">
                          Min: {formatCurrency(promotion.minOrderValue)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {promotion.usageCount}
                        {promotion.usageLimit && ` / ${promotion.usageLimit}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(promotion.startDate), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="body2">
                        to {format(new Date(promotion.endDate), 'MMM dd, yyyy')}
                      </Typography>
                      {isExpired(promotion.endDate) && (
                        <Chip label="Expired" size="small" color="error" sx={{ mt: 0.5 }} />
                      )}
                      {isUpcoming(promotion.startDate) && (
                        <Chip label="Upcoming" size="small" color="info" sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={promotion.isActive ? 'Active' : 'Inactive'}
                        color={promotion.isActive ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleStatus(promotion.id, promotion.isActive)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Statistics">
                        <IconButton
                          size="small"
                          onClick={() => handleViewStats(promotion.id)}
                        >
                          <StatsIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditPromotion(promotion.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePromotion(promotion.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <PromotionFormDialog
          open={formDialogOpen}
          onClose={() => {
            setFormDialogOpen(false)
            setSelectedPromotionId(null)
          }}
          promotionId={selectedPromotionId}
        />

        <PromotionStatsDialog
          open={statsDialogOpen}
          onClose={() => {
            setStatsDialogOpen(false)
            setSelectedPromotionId(null)
          }}
          promotionId={selectedPromotionId}
        />
      </Box>
    </DashboardLayout>
  )
}
