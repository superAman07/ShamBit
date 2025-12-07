import { apiService } from './api'
import { 
  AdminUser, 
  CreateAdminRequest, 
  UpdateAdminRequest, 
  ChangePasswordRequest,
  AdminAuditLog 
} from '@/types/admin'

class AdminService {
  async getAllAdmins(): Promise<AdminUser[]> {
    const response = await apiService.get<{ admins: AdminUser[] }>('/admins')
    return response.admins
  }

  async getAdminById(id: string): Promise<AdminUser> {
    const response = await apiService.get<{ admin: AdminUser }>(`/admins/${id}`)
    return response.admin
  }

  async createAdmin(data: CreateAdminRequest): Promise<AdminUser> {
    const response = await apiService.post<{ admin: AdminUser }>('/admins', data)
    return response.admin
  }

  async updateAdmin(id: string, data: UpdateAdminRequest): Promise<AdminUser> {
    const response = await apiService.put<{ admin: AdminUser }>(`/admins/${id}`, data)
    return response.admin
  }

  async changePassword(id: string, data: ChangePasswordRequest): Promise<void> {
    await apiService.put(`/admins/${id}/password`, data)
  }

  async getAuditLogs(params?: {
    limit?: number
    offset?: number
    adminId?: string
    action?: string
    resourceType?: string
    resourceId?: string
    startDate?: string
    endDate?: string
  }): Promise<{ logs: AdminAuditLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const response = await apiService.get<{ 
      logs: AdminAuditLog[]
      pagination: {
        page: number
        pageSize: number
        totalPages: number
        totalItems: number
      }
    }>('/auth/admin/audit-logs', { params })
    
    return {
      logs: response.logs,
      total: response.pagination.totalItems,
      page: response.pagination.page,
      pageSize: response.pagination.pageSize,
      totalPages: response.pagination.totalPages,
    }
  }
}

export const adminService = new AdminService()
