/**
 * Inventory Service
 * Handles all inventory-related API calls
 */

import { apiService } from './api'
import { PaginatedResponse } from '@/types/api'
import {
  Inventory,
  InventoryHistory,
  InventoryUpdateData,
  BulkInventoryUpdateData,
  BulkInventoryUpdateResult,
  InventoryFilters,
  RestockData,
} from '@/types/inventory'

class InventoryService {
  /**
   * Get paginated inventory list with filters
   */
  async getInventory(filters: InventoryFilters): Promise<PaginatedResponse<Inventory>> {
    // Transform filters to match backend API expectations
    const apiParams: any = {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      categoryId: filters.categoryId,
    }
    
    // Convert lowStock boolean to stockStatus string
    if (filters.lowStock) {
      apiParams.stockStatus = 'low'
    }
    
    const response = await apiService.getAxiosInstance().get('/inventory', { params: apiParams })
    
    return {
      items: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      limit: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    }
  }

  /**
   * Get inventory details for a specific product
   */
  async getInventoryByProduct(productId: string): Promise<Inventory> {
    return apiService.get<Inventory>(`/inventory/${productId}`)
  }

  /**
   * Update inventory for a specific product
   */
  async updateInventory(productId: string, data: InventoryUpdateData): Promise<Inventory> {
    return apiService.put<Inventory>(`/inventory/${productId}`, data)
  }

  /**
   * Restock inventory for a specific product
   */
  async restockInventory(productId: string, data: RestockData): Promise<Inventory> {
    return apiService.post<Inventory>(`/inventory/${productId}/restock`, data)
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(limit?: number): Promise<Inventory[]> {
    return apiService.get<Inventory[]>('/inventory/low-stock', { limit })
  }

  /**
   * Get inventory history for a specific product
   */
  async getInventoryHistory(productId: string): Promise<InventoryHistory[]> {
    return apiService.get<InventoryHistory[]>(`/inventory/${productId}/history`)
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(updates: BulkInventoryUpdateData[]): Promise<BulkInventoryUpdateResult> {
    return apiService.post<BulkInventoryUpdateResult>('/inventory/bulk-update', { updates })
  }

  /**
   * Upload CSV file for bulk inventory update
   */
  async bulkUploadInventory(file: File): Promise<BulkInventoryUpdateResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiService.getAxiosInstance().post<{
      success: boolean
      data: BulkInventoryUpdateResult
    }>('/inventory/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data.data
  }

  /**
   * Export inventory data as CSV
   */
  async exportInventoryCSV(filters?: InventoryFilters): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get('/inventory/export', {
      params: filters,
      responseType: 'blob',
    })
    
    return response.data
  }
}

export const inventoryService = new InventoryService()