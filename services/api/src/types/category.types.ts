export interface Category {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  iconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed fields for hierarchical structure
  subcategories?: Category[];
  productCount?: number;
  level?: number;
}

export interface CreateCategoryDto {
  parentId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  iconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  parentId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  iconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface CategoryListQuery {
  page?: number;
  pageSize?: number;
  parentId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  includeSubcategories?: boolean;
}
