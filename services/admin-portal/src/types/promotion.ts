/**
 * Promotion Management Types
 */

export interface Promotion {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderValue?: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount: number
  perUserLimit?: number
  startDate: string
  endDate: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PromotionFormData {
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderValue?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  startDate: string
  endDate: string
  isActive: boolean
}

export interface PromotionUsage {
  id: string
  promotionId: string
  userId: string
  orderId: string
  discountAmount: number
  usedAt: string
  userName?: string
  orderNumber?: string
}

export interface PromotionFilters {
  search?: string
  isActive?: boolean
  discountType?: 'percentage' | 'fixed'
  page?: number
  limit?: number
}

export interface PromotionStats {
  totalUsage: number
  totalDiscount: number
  uniqueUsers: number
  averageDiscount: number
}
