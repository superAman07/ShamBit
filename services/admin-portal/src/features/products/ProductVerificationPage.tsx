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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardMedia,
  Avatar,
} from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pause as HoldIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  mrp: number;
  sellingPrice: number;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'hold';
  verificationNotes?: string;
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  createdAt: string;
  sellerInfo: {
    id: string;
    name: string;
    email: string;
    businessName?: string;
    sellerType: 'individual' | 'business';
  };
  category?: {
    name: string;
  };
  brand?: {
    name: string;
  };
}

const ProductVerificationPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | 'hold'>('approve');
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    loadProducts();
  }, [page, rowsPerPage, search, statusFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // API call to get products for verification
      const response = await fetch(`/api/v1/sellers/products/${statusFilter === 'pending' ? 'pending' : ''}?` + new URLSearchParams({
        page: (page + 1).toString(),
        pageSize: rowsPerPage.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'pending' && { verificationStatus: statusFilter }),
      }));
      
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        setTotal(data.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/v1/sellers/products/${selectedProduct.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: verificationAction,
          notes: verificationNotes,
          adminId: 'current-admin-id', // Replace with actual admin ID
        }),
      });

      if (response.ok) {
        setVerificationDialogOpen(false);
        setVerificationNotes('');
        loadProducts();
      }
    } catch (error) {
      console.error('Failed to verify product:', error);
    }
  };

  const handleToggleFeatured = async (productId: string, isFeatured: boolean) => {
    try {
      const response = await fetch(`/api/v1/sellers/products/${productId}/featured`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      });

      if (response.ok) {
        loadProducts();
      }
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'hold': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const openVerificationDialog = (product: Product, action: 'approve' | 'reject' | 'hold') => {
    setSelectedProduct(product);
    setVerificationAction(action);
    setVerificationDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Product Verification
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search products..."
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
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="hold">On Hold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Products Table */}
        <Paper>
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Category/Brand</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {product.imageUrls.length > 0 ? (
                          <Avatar
                            src={product.imageUrls[0]}
                            sx={{ width: 50, height: 50, mr: 2 }}
                            variant="rounded"
                          />
                        ) : (
                          <Avatar sx={{ width: 50, height: 50, mr: 2 }} variant="rounded">
                            P
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="subtitle2">{product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {product.sku}
                          </Typography>
                          {product.isFeatured && (
                            <Chip label="Featured" size="small" color="warning" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {product.sellerInfo.sellerType === 'business' ? 
                          <BusinessIcon sx={{ mr: 1, fontSize: 16 }} /> : 
                          <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                        }
                        <Box>
                          <Typography variant="body2">
                            {product.sellerInfo.businessName || product.sellerInfo.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.sellerInfo.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.category?.name || 'No Category'}
                      </Typography>
                      {product.brand && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {product.brand.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">₹{product.sellingPrice}</Typography>
                      {product.mrp !== product.sellingPrice && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                          ₹{product.mrp}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.verificationStatus}
                        color={getStatusColor(product.verificationStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(product.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedProduct(product);
                            setViewDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {product.verificationStatus === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openVerificationDialog(product, 'approve')}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openVerificationDialog(product, 'reject')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hold">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => openVerificationDialog(product, 'hold')}
                            >
                              <HoldIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      
                      {product.verificationStatus === 'approved' && (
                        <Tooltip title={product.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleToggleFeatured(product.id, product.isFeatured)}
                          >
                            {product.isFeatured ? <StarIcon /> : <StarBorderIcon />}
                          </IconButton>
                        </Tooltip>
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

        {/* Product Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Product Details</DialogTitle>
          <DialogContent>
            {selectedProduct && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {selectedProduct.imageUrls.length > 0 && (
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={selectedProduct.imageUrls[0]}
                        alt={selectedProduct.name}
                      />
                    </Card>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>{selectedProduct.name}</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedProduct.description || 'No description provided'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">SKU: {selectedProduct.sku}</Typography>
                    <Typography variant="subtitle2">MRP: ₹{selectedProduct.mrp}</Typography>
                    <Typography variant="subtitle2">Selling Price: ₹{selectedProduct.sellingPrice}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Seller Information:</Typography>
                    <Typography variant="body2">
                      {selectedProduct.sellerInfo.businessName || selectedProduct.sellerInfo.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedProduct.sellerInfo.email}
                    </Typography>
                  </Box>

                  {selectedProduct.verificationNotes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Verification Notes:</Typography>
                      <Typography variant="body2">{selectedProduct.verificationNotes}</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Verification Dialog */}
        <Dialog open={verificationDialogOpen} onClose={() => setVerificationDialogOpen(false)}>
          <DialogTitle>
            {verificationAction === 'approve' && 'Approve Product'}
            {verificationAction === 'reject' && 'Reject Product'}
            {verificationAction === 'hold' && 'Put Product on Hold'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Add notes about your decision..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVerificationDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleVerification} 
              variant="contained"
              color={verificationAction === 'approve' ? 'success' : verificationAction === 'reject' ? 'error' : 'warning'}
            >
              {verificationAction === 'approve' && 'Approve'}
              {verificationAction === 'reject' && 'Reject'}
              {verificationAction === 'hold' && 'Put on Hold'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ProductVerificationPage;