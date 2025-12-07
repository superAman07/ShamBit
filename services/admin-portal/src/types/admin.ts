export type AdminRole = 
  | 'super_admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'delivery_manager'
  | 'analyst'

export interface AdminUser {
  id: string
  username: string
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateAdminRequest {
  username: string
  password: string
  name: string
  email: string
  role: AdminRole
}

export interface UpdateAdminRequest {
  name?: string
  email?: string
  role?: AdminRole
  isActive?: boolean
}

export interface ChangePasswordRequest {
  newPassword: string
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  order_manager: 'Order Manager',
  inventory_manager: 'Inventory Manager',
  delivery_manager: 'Delivery Manager',
  analyst: 'Analyst',
}
