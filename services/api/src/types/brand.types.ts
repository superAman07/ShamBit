export interface Brand {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  country?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDto {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  country?: string;
  isActive?: boolean;
}

export interface UpdateBrandDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  country?: string;
  isActive?: boolean;
}

export interface BrandListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  country?: string;
}

export interface BrandListResponse {
  brands: Brand[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}