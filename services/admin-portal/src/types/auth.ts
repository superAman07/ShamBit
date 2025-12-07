export type AdminRole = 
  | 'super_admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'delivery_manager'
  | 'analyst'

export interface Admin {
  id: string
  username: string
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  admin: Admin
  tokens: {
    accessToken: string
    refreshToken: string
  }
}