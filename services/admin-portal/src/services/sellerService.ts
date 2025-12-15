import { apiService } from './api';

export interface Seller {
  id: string;
  businessName: string;
  businessType: string;
  gstin?: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SellerFilters {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
  city?: string;
  businessType?: string;
}

export interface SellerListResponse {
  sellers: Seller[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SellerStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  recentRegistrations: number;
  topCities: Array<{
    city: string;
    count: number;
  }>;
  businessTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
}

class SellerService {
  /**
   * Get sellers with filters and pagination
   */
  async getSellers(filters: SellerFilters): Promise<SellerListResponse> {
    const params: any = {
      page: filters.page,
      pageSize: filters.pageSize,
    };

    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.city) params.city = filters.city;
    if (filters.businessType) params.businessType = filters.businessType;

    const response = await apiService.getAxiosInstance().get('/sellers', { params });
    return response.data.data;
  }

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller> {
    const response = await apiService.getAxiosInstance().get(`/sellers/${id}`);
    return response.data.data;
  }

  /**
   * Update seller status
   */
  async updateSellerStatus(
    id: string, 
    status: 'approved' | 'rejected' | 'suspended', 
    notes?: string
  ): Promise<Seller> {
    const response = await apiService.getAxiosInstance().put(`/sellers/${id}/status`, {
      status,
      notes
    });
    return response.data.data;
  }

  /**
   * Get seller statistics
   */
  async getSellerStatistics(): Promise<SellerStatistics> {
    const response = await apiService.getAxiosInstance().get('/sellers/statistics/overview');
    return response.data.data;
  }
}

export const sellerService = new SellerService();