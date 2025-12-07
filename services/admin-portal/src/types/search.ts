/**
 * Search-related types and interfaces
 */

export interface SearchFilters {
  query?: string
  fields?: string[]
  categoryId?: string
  brandId?: string
  isActive?: boolean
  isFeatured?: boolean
  isSellable?: boolean
  isReturnable?: boolean
  hasImages?: boolean
  hasAttributes?: boolean
  hasOffers?: boolean
  minPrice?: number
  maxPrice?: number
  minStock?: number
  maxStock?: number
  stockLevel?: 'Normal' | 'Low' | 'Out'
  warehouseId?: string
  tags?: string[]
  attributes?: { [key: string]: string }
  dateRange?: {
    field: 'created_at' | 'updated_at' | 'last_restock_date' | 'last_sale_date'
    start: Date | null
    end: Date | null
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface SearchAggregations {
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  featuredProducts: number
  categoryCounts: { [categoryId: string]: number }
  brandCounts: { [brandId: string]: number }
  stockLevelCounts: { Normal: number; Low: number; Out: number }
  priceRanges: {
    '0-100': number
    '100-500': number
    '500-1000': number
    '1000+': number
  }
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: SearchFilters
  createdAt: Date
}