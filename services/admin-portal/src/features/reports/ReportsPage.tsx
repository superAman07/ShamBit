import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Tabs, Tab, Paper, Alert, Snackbar } from '@mui/material';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  fetchSalesReport,
  fetchRevenueReport,
  fetchTopProductsReport,
  setPeriod,
  setDateRange,
} from '@/store/slices/reportsSlice';
import { ReportPeriod } from '@/types/reports';
import {
  DateRangeSelector,
  SalesReportTab,
  RevenueReportTab,
  ProductsReportTab,
} from './components';

export const ReportsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.reports);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const loadReports = useCallback(() => {
    dispatch(fetchSalesReport(filters));
    dispatch(fetchRevenueReport(filters));
    dispatch(fetchTopProductsReport(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePeriodChange = (period: ReportPeriod) => {
    dispatch(setPeriod(period));
  };

  const handleCustomDateRangeChange = (startDate: string, endDate: string) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced update
    const timer = setTimeout(() => {
      dispatch(setDateRange({ startDate, endDate }));
    }, 500);

    setDebounceTimer(timer);
  };

  const handleExportSuccess = () => {
    setSnackbarMessage('Report exported successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleExportError = (errorMessage: string) => {
    setSnackbarMessage(errorMessage || 'Failed to export report');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <DashboardLayout>
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Reports
        </Typography>

        {/* Date Range Selector */}
        <DateRangeSelector
          currentPeriod={filters.period || 'custom'}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onPeriodChange={handlePeriodChange}
          onCustomDateRangeChange={handleCustomDateRangeChange}
        />

        {/* Tabs */}
        <Paper sx={{ mt: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Sales" />
            <Tab label="Revenue" />
            <Tab label="Products" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <SalesReportTab
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
              />
            )}
            {activeTab === 1 && (
              <RevenueReportTab
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
              />
            )}
            {activeTab === 2 && (
              <ProductsReportTab
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
              />
            )}
          </Box>
        </Paper>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};
