import { apiService } from './api';
import {
  CustomerFilters,
  CustomerListResponse,
  CustomerDetails,
  CustomerNote,
  CustomerOrdersResponse,
  VerificationStatus,
} from '@/types/customer';

class CustomerService {
  /**
   * Get customers with filters and pagination
   */
  async getCustomers(
    page: number = 1,
    pageSize: number = 20,
    filters?: CustomerFilters,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<CustomerListResponse> {
    const params: any = {
      page,
      pageSize,
      sortBy,
      sortOrder,
      ...filters,
    };

    const response = await apiService.getAxiosInstance().get('/admin/customers', { params });
    
    return {
      customers: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
      statistics: response.data.statistics,
    };
  }

  /**
   * Get customer by ID with full details
   */
  async getCustomerById(customerId: string): Promise<CustomerDetails> {
    const response = await apiService.getAxiosInstance().get(`/admin/customers/${customerId}`);
    return response.data.data;
  }

  /**
   * Block customer
   */
  async blockCustomer(customerId: string, reason: string): Promise<void> {
    await apiService.getAxiosInstance().put(`/admin/customers/${customerId}/block`, { reason });
  }

  /**
   * Unblock customer
   */
  async unblockCustomer(customerId: string, reason: string): Promise<void> {
    await apiService.getAxiosInstance().put(`/admin/customers/${customerId}/unblock`, { reason });
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(customerId: string, verificationStatus: VerificationStatus): Promise<void> {
    await apiService.getAxiosInstance().put(`/admin/customers/${customerId}/verification-status`, { verificationStatus });
  }

  /**
   * Add customer note
   */
  async addCustomerNote(customerId: string, noteText: string): Promise<CustomerNote> {
    const response = await apiService.getAxiosInstance().post(`/admin/customers/${customerId}/notes`, { noteText });
    return response.data.data;
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(
    customerId: string,
    page: number = 1,
    pageSize: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<CustomerOrdersResponse> {
    const params: any = {
      page,
      pageSize,
    };
    
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiService.getAxiosInstance().get(`/admin/customers/${customerId}/orders`, { params });
    
    return {
      orders: response.data.data,
      pagination: response.data.pagination,
    };
  }
}

export const customerService = new CustomerService();
