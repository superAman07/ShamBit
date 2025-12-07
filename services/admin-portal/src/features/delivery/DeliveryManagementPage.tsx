import React, { useEffect, useState } from 'react';
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
  Tooltip,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as MetricsIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Lock as PasswordIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  fetchDeliveryPersonnel,
  fetchActiveDeliveries,
  fetchDeliveryStatusOverview,
  createDeliveryPersonnel,
  updateDeliveryPersonnel,
  deleteDeliveryPersonnel,
  reassignDelivery,
  resetDeliveryPersonnelPassword,
  setPersonnelPage,
  setPersonnelPageSize,
  setPersonnelFilters,
  clearErrors,
} from '@/store/slices/deliverySlice';
import { DeliveryPersonnel, Delivery } from '@/types/delivery';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PersonnelFormDialog } from './components/PersonnelFormDialog';
import { ActiveDeliveriesPanel } from './components/ActiveDeliveriesPanel';
import { ReassignDialog } from './components/ReassignDialog';
import { PersonnelMetricsDialog } from './components/PersonnelMetricsDialog';
import { PasswordResetDialog } from './components/PasswordResetDialog';

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
      id={`delivery-tabpanel-${index}`}
      aria-labelledby={`delivery-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const DeliveryManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    personnel,
    totalPersonnel,
    personnelPage,
    personnelPageSize,
    personnelFilters,
    activeDeliveries,
    statusOverview,
    loading,
    error,
  } = useSelector((state: RootState) => state.delivery);

  const [currentTab, setCurrentTab] = useState(0);
  const [personnelDialogOpen, setPersonnelDialogOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<DeliveryPersonnel | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [selectedMetricsPersonnel, setSelectedMetricsPersonnel] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [selectedPasswordResetPersonnel, setSelectedPasswordResetPersonnel] = useState<DeliveryPersonnel | null>(null);

  useEffect(() => {
    dispatch(fetchDeliveryPersonnel({ page: personnelPage, pageSize: personnelPageSize, filters: personnelFilters }));
    dispatch(fetchActiveDeliveries());
    dispatch(fetchDeliveryStatusOverview());
  }, [dispatch, personnelPage, personnelPageSize, personnelFilters]);

  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    dispatch(setPersonnelPage(newPage + 1));
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setPersonnelPageSize(parseInt(event.target.value, 10)));
  };

  const handleAddPersonnel = () => {
    setSelectedPersonnel(null);
    setPersonnelDialogOpen(true);
  };

  const handleEditPersonnel = (personnel: DeliveryPersonnel) => {
    setSelectedPersonnel(personnel);
    setPersonnelDialogOpen(true);
  };

  const handleDeletePersonnel = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery personnel?')) {
      await dispatch(deleteDeliveryPersonnel(id));
      dispatch(fetchDeliveryPersonnel({ page: personnelPage, pageSize: personnelPageSize, filters: personnelFilters }));
    }
  };

  const handlePersonnelSubmit = async (data: any) => {
    try {
      if (selectedPersonnel) {
        await dispatch(updateDeliveryPersonnel({ id: selectedPersonnel.id, data })).unwrap();
      } else {
        await dispatch(createDeliveryPersonnel(data)).unwrap();
      }
      setPersonnelDialogOpen(false);
      dispatch(fetchDeliveryPersonnel({ page: personnelPage, pageSize: personnelPageSize, filters: personnelFilters }));
      dispatch(fetchDeliveryStatusOverview());
    } catch (err) {
      // Error is handled in the dialog
    }
  };

  const handleReassign = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setReassignDialogOpen(true);
  };

  const handleReassignSubmit = async (deliveryId: string, personnelId: string) => {
    try {
      await dispatch(reassignDelivery({ deliveryId, deliveryPersonnelId: personnelId })).unwrap();
      setReassignDialogOpen(false);
      dispatch(fetchActiveDeliveries());
    } catch (err) {
      // Error is handled in the dialog
    }
  };

  const handleViewMetrics = (personnel: DeliveryPersonnel) => {
    setSelectedMetricsPersonnel({ id: personnel.id, name: personnel.name });
    setMetricsDialogOpen(true);
  };

  const handleResetPassword = (personnel: DeliveryPersonnel) => {
    setSelectedPasswordResetPersonnel(personnel);
    setPasswordResetDialogOpen(true);
  };

  const handlePasswordResetSubmit = async (password: string) => {
    if (selectedPasswordResetPersonnel) {
      try {
        await dispatch(resetDeliveryPersonnelPassword({ 
          id: selectedPasswordResetPersonnel.id, 
          password 
        })).unwrap();
        setPasswordResetDialogOpen(false);
        // Show success message or notification here
      } catch (err) {
        // Error is handled in the dialog
      }
    }
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'available') => {
    switch (filter) {
      case 'all':
        dispatch(setPersonnelFilters({}));
        break;
      case 'active':
        dispatch(setPersonnelFilters({ isActive: true }));
        break;
      case 'available':
        dispatch(setPersonnelFilters({ isActive: true, isAvailable: true }));
        break;
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Delivery Management
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddPersonnel}>
            Add Personnel
          </Button>
        </Box>

        {/* Status Overview Cards */}
        {statusOverview && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Deliveries
                  </Typography>
                  <Typography variant="h4">{statusOverview.totalActive}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {statusOverview.assigned} assigned • {statusOverview.pickedUp} picked up •{' '}
                    {statusOverview.inTransit} in transit
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Personnel
                  </Typography>
                  <Typography variant="h4">{statusOverview.totalPersonnel}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Available Personnel
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {statusOverview.availablePersonnel}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Busy Personnel
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {statusOverview.busyPersonnel}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Personnel List" />
            <Tab label="Active Deliveries" />
          </Tabs>
        </Paper>

        {/* Personnel List Tab */}
        <TabPanel value={currentTab} index={0}>
          {/* Filter Buttons */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant={Object.keys(personnelFilters).length === 0 ? 'contained' : 'outlined'}
              onClick={() => handleFilterChange('all')}
              size="small"
            >
              All
            </Button>
            <Button
              variant={personnelFilters.isActive === true && !personnelFilters.isAvailable ? 'contained' : 'outlined'}
              onClick={() => handleFilterChange('active')}
              size="small"
            >
              Active Only
            </Button>
            <Button
              variant={personnelFilters.isAvailable === true ? 'contained' : 'outlined'}
              onClick={() => handleFilterChange('available')}
              size="small"
            >
              Available Only
            </Button>
          </Box>

          <Paper>
            {error.personnel && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error.personnel}
              </Alert>
            )}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Availability</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading.personnel ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Loading personnel...
                      </TableCell>
                    </TableRow>
                  ) : personnel.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No delivery personnel found
                      </TableCell>
                    </TableRow>
                  ) : (
                    personnel.map((person) => (
                      <TableRow key={person.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {person.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{person.mobileNumber}</Typography>
                            {person.email && (
                              <Typography variant="caption" color="textSecondary">
                                {person.email}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {person.vehicleType ? (
                            <Box>
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {person.vehicleType}
                              </Typography>
                              {person.vehicleNumber && (
                                <Typography variant="caption" color="textSecondary">
                                  {person.vehicleNumber}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={person.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={person.isActive ? 'Active' : 'Inactive'}
                            color={person.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={person.isAvailable ? 'Available' : 'Busy'}
                            color={person.isAvailable ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View Metrics">
                              <IconButton size="small" onClick={() => handleViewMetrics(person)}>
                                <MetricsIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reset Password">
                              <IconButton size="small" onClick={() => handleResetPassword(person)}>
                                <PasswordIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEditPersonnel(person)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePersonnel(person.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalPersonnel}
              page={personnelPage - 1}
              onPageChange={handlePageChange}
              rowsPerPage={personnelPageSize}
              onRowsPerPageChange={handlePageSizeChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </TabPanel>

        {/* Active Deliveries Tab */}
        <TabPanel value={currentTab} index={1}>
          <ActiveDeliveriesPanel
            deliveries={activeDeliveries}
            loading={loading.activeDeliveries}
            error={error.activeDeliveries}
            onReassign={handleReassign}
            onViewDetails={(delivery) => {
              // Could open a delivery details dialog
              console.log('View delivery details:', delivery);
            }}
          />
        </TabPanel>

        {/* Dialogs */}
        <PersonnelFormDialog
          open={personnelDialogOpen}
          onClose={() => setPersonnelDialogOpen(false)}
          onSubmit={handlePersonnelSubmit}
          personnel={selectedPersonnel}
          loading={loading.action}
          error={error.action}
        />

        <ReassignDialog
          open={reassignDialogOpen}
          onClose={() => setReassignDialogOpen(false)}
          onSubmit={handleReassignSubmit}
          delivery={selectedDelivery}
          availablePersonnel={personnel.filter((p) => p.isActive)}
          loading={loading.action}
          error={error.action}
        />

        {selectedMetricsPersonnel && (
          <PersonnelMetricsDialog
            open={metricsDialogOpen}
            onClose={() => setMetricsDialogOpen(false)}
            personnelId={selectedMetricsPersonnel.id}
            personnelName={selectedMetricsPersonnel.name}
          />
        )}

        <PasswordResetDialog
          open={passwordResetDialogOpen}
          onClose={() => setPasswordResetDialogOpen(false)}
          onSubmit={handlePasswordResetSubmit}
          personnel={selectedPasswordResetPersonnel}
          loading={loading.action}
          error={error.action}
        />
      </Box>
    </DashboardLayout>
  );
};
