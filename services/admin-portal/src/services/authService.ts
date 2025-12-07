import { apiService } from './api'
import { Admin, LoginCredentials, LoginResponse } from '@/types/auth'

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/admin/login', credentials)
    
    // Store tokens in localStorage
    if (response.tokens) {
      localStorage.setItem('accessToken', response.tokens.accessToken)
      localStorage.setItem('refreshToken', response.tokens.refreshToken)
    }
    
    return response
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/admin/logout')
    } finally {
      // Clear tokens regardless of API response
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  async getCurrentAdmin(): Promise<Admin> {
    return await apiService.get<Admin>('/auth/admin/me')
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await apiService.post<LoginResponse>('/auth/admin/refresh-token', { refreshToken })
    
    // Update tokens
    if (response.tokens) {
      localStorage.setItem('accessToken', response.tokens.accessToken)
      localStorage.setItem('refreshToken', response.tokens.refreshToken)
    }
    
    return response
  }
  
  clearTokens(): void {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
}

export const authService = new AuthService()