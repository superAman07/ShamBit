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
  startDate: Date;
  endDate: Date;
  bannerUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Banner-specific fields
  actionType?: BannerActionType;
  actionValue?: string;
  mobileImageUrl?: string;
  displayOrder?: number;
  bannerType?: BannerType;
  backgroundColor?: string;
  textColor?: string;
  
  // Related data (populated when needed)
  product?: {
    id: string;
    name: string;
    sku: string;
    sellingPrice: number;
  };
  
  // Computed fields
  isCurrentlyActive?: boolean;
  daysRemaining?: number;
  finalPrice?: number; // Product price after applying offer
}

export interface CreateProductOfferDto {
  productId?: string; // Optional for general banners
  offerTitle: string;
  offerDescription?: string;
  discountType: ProductOfferDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
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

export interface UpdateProductOfferDto {
  offerTitle?: string;
  offerDescription?: string;
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
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

export interface ProductOfferValidationResult {
  isValid: boolean;
  offer?: ProductOffer;
  discountAmount?: number;
  finalPrice?: number;
  error?: string;
  errorCode?: string;
}

export interface ProductOfferStats {
  offerId: string;
  offerTitle: string;
  productName: string;
  totalViews?: number;
  totalOrders?: number;
  totalRevenue?: number;
  conversionRate?: number;
  averageOrderValue?: number;
}

export interface BulkProductOfferOperation {
  productIds: string[];
  offerData: Omit<CreateProductOfferDto, 'productId'>;
}

export interface ProductOfferPerformance {
  offerId: string;
  offerTitle: string;
  productId: string;
  productName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  daysActive: number;
  revenuePerDay: number;
}