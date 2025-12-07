import React, { useEffect, useState } from 'react';
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
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as VerifiedIcon,
  Warning as SuspiciousIcon,
  Help as NotVerifiedIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  fetchCustomers,
  setFilters,
  setPage,
  setPageSize,
  setSorting,
  setSelectedCustomerId,
  clearErrors,
} from '@/store/slices/customerSlice';
import { VerificationStatus } from '@/types/customer';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useDebounce } from '@/hooks/useDebounce';
import { CustomerDetailsDialog } from './components/CustomerDetailsDialog';

const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  verified: 'success',
  not_verified: 'default',
  suspicious: 'warning',
};

const VERIFICATION_STATUS_ICONS: Record<VerificationStatus, React.ReactElement> = {
  verified: <VerifiedIcon fontSize="small" />,
  not_verified: <NotVerifiedIcon fontSize="small" />,
  suspicious: <SuspiciousIcon fontSize="small" />,
};

export const CustomerListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    customers,
    totalCustomers,
    currentPage,
    pageSize,
    filters,
    sortBy,
    sortOrder,
    statistics,
    loading,
    error,
  } = useSelector((state: RootState) => state.customers);

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    dispatch(fetchCustomers({
      page: currentPage,
      pageSize,
      filters,
      sortBy,
      sortOrder,
    }));
  }, [dispatch, currentPage, pageSize, filters, sortBy, sortOrder]);

  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Update filters when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      dispatch(setFilters({ ...filters, search: debouncedSearchTerm || undefined }));
    }
  }, [debouncedSearchTerm]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    dispatch(setPage(newPage + 1)); // MUI uses 0-based indexing
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setPageSize(parseInt(event.target.value, 10)));
  };

  const handleSort = (field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch(setSorting({ sortBy: field, sortOrder: newSortOrder }));
  };

  const handleVerificationStatusFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    dispatch(setFilters({
      ...filters,
      verificationStatus: value ? (value as VerificationStatus) : undefined,
    }));
  };

  const handleAccountStatusFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    dispatch(setFilters({
      ...filters,
      accountStatus: value ? (value as 'active' | 'blocked') : undefined,
    }));
  };

  const handleRowClick = (customerId: string) => {
    dispatch(setSelectedCustomerId(customerId));
  };

  const getVerificationStatusLabel = (status: VerificationStatus): string => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'not_verified':
        return 'Not Verified';
      case 'suspicious':
        return 'Suspicious';
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <CustomerDetailsDialog />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">
            Customer Management
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name or mobile number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            label="Verification Status"
            value={filters.verificationStatus || ''}
            onChange={handleVerificationStatusFilter}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="verified">Verified</MenuItem>
            <MenuItem value="not_verified">Not Verified</MenuItem>
            <MenuItem value="suspicious">Suspicious</MenuItem>
          </TextField>
          <TextField
            select
            label="Account Status"
            value={filters.accountStatus || ''}
            onChange={handleAccountStatusFilter}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </TextField>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Customers
                </Typography>
                <Typography variant="h5">
                  {statistics.totalCustomers.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Customers
                </Typography>
                <Typography variant="h5">
                  {statistics.activeCustomers.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Blocked Customers
                </Typography>
                <Typography variant="h5">
                  {statistics.blockedCustomers.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  New (Last 30 Days)
                </Typography>
                <Typography variant="h5">
                  {statistics.newCustomersLast30Days.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Customers Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </TableCell>
                  <TableCell>Mobile Number</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('verificationStatus')}
                  >
                    Verification Status
                  </TableCell>
                  <TableCell>Account Status</TableCell>
                  <TableCell align="right">Total Orders</TableCell>
                  <TableCell align="right">Total Spent</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('lastOrderDate')}
                  >
                    Last Order
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('createdAt')}
                  >
                    Registered
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.customers ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : error.customers ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ color: 'error.main' }}>
                      Error: {error.customers}
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(customer.id)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {customer.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.mobileNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {customer.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={VERIFICATION_STATUS_ICONS[customer.verificationStatus]}
                          label={getVerificationStatusLabel(customer.verificationStatus)}
                          color={VERIFICATION_STATUS_COLORS[customer.verificationStatus]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.isBlocked ? 'Blocked' : 'Active'}
                          color={customer.isBlocked ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {customer.totalOrders}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(customer.totalSpent)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(customer.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCustomers}
            page={currentPage - 1} // MUI uses 0-based indexing
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Paper>
      </Box>
    </DashboardLayout>
  );
};
