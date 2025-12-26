/**
 * API Configuration
 * Handles dynamic API base URL detection for different network environments
 */

export interface ApiConfig {
  baseURL: string
  timeout: number
  uploadTimeout: number
}

/**
 * Get API base URL with automatic network detection
 */
export function getApiBaseUrl(): string {
  // First, try environment variable (if explicitly set)
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) {
    if (import.meta.env.MODE !== 'production') {
      console.log('🔧 Using configured API URL:', import.meta.env.VITE_API_BASE_URL)
    }
    return import.meta.env.VITE_API_BASE_URL
  }

  // In development, use relative URLs to leverage Vite proxy
  if (import.meta.env.MODE === 'development') {
    const relativeUrl = '/api/v1'
    if (import.meta.env.MODE !== 'production') {
      console.log('🔧 Using Vite proxy URL:', relativeUrl)
    }
    return relativeUrl
  }

  // Auto-detect based on current host for production
  const currentHost = window.location.hostname
  
  // Use the same host as the admin portal for API calls
  // This ensures that when accessing from network IP, API is also accessed via network IP
  let apiHost = currentHost
  
  const protocol = window.location.protocol
  const detectedUrl = `${protocol}//${apiHost}:3000/api/v1`
  
  if (import.meta.env.MODE !== 'production') {
    console.log('🔍 Auto-detected API URL:', detectedUrl)
    console.log('📍 Current host:', currentHost)
    console.log('🌐 API host:', apiHost)
  }
  
  return detectedUrl
}



/**
 * Get complete API configuration
 */
export function getApiConfig(): ApiConfig {
  return {
    baseURL: getApiBaseUrl(),
    timeout: 10000, // 10 seconds for regular API calls
    uploadTimeout: 120000, // 2 minutes for file uploads
  }
}

/**
 * Test API connectivity
 */
export async function testApiConnection(baseURL?: string): Promise<boolean> {
  const url = baseURL || getApiBaseUrl()
  
  try {
    // Test with the API base URL - even 404 means the server is responding
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000,
    } as RequestInit)
    
    // 404 is expected for the base API URL, which means server is responding
    return response.status === 404 || response.ok
  } catch (error) {
    console.warn(`API connection test failed for ${url}:`, error)
    return false
  }
}