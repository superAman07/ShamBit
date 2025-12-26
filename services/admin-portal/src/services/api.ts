import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { ApiResponse } from '@/types/api'
import { getApiConfig } from '@/config/api'
import { apiRateLimiter } from '@/utils/rateLimiter'
import { requestDeduplicator } from '@/utils/requestDeduplication'
import { errorTracker } from '@/utils/errorTracking'

class ApiService {
  private api: AxiosInstance

  constructor() {
    const config = getApiConfig()
    
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      withCredentials: true, // Important for HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

    console.log(`🔗 API Service initialized with baseURL: ${config.baseURL}`)
    this.setupInterceptors()
  }

  /**
   * Update the API base URL at runtime
   */
  updateBaseURL(newBaseURL: string) {
    this.api.defaults.baseURL = newBaseURL
    console.log(`🔄 API Service baseURL updated to: ${newBaseURL}`)
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.api.defaults.baseURL || ''
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add access token to Authorization header
        const accessToken = localStorage.getItem('accessToken')
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response
      },
      async (error: AxiosError<ApiResponse>) => {
        // Track error with context
        errorTracker.trackApiError(
          error,
          error.config?.url || 'unknown',
          error.config?.method?.toUpperCase() || 'unknown',
          {
            component: 'ApiService',
            action: 'apiRequest',
          }
        )

        // Log error details for debugging
        if (error.response) {
          console.error('API Error Response:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
          })
        } else if (error.request) {
          console.error('API Network Error:', {
            message: error.message,
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            code: error.code
          })
        } else {
          console.error('API Request Setup Error:', {
            message: error.message,
            url: error.config?.url
          })
        }
        
        // Handle common errors
        if (error.response?.status === 401) {
          // Unauthorized - clear tokens and redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            // Use window.location for hard navigation to prevent loops
            window.location.href = '/login'
          }
        } else if (error.response?.status === 429) {
          // Rate limited - wait and retry once
          console.warn('Rate limited, waiting before retry...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Retry the request once
          if (error.config && !error.config.headers['X-Retry-Attempt']) {
            error.config.headers['X-Retry-Attempt'] = '1'
            return this.api.request(error.config)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Generic methods with rate limiting and deduplication
  async get<T>(url: string, params?: any): Promise<T> {
    return requestDeduplicator.deduplicate(
      url,
      async () => {
        await apiRateLimiter.waitForSlot()
        try {
          const response = await this.api.get<ApiResponse<T>>(url, { params })
          return response.data.data as T
        } finally {
          apiRateLimiter.releaseSlot()
        }
      },
      params
    )
  }

  async post<T>(url: string, data?: any): Promise<T> {
    await apiRateLimiter.waitForSlot()
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data)
      return response.data.data as T
    } finally {
      apiRateLimiter.releaseSlot()
    }
  }

  async put<T>(url: string, data?: any): Promise<T> {
    await apiRateLimiter.waitForSlot()
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data)
      return response.data.data as T
    } finally {
      apiRateLimiter.releaseSlot()
    }
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    await apiRateLimiter.waitForSlot()
    try {
      const response = await this.api.patch<ApiResponse<T>>(url, data)
      return response.data.data as T
    } finally {
      apiRateLimiter.releaseSlot()
    }
  }

  async delete<T>(url: string): Promise<T> {
    await apiRateLimiter.waitForSlot()
    try {
      const response = await this.api.delete<ApiResponse<T>>(url)
      return response.data.data as T
    } finally {
      apiRateLimiter.releaseSlot()
    }
  }

  // Get the axios instance for direct use if needed
  getAxiosInstance(): AxiosInstance {
    return this.api
  }

  /**
   * Upload file with extended timeout and retry logic
   */
  async uploadFile<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    retries: number = 2
  ): Promise<T> {
    const config = getApiConfig()
    let lastError: any

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.api.post<ApiResponse<T>>(url, formData, {
          timeout: config.uploadTimeout,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              onProgress(percentCompleted)
            }
          },
        })
        return response.data.data as T
      } catch (error: any) {
        lastError = error
        
        // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (error.response.status !== 408 && error.response.status !== 429) {
            throw error
          }
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
          console.log(`Upload attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // All retries failed
    throw lastError
  }
}

export const apiService = new ApiService()