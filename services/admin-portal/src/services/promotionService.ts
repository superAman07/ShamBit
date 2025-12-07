/**
 * Promotion Service
 * Handles all promotion related API calls
 */

import { apiService } from './api'
import { PaginatedResponse } from '@/types/api'
import {
  Promotion,
  PromotionFormData,
  PromotionFilters,
  PromotionUsage,
  PromotionStats,
} from '@/types/promotion'

class PromotionService {
  async getPromotions(filters?: PromotionFilters): Promise<PaginatedResponse<Promotion>> {
    const response = await apiService.getAxiosInstance().get('/promotions', { params: filters })
    
    return {
      items: response.data.data,
      total: response.data.pagination?.totalItems || response.data.data.length,
      page: response.data.pagination?.page || 1,
      limit: response.data.pagination?.pageSize || response.data.data.length,
      totalPages: response.data.pagination?.totalPages || 1,
    }
  }

  async getPromotion(id: string): Promise<Promotion> {
    return apiService.get<Promotion>(`/promotions/${id}`)
  }

  async createPromotion(data: PromotionFormData): Promise<Promotion> {
    return apiService.post<Promotion>('/promotions', data)
  }

  async updatePromotion(id: string, data: Partial<PromotionFormData>): Promise<Promotion> {
    return apiService.put<Promotion>(`/promotions/${id}`, data)
  }

  async deletePromotion(id: string): Promise<void> {
    return apiService.delete<void>(`/promotions/${id}`)
  }

  async togglePromotionStatus(id: string, isActive: boolean): Promise<Promotion> {
    return apiService.put<Promotion>(`/promotions/${id}`, { isActive })
  }

  async getPromotionUsage(id: string): Promise<PromotionUsage[]> {
    const response = await apiService.get<any>(`/promotions/${id}/usage`)
    // API returns an object with usageByDate array, not a direct array
    return response.usageByDate || []
  }

  async getPromotionStats(id: string): Promise<PromotionStats> {
    const response = await apiService.get<any>(`/promotions/${id}/usage`)
    
    // Use the stats from API response directly
    return {
      totalUsage: response.totalUsage || 0,
      totalDiscount: response.totalDiscountGiven || 0,
      uniqueUsers: response.uniqueUsers || 0,
      averageDiscount: response.totalUsage > 0 ? (response.totalDiscountGiven / response.totalUsage) : 0,
    }
  }
}

export const promotionService = new PromotionService()
