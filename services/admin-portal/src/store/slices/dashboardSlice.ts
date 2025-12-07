import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardService } from '@/services/dashboardService';
import {
  SalesMetrics,
  RecentOrder,
  LowStockProduct,
  DeliveryStatusOverview,
  DateRange,
} from '@/types/dashboard';

interface DashboardState {
  salesMetrics: SalesMetrics | null;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
  deliveryStatusOverview: DeliveryStatusOverview | null;
  dateRange: DateRange | null;
  loading: {
    salesMetrics: boolean;
    recentOrders: boolean;
    lowStockProducts: boolean;
    deliveryStatusOverview: boolean;
  };
  error: {
    salesMetrics: string | null;
    recentOrders: string | null;
    lowStockProducts: string | null;
    deliveryStatusOverview: string | null;
  };
}

const initialState: DashboardState = {
  salesMetrics: null,
  recentOrders: [],
  lowStockProducts: [],
  deliveryStatusOverview: null,
  dateRange: null,
  loading: {
    salesMetrics: false,
    recentOrders: false,
    lowStockProducts: false,
    deliveryStatusOverview: false,
  },
  error: {
    salesMetrics: null,
    recentOrders: null,
    lowStockProducts: null,
    deliveryStatusOverview: null,
  },
};

// Async thunks
export const fetchSalesMetrics = createAsyncThunk(
  'dashboard/fetchSalesMetrics',
  async (dateRange: DateRange | undefined, { rejectWithValue }) => {
    try {
      return await dashboardService.getSalesMetrics(dateRange);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch sales metrics');
    }
  }
);

export const fetchRecentOrders = createAsyncThunk(
  'dashboard/fetchRecentOrders',
  async (limit: number, { rejectWithValue }) => {
    try {
      return await dashboardService.getRecentOrders(limit);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch recent orders');
    }
  }
);

export const fetchLowStockProducts = createAsyncThunk(
  'dashboard/fetchLowStockProducts',
  async (limit: number, { rejectWithValue }) => {
    try {
      return await dashboardService.getLowStockProducts(limit);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch low stock products');
    }
  }
);

export const fetchDeliveryStatusOverview = createAsyncThunk(
  'dashboard/fetchDeliveryStatusOverview',
  async (_, { rejectWithValue }) => {
    try {
      return await dashboardService.getDeliveryStatusOverview();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch delivery status');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<DateRange | null>) => {
      state.dateRange = action.payload;
    },
    clearDashboardData: (state) => {
      state.salesMetrics = null;
      state.recentOrders = [];
      state.lowStockProducts = [];
      state.deliveryStatusOverview = null;
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Sales Metrics
    builder
      .addCase(fetchSalesMetrics.pending, (state) => {
        state.loading.salesMetrics = true;
        state.error.salesMetrics = null;
      })
      .addCase(fetchSalesMetrics.fulfilled, (state, action) => {
        state.loading.salesMetrics = false;
        state.salesMetrics = action.payload;
      })
      .addCase(fetchSalesMetrics.rejected, (state, action) => {
        state.loading.salesMetrics = false;
        state.error.salesMetrics = action.payload as string;
      });

    // Recent Orders
    builder
      .addCase(fetchRecentOrders.pending, (state) => {
        state.loading.recentOrders = true;
        state.error.recentOrders = null;
      })
      .addCase(fetchRecentOrders.fulfilled, (state, action) => {
        state.loading.recentOrders = false;
        state.recentOrders = action.payload;
      })
      .addCase(fetchRecentOrders.rejected, (state, action) => {
        state.loading.recentOrders = false;
        state.error.recentOrders = action.payload as string;
      });

    // Low Stock Products
    builder
      .addCase(fetchLowStockProducts.pending, (state) => {
        state.loading.lowStockProducts = true;
        state.error.lowStockProducts = null;
      })
      .addCase(fetchLowStockProducts.fulfilled, (state, action) => {
        state.loading.lowStockProducts = false;
        state.lowStockProducts = action.payload;
      })
      .addCase(fetchLowStockProducts.rejected, (state, action) => {
        state.loading.lowStockProducts = false;
        state.error.lowStockProducts = action.payload as string;
      });

    // Delivery Status Overview
    builder
      .addCase(fetchDeliveryStatusOverview.pending, (state) => {
        state.loading.deliveryStatusOverview = true;
        state.error.deliveryStatusOverview = null;
      })
      .addCase(fetchDeliveryStatusOverview.fulfilled, (state, action) => {
        state.loading.deliveryStatusOverview = false;
        state.deliveryStatusOverview = action.payload;
      })
      .addCase(fetchDeliveryStatusOverview.rejected, (state, action) => {
        state.loading.deliveryStatusOverview = false;
        state.error.deliveryStatusOverview = action.payload as string;
      });
  },
});

export const { setDateRange, clearDashboardData } = dashboardSlice.actions;
export default dashboardSlice.reducer;
