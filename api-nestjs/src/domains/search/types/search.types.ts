export interface SearchDocument {
  // Core identifiers
  id: string;
  type: 'product' | 'variant' | 'category' | 'brand';

  // Basic information
  name: string;
  description: string;
  slug: string;

  // Hierarchical data
  category: {
    id: string;
    name: string;
    path: string[];
    pathIds: string[];
    level: number;
  };

  // Brand information
  brand?: {
    id: string;
    name: string;
    slug: string;
  };

  // Seller information
  seller: {
    id: string;
    businessName: string;
    rating: number;
    isVerified: boolean;
  };

  // Pricing (aggregated from variants)
  pricing: {
    minPrice: number;
    maxPrice: number;
    currency: string;
    hasDiscount: boolean;
    discountPercentage?: number;
  };

  // Inventory (aggregated)
  inventory: {
    totalQuantity: number;
    isInStock: boolean;
    lowStock: boolean;
  };

  // Attributes (flattened for filtering)
  attributes: Record<string, any>;

  // Variants (for product documents)
  variants?: Array<{
    id: string;
    sku: string;
    price: number;
    inventory: number;
    attributes: Record<string, any>;
  }>;

  // Media
  images: string[];
  primaryImage: string;

  // Search optimization
  searchText: string;
  keywords: string[];
  tags: string[];

  // Popularity metrics
  popularity: {
    viewCount: number;
    orderCount: number;
    rating: number;
    reviewCount: number;
    wishlistCount: number;
    score: number;
  };

  // Status and flags
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  isPromoted: boolean;

  // Localization
  locale: string;
  translations?: Record<string, Partial<SearchDocument>>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date;
}

export interface SearchQuery {
  q?: string;
  category?: string;
  brand?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  attributes?: Record<string, any>;
  inStock?: boolean;
  location?: {
    lat: number;
    lon: number;
    radius?: string;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  locale?: string;
  userId?: string;
}

export interface SearchResult {
  results: SearchDocument[];
  total: number;
  page: number;
  limit: number;
  facets: SearchFacets;
  suggestions?: string[];
  took: number;
}

export interface SearchFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  priceRanges: FacetBucket[];
  ratings: FacetBucket[];
  availability?: FacetBucket[];
  attributes: Record<string, FacetBucket[]>;
}

export interface FacetBucket {
  key: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[];
  products: SearchDocument[];
  categories: CategorySuggestion[];
  brands: BrandSuggestion[];
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'query' | 'product' | 'category' | 'brand';
  score: number;
  metadata?: any;
}

export interface CategorySuggestion {
  id: string;
  name: string;
  path: string[];
  productCount: number;
}

export interface BrandSuggestion {
  id: string;
  name: string;
  productCount: number;
  logoUrl?: string;
}

export interface TrendingResult {
  products: SearchDocument[];
  categories: CategorySuggestion[];
  brands: BrandSuggestion[];
  queries: string[];
}

export interface RecommendationResult {
  recommendations: SearchDocument[];
  type: 'collaborative' | 'content' | 'trending' | 'personalized';
  metadata: {
    userId?: string;
    productId?: string;
    algorithm: string;
    confidence: number;
  };
}

export interface IndexUpdateEvent {
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data?: any;
  timestamp: Date;
}

export interface SearchAnalytics {
  query: string;
  userId?: string;
  sessionId: string;
  results: number;
  clickedResults: string[];
  timestamp: Date;
  responseTime: number;
  filters: Record<string, any>;
}

export enum SortOption {
  RELEVANCE = 'relevance',
  PRICE_LOW_HIGH = 'price_asc',
  PRICE_HIGH_LOW = 'price_desc',
  RATING = 'rating',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
  BEST_SELLING = 'best_selling',
}

export interface SearchConfig {
  defaultLimit: number;
  maxLimit: number;
  enableFacets: boolean;
  enableAutocomplete: boolean;
  enablePersonalization: boolean;
  cacheTimeout: number;
  indexName: string;
  locale: string;
}
