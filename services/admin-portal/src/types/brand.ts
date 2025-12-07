/**
 * Brand Types and Interfaces
 */

export interface Brand {
  id: string
  name: string
  description?: string
  logoUrl?: string
  website?: string
  country?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BrandFormData {
  name: string
  description?: string
  logoUrl?: string
  website?: string
  country?: string
  isActive: boolean
}

export interface BrandFilters {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  country?: string
}

export interface CreateBrandDto {
  name: string
  description?: string
  logoUrl?: string
  website?: string
  country?: string
  isActive?: boolean
}

export interface UpdateBrandDto {
  name?: string
  description?: string
  logoUrl?: string
  website?: string
  country?: string
  isActive?: boolean
}