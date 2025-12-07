export type ProductOfferDiscountType = 'Flat' | 'Percentage';
export type BannerActionType = 'product' | 'category' | 'url' | 'search' | 'none';
export type BannerType = 'hero' | 'promotional' | 'category' | 'product';

export interface ProductOffer {
  id: string;
  productId?: string; // Optional for general banners
  offerTitle: string;
  offerDescription?: string;
  discountType: ProductOfferDiscountType;
  discountValue: number;
  startDate: string; // ISO string
  endDate: string; // ISO string
  bannerUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Banner-specific fields
  actionType?: BannerActionType;
  actionValue?: string;
  mobileImageUrl?: string;
  displayOrder?: number;
  bannerType?: BannerType;
  backgroundColor?: string;
  textColor?: string;
  
  // Related data
  product?: {
    id: string;
    name: string;
    sku: string;
    sellingPrice: number;
  };
  
  // Computed fields
  isCurrentlyActive?: boolean;
  daysRemaining?: number;
  finalPrice?: number;
}

export interface CreateProductOfferRequest {
  productId?: string; // Optional for general banners
  offerTitle: string;
  offerDescription?: string;
  discountType: ProductOfferDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  bannerUrl?: string;
  isActive?: boolean;
  
  // Banner-specific fields
  actionType?: BannerActionType;
  actionValue?: string;
  mobileImageUrl?: string;
  displayOrder?: number;
  bannerType?: BannerType;
  backgroundColor?: string;
  textColor?: string;
}

export interface UpdateProductOfferRequest {
  offerTitle?: string;
  offerDescription?: string;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
  isActive?: boolean;
  
  // Banner-specific fields
  actionType?: BannerActionType;
  actionValue?: string;
  mobileImageUrl?: string;
  displayOrder?: number;
  bannerType?: BannerType;
  backgroundColor?: string;
  textColor?: string;
}

export interface ProductOfferListQuery {
  page?: number;
  pageSize?: number;
  productId?: string;
  isActive?: boolean;
  includeExpired?: boolean;
  discountType?: ProductOfferDiscountType;
}

export interface ProductOfferListResponse {
  offers: ProductOffer[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface BulkProductOfferRequest {
  productIds: string[];
  offerData: Omit<CreateProductOfferRequest, 'productId'>;
}

export interface ProductOfferPerformance {
  offerId: string;
  offerTitle: string;
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  daysActive: number;
  revenuePerDay: number;
}