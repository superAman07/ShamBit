/**
 * Inventory Redux Slice
 * Manages inventory state and actions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { inventoryService } from '@/services/inventoryService'
import { PaginatedResponse } from '@/types/api'
import {
  Inventory,
  InventoryHistory,
  InventoryUpdateData,
  BulkInventoryUpdateData,
  InventoryFilters,
  RestockData,
} from '@/types/inventory'

interface InventoryState {
  inventory: Inventory[]
  selectedInventory: Inventory | null
  inventoryHistory: InventoryHistory[]
  lowStockProducts: Inventory[]
  loading: boolean
  historyLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: InventoryFilters
}

const initialState: InventoryState = {
  inventory: [],
  selectedInventory: null,
  inventoryHistory: [],
  lowStockProducts: [],
  loading: false,
  historyLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 20,
  },
}

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (filters: InventoryFilters, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getInventory(filters)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch inventory')
    }
  }
)

export const fetchInventoryByProduct = createAsyncThunk(
  'inventory/fetchInventoryByProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getInventoryByProduct(productId)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch inventory')
    }
  }
)

export const updateInventory = createAsyncThunk(
  'inventory/updateInventory',
  async ({ productId, data }: { productId: string; data: InventoryUpdateData }, { rejectWithValue }) => {
    try {
      const response = await inventoryService.updateInventory(productId, data)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update inventory')
    }
  }
)

export const restockInventory = createAsyncThunk(
  'inventory/restockInventory',
  async ({ productId, data }: { productId: string; data: RestockData }, { rejectWithValue }) => {
    try {
      const response = await inventoryService.restockInventory(productId, data)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to restock inventory')
    }
  }
)

export const fetchLowStockProducts = createAsyncThunk(
  'inventory/fetchLowStockProducts',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getLowStockProducts(limit)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch low stock products')
    }
  }
)

export const fetchInventoryHistory = createAsyncThunk(
  'inventory/fetchInventoryHistory',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getInventoryHistory(productId)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch inventory history')
    }
  }
)

export const bulkUpdateInventory = createAsyncThunk(
  'inventory/bulkUpdateInventory',
  async (updates: BulkInventoryUpdateData[], { rejectWithValue }) => {
    try {
      const response = await inventoryService.bulkUpdateInventory(updates)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to bulk update inventory')
    }
  }
)

export const bulkUploadInventory = createAsyncThunk(
  'inventory/bulkUploadInventory',
  async (file: File, { rejectWithValue }) => {
    try {
      const response = await inventoryService.bulkUploadInventory(file)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to upload inventory file')
    }
  }
)

export const exportInventoryCSV = createAsyncThunk(
  'inventory/exportInventoryCSV',
  async (filters: InventoryFilters | undefined, { rejectWithValue }) => {
    try {
      const blob = await inventoryService.exportInventoryCSV(filters)
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return true
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to export inventory')
    }
  }
)

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<InventoryFilters>) => {
      state.filters = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    clearSelectedInventory: (state) => {
      state.selectedInventory = null
      state.inventoryHistory = []
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInventory.fulfilled, (state, action: PayloadAction<PaginatedResponse<Inventory>>) => {
        state.loading = false
        state.inventory = action.payload.items
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        }
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch inventory by product
      .addCase(fetchInventoryByProduct.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInventoryByProduct.fulfilled, (state, action: PayloadAction<Inventory>) => {
        state.loading = false
        state.selectedInventory = action.payload
      })
      .addCase(fetchInventoryByProduct.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update inventory
      .addCase(updateInventory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateInventory.fulfilled, (state, action: PayloadAction<Inventory>) => {
        state.loading = false
        // Update the inventory in the list
        const index = state.inventory.findIndex(item => item.productId === action.payload.productId)
        if (index !== -1) {
          state.inventory[index] = action.payload
        }
        // Update selected inventory if it matches
        if (state.selectedInventory?.productId === action.payload.productId) {
          state.selectedInventory = action.payload
        }
      })
      .addCase(updateInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Restock inventory
      .addCase(restockInventory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(restockInventory.fulfilled, (state, action: PayloadAction<Inventory>) => {
        state.loading = false
        // Update the inventory in the list
        const index = state.inventory.findIndex(item => item.productId === action.payload.productId)
        if (index !== -1) {
          state.inventory[index] = action.payload
        }
        // Update selected inventory if it matches
        if (state.selectedInventory?.productId === action.payload.productId) {
          state.selectedInventory = action.payload
        }
      })
      .addCase(restockInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch low stock products
      .addCase(fetchLowStockProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLowStockProducts.fulfilled, (state, action: PayloadAction<Inventory[]>) => {
        state.loading = false
        state.lowStockProducts = action.payload
      })
      .addCase(fetchLowStockProducts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch inventory history
      .addCase(fetchInventoryHistory.pending, (state) => {
        state.historyLoading = true
        state.error = null
      })
      .addCase(fetchInventoryHistory.fulfilled, (state, action: PayloadAction<InventoryHistory[]>) => {
        state.historyLoading = false
        state.inventoryHistory = action.payload
      })
      .addCase(fetchInventoryHistory.rejected, (state, action) => {
        state.historyLoading = false
        state.error = action.payload as string
      })
      // Bulk update inventory
      .addCase(bulkUpdateInventory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(bulkUpdateInventory.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(bulkUpdateInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Bulk upload inventory
      .addCase(bulkUploadInventory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(bulkUploadInventory.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(bulkUploadInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Export inventory CSV
      .addCase(exportInventoryCSV.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(exportInventoryCSV.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(exportInventoryCSV.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { setFilters, clearError, clearSelectedInventory } = inventorySlice.actions
export default inventorySlice.reducer