import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { sellerService, Seller, SellerStatistics } from '../../services/sellerService';
import { format } from 'date-fns';
import SellerDetailsDialog from './SellerDetailsDialog';
import SellerStatsDashboard from './SellerStatsDashboard';
import SellerErrorBoundary from './SellerErrorBoundary';

const SellersListPage: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [statistics, setStatistics] = useState<SellerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    loadSellers();
    loadStatistics();
  }, [page, rowsPerPage, search, statusFilter]);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const response = await sellerService.getSellers({
        page: page + 1,
        pageSize: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setSellers(response.sellers);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await sellerService.getSellerStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleVerification = async (action: 'approve' | 'reject' | 'hold', notes?: string) => {
    if (!selectedSeller) return;

    try {
      await sellerService.verifySellerDocuments(
        selectedSeller.id,
        action,
        notes
      );
      loadSellers();
      loadStatistics();
    } catch (error) {
      console.error('Failed to verify seller:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'suspended': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const openSellerDetails = (seller: Seller) => {
    setSelectedSeller(seller);
    setViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <SellerErrorBoundary>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Seller Management
        </Typography>

      {/* Statistics Dashboard */}
      {statistics && (
        <Box sx={{ mb: 3 }}>
          <SellerStatsDashboard statistics={statistics} />
        </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Sellers Table */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Seller Info</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Business Details</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Product Categories</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Registration Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {(seller.sellerType === 'business' || seller.businessName) ? <BusinessIcon sx={{ mr: 1 }} /> : <PersonIcon sx={{ mr: 1 }} />}
                      <Box>
                        <Typography variant="subtitle2">
                          {seller.businessName || seller.fullName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {seller.sellerType ? (seller.sellerType === 'business' ? 'Business' : 'Individual') : 'Legacy'}
                          {seller.businessType && ` • ${seller.businessType}`}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{seller.email}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {seller.mobile || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {seller.gstRegistered && (
                        <Chip label="GST Registered" size="small" color="success" sx={{ mb: 0.5 }} />
                      )}
                      {seller.yearOfEstablishment && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Est. {seller.yearOfEstablishment}
                        </Typography>
                      )}
                      {seller.estimatedMonthlyOrderVolume && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Volume: {seller.estimatedMonthlyOrderVolume}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {seller.homeAddress ? (
                      <>
                        <Typography variant="body2">
                          {seller.homeAddress.city}, {seller.homeAddress.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {seller.homeAddress.pinCode}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Address not available
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {seller.primaryProductCategories ? (
                      <Tooltip title={seller.primaryProductCategories}>
                        <Typography variant="body2" sx={{ 
                          maxWidth: 150, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {seller.primaryProductCategories}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not specified
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={seller.status}
                      color={getStatusColor(seller.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(seller.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => openSellerDetails(seller)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Seller Details Dialog */}
      <SellerDetailsDialog
        open={viewDialogOpen}
        seller={selectedSeller}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedSeller(null);
        }}
        onVerify={handleVerification}
      />
      </Box>
      </SellerErrorBoundary>
    </DashboardLayout>
  );
};

export default SellersListPage;