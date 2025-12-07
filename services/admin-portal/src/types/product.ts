/**
 * Product Management Types
 */

export interface Category {
  id: string
  parentId?: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  bannerUrl?: string
  iconUrl?: string
  metaTitle?: string
  metaDescription?: string
  displayOrder: number
  isFeatured: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  
  // Computed fields for hierarchical structure
  subcategories?: Category[]
  productCount?: number
  level?: number
}

export interface Product {
  id: string
  categoryId?: string
  brandId?: string
  name: string
  slug: string
  sku: string
  barcode?: string
  description?: string
  detailedDescription?: string
  brand?: string // Legacy field
  unitSize?: string
  unitType?: string
  price: number // Legacy field in paise
  mrp: number
  sellingPrice: number
  taxPercent: number
  discountPercent: number
  weight?: number
  dimensions?: string
  storageInfo?: string
  
  // Food-specific fields
  ingredients?: string
  nutritionInfo?: string
  shelfLifeDays?: number
  
  // Marketing and search fields
  searchKeywords?: string
  tags?: string
  isFeatured: boolean
  isReturnable: boolean
  isSellable: boolean
  
  imageUrls: string[] // Legacy field
  images?: ProductImage[] // New structured images
  attributes?: ProductAttribute[] // Dynamic product attributes
  isActive: boolean
  isAvailable?: boolean
  createdAt: string
  updatedAt: string
  
  // Related data
  category?: Category
  brandInfo?: {
    id: string
    name: string
    logoUrl?: string
    country?: string
  }
  
  // Computed fields
  finalPrice?: number
}

export interface ProductFormData {
  categoryId?: string
  brandId?: string
  name: string
  sku?: string
  barcode?: string
  description?: string
  detailedDescription?: string
  brand?: string // Legacy field
  unitSize?: string
  unitType?: string
  mrp: number
  sellingPrice: number
  taxPercent?: number
  discountPercent?: number
  weight?: number
  dimensions?: string
  storageInfo?: string
  
  // Food-specific fields
  ingredients?: string
  nutritionInfo?: string
  shelfLifeDays?: number
  
  // Marketing and search fields
  searchKeywords?: string
  tags?: string
  isFeatured?: boolean
  isReturnable?: boolean
  isSellable?: boolean
  
  isActive: boolean
}

export interface CategoryFormData {
  parentId?: string
  name: string
  description?: string
  imageUrl?: string
  bannerUrl?: string
  iconUrl?: string
  metaTitle?: string
  metaDescription?: string
  displayOrder: number
  isFeatured: boolean
  isActive: boolean
}

export interface ProductFilters {
  search?: string
  categoryId?: string
  brandId?: string
  isActive?: boolean
  isFeatured?: boolean
  isSellable?: boolean
  sku?: string
  barcode?: string
  tags?: string
  attributes?: { [key: string]: string }
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

export interface ProductImage {
  id: string
  productId: string
  imageUrl: string
  altText?: string
  displayOrder: number
  isPrimary: boolean
  createdAt: string
}

export interface CreateProductImageDto {
  imageUrl: string
  altText?: string
  displayOrder?: number
  isPrimary?: boolean
}

export interface UpdateProductImageDto {
  altText?: string
  displayOrder?: number
  isPrimary?: boolean
}

export interface ProductAttribute {
  id: string
  productId: string
  attributeName: string
  attributeValue: string
  createdAt: string
}

export interface CreateProductAttributeDto {
  attributeName: string
  attributeValue: string
}

export interface UpdateProductAttributeDto {
  attributeName?: string
  attributeValue?: string
}

export interface BulkUploadResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}
