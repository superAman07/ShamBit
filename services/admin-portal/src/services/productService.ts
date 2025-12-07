/**
 * Product Service
 * Handles all product and category related API calls
 */

import { apiService } from './api'
import { PaginatedResponse } from '@/types/api'
import {
  Product,
  Category,
  ProductFormData,
  CategoryFormData,
  ProductFilters,
  BulkUploadResult,
} from '@/types/product'

class ProductService {
  // Product endpoints
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const response = await apiService.getAxiosInstance().get('/products', { 
      params: filters
    })
    
    return {
      items: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      limit: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    }
  }

  async getProduct(id: string): Promise<Product> {
    return apiService.get<Product>(`/products/${id}`)
  }

  async createProduct(data: ProductFormData): Promise<Product> {
    return apiService.post<Product>('/products', data)
  }

  async updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
    return apiService.put<Product>(`/products/${id}`, data)
  }

  async deleteProduct(id: string): Promise<void> {
    return apiService.delete<void>(`/products/${id}`)
  }

  async toggleProductStatus(id: string, isActive: boolean): Promise<Product> {
    return apiService.put<Product>(`/products/${id}`, { isActive })
  }

  async uploadProductImages(
    id: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrls: string[] }> {
    // Return early if no files to upload
    if (!files || files.length === 0) {
      return { imageUrls: [] }
    }

    try {
      // First, upload the files to get URLs with progress tracking
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })

      const uploadResponse = await apiService.uploadFile<{ images: Array<{ imageUrl: string }> }>(
        '/upload/images',
        formData,
        onProgress
      )

      // Extract the image URLs from the upload response
      const imageUrls = uploadResponse.images.map((img) => img.imageUrl)

      // Then, add each URL to the product in parallel for better performance
      const addImagePromises = imageUrls.map((imageUrl, i) =>
        apiService.post(`/products/${id}/images`, {
          imageUrl,
          altText: `Product image ${i + 1}`,
          displayOrder: i,
          isPrimary: i === 0, // First image is primary
        }).catch((error) => {
          console.error(`Failed to add image ${i + 1}:`, error)
          return null // Continue with other images even if one fails
        })
      )

      await Promise.all(addImagePromises)
      return { imageUrls }
    } catch (error: any) {
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timed out. Please check your connection and try again.')
      }
      if (error.response?.status === 413) {
        throw new Error('Files are too large. Please reduce image sizes and try again.')
      }
      if (error.response?.status === 415) {
        throw new Error('Invalid file type. Please upload only image files.')
      }
      throw error
    }
  }

  async bulkUploadProducts(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<BulkUploadResult> {
    const formData = new FormData()
    formData.append('file', file)

    const result = await apiService.uploadFile<BulkUploadResult>(
      '/products/bulk-upload',
      formData,
      onProgress
    )
    
    // Show detailed results
    if (result.errors && result.errors.length > 0) {
      console.warn('Bulk upload completed with errors:', result.errors)
    }
    
    return result
  }

  async downloadBulkUploadTemplate(): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get(
      '/products/bulk-upload/template',
      {
        responseType: 'blob',
      }
    )
    return response.data
  }

  // Category endpoints
  async getCategories(): Promise<Category[]> {
    return apiService.get<Category[]>('/categories')
  }

  async getCategory(id: string): Promise<Category> {
    return apiService.get<Category>(`/categories/${id}`)
  }

  async createCategory(data: CategoryFormData): Promise<Category> {
    return apiService.post<Category>('/categories', data)
  }

  async updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    return apiService.put<Category>(`/categories/${id}`, data)
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      // Use axios directly for DELETE since it returns 204 No Content
      await apiService.getAxiosInstance().delete(`/categories/${id}`)
    } catch (error: any) {
      // Handle 204 as success
      if (error?.response?.status === 204) {
        return
      }
      throw error
    }
  }

  async uploadCategoryImage(
    id: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string }> {
    const formData = new FormData()
    formData.append('image', file)

    return await apiService.uploadFile<{ imageUrl: string }>(
      `/categories/${id}/image`,
      formData,
      onProgress
    )
  }

  async uploadImage(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string }> {
    const formData = new FormData()
    formData.append('image', file)

    return await apiService.uploadFile<{ imageUrl: string }>(
      '/upload/image',
      formData,
      onProgress
    )
  }
}

export const productService = new ProductService()
