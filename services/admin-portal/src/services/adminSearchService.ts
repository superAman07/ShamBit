/**
 * Admin Search Service - Simplified Placeholder
 * 
 * NOTE: This is a temporary placeholder to prevent import errors.
 * The complex search functionality has been removed.
 * 
 * TODO: Refactor ProductListPage and EnhancedSearchPage to use simple filtering
 * instead of this complex search service.
 */

export interface AdminSearchResult {
  products: any[];
  total: number;
  aggregations?: any;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  meta?: {
    query: string;
    executionTime: number;
    cached: boolean;
    suggestions: string[];
  };
}

export const adminSearchService = {
  async searchProducts(_filters: any): Promise<AdminSearchResult> {
    console.warn('adminSearchService.searchProducts is deprecated - use simple filtering instead');
    return { products: [], total: 0, pagination: { page: 1, pageSize: 20, totalPages: 0, totalItems: 0 } };
  },

  async getSearchAnalytics(): Promise<any> {
    console.warn('adminSearchService.getSearchAnalytics is deprecated');
    return {};
  },

  async getFilterPresets(): Promise<any[]> {
    console.warn('adminSearchService.getFilterPresets is deprecated');
    return [];
  },

  async saveFilterPreset(_name: string, _description: string, _filters: any): Promise<any> {
    console.warn('adminSearchService.saveFilterPreset is deprecated');
    return {};
  },

  async exportSearchResults(_filters: any): Promise<Blob> {
    console.warn('adminSearchService.exportSearchResults is deprecated');
    return new Blob();
  },

  async getFilterStats(_filters: any): Promise<any> {
    console.warn('adminSearchService.getFilterStats is deprecated');
    return {};
  },

  async getAvailabilityFilters(): Promise<any> {
    console.warn('adminSearchService.getAvailabilityFilters is deprecated');
    return {};
  },
};
