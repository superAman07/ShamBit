import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { deliveryService } from '@/services/deliveryService';
import {
  DeliveryPersonnel,
  Delivery,
  DeliveryStatusOverview,
  CreateDeliveryPersonnelRequest,
  UpdateDeliveryPersonnelRequest,
  DeliveryFilters,
} from '@/types/delivery';

interface DeliveryState {
  // Personnel
  personnel: DeliveryPersonnel[];
  totalPersonnel: number;
  personnelPage: number;
  personnelPageSize: number;
  personnelFilters: { isActive?: boolean; isAvailable?: boolean };
  
  // Active Deliveries
  activeDeliveries: Delivery[];
  
  // All Deliveries
  deliveries: Delivery[];
  totalDeliveries: number;
  deliveriesPage: number;
  deliveriesPageSize: number;
  deliveriesFilters: DeliveryFilters;
  
  // Overview
  statusOverview: DeliveryStatusOverview | null;
  
  // Loading states
  loading: {
    personnel: boolean;
    activeDeliveries: boolean;
    deliveries: boolean;
    overview: boolean;
    action: boolean;
  };
  
  // Error states
  error: {
    personnel: string | null;
    activeDeliveries: string | null;
    deliveries: string | null;
    overview: string | null;
    action: string | null;
  };
}

const initialState: DeliveryState = {
  personnel: [],
  totalPersonnel: 0,
  personnelPage: 1,
  personnelPageSize: 50,
  personnelFilters: {},
  
  activeDeliveries: [],
  
  deliveries: [],
  totalDeliveries: 0,
  deliveriesPage: 1,
  deliveriesPageSize: 20,
  deliveriesFilters: {},
  
  statusOverview: null,
  
  loading: {
    personnel: false,
    activeDeliveries: false,
    deliveries: false,
    overview: false,
    action: false,
  },
  
  error: {
    personnel: null,
    activeDeliveries: null,
    deliveries: null,
    overview: null,
    action: null,
  },
};

// Async thunks
export const fetchDeliveryPersonnel = createAsyncThunk(
  'delivery/fetchPersonnel',
  async (params: {
    page?: number;
    pageSize?: number;
    filters?: { isActive?: boolean; isAvailable?: boolean };
  }) => {
    const response = await deliveryService.getDeliveryPersonnel(
      params.page,
      params.pageSize,
      params.filters
    );
    return response;
  }
);

export const fetchActiveDeliveries = createAsyncThunk(
  'delivery/fetchActiveDeliveries',
  async () => {
    return await deliveryService.getActiveDeliveries();
  }
);

export const fetchDeliveries = createAsyncThunk(
  'delivery/fetchDeliveries',
  async (params: {
    page?: number;
    pageSize?: number;
    filters?: DeliveryFilters;
  }) => {
    const response = await deliveryService.getDeliveries(
      params.page,
      params.pageSize,
      params.filters
    );
    return response;
  }
);

export const fetchDeliveryStatusOverview = createAsyncThunk(
  'delivery/fetchStatusOverview',
  async () => {
    return await deliveryService.getDeliveryStatusOverview();
  }
);

export const createDeliveryPersonnel = createAsyncThunk(
  'delivery/createPersonnel',
  async (data: CreateDeliveryPersonnelRequest) => {
    return await deliveryService.createDeliveryPersonnel(data);
  }
);

export const updateDeliveryPersonnel = createAsyncThunk(
  'delivery/updatePersonnel',
  async (params: { id: string; data: UpdateDeliveryPersonnelRequest }) => {
    return await deliveryService.updateDeliveryPersonnel(params.id, params.data);
  }
);

export const deleteDeliveryPersonnel = createAsyncThunk(
  'delivery/deletePersonnel',
  async (id: string) => {
    await deliveryService.deleteDeliveryPersonnel(id);
    return id;
  }
);

export const reassignDelivery = createAsyncThunk(
  'delivery/reassign',
  async (params: { deliveryId: string; deliveryPersonnelId: string }) => {
    return await deliveryService.reassignDelivery(
      params.deliveryId,
      params.deliveryPersonnelId
    );
  }
);

export const resetDeliveryPersonnelPassword = createAsyncThunk(
  'delivery/resetPassword',
  async (params: { id: string; password: string }) => {
    await deliveryService.resetDeliveryPersonnelPassword(params.id, params.password);
    return params.id;
  }
);

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    setPersonnelPage: (state, action: PayloadAction<number>) => {
      state.personnelPage = action.payload;
    },
    setPersonnelPageSize: (state, action: PayloadAction<number>) => {
      state.personnelPageSize = action.payload;
      state.personnelPage = 1;
    },
    setPersonnelFilters: (
      state,
      action: PayloadAction<{ isActive?: boolean; isAvailable?: boolean }>
    ) => {
      state.personnelFilters = action.payload;
      state.personnelPage = 1;
    },
    setDeliveriesPage: (state, action: PayloadAction<number>) => {
      state.deliveriesPage = action.payload;
    },
    setDeliveriesPageSize: (state, action: PayloadAction<number>) => {
      state.deliveriesPageSize = action.payload;
      state.deliveriesPage = 1;
    },
    setDeliveriesFilters: (state, action: PayloadAction<DeliveryFilters>) => {
      state.deliveriesFilters = action.payload;
      state.deliveriesPage = 1;
    },
    clearErrors: (state) => {
      state.error = {
        personnel: null,
        activeDeliveries: null,
        deliveries: null,
        overview: null,
        action: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch Personnel
    builder
      .addCase(fetchDeliveryPersonnel.pending, (state) => {
        state.loading.personnel = true;
        state.error.personnel = null;
      })
      .addCase(fetchDeliveryPersonnel.fulfilled, (state, action) => {
        state.loading.personnel = false;
        state.personnel = action.payload.personnel;
        state.totalPersonnel = action.payload.total;
        state.personnelPage = action.payload.page;
        state.personnelPageSize = action.payload.pageSize;
      })
      .addCase(fetchDeliveryPersonnel.rejected, (state, action) => {
        state.loading.personnel = false;
        state.error.personnel = action.error.message || 'Failed to fetch delivery personnel';
      });

    // Fetch Active Deliveries
    builder
      .addCase(fetchActiveDeliveries.pending, (state) => {
        state.loading.activeDeliveries = true;
        state.error.activeDeliveries = null;
      })
      .addCase(fetchActiveDeliveries.fulfilled, (state, action) => {
        state.loading.activeDeliveries = false;
        state.activeDeliveries = action.payload;
      })
      .addCase(fetchActiveDeliveries.rejected, (state, action) => {
        state.loading.activeDeliveries = false;
        state.error.activeDeliveries = action.error.message || 'Failed to fetch active deliveries';
      });

    // Fetch Deliveries
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.loading.deliveries = true;
        state.error.deliveries = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.loading.deliveries = false;
        state.deliveries = action.payload.deliveries;
        state.totalDeliveries = action.payload.total;
        state.deliveriesPage = action.payload.page;
        state.deliveriesPageSize = action.payload.pageSize;
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.loading.deliveries = false;
        state.error.deliveries = action.error.message || 'Failed to fetch deliveries';
      });

    // Fetch Status Overview
    builder
      .addCase(fetchDeliveryStatusOverview.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = null;
      })
      .addCase(fetchDeliveryStatusOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.statusOverview = action.payload;
      })
      .addCase(fetchDeliveryStatusOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview = action.error.message || 'Failed to fetch status overview';
      });

    // Create Personnel
    builder
      .addCase(createDeliveryPersonnel.pending, (state) => {
        state.loading.action = true;
        state.error.action = null;
      })
      .addCase(createDeliveryPersonnel.fulfilled, (state, action) => {
        state.loading.action = false;
        state.personnel.unshift(action.payload);
        state.totalPersonnel += 1;
      })
      .addCase(createDeliveryPersonnel.rejected, (state, action) => {
        state.loading.action = false;
        state.error.action = action.error.message || 'Failed to create delivery personnel';
      });

    // Update Personnel
    builder
      .addCase(updateDeliveryPersonnel.pending, (state) => {
        state.loading.action = true;
        state.error.action = null;
      })
      .addCase(updateDeliveryPersonnel.fulfilled, (state, action) => {
        state.loading.action = false;
        const index = state.personnel.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.personnel[index] = action.payload;
        }
      })
      .addCase(updateDeliveryPersonnel.rejected, (state, action) => {
        state.loading.action = false;
        state.error.action = action.error.message || 'Failed to update delivery personnel';
      });

    // Delete Personnel
    builder
      .addCase(deleteDeliveryPersonnel.pending, (state) => {
        state.loading.action = true;
        state.error.action = null;
      })
      .addCase(deleteDeliveryPersonnel.fulfilled, (state, action) => {
        state.loading.action = false;
        state.personnel = state.personnel.filter((p) => p.id !== action.payload);
        state.totalPersonnel -= 1;
      })
      .addCase(deleteDeliveryPersonnel.rejected, (state, action) => {
        state.loading.action = false;
        state.error.action = action.error.message || 'Failed to delete delivery personnel';
      });

    // Reassign Delivery
    builder
      .addCase(reassignDelivery.pending, (state) => {
        state.loading.action = true;
        state.error.action = null;
      })
      .addCase(reassignDelivery.fulfilled, (state, action) => {
        state.loading.action = false;
        // Update in active deliveries
        const activeIndex = state.activeDeliveries.findIndex((d) => d.id === action.payload.id);
        if (activeIndex !== -1) {
          state.activeDeliveries[activeIndex] = action.payload;
        }
        // Update in all deliveries
        const deliveryIndex = state.deliveries.findIndex((d) => d.id === action.payload.id);
        if (deliveryIndex !== -1) {
          state.deliveries[deliveryIndex] = action.payload;
        }
      })
      .addCase(reassignDelivery.rejected, (state, action) => {
        state.loading.action = false;
        state.error.action = action.error.message || 'Failed to reassign delivery';
      });

    // Reset Password
    builder
      .addCase(resetDeliveryPersonnelPassword.pending, (state) => {
        state.loading.action = true;
        state.error.action = null;
      })
      .addCase(resetDeliveryPersonnelPassword.fulfilled, (state) => {
        state.loading.action = false;
      })
      .addCase(resetDeliveryPersonnelPassword.rejected, (state, action) => {
        state.loading.action = false;
        state.error.action = action.error.message || 'Failed to reset password';
      });
  },
});

export const {
  setPersonnelPage,
  setPersonnelPageSize,
  setPersonnelFilters,
  setDeliveriesPage,
  setDeliveriesPageSize,
  setDeliveriesFilters,
  clearErrors,
} = deliverySlice.actions;

export default deliverySlice.reducer;
