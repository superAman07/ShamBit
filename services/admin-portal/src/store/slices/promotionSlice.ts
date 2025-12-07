/**
 * Promotion Slice
 * Redux state management for promotions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { promotionService } from '@/services/promotionService'
import {
  Promotion,
  PromotionFormData,
  PromotionFilters,
  PromotionUsage,
  PromotionStats,
} from '@/types/promotion'
import { PaginatedResponse } from '@/types/api'

interface PromotionState {
  promotions: Promotion[]
  selectedPromotion: Promotion | null
  promotionUsage: PromotionUsage[]
  promotionStats: PromotionStats | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: PromotionFilters
}

const initialState: PromotionState = {
  promotions: [],
  selectedPromotion: null,
  promotionUsage: [],
  promotionStats: null,
  loading: false,
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
export const fetchPromotions = createAsyncThunk(
  'promotion/fetchPromotions',
  async (filters?: PromotionFilters) => {
    return await promotionService.getPromotions(filters)
  }
)

export const fetchPromotion = createAsyncThunk(
  'promotion/fetchPromotion',
  async (id: string) => {
    return await promotionService.getPromotion(id)
  }
)

export const createPromotion = createAsyncThunk(
  'promotion/createPromotion',
  async (data: PromotionFormData) => {
    return await promotionService.createPromotion(data)
  }
)

export const updatePromotion = createAsyncThunk(
  'promotion/updatePromotion',
  async ({ id, data }: { id: string; data: Partial<PromotionFormData> }) => {
    return await promotionService.updatePromotion(id, data)
  }
)

export const deletePromotion = createAsyncThunk(
  'promotion/deletePromotion',
  async (id: string) => {
    await promotionService.deletePromotion(id)
    return id
  }
)

export const togglePromotionStatus = createAsyncThunk(
  'promotion/togglePromotionStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }) => {
    return await promotionService.togglePromotionStatus(id, isActive)
  }
)

export const fetchPromotionUsage = createAsyncThunk(
  'promotion/fetchPromotionUsage',
  async (id: string) => {
    return await promotionService.getPromotionUsage(id)
  }
)

export const fetchPromotionStats = createAsyncThunk(
  'promotion/fetchPromotionStats',
  async (id: string) => {
    return await promotionService.getPromotionStats(id)
  }
)

const promotionSlice = createSlice({
  name: 'promotion',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<PromotionFilters>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearSelectedPromotion: (state) => {
      state.selectedPromotion = null
      state.promotionUsage = []
      state.promotionStats = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch promotions
    builder
      .addCase(fetchPromotions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPromotions.fulfilled, (state, action: PayloadAction<PaginatedResponse<Promotion>>) => {
        state.loading = false
        state.promotions = action.payload.items
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        }
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch promotions'
      })

    // Fetch single promotion
    builder
      .addCase(fetchPromotion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPromotion.fulfilled, (state, action: PayloadAction<Promotion>) => {
        state.loading = false
        state.selectedPromotion = action.payload
      })
      .addCase(fetchPromotion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch promotion'
      })

    // Create promotion
    builder
      .addCase(createPromotion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPromotion.fulfilled, (state, action: PayloadAction<Promotion>) => {
        state.loading = false
        state.promotions.unshift(action.payload)
      })
      .addCase(createPromotion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create promotion'
      })

    // Update promotion
    builder
      .addCase(updatePromotion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePromotion.fulfilled, (state, action: PayloadAction<Promotion>) => {
        state.loading = false
        const index = state.promotions.findIndex((p) => p.id === action.payload.id)
        if (index !== -1) {
          state.promotions[index] = action.payload
        }
        if (state.selectedPromotion?.id === action.payload.id) {
          state.selectedPromotion = action.payload
        }
      })
      .addCase(updatePromotion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update promotion'
      })

    // Delete promotion
    builder
      .addCase(deletePromotion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deletePromotion.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.promotions = state.promotions.filter((p) => p.id !== action.payload)
      })
      .addCase(deletePromotion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete promotion'
      })

    // Toggle promotion status
    builder
      .addCase(togglePromotionStatus.fulfilled, (state, action: PayloadAction<Promotion>) => {
        const index = state.promotions.findIndex((p) => p.id === action.payload.id)
        if (index !== -1) {
          state.promotions[index] = action.payload
        }
        if (state.selectedPromotion?.id === action.payload.id) {
          state.selectedPromotion = action.payload
        }
      })

    // Fetch promotion usage
    builder
      .addCase(fetchPromotionUsage.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPromotionUsage.fulfilled, (state, action: PayloadAction<PromotionUsage[]>) => {
        state.loading = false
        state.promotionUsage = action.payload
      })
      .addCase(fetchPromotionUsage.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch promotion usage'
      })

    // Fetch promotion stats
    builder
      .addCase(fetchPromotionStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPromotionStats.fulfilled, (state, action: PayloadAction<PromotionStats>) => {
        state.loading = false
        state.promotionStats = action.payload
      })
      .addCase(fetchPromotionStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch promotion stats'
      })
  },
})

export const { setFilters, clearSelectedPromotion, clearError } = promotionSlice.actions
export default promotionSlice.reducer
