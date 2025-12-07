import { apiService } from './api';
import {
  ProductOffer,
  CreateProductOfferRequest,
  UpdateProductOfferRequest,
  ProductOfferListQuery,
  ProductOfferListResponse,
  BulkProductOfferRequest,
} from '../types/product-offer';
// import { ApiResponse } from '../types/api';

class ProductOfferService {
  private readonly baseUrl = '/product-offers';

  /**
   * Get all product offers with filtering and pagination
   */
  async getProductOffers(query: ProductOfferListQuery = {}): Promise<ProductOfferListResponse> {
    const params = new URLSearchParams();
    
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.productId) params.append('productId', query.productId);
    if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query.includeExpired !== undefined) params.append('includeExpired', query.includeExpired.toString());
    if (query.discountType) params.append('discountType', query.discountType);

    const response = await apiService.getAxiosInstance().get(`${this.baseUrl}?${params}`);
    
    return {
      offers: response.data.data,
      pagination: response.data.pagination,
    };
  }

  /**
   * Get a single product offer by ID
   */
  async getProductOfferById(id: string): Promise<ProductOffer> {
    return apiService.get<ProductOffer>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new product offer
   */
  async createProductOffer(data: CreateProductOfferRequest): Promise<ProductOffer> {
    return apiService.post<ProductOffer>(this.baseUrl, data);
  }

  /**
   * Update a product offer
   */
  async updateProductOffer(id: string, data: UpdateProductOfferRequest): Promise<ProductOffer> {
    return apiService.put<ProductOffer>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete a product offer
   */
  async deleteProductOffer(id: string): Promise<void> {
    return apiService.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle product offer active status
   */
  async toggleOfferStatus(id: string, isActive: boolean): Promise<ProductOffer> {
    return apiService.patch<ProductOffer>(`${this.baseUrl}/${id}/toggle`, {
      isActive,
    });
  }

  /**
   * Create bulk product offers
   */
  async createBulkProductOffers(data: BulkProductOfferRequest): Promise<ProductOffer[]> {
    return apiService.post<ProductOffer[]>(`${this.baseUrl}/bulk`, data);
  }

  /**
   * Get expiring offers
   */
  async getExpiringOffers(daysAhead: number = 7): Promise<ProductOffer[]> {
    return apiService.get<ProductOffer[]>(`${this.baseUrl}/expiring?days=${daysAhead}`);
  }

  /**
   * Get active offers for a specific product
   */
  async getActiveOffersForProduct(productId: string): Promise<ProductOffer[]> {
    return apiService.get<ProductOffer[]>(`${this.baseUrl}/product/${productId}/active`);
  }

  /**
   * Validate a product offer
   */
  async validateProductOffer(productId: string, offerId?: string): Promise<{
    isValid: boolean;
    offer?: ProductOffer;
    discountAmount?: number;
    finalPrice?: number;
    error?: { message: string; code: string };
  }> {
    const response = await apiService.getAxiosInstance().post(`${this.baseUrl}/validate`, {
      productId,
      offerId,
    });
    return response.data;
  }

  /**
   * Get all active banners
   */
  async getActiveBanners(bannerType?: string): Promise<ProductOffer[]> {
    const url = bannerType 
      ? `${this.baseUrl}/banners/active?type=${bannerType}`
      : `${this.baseUrl}/banners/active`;
    return apiService.get<ProductOffer[]>(url);
  }

  /**
   * Get hero banners
   */
  async getHeroBanners(): Promise<ProductOffer[]> {
    return apiService.get<ProductOffer[]>(`${this.baseUrl}/banners/hero`);
  }

  /**
   * Get promotional banners
   */
  async getPromotionalBanners(): Promise<ProductOffer[]> {
    return apiService.get<ProductOffer[]>(`${this.baseUrl}/banners/promotional`);
  }

  /**
   * Get category banners
   */
  async getCategoryBanners(): Promise<ProductOffer[]> {
    return apiService.get<ProductOffer[]>(`${this.baseUrl}/banners/category`);
  }
}

export const productOfferService = new ProductOfferService();
