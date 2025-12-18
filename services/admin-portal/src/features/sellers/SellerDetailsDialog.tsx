import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  CardHeader,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  Receipt as TaxIcon,
  Inventory as ProductIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pause as HoldIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Seller } from '../../services/sellerService';

interface SellerDetailsDialogProps {
  open: boolean;
  seller: Seller | null;
  onClose: () => void;
  onVerify: (action: 'approve' | 'reject' | 'hold', notes?: string) => Promise<void>;
}

const SellerDetailsDialog: React.FC<SellerDetailsDialogProps> = ({
  open,
  seller,
  onClose,
  onVerify,
}) => {
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | 'hold' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!seller) return null;

  const handleVerification = async () => {
    if (!verificationAction) return;
    
    setLoading(true);
    try {
      await onVerify(verificationAction, verificationNotes);
      setVerificationAction(null);
      setVerificationNotes('');
      onClose();
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
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

  const documentTypes = [
    'panCard',
    'aadhaar',
    'businessRegistration',
    'gstCertificate',
    'addressProof',
    'photograph',
    'cancelledCheque'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Seller Details</Typography>
          <Chip
            label={seller.status.toUpperCase()}
            color={getStatusColor(seller.status) as any}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<PersonIcon />}
                title="Personal Information"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Full Name</Typography>
                    <Typography variant="body1">{seller.fullName || 'Not provided'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{seller.email}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Mobile</Typography>
                    <Typography variant="body1">{seller.mobile || 'Not provided'}</Typography>
                  </Grid>
                  {seller.dateOfBirth && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                      <Typography variant="body1">{format(new Date(seller.dateOfBirth), 'MMM dd, yyyy')}</Typography>
                    </Grid>
                  )}
                  {seller.gender && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{seller.gender}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Business Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<BusinessIcon />}
                title="Business Information"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Seller Type</Typography>
                    <Chip label={seller.sellerType || 'Legacy'} size="small" variant="outlined" />
                  </Grid>
                  {seller.businessName && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Business Name</Typography>
                      <Typography variant="body1">{seller.businessName}</Typography>
                    </Grid>
                  )}
                  {seller.businessType && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Business Type</Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{seller.businessType}</Typography>
                    </Grid>
                  )}
                  {seller.natureOfBusiness && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Nature of Business</Typography>
                      <Typography variant="body1">{seller.natureOfBusiness}</Typography>
                    </Grid>
                  )}
                  {seller.yearOfEstablishment && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Year of Establishment</Typography>
                      <Typography variant="body1">{seller.yearOfEstablishment}</Typography>
                    </Grid>
                  )}
                  {seller.businessPhone && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Business Phone</Typography>
                      <Typography variant="body1">{seller.businessPhone}</Typography>
                    </Grid>
                  )}
                  {seller.businessEmail && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Business Email</Typography>
                      <Typography variant="body1">{seller.businessEmail}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Product & Operational Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<ProductIcon />}
                title="Product & Operational Information"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Primary Product Categories</Typography>
                    <Typography variant="body1">{seller.primaryProductCategories || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Estimated Monthly Order Volume</Typography>
                    <Typography variant="body1">{seller.estimatedMonthlyOrderVolume || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Preferred Pickup Time Slots</Typography>
                    <Typography variant="body1">{seller.preferredPickupTimeSlots || 'Not specified'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Max Order Processing Time</Typography>
                    <Typography variant="body1">{seller.maxOrderProcessingTime ? `${seller.maxOrderProcessingTime} days` : 'Not specified'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Address Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<LocationIcon />}
                title="Address Information"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Home Address</Typography>
                    {seller.homeAddress ? (
                      <Typography variant="body1">
                        {seller.homeAddress.addressLine1}
                        {seller.homeAddress.addressLine2 && `, ${seller.homeAddress.addressLine2}`}
                        <br />
                        {seller.homeAddress.city}, {seller.homeAddress.state} - {seller.homeAddress.pinCode}
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="text.secondary">Not provided</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Business Address</Typography>
                    {seller.businessAddress ? (
                      seller.businessAddress.sameAsHome ? (
                        <Typography variant="body1" color="text.secondary">Same as home address</Typography>
                      ) : (
                        <Typography variant="body1">
                          {seller.businessAddress.addressLine1}
                          {seller.businessAddress.addressLine2 && `, ${seller.businessAddress.addressLine2}`}
                          <br />
                          {seller.businessAddress.city}, {seller.businessAddress.state} - {seller.businessAddress.pinCode}
                        </Typography>
                      )
                    ) : (
                      <Typography variant="body1" color="text.secondary">Not provided</Typography>
                    )}
                  </Grid>
                  {seller.warehouseAddress && !seller.warehouseAddress.sameAsBusiness && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Warehouse Address</Typography>
                      <Typography variant="body1">
                        {seller.warehouseAddress.addressLine1}
                        {seller.warehouseAddress.addressLine2 && `, ${seller.warehouseAddress.addressLine2}`}
                        <br />
                        {seller.warehouseAddress.city}, {seller.warehouseAddress.state} - {seller.warehouseAddress.pinCode}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Tax & Compliance Details */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<TaxIcon />}
                title="Tax & Compliance Details"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">GST Registered</Typography>
                    <Chip 
                      label={seller.gstRegistered ? 'Yes' : 'No'} 
                      color={seller.gstRegistered ? 'success' : 'default'}
                      size="small" 
                    />
                  </Grid>
                  {seller.gstNumber && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">GST Number</Typography>
                      <Typography variant="body1">{seller.gstNumber}</Typography>
                    </Grid>
                  )}
                  {seller.panNumber && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">PAN Number</Typography>
                      <Typography variant="body1">{seller.panNumber}</Typography>
                    </Grid>
                  )}
                  {seller.panHolderName && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">PAN Holder Name</Typography>
                      <Typography variant="body1">{seller.panHolderName}</Typography>
                    </Grid>
                  )}
                  {seller.aadhaarNumber && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Aadhaar Number</Typography>
                      <Typography variant="body1">XXXX-XXXX-{seller.aadhaarNumber.slice(-4)}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Bank Details */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<BankIcon />}
                title="Bank Account Details"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  {seller.bankDetails ? (
                    <>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Account Holder Name</Typography>
                        <Typography variant="body1">{seller.bankDetails.accountHolderName}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Bank Name</Typography>
                        <Typography variant="body1">{seller.bankDetails.bankName}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Account Number</Typography>
                        <Typography variant="body1">XXXX-XXXX-{seller.bankDetails.accountNumber.slice(-4)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">IFSC Code</Typography>
                        <Typography variant="body1">{seller.bankDetails.ifscCode}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Account Type</Typography>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{seller.bankDetails.accountType}</Typography>
                      </Grid>
                    </>
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body1" color="text.secondary">Bank details not provided</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Documents */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<DocumentIcon />}
                title="Uploaded Documents"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  {documentTypes.map((docType) => {
                    const isUploaded = seller.documentsUploaded && seller.documentsUploaded[docType];
                    return (
                      <Grid item xs={12} md={6} key={docType}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {docType.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          {isUploaded ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip label="Uploaded" color="success" size="small" />
                              <IconButton 
                                size="small" 
                                onClick={() => window.open(seller.documentsUploaded![docType], '_blank')}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Chip label="Not Uploaded" color="error" size="small" />
                          )}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Verification Notes */}
          {seller.verificationNotes && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="subtitle2">Verification Notes:</Typography>
                <Typography variant="body2">{seller.verificationNotes}</Typography>
              </Alert>
            </Grid>
          )}

          {/* Verification Actions */}
          {seller.status === 'pending' && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Verification Actions" titleTypographyProps={{ variant: 'h6' }} />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Action</InputLabel>
                        <Select
                          value={verificationAction || ''}
                          label="Action"
                          onChange={(e) => setVerificationAction(e.target.value as any)}
                        >
                          <MenuItem value="approve">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ApproveIcon sx={{ mr: 1, color: 'success.main' }} />
                              Approve
                            </Box>
                          </MenuItem>
                          <MenuItem value="reject">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <RejectIcon sx={{ mr: 1, color: 'error.main' }} />
                              Reject
                            </Box>
                          </MenuItem>
                          <MenuItem value="hold">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <HoldIcon sx={{ mr: 1, color: 'warning.main' }} />
                              Put on Hold
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Verification Notes"
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Add notes about the verification decision..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {seller.status === 'pending' && verificationAction && (
          <Button 
            onClick={handleVerification} 
            variant="contained" 
            disabled={loading}
            color={verificationAction === 'approve' ? 'success' : verificationAction === 'reject' ? 'error' : 'warning'}
          >
            {loading ? 'Processing...' : `${verificationAction.charAt(0).toUpperCase() + verificationAction.slice(1)} Seller`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SellerDetailsDialog;