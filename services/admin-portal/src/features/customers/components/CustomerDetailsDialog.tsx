import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as VerifiedIcon,
  Warning as SuspiciousIcon,
  Help as NotVerifiedIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  fetchCustomerById,
  clearSelectedCustomer,
} from '@/store/slices/customerSlice';
import { VerificationStatus } from '@/types/customer';
import { ProfileTab } from './ProfileTab';
import { AddressesTab } from './AddressesTab';
import { OrdersTab } from './OrdersTab';
import { NotesTab } from './NotesTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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

export const CustomerDetailsDialog: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    selectedCustomerId,
    selectedCustomer,
    loading,
    error,
  } = useSelector((state: RootState) => state.customers);

  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (selectedCustomerId) {
      dispatch(fetchCustomerById(selectedCustomerId));
    }
  }, [dispatch, selectedCustomerId]);

  const handleClose = () => {
    dispatch(clearSelectedCustomer());
    setCurrentTab(0);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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

  const open = Boolean(selectedCustomerId);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              {selectedCustomer ? `Customer Details - ${selectedCustomer.name}` : 'Customer Details'}
            </Typography>
            {selectedCustomer && (
              <Chip
                icon={VERIFICATION_STATUS_ICONS[selectedCustomer.verificationStatus]}
                label={getVerificationStatusLabel(selectedCustomer.verificationStatus)}
                color={VERIFICATION_STATUS_COLORS[selectedCustomer.verificationStatus]}
                size="small"
              />
            )}
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading.customerDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        ) : error.customerDetails ? (
          <Alert severity="error">{error.customerDetails}</Alert>
        ) : selectedCustomer ? (
          <>
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Profile" />
              <Tab label="Addresses" />
              <Tab label="Orders" />
              <Tab label="Notes" />
            </Tabs>

            <TabPanel value={currentTab} index={0}>
              <ProfileTab customer={selectedCustomer} />
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
              <AddressesTab addresses={selectedCustomer.addresses} />
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
              <OrdersTab customerId={selectedCustomer.id} />
            </TabPanel>

            <TabPanel value={currentTab} index={3}>
              <NotesTab customerId={selectedCustomer.id} notes={selectedCustomer.notes} />
            </TabPanel>
          </>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
