import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  LocalOffer as OfferIcon,
} from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';

import { productOfferService } from '../../services/productOfferService';
import { ProductOffer, ProductOfferListQuery, BannerType } from '../../types/product-offer';
import { formatCurrency } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import BulkOfferDialog from './components/BulkOfferDialog';
import OfferPerformanceDialog from './components/OfferPerformanceDialog';
import { BannerFormDialog } from './components/BannerFormDialog';

const ProductOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<ProductOfferListQuery>({});
  const [bannerTypeFilter, setBannerTypeFilter] = useState<BannerType | ''>('');
  
  // Dialog states
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ProductOffer | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuOfferId, setMenuOfferId] = useState<string | null>(null);
  
  const [expiringOffers, setExpiringOffers] = useState<ProductOffer[]>([]);

  useEffect(() => {
    loadOffers();
    loadExpiringOffers();
  }, [page, rowsPerPage, filters]);

  const loadOffers = async () => {
    try {
      setTableLoading(true);
      const query: ProductOfferListQuery = {
        page: page + 1,
        pageSize: rowsPerPage,
        ...filters,
      };
      
      const response = await productOfferService.getProductOffers(query);
      setOffers(response.offers);
      setTotalItems(response.pagination.totalItems);
    } catch (err) {
      logger.error('Failed to load product offers', err as Error);
      setError('Failed to load product offers');
    } finally {
      setTableLoading(false);
    }
  };

  const loadExpiringOffers = async () => {
    try {
      const expiring = await productOfferService.getExpiringOffers(7);
      setExpiringOffers(expiring);
    } catch (err) {
      logger.error('Failed to load expiring offers', err as Error);
    }
  };

  const handleBannerSubmit = async (data: any) => {
    setDialogLoading(true);
    try {
      if (selectedOffer) {
        await productOfferService.updateProductOffer(selectedOffer.id, data);
      } else {
        await productOfferService.createProductOffer(data);
      }
      setBannerDialogOpen(false);
      setSelectedOffer(null);
      loadOffers();
    } catch (err) {
      logger.error('Failed to save banner', err as Error);
      setError('Failed to save banner');
      throw err;
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteOffer = async () => {
    if (!selectedOffer) return;
    
    try {
      await productOfferService.deleteProductOffer(selectedOffer.id);
      setDeleteDialogOpen(false);
      setSelectedOffer(null);
      loadOffers();
    } catch (err) {
      logger.error('Failed to delete product offer', err as Error);
      setError('Failed to delete product offer');
    }
  };

  const handleToggleStatus = async (offer: ProductOffer) => {
    try {
      await productOfferService.toggleOfferStatus(offer.id, !offer.isActive);
      loadOffers();
    } catch (err) {
      logger.error('Failed to toggle offer status', err as Error);
      setError('Failed to toggle offer status');
    }
  };

  const openEditDialog = (offer: ProductOffer) => {
    setSelectedOffer(offer);
    setBannerDialogOpen(true);
  };

  const openDeleteDialog = (offer: ProductOffer) => {
    setSelectedOffer(offer);
    setDeleteDialogOpen(true);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, offerId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuOfferId(offerId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuOfferId(null);
  };

  const getOfferStatus = (offer: ProductOffer) => {
    const now = new Date();
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    
    if (!offer.isActive) {
      return { label: 'Inactive', color: 'default' as const };
    }
    
    if (isBefore(now, startDate)) {
      return { label: 'Scheduled', color: 'info' as const };
    }
    
    if (isAfter(now, endDate)) {
      return { label: 'Expired', color: 'error' as const };
    }
    
    return { label: 'Active', color: 'success' as const };
  };

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Banners & Offers Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setBulkDialogOpen(true)}
            >
              Bulk Create
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedOffer(null);
                setBannerDialogOpen(true);
              }}
            >
              Create Banner
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Expiring Offers Alert */}
        {expiringOffers.length > 0 && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            {expiringOffers.length} offer(s) expiring within 7 days
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <OfferIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{totalItems}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Offers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">
                      {offers.filter(o => getOfferStatus(o).label === 'Active').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Offers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{expiringOffers.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expiring Soon
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Banner Type</InputLabel>
                <Select
                  value={bannerTypeFilter}
                  onChange={(e) => setBannerTypeFilter(e.target.value as BannerType | '')}
                  label="Banner Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="hero">Hero</MenuItem>
                  <MenuItem value="promotional">Promotional</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="product">Product</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.isActive ?? ''}
                  onChange={(e) => setFilters({ ...filters, isActive: e.target.value === '' ? undefined : e.target.value === 'true' })}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={filters.discountType ?? ''}
                  onChange={(e) => setFilters({ ...filters, discountType: e.target.value as any })}
                  label="Discount Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Percentage">Percentage</MenuItem>
                  <MenuItem value="Flat">Flat Amount</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.includeExpired ?? false}
                    onChange={(e) => setFilters({ ...filters, includeExpired: e.target.checked })}
                  />
                }
                label="Include Expired"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Offers Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Banner</TableCell>
                <TableCell>Title & Type</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers
                .filter(offer => !bannerTypeFilter || offer.bannerType === bannerTypeFilter)
                .map((offer) => {
                  const status = getOfferStatus(offer);
                  
                  return (
                    <TableRow key={offer.id}>
                      <TableCell>
                        {offer.bannerUrl ? (
                          <Box
                            component="img"
                            src={offer.bannerUrl}
                            alt={offer.offerTitle}
                            sx={{
                              width: 120,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 120,
                              height: 60,
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
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{offer.offerTitle}</Typography>
                          <Chip
                            label={offer.bannerType || 'promotional'}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                          {offer.displayOrder !== undefined && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Order: {offer.displayOrder}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {offer.actionType || 'none'}
                          </Typography>
                          {offer.actionValue && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {offer.actionValue}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {offer.discountValue}
                        {offer.discountType === 'Percentage' ? '%' : ` ${formatCurrency(offer.discountValue)}`}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {format(new Date(offer.startDate), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="body2">
                            to {format(new Date(offer.endDate), 'MMM dd, yyyy')}
                          </Typography>
                          {offer.daysRemaining !== undefined && offer.daysRemaining > 0 && (
                            <Typography variant="caption" color="warning.main">
                              {offer.daysRemaining} days left
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, offer.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalItems}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              const offer = offers.find(o => o.id === menuOfferId);
              if (offer) {
                handleToggleStatus(offer);
              }
              handleMenuClose();
            }}
          >
            {offers.find(o => o.id === menuOfferId)?.isActive ? (
              <>
                <ToggleOffIcon sx={{ mr: 1 }} />
                Deactivate
              </>
            ) : (
              <>
                <ToggleOnIcon sx={{ mr: 1 }} />
                Activate
              </>
            )}
          </MenuItem>
          <MenuItem
            onClick={() => {
              const offer = offers.find(o => o.id === menuOfferId);
              if (offer) {
                openEditDialog(offer);
              }
              handleMenuClose();
            }}
          >
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              const offer = offers.find(o => o.id === menuOfferId);
              if (offer) {
                setSelectedOffer(offer);
                setPerformanceDialogOpen(true);
              }
              handleMenuClose();
            }}
          >
            <ViewIcon sx={{ mr: 1 }} />
            View Performance
          </MenuItem>
          <MenuItem
            onClick={() => {
              const offer = offers.find(o => o.id === menuOfferId);
              if (offer) {
                openDeleteDialog(offer);
              }
              handleMenuClose();
            }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Banner Form Dialog */}
        <BannerFormDialog
          open={bannerDialogOpen}
          onClose={() => {
            setBannerDialogOpen(false);
            setSelectedOffer(null);
          }}
          onSubmit={handleBannerSubmit}
          banner={selectedOffer}
          loading={dialogLoading}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Product Offer</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the offer "{selectedOffer?.offerTitle}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteOffer}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Offer Dialog */}
        <BulkOfferDialog
          open={bulkDialogOpen}
          onClose={() => setBulkDialogOpen(false)}
          onSuccess={() => {
            loadOffers();
            setBulkDialogOpen(false);
          }}
        />

        {/* Performance Dialog */}
        <OfferPerformanceDialog
          open={performanceDialogOpen}
          onClose={() => {
            setPerformanceDialogOpen(false);
            setSelectedOffer(null);
          }}
          offer={selectedOffer}
        />
      </Box>
    </DashboardLayout>
  );
};

export default ProductOffersPage;