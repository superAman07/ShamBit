import { apiService } from './api';
import { normalizeSellerData } from '../utils/sellerDataMigration';

export interface Seller {
  id: string;
  // Personal Details
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  mobile?: string;
  email: string;
  
  // Seller Type & Business Information
  sellerType?: 'individual' | 'business';
  businessType?: string;
  businessName?: string;
  natureOfBusiness?: string;
  yearOfEstablishment?: number;
  businessPhone?: string;
  businessEmail?: string;
  
  // Product & Operational Information
  primaryProductCategories?: string;
  estimatedMonthlyOrderVolume?: string;
  preferredPickupTimeSlots?: string;
  maxOrderProcessingTime?: number;
  
  // Address Information
  homeAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  businessAddress?: {
    sameAsHome: boolean;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  };
  warehouseAddress?: {
    sameAsBusiness: boolean;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  };
  
  // Tax & Compliance Details
  gstRegistered?: boolean;
  gstNumber?: string;
  gstin?: string;
  panNumber?: string;
  panHolderName?: string;
  tdsApplicable?: boolean;
  aadhaarNumber?: string;
  
  // Bank Account Details
  bankDetails?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'savings' | 'current';
  };
  
  // System Fields
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationNotes?: string;
  documentsUploaded?: { [key: string]: string }; // Document type -> URL mapping
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
    const data = response.data.data;
    
    // Normalize seller data for backward compatibility
    return {
      ...data,
      sellers: data.sellers.map((seller: any) => normalizeSellerData(seller))
    };
  }

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller> {
    const response = await apiService.getAxiosInstance().get(`/sellers/${id}`);
    return normalizeSellerData(response.data.data);
  }

  /**
   * Update seller status (legacy method - kept for compatibility)
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
   * Verify seller documents and update status (new comprehensive method)
   */
  async verifySellerDocuments(
    id: string, 
    action: 'approve' | 'reject' | 'hold', 
    notes?: string,
    adminId?: string
  ): Promise<Seller> {
    // Map action to status for API compatibility
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected', 
      'hold': 'pending'
    };
    
    const requestData = {
      status: statusMap[action],
      verificationNotes: notes || '',
      adminId: adminId || 'admin_user' // Provide default admin ID if not provided
    };
    
    console.log('Sending seller verification request:', {
      url: `/sellers/${id}/verify`,
      data: requestData
    });
    
    const response = await apiService.getAxiosInstance().put(`/sellers/${id}/verify`, requestData);
    return response.data.data;
  }

  /**
   * Upload seller document
   */
  async uploadSellerDocument(
    sellerId: string, 
    documentType: string, 
    documentUrl: string
  ): Promise<{ success: boolean }> {
    const response = await apiService.getAxiosInstance().post(`/sellers/${sellerId}/documents`, {
      documentType,
      documentUrl
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