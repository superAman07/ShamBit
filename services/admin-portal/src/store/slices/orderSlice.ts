import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { orderService } from '@/services/orderService';
import {
  Order,
  OrderFilters,
  PaymentDiscrepancy,
  OrderStatusUpdate,
  OrderAssignment,
  OrderCancellation,
  OrderReturn,
  DeliveryPersonnel,
  OrderNote,
} from '@/types/order';

interface OrderState {
  // Order list
  orders: Order[];
  totalOrders: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  filters: OrderFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Selected order
  selectedOrder: Order | null;
  
  // Delivery personnel
  availableDeliveryPersonnel: DeliveryPersonnel[];
  
  // Payment discrepancies
  paymentDiscrepancies: PaymentDiscrepancy[];
  totalDiscrepancies: number;
  discrepanciesPage: number;
  
  // Loading states
  loading: {
    orders: boolean;
    orderDetails: boolean;
    updateStatus: boolean;
    assignDelivery: boolean;
    cancelOrder: boolean;
    processReturn: boolean;
    addNote: boolean;
    deliveryPersonnel: boolean;
    paymentDiscrepancies: boolean;
    resolveDiscrepancy: boolean;
  };
  
  // Error states
  error: {
    orders: string | null;
    orderDetails: string | null;
    updateStatus: string | null;
    assignDelivery: string | null;
    cancelOrder: string | null;
    processReturn: string | null;
    addNote: string | null;
    deliveryPersonnel: string | null;
    paymentDiscrepancies: string | null;
    resolveDiscrepancy: string | null;
  };
}

const initialState: OrderState = {
  orders: [],
  totalOrders: 0,
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  filters: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',
  selectedOrder: null,
  availableDeliveryPersonnel: [],
  paymentDiscrepancies: [],
  totalDiscrepancies: 0,
  discrepanciesPage: 1,
  loading: {
    orders: false,
    orderDetails: false,
    updateStatus: false,
    assignDelivery: false,
    cancelOrder: false,
    processReturn: false,
    addNote: false,
    deliveryPersonnel: false,
    paymentDiscrepancies: false,
    resolveDiscrepancy: false,
  },
  error: {
    orders: null,
    orderDetails: null,
    updateStatus: null,
    assignDelivery: null,
    cancelOrder: null,
    processReturn: null,
    addNote: null,
    deliveryPersonnel: null,
    paymentDiscrepancies: null,
    resolveDiscrepancy: null,
  },
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (
    params: {
      page?: number;
      pageSize?: number;
      filters?: OrderFilters;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { rejectWithValue }
  ) => {
    try {
      return await orderService.getOrders(
        params.page,
        params.pageSize,
        params.filters,
        params.sortBy,
        params.sortOrder
      );
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      return await orderService.getOrderById(orderId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch order details');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (update: OrderStatusUpdate, { rejectWithValue }) => {
    try {
      return await orderService.updateOrderStatus(update);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update order status');
    }
  }
);

export const assignOrderToDelivery = createAsyncThunk(
  'orders/assignOrderToDelivery',
  async (assignment: OrderAssignment, { rejectWithValue }) => {
    try {
      return await orderService.assignOrderToDelivery(assignment);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to assign order to delivery');
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async (cancellation: OrderCancellation, { rejectWithValue }) => {
    try {
      return await orderService.cancelOrder(cancellation);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to cancel order');
    }
  }
);

export const processOrderReturn = createAsyncThunk(
  'orders/processOrderReturn',
  async (returnData: OrderReturn, { rejectWithValue }) => {
    try {
      return await orderService.processOrderReturn(returnData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to process order return');
    }
  }
);

export const fetchAvailableDeliveryPersonnel = createAsyncThunk(
  'orders/fetchAvailableDeliveryPersonnel',
  async (_, { rejectWithValue }) => {
    try {
      return await orderService.getAvailableDeliveryPersonnel();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch delivery personnel');
    }
  }
);

export const addOrderNote = createAsyncThunk(
  'orders/addOrderNote',
  async (noteData: OrderNote, { rejectWithValue }) => {
    try {
      return await orderService.addOrderNote(noteData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to add note');
    }
  }
);

export const fetchPaymentDiscrepancies = createAsyncThunk(
  'orders/fetchPaymentDiscrepancies',
  async (
    params: { page?: number; pageSize?: number; status?: 'pending' | 'resolved' | 'ignored' },
    { rejectWithValue }
  ) => {
    try {
      return await orderService.getPaymentDiscrepancies(params.page, params.pageSize, params.status);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch payment discrepancies');
    }
  }
);

export const resolvePaymentDiscrepancy = createAsyncThunk(
  'orders/resolvePaymentDiscrepancy',
  async (
    params: { discrepancyId: string; action: 'resolve' | 'ignore'; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      return await orderService.resolvePaymentDiscrepancy(params.discrepancyId, params.action, params.notes);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to resolve payment discrepancy');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<OrderFilters>) => {
      state.filters = action.payload;
      state.currentPage = 1; // Reset to first page when filters change
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
      state.currentPage = 1; // Reset to first page when page size changes
    },
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading.orders = true;
        state.error.orders = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading.orders = false;
        state.orders = action.payload.orders;
        state.totalOrders = action.payload.total;
        state.currentPage = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading.orders = false;
        state.error.orders = action.payload as string;
      });

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading.orderDetails = true;
        state.error.orderDetails = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading.orderDetails = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading.orderDetails = false;
        state.error.orderDetails = action.payload as string;
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading.updateStatus = true;
        state.error.updateStatus = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading.updateStatus = false;
        // Update the order in the list
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update selected order if it's the same
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading.updateStatus = false;
        state.error.updateStatus = action.payload as string;
      });

    // Assign Order to Delivery
    builder
      .addCase(assignOrderToDelivery.pending, (state) => {
        state.loading.assignDelivery = true;
        state.error.assignDelivery = null;
      })
      .addCase(assignOrderToDelivery.fulfilled, (state, action) => {
        state.loading.assignDelivery = false;
        // Update the order in the list
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update selected order if it's the same
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(assignOrderToDelivery.rejected, (state, action) => {
        state.loading.assignDelivery = false;
        state.error.assignDelivery = action.payload as string;
      });

    // Cancel Order
    builder
      .addCase(cancelOrder.pending, (state) => {
        state.loading.cancelOrder = true;
        state.error.cancelOrder = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading.cancelOrder = false;
        // Update the order in the list
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update selected order if it's the same
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading.cancelOrder = false;
        state.error.cancelOrder = action.payload as string;
      });

    // Process Order Return
    builder
      .addCase(processOrderReturn.pending, (state) => {
        state.loading.processReturn = true;
        state.error.processReturn = null;
      })
      .addCase(processOrderReturn.fulfilled, (state, action) => {
        state.loading.processReturn = false;
        // Update the order in the list
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update selected order if it's the same
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(processOrderReturn.rejected, (state, action) => {
        state.loading.processReturn = false;
        state.error.processReturn = action.payload as string;
      });

    // Fetch Available Delivery Personnel
    builder
      .addCase(fetchAvailableDeliveryPersonnel.pending, (state) => {
        state.loading.deliveryPersonnel = true;
        state.error.deliveryPersonnel = null;
      })
      .addCase(fetchAvailableDeliveryPersonnel.fulfilled, (state, action) => {
        state.loading.deliveryPersonnel = false;
        state.availableDeliveryPersonnel = action.payload;
      })
      .addCase(fetchAvailableDeliveryPersonnel.rejected, (state, action) => {
        state.loading.deliveryPersonnel = false;
        state.error.deliveryPersonnel = action.payload as string;
      });

    // Fetch Payment Discrepancies
    builder
      .addCase(fetchPaymentDiscrepancies.pending, (state) => {
        state.loading.paymentDiscrepancies = true;
        state.error.paymentDiscrepancies = null;
      })
      .addCase(fetchPaymentDiscrepancies.fulfilled, (state, action) => {
        state.loading.paymentDiscrepancies = false;
        state.paymentDiscrepancies = action.payload.discrepancies;
        state.totalDiscrepancies = action.payload.total;
      })
      .addCase(fetchPaymentDiscrepancies.rejected, (state, action) => {
        state.loading.paymentDiscrepancies = false;
        state.error.paymentDiscrepancies = action.payload as string;
      });

    // Resolve Payment Discrepancy
    builder
      .addCase(resolvePaymentDiscrepancy.pending, (state) => {
        state.loading.resolveDiscrepancy = true;
        state.error.resolveDiscrepancy = null;
      })
      .addCase(resolvePaymentDiscrepancy.fulfilled, (state, action) => {
        state.loading.resolveDiscrepancy = false;
        // Update the discrepancy in the list
        const index = state.paymentDiscrepancies.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.paymentDiscrepancies[index] = action.payload;
        }
      })
      .addCase(resolvePaymentDiscrepancy.rejected, (state, action) => {
        state.loading.resolveDiscrepancy = false;
        state.error.resolveDiscrepancy = action.payload as string;
      });

    // Add Order Note
    builder
      .addCase(addOrderNote.pending, (state) => {
        state.loading.addNote = true;
        state.error.addNote = null;
      })
      .addCase(addOrderNote.fulfilled, (state, action) => {
        state.loading.addNote = false;
        // Update the order in the list
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update selected order if it's the same
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(addOrderNote.rejected, (state, action) => {
        state.loading.addNote = false;
        state.error.addNote = action.payload as string;
      });
  },
});

export const {
  setFilters,
  setSorting,
  setPage,
  setPageSize,
  clearSelectedOrder,
  clearErrors,
} = orderSlice.actions;

export default orderSlice.reducer;