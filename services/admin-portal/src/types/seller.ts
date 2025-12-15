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