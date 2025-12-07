export type DiscountType = 'percentage' | 'fixed';

export interface Promotion {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number; // Percentage (0-100) or amount in paise
  minOrderValue?: number; // In paise
  maxDiscountAmount?: number; // In paise
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromotionDto {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

export interface UpdatePromotionDto {
  description?: string;
  discountValue?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface PromotionListQuery {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  includeExpired?: boolean;
}

export interface ValidatePromotionRequest {
  code: string;
  userId: string;
  orderAmount: number; // In paise
}

export interface ValidatePromotionResponse {
  valid: boolean;
  promotion?: Promotion;
  discountAmount?: number; // In paise
  error?: string;
  errorCode?: string;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

export interface PromotionUsageStats {
  promotionId: string;
  code: string;
  totalUsage: number;
  totalDiscountGiven: number; // In paise
  uniqueUsers: number;
  usageByDate: {
    date: string;
    count: number;
    totalDiscount: number;
  }[];
}
