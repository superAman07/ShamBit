import { apiService } from './api';
import {
  DeliveryPersonnel,
  DeliveryPersonnelWithStats,
  Delivery,
  DeliveryMetrics,
  DeliveryStatusOverview,
  CreateDeliveryPersonnelRequest,
  UpdateDeliveryPersonnelRequest,
  AssignmentSuggestion,
  DeliveryFilters,
  DeliveryListResponse,
  PersonnelListResponse,
} from '@/types/delivery';

class DeliveryService {
  /**
   * Get all delivery personnel with pagination
   */
  async getDeliveryPersonnel(
    page: number = 1,
    pageSize: number = 50,
    filters?: { isActive?: boolean; isAvailable?: boolean }
  ): Promise<PersonnelListResponse> {
    const params: any = { page, pageSize };
    
    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive;
    }
    if (filters?.isAvailable !== undefined) {
      params.isAvailable = filters.isAvailable;
    }

    const response = await apiService.getAxiosInstance().get('/delivery/personnel', { params });
    
    return {
      personnel: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    };
  }

  /**
   * Get delivery personnel by ID
   */
  async getDeliveryPersonnelById(id: string): Promise<DeliveryPersonnel> {
    return apiService.get<DeliveryPersonnel>(`/delivery/personnel/${id}`);
  }

  /**
   * Get delivery personnel with statistics
   */
  async getDeliveryPersonnelWithStats(id: string): Promise<DeliveryPersonnelWithStats> {
    return apiService.get<DeliveryPersonnelWithStats>(`/delivery/personnel/${id}/stats`);
  }

  /**
   * Create new delivery personnel
   */
  async createDeliveryPersonnel(data: CreateDeliveryPersonnelRequest): Promise<DeliveryPersonnel> {
    return apiService.post<DeliveryPersonnel>('/delivery/personnel', data);
  }

  /**
   * Update delivery personnel
   */
  async updateDeliveryPersonnel(
    id: string,
    data: UpdateDeliveryPersonnelRequest
  ): Promise<DeliveryPersonnel> {
    return apiService.put<DeliveryPersonnel>(`/delivery/personnel/${id}`, data);
  }

  /**
   * Delete delivery personnel
   */
  async deleteDeliveryPersonnel(id: string): Promise<void> {
    await apiService.delete(`/delivery/personnel/${id}`);
  }

  /**
   * Get delivery personnel metrics
   */
  async getDeliveryMetrics(personnelId: string): Promise<DeliveryMetrics> {
    return apiService.get<DeliveryMetrics>(`/delivery/personnel/${personnelId}/metrics`);
  }

  /**
   * Get all active deliveries
   */
  async getActiveDeliveries(): Promise<Delivery[]> {
    return apiService.get<Delivery[]>('/delivery/active');
  }

  /**
   * Get all deliveries with filters
   */
  async getDeliveries(
    page: number = 1,
    pageSize: number = 20,
    filters?: DeliveryFilters
  ): Promise<DeliveryListResponse> {
    const params: any = { page, pageSize };
    
    if (filters?.status) {
      params.status = filters.status.join(',');
    }
    if (filters?.deliveryPersonnelId) {
      params.deliveryPersonnelId = filters.deliveryPersonnelId;
    }
    if (filters?.startDate) {
      params.startDate = filters.startDate;
    }
    if (filters?.endDate) {
      params.endDate = filters.endDate;
    }

    const response = await apiService.getAxiosInstance().get('/delivery', { params });
    
    return {
      deliveries: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    };
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<Delivery> {
    return apiService.get<Delivery>(`/delivery/${id}`);
  }

  /**
   * Get delivery status overview
   */
  async getDeliveryStatusOverview(): Promise<DeliveryStatusOverview> {
    return apiService.get<DeliveryStatusOverview>('/delivery/status-overview');
  }

  /**
   * Get assignment suggestions for an order
   */
  async getAssignmentSuggestions(
    pickupLatitude: number,
    pickupLongitude: number,
    limit: number = 5
  ): Promise<AssignmentSuggestion[]> {
    return apiService.post<AssignmentSuggestion[]>('/delivery/assignment-suggestions', {
      pickupLatitude,
      pickupLongitude,
      limit,
    });
  }

  /**
   * Reassign delivery to different personnel
   */
  async reassignDelivery(deliveryId: string, deliveryPersonnelId: string): Promise<Delivery> {
    return apiService.put<Delivery>(`/delivery/${deliveryId}/reassign`, {
      deliveryPersonnelId,
    });
  }

  /**
   * Reset delivery personnel password
   */
  async resetDeliveryPersonnelPassword(id: string, password: string): Promise<void> {
    await apiService.put(`/delivery/personnel/${id}/password`, { password });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(deliveryId: string, status: string): Promise<Delivery> {
    return apiService.put<Delivery>(`/delivery/${deliveryId}/status`, { status });
  }
}

export const deliveryService = new DeliveryService();
