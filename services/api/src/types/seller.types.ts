import { z } from 'zod';

export const sellerRegistrationSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['grocery', 'organic', 'packaged', 'other']),
  gstin: z.string().optional(),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number'),
  email: z.string().email('Please enter a valid email address'),
  city: z.string().min(2, 'City must be at least 2 characters'),
});

export type SellerRegistrationData = z.infer<typeof sellerRegistrationSchema>;

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
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
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
  recentRegistrations: number; // Last 30 days
  topCities: Array<{
    city: string;
    count: number;
  }>;
  businessTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
}