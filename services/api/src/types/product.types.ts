export interface Product {
  id: string;
  categoryId?: string;
  brandId?: string;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  description?: string;
  detailedDescription?: string;
  brand?: string; // Legacy field - will be populated from brand relationship
  unitSize?: string;
  unitType?: string;
  price: number; // In smallest currency unit (paise) - legacy field
  mrp: number; // Maximum retail price
  sellingPrice: number; // New selling price in rupees
  taxPercent: number;
  discountPercent: number;
  weight?: number;
  dimensions?: string;
  storageInfo?: string;
  
  // Food-specific fields
  ingredients?: string;
  nutritionInfo?: string;
  shelfLifeDays?: number;
  
  // Marketing and search fields
  searchKeywords?: string;
  tags?: string;
  isFeatured: boolean;
  isReturnable: boolean;
  isSellable: boolean;
  
  imageUrls: string[]; // Legacy field - populated from images relationship
  images?: ProductImage[]; // New structured images
  attributes?: ProductAttribute[]; // Dynamic product attributes
  isActive: boolean;
  isAvailable?: boolean; // Real-time stock availability
  stockQuantity?: number; // Aggregated available stock across all warehouses
  createdAt: Date;
  updatedAt: Date;
  
  // Enhanced fields from brand relationship
  brandInfo?: {
    id: string;
    name: string;
    logoUrl?: string;
    country?: string;
  };
  
  // Enhanced fields from category relationship
  category?: {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    parentName?: string;
  };
  
  // Product offers
  activeOffers?: {
    id: string;
    offerTitle: string;
    offerDescription?: string;
    discountType: 'Flat' | 'Percentage';
    discountValue: number;
    startDate: Date;
    endDate: Date;
    bannerUrl?: string;
  }[];
  
  // Computed fields
  finalPrice?: number; // After discounts and offers
}

export interface CreateProductDto {
  categoryId?: string;
  brandId?: string;
  name: string;
  sku?: string; // Auto-generated if not provided
  barcode?: string;
  description?: string;
  detailedDescription?: string;
  brand?: string; // Legacy field - will be ignored if brandId is provided
  unitSize?: string;
  unitType?: string;
  price?: number; // Legacy field - will be calculated from sellingPrice
  mrp: number;
  sellingPrice: number;
  taxPercent?: number;
  discountPercent?: number;
  weight?: number;
  dimensions?: string;
  storageInfo?: string;
  
  // Food-specific fields
  ingredients?: string;
  nutritionInfo?: string;
  shelfLifeDays?: number;
  
  // Marketing and search fields
  searchKeywords?: string;
  tags?: string;
  isFeatured?: boolean;
  isReturnable?: boolean;
  isSellable?: boolean;
  
  imageUrls?: string[];
  isActive?: boolean;
}

export interface UpdateProductDto {
  categoryId?: string;
  brandId?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  detailedDescription?: string;
  brand?: string; // Legacy field - will be ignored if brandId is provided
  unitSize?: string;
  unitType?: string;
  price?: number; // Legacy field - will be calculated from sellingPrice
  mrp?: number;
  sellingPrice?: number;
  taxPercent?: number;
  discountPercent?: number;
  weight?: number;
  dimensions?: string;
  storageInfo?: string;
  
  // Food-specific fields
  ingredients?: string;
  nutritionInfo?: string;
  shelfLifeDays?: number;
  
  // Marketing and search fields
  searchKeywords?: string;
  tags?: string;
  isFeatured?: boolean;
  isReturnable?: boolean;
  isSellable?: boolean;
  
  imageUrls?: string[];
  isActive?: boolean;
}

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isSellable?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string; // Legacy field - will search by brand name
  sku?: string;
  barcode?: string;
  tags?: string;
  attributes?: { [key: string]: string }; // Attribute filters
  mfcId?: string; // Micro Fulfillment Center ID for stock context
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface CreateProductImageDto {
  imageUrl: string;
  altText?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}

export interface UpdateProductImageDto {
  altText?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}

export interface ProductAttribute {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  createdAt: Date;
}

export interface CreateProductAttributeDto {
  attributeName: string;
  attributeValue: string;
}

export interface UpdateProductAttributeDto {
  attributeName?: string;
  attributeValue?: string;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}
