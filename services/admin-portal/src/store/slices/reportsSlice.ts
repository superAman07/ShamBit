import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { reportsService } from '@/services/reportsService';
import {
  SalesReport,
  RevenueReport,
  TopProductsReport,
  ReportFilters,
  ReportPeriod,
} from '@/types/reports';

interface ReportsState {
  salesReport: SalesReport | null;
  revenueReport: RevenueReport | null;
  productsReport: TopProductsReport | null;
  filters: ReportFilters;
  loading: {
    sales: boolean;
    revenue: boolean;
    products: boolean;
    export: boolean;
  };
  error: {
    sales: string | null;
    revenue: string | null;
    products: string | null;
    export: string | null;
  };
}

const getDefaultDateRange = (): { startDate: string; endDate: string } => {
  const today = new Date();
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);
  
  return {
    startDate: last30Days.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
};

const initialState: ReportsState = {
  salesReport: null,
  revenueReport: null,
  productsReport: null,
  filters: {
    ...getDefaultDateRange(),
    period: 'last_30_days',
  },
  loading: {
    sales: false,
    revenue: false,
    products: false,
    export: false,
  },
  error: {
    sales: null,
    revenue: null,
    products: null,
    export: null,
  },
};

// Async thunks
export const fetchSalesReport = createAsyncThunk(
  'reports/fetchSalesReport',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      return await reportsService.getSalesReport(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch sales report');
    }
  }
);

export const fetchRevenueReport = createAsyncThunk(
  'reports/fetchRevenueReport',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      return await reportsService.getRevenueReport(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch revenue report');
    }
  }
);

export const fetchTopProductsReport = createAsyncThunk(
  'reports/fetchTopProductsReport',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      return await reportsService.getTopProductsReport(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch products report');
    }
  }
);

export const exportSalesReportCSV = createAsyncThunk(
  'reports/exportSalesReportCSV',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      const blob = await reportsService.exportSalesReportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-report-${filters.startDate}-to-${filters.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to export sales report');
    }
  }
);

export const exportRevenueReportCSV = createAsyncThunk(
  'reports/exportRevenueReportCSV',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      const blob = await reportsService.exportRevenueReportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue-report-${filters.startDate}-to-${filters.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to export revenue report');
    }
  }
);

export const exportProductsReportCSV = createAsyncThunk(
  'reports/exportProductsReportCSV',
  async (filters: ReportFilters, { rejectWithValue }) => {
    try {
      const blob = await reportsService.exportProductsReportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-report-${filters.startDate}-to-${filters.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to export products report');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
      state.filters.period = 'custom';
    },
    setPeriod: (state, action: PayloadAction<ReportPeriod>) => {
      state.filters.period = action.payload;
      
      // Calculate date range based on period
      const today = new Date();
      let startDate: Date;
      
      switch (action.payload) {
        case 'today':
          startDate = new Date(today);
          break;
        case 'last_7_days':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'last_30_days':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 30);
          break;
        case 'this_month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'last_month': {
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          state.filters.endDate = endOfLastMonth.toISOString().split('T')[0];
          state.filters.startDate = startDate.toISOString().split('T')[0];
          return;
        }
        default:
          return;
      }
      
      state.filters.startDate = startDate.toISOString().split('T')[0];
      state.filters.endDate = today.toISOString().split('T')[0];
    },
    clearReportsData: (state) => {
      state.salesReport = null;
      state.revenueReport = null;
      state.productsReport = null;
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Sales Report
    builder
      .addCase(fetchSalesReport.pending, (state) => {
        state.loading.sales = true;
        state.error.sales = null;
      })
      .addCase(fetchSalesReport.fulfilled, (state, action) => {
        state.loading.sales = false;
        state.salesReport = action.payload;
      })
      .addCase(fetchSalesReport.rejected, (state, action) => {
        state.loading.sales = false;
        state.error.sales = action.payload as string;
      });

    // Revenue Report
    builder
      .addCase(fetchRevenueReport.pending, (state) => {
        state.loading.revenue = true;
        state.error.revenue = null;
      })
      .addCase(fetchRevenueReport.fulfilled, (state, action) => {
        state.loading.revenue = false;
        state.revenueReport = action.payload;
      })
      .addCase(fetchRevenueReport.rejected, (state, action) => {
        state.loading.revenue = false;
        state.error.revenue = action.payload as string;
      });

    // Products Report
    builder
      .addCase(fetchTopProductsReport.pending, (state) => {
        state.loading.products = true;
        state.error.products = null;
      })
      .addCase(fetchTopProductsReport.fulfilled, (state, action) => {
        state.loading.products = false;
        state.productsReport = action.payload;
      })
      .addCase(fetchTopProductsReport.rejected, (state, action) => {
        state.loading.products = false;
        state.error.products = action.payload as string;
      });

    // Export CSV
    builder
      .addCase(exportSalesReportCSV.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportSalesReportCSV.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportSalesReportCSV.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload as string;
      })
      .addCase(exportRevenueReportCSV.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportRevenueReportCSV.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportRevenueReportCSV.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload as string;
      })
      .addCase(exportProductsReportCSV.pending, (state) => {
        state.loading.export = true;
        state.error.export = null;
      })
      .addCase(exportProductsReportCSV.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportProductsReportCSV.rejected, (state, action) => {
        state.loading.export = false;
        state.error.export = action.payload as string;
      });
  },
});

export const { setDateRange, setPeriod, clearReportsData } = reportsSlice.actions;
export default reportsSlice.reducer;
