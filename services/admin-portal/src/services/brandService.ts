/**
 * Brand Service
 * Handles all brand-related API calls
 */

import { apiService } from './api'
import { PaginatedResponse } from '@/types/api'
import { Brand, BrandFilters, CreateBrandDto, UpdateBrandDto } from '@/types/brand'

class BrandService {
  async getBrands(filters?: BrandFilters): Promise<PaginatedResponse<Brand>> {
    const params = {
      page: filters?.page,
      pageSize: filters?.limit,
      search: filters?.search,
      isActive: filters?.isActive,
    }
    
    const response = await apiService.getAxiosInstance().get('/brands', { 
      params
    })
    
    return {
      items: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      limit: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    }
  }

  async getBrand(id: string): Promise<Brand> {
    return apiService.get<Brand>(`/brands/${id}`)
  }

  async createBrand(data: CreateBrandDto): Promise<Brand> {
    return apiService.post<Brand>('/brands', data)
  }

  async updateBrand(id: string, data: UpdateBrandDto): Promise<Brand> {
    return apiService.put<Brand>(`/brands/${id}`, data)
  }

  async deleteBrand(id: string): Promise<void> {
    return apiService.delete<void>(`/brands/${id}`)
  }

  async toggleBrandStatus(id: string, isActive: boolean): Promise<Brand> {
    return apiService.put<Brand>(`/brands/${id}`, { isActive })
  }

  async uploadBrandLogo(
    id: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ logoUrl: string }> {
    const formData = new FormData()
    formData.append('logo', file)

    return await apiService.uploadFile<{ logoUrl: string }>(
      `/brands/${id}/logo`,
      formData,
      onProgress
    )
  }

  // Search brands for dropdown
  async searchBrands(query: string, limit: number = 10): Promise<Brand[]> {
    const response = await apiService.getAxiosInstance().get('/brands/search', {
      params: { query, limit, isActive: true }
    })
    return response.data.data
  }
}

export const brandService = new BrandService()