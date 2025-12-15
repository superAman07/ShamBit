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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Block as SuspendIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { sellerService, Seller, SellerStatistics } from '../../services/sellerService';
import { format } from 'date-fns';

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
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'suspended'>('approved');
  const [actionNotes, setActionNotes] = useState('');

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

  const handleStatusUpdate = async () => {
    if (!selectedSeller) return;

    try {
      await sellerService.updateSellerStatus(
        selectedSeller.id,
        actionType,
        actionNotes || undefined
      );
      setActionDialogOpen(false);
      setActionNotes('');
      loadSellers();
      loadStatistics();
    } catch (error) {
      console.error('Failed to update seller status:', error);
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

  const openActionDialog = (seller: Seller, action: 'approved' | 'rejected' | 'suspended') => {
    setSelectedSeller(seller);
    setActionType(action);
    setActionDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Seller Management
        </Typography>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StoreIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4">{statistics.total}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sellers
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
                  <PendingIcon sx={{ mr: 2, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4">{statistics.pending}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Approval
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
                  <PeopleIcon sx={{ mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4">{statistics.approved}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approved Sellers
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
                  <TrendingUpIcon sx={{ mr: 2, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4">{statistics.recentRegistrations}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      New This Month
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
                <TableCell>Business Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Registration Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{seller.businessName}</Typography>
                    {seller.gstin && (
                      <Typography variant="caption" color="text.secondary">
                        GSTIN: {seller.gstin}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{seller.ownerName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{seller.email}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {seller.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{seller.city}</TableCell>
                  <TableCell>
                    <Chip 
                      label={seller.businessType} 
                      size="small" 
                      variant="outlined"
                    />
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
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedSeller(seller);
                        setViewDialogOpen(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                    {seller.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(seller, 'approved')}
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openActionDialog(seller, 'rejected')}
                        >
                          <RejectIcon />
                        </IconButton>
                      </>
                    )}
                    {seller.status === 'approved' && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => openActionDialog(seller, 'suspended')}
                      >
                        <SuspendIcon />
                      </IconButton>
                    )}
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

      {/* View Seller Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Seller Details</DialogTitle>
        <DialogContent>
          {selectedSeller && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Business Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.businessName}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Owner Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.ownerName}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Email</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Phone</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">City</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.city}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Business Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedSeller.businessType}</Typography>
              </Grid>
              {selectedSeller.gstin && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">GSTIN</Typography>
                  <Typography variant="body1" gutterBottom>{selectedSeller.gstin}</Typography>
                </Grid>
              )}
              {selectedSeller.verificationNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Verification Notes</Typography>
                  <Typography variant="body1" gutterBottom>{selectedSeller.verificationNotes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
        <DialogTitle>
          {actionType === 'approved' && 'Approve Seller'}
          {actionType === 'rejected' && 'Reject Seller'}
          {actionType === 'suspended' && 'Suspend Seller'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default SellersListPage;