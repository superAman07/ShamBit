import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { customerService } from '@/services/customerService';
import {
  Customer,
  CustomerFilters,
  CustomerStatistics,
  CustomerDetails,
  OrderSummary,
  VerificationStatus,
} from '@/types/customer';

interface CustomerState {
  // Customer list
  customers: Customer[];
  totalCustomers: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  filters: CustomerFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Statistics
  statistics: CustomerStatistics;
  
  // Selected customer
  selectedCustomerId: string | null;
  selectedCustomer: CustomerDetails | null;
  
  // Customer orders
  customerOrders: OrderSummary[];
  ordersPage: number;
  ordersPageSize: number;
  ordersTotalPages: number;
  ordersTotalItems: number;
  
  // Loading states
  loading: {
    customers: boolean;
    customerDetails: boolean;
    blockAction: boolean;
    noteAction: boolean;
    orders: boolean;
  };
  
  // Error states
  error: {
    customers: string | null;
    customerDetails: string | null;
    blockAction: string | null;
    noteAction: string | null;
    orders: string | null;
  };
}

const initialState: CustomerState = {
  customers: [],
  totalCustomers: 0,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  filters: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',
  statistics: {
    totalCustomers: 0,
    activeCustomers: 0,
    blockedCustomers: 0,
    newCustomersLast30Days: 0,
  },
  selectedCustomerId: null,
  selectedCustomer: null,
  customerOrders: [],
  ordersPage: 1,
  ordersPageSize: 10,
  ordersTotalPages: 0,
  ordersTotalItems: 0,
  loading: {
    customers: false,
    customerDetails: false,
    blockAction: false,
    noteAction: false,
    orders: false,
  },
  error: {
    customers: null,
    customerDetails: null,
    blockAction: null,
    noteAction: null,
    orders: null,
  },
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (
    params: {
      page?: number;
      pageSize?: number;
      filters?: CustomerFilters;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { rejectWithValue }
  ) => {
    try {
      return await customerService.getCustomers(
        params.page,
        params.pageSize,
        params.filters,
        params.sortBy,
        params.sortOrder
      );
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch customers');
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (customerId: string, { rejectWithValue }) => {
    try {
      return await customerService.getCustomerById(customerId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch customer details');
    }
  }
);

export const blockCustomer = createAsyncThunk(
  'customers/blockCustomer',
  async (params: { customerId: string; reason: string }, { rejectWithValue }) => {
    try {
      await customerService.blockCustomer(params.customerId, params.reason);
      return params.customerId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to block customer');
    }
  }
);

export const unblockCustomer = createAsyncThunk(
  'customers/unblockCustomer',
  async (params: { customerId: string; reason: string }, { rejectWithValue }) => {
    try {
      await customerService.unblockCustomer(params.customerId, params.reason);
      return params.customerId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to unblock customer');
    }
  }
);

export const updateVerificationStatus = createAsyncThunk(
  'customers/updateVerificationStatus',
  async (params: { customerId: string; verificationStatus: VerificationStatus }, { rejectWithValue }) => {
    try {
      await customerService.updateVerificationStatus(params.customerId, params.verificationStatus);
      return params;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update verification status');
    }
  }
);

export const addCustomerNote = createAsyncThunk(
  'customers/addCustomerNote',
  async (params: { customerId: string; noteText: string }, { rejectWithValue }) => {
    try {
      return await customerService.addCustomerNote(params.customerId, params.noteText);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to add note');
    }
  }
);

export const fetchCustomerOrders = createAsyncThunk(
  'customers/fetchCustomerOrders',
  async (
    params: {
      customerId: string;
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      return await customerService.getCustomerOrders(
        params.customerId,
        params.page,
        params.pageSize,
        params.startDate,
        params.endDate
      );
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch customer orders');
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<CustomerFilters>) => {
      state.filters = action.payload;
      state.currentPage = 1;
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1;
    },
    setSelectedCustomerId: (state, action: PayloadAction<string | null>) => {
      state.selectedCustomerId = action.payload;
    },
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
      state.selectedCustomerId = null;
      state.customerOrders = [];
      state.ordersPage = 1;
      state.error.customerDetails = null;
      state.error.orders = null;
    },
    setOrdersPage: (state, action: PayloadAction<number>) => {
      state.ordersPage = action.payload;
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Fetch Customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading.customers = true;
        state.error.customers = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading.customers = false;
        state.customers = action.payload.customers;
        state.totalCustomers = action.payload.total;
        state.currentPage = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages;
        state.statistics = action.payload.statistics;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading.customers = false;
        state.error.customers = action.payload as string;
      });

    // Fetch Customer By ID
    builder
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading.customerDetails = true;
        state.error.customerDetails = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading.customerDetails = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading.customerDetails = false;
        state.error.customerDetails = action.payload as string;
      });

    // Block Customer
    builder
      .addCase(blockCustomer.pending, (state) => {
        state.loading.blockAction = true;
        state.error.blockAction = null;
      })
      .addCase(blockCustomer.fulfilled, (state, action) => {
        state.loading.blockAction = false;
        if (state.selectedCustomer) {
          state.selectedCustomer.isBlocked = true;
        }
        // Update in list if present
        const customer = state.customers.find(c => c.id === action.payload);
        if (customer) {
          customer.isBlocked = true;
        }
      })
      .addCase(blockCustomer.rejected, (state, action) => {
        state.loading.blockAction = false;
        state.error.blockAction = action.payload as string;
      });

    // Unblock Customer
    builder
      .addCase(unblockCustomer.pending, (state) => {
        state.loading.blockAction = true;
        state.error.blockAction = null;
      })
      .addCase(unblockCustomer.fulfilled, (state, action) => {
        state.loading.blockAction = false;
        if (state.selectedCustomer) {
          state.selectedCustomer.isBlocked = false;
        }
        // Update in list if present
        const customer = state.customers.find(c => c.id === action.payload);
        if (customer) {
          customer.isBlocked = false;
        }
      })
      .addCase(unblockCustomer.rejected, (state, action) => {
        state.loading.blockAction = false;
        state.error.blockAction = action.payload as string;
      });

    // Update Verification Status
    builder
      .addCase(updateVerificationStatus.pending, (state) => {
        state.loading.blockAction = true;
        state.error.blockAction = null;
      })
      .addCase(updateVerificationStatus.fulfilled, (state, action) => {
        state.loading.blockAction = false;
        if (state.selectedCustomer) {
          state.selectedCustomer.verificationStatus = action.payload.verificationStatus;
        }
        // Update in list if present
        const customer = state.customers.find(c => c.id === action.payload.customerId);
        if (customer) {
          customer.verificationStatus = action.payload.verificationStatus;
        }
      })
      .addCase(updateVerificationStatus.rejected, (state, action) => {
        state.loading.blockAction = false;
        state.error.blockAction = action.payload as string;
      });

    // Add Customer Note
    builder
      .addCase(addCustomerNote.pending, (state) => {
        state.loading.noteAction = true;
        state.error.noteAction = null;
      })
      .addCase(addCustomerNote.fulfilled, (state, action) => {
        state.loading.noteAction = false;
        if (state.selectedCustomer) {
          state.selectedCustomer.notes.unshift(action.payload);
        }
      })
      .addCase(addCustomerNote.rejected, (state, action) => {
        state.loading.noteAction = false;
        state.error.noteAction = action.payload as string;
      });

    // Fetch Customer Orders
    builder
      .addCase(fetchCustomerOrders.pending, (state) => {
        state.loading.orders = true;
        state.error.orders = null;
      })
      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.loading.orders = false;
        state.customerOrders = action.payload.orders;
        state.ordersPage = action.payload.pagination.page;
        state.ordersPageSize = action.payload.pagination.pageSize;
        state.ordersTotalPages = action.payload.pagination.totalPages;
        state.ordersTotalItems = action.payload.pagination.totalItems;
      })
      .addCase(fetchCustomerOrders.rejected, (state, action) => {
        state.loading.orders = false;
        state.error.orders = action.payload as string;
      });
  },
});

export const {
  setFilters,
  setSorting,
  setPage,
  setPageSize,
  setSelectedCustomerId,
  clearSelectedCustomer,
  setOrdersPage,
  clearErrors,
} = customerSlice.actions;

export default customerSlice.reducer;
