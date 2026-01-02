import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { SEARCH_CONSTANTS } from './config/elasticsearch.config';
import { 
  SearchQuery, 
  SearchResult, 
  SearchFacets, 
  FacetBucket,
  AutocompleteResult,
  TrendingResult,
  RecommendationResult,
  SortOption,
  SearchDocument
} from './types/search.types';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private elasticsearchClient: Client;
  private readonly indexPrefix: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
  ) {
    this.indexPrefix = this.configService.get('ELASTICSEARCH_INDEX_PREFIX', 'marketplace');
    this.elasticsearchClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
      auth: {
        username: this.configService.get('ELASTICSEARCH_USERNAME') || '',
        password: this.configService.get('ELASTICSEARCH_PASSWORD') || '',
      },
    });
  }

  private getIndexName(): string {
    return `${this.indexPrefix}_products`;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(query);
      
      // Check cache first
      const cacheKey = this.buildCacheKey(query);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached as SearchResult;
      }

      // Execute search
      const response = await this.elasticsearchClient.search({
        index: this.getIndexName(),
        body: esQuery,
      });

      // Process results
      const result = this.processSearchResponse(response, query);
      
      // Cache results
      await this.cacheService.set(cacheKey, result, SEARCH_CONSTANTS.CACHE_TTL);
      
      // Track analytics
      await this.analyticsService.trackSearch({
        query: query.q || '',
        userId: query.userId,
        sessionId: 'session-id', // TODO: Get from request
        results: result.total,
        clickedResults: [],
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        filters: this.extractFilters(query),
      });

      return result;

    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  private buildElasticsearchQuery(query: SearchQuery) {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Text search
    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: [
            'name^3',
            'name.autocomplete^2',
            'description^1',
            'searchText^1',
            'brand.name^2',
            'category.name^2',
            'keywords^2'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });

      // Boost exact matches
      should.push({
        term: {
          'name.keyword': {
            value: query.q,
            boost: 5
          }
        }
      });
    } else {
      // Match all if no query
      must.push({ match_all: {} });
    }

    // Category filter
    if (query.category) {
      filter.push({
        term: { 'category.id': query.category }
      });
    }

    // Brand filter
    if (query.brand) {
      filter.push({
        term: { 'brand.id': query.brand }
      });
    }

    // Seller filter
    if (query.seller) {
      filter.push({
        term: { 'seller.id': query.seller }
      });
    }

    // Price range filter
    if (query.minPrice || query.maxPrice) {
      const priceFilter: any = {};
      if (query.minPrice) priceFilter.gte = query.minPrice;
      if (query.maxPrice) priceFilter.lte = query.maxPrice;
      
      filter.push({
        range: { 'pricing.minPrice': priceFilter }
      });
    }

    // Rating filter
    if (query.rating) {
      filter.push({
        range: { 'popularity.rating': { gte: query.rating } }
      });
    }

    // In stock filter
    if (query.inStock) {
      filter.push({
        term: { 'inventory.isInStock': true }
      });
    }

    // Attribute filters
    if (query.attributes) {
      Object.entries(query.attributes).forEach(([key, value]) => {
        filter.push({
          nested: {
            path: 'attributes',
            query: {
              bool: {
                must: [
                  { term: { 'attributes.name': key } },
                  { term: { 'attributes.value': value } }
                ]
              }
            }
          }
        });
      });
    }

    // Active products only
    filter.push({ term: { isActive: true } });

    // Build sort
    const sort = this.buildSort(query.sortBy, query.sortOrder);

    // Build aggregations for facets
    const aggs = this.buildAggregations(query);

    // Pagination
    const from = ((query.page || 1) - 1) * (query.limit || SEARCH_CONSTANTS.DEFAULT_SIZE);
    const size = Math.min(query.limit || SEARCH_CONSTANTS.DEFAULT_SIZE, SEARCH_CONSTANTS.MAX_SIZE);

    return {
      query: {
        bool: {
          must,
          filter,
          should,
          minimum_should_match: should.length > 0 ? 1 : 0
        }
      },
      sort,
      aggs,
      from,
      size,
      track_total_hits: true,
      _source: {
        excludes: ['searchText'] // Exclude large fields from response
      }
    };
  }

  private buildSort(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const sort: any[] = [];

    switch (sortBy) {
      case SortOption.PRICE_LOW_HIGH:
        sort.push({ 'pricing.minPrice': { order: 'asc' } });
        break;
      case SortOption.PRICE_HIGH_LOW:
        sort.push({ 'pricing.minPrice': { order: 'desc' } });
        break;
      case SortOption.RATING:
        sort.push({ 'popularity.rating': { order: 'desc' } });
        break;
      case SortOption.POPULARITY:
        sort.push({ 'popularity.score': { order: 'desc' } });
        break;
      case SortOption.NEWEST:
        sort.push({ createdAt: { order: 'desc' } });
        break;
      case SortOption.BEST_SELLING:
        sort.push({ 'popularity.orderCount': { order: 'desc' } });
        break;
      case SortOption.RELEVANCE:
      default:
        sort.push({ _score: { order: 'desc' } });
        break;
    }

    // Secondary sort by popularity score
    if (sortBy !== SortOption.POPULARITY) {
      sort.push({ 'popularity.score': { order: 'desc' } });
    }

    return sort;
  }

  private buildAggregations(query: SearchQuery) {
    return {
      categories: {
        terms: {
          field: 'category.id',
          size: SEARCH_CONSTANTS.FACET_SIZE
        },
        aggs: {
          category_name: {
            terms: { field: 'category.name.keyword' }
          }
        }
      },
      brands: {
        terms: {
          field: 'brand.id',
          size: SEARCH_CONSTANTS.FACET_SIZE
        },
        aggs: {
          brand_name: {
            terms: { field: 'brand.name.keyword' }
          }
        }
      },
      price_ranges: {
        range: {
          field: 'pricing.minPrice',
          ranges: [
            { key: '0-500', from: 0, to: 500 },
            { key: '500-1000', from: 500, to: 1000 },
            { key: '1000-5000', from: 1000, to: 5000 },
            { key: '5000-10000', from: 5000, to: 10000 },
            { key: '10000+', from: 10000 }
          ]
        }
      },
      ratings: {
        range: {
          field: 'popularity.rating',
          ranges: [
            { key: '4+', from: 4 },
            { key: '3+', from: 3 },
            { key: '2+', from: 2 },
            { key: '1+', from: 1 }
          ]
        }
      }
    };
  }

  private processSearchResponse(response: any, query: SearchQuery): SearchResult {
    const hits = response.hits.hits || [];
    const total = response.hits.total?.value || 0;
    
    const results = hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score
    })) as SearchDocument[];

    const facets = this.processFacets(response.aggregations || {});

    return {
      results,
      total,
      page: query.page || 1,
      limit: query.limit || SEARCH_CONSTANTS.DEFAULT_SIZE,
      facets,
      took: response.took
    };
  }

  private processFacets(aggregations: any): SearchFacets {
    const processBuckets = (buckets: any[]): FacetBucket[] => {
      return buckets.map(bucket => ({
        key: bucket.key,
        label: bucket.key_as_string || bucket.key,
        count: bucket.doc_count
      }));
    };

    return {
      categories: processBuckets(aggregations.categories?.buckets || []),
      brands: processBuckets(aggregations.brands?.buckets || []),
      priceRanges: processBuckets(aggregations.price_ranges?.buckets || []),
      ratings: processBuckets(aggregations.ratings?.buckets || []),
      attributes: {} // TODO: Process dynamic attribute facets
    };
  }

  async getAutocomplete(query: string, limit = 10): Promise<AutocompleteResult> {
    if (!query || query.length < 2) {
      return {
        suggestions: [],
        products: [],
        categories: [],
        brands: []
      };
    }

    try {
      const response = await this.elasticsearchClient.search({
        index: this.getIndexName(),
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['name.autocomplete^3', 'brand.name^2', 'category.name^2'],
                    type: 'bool_prefix'
                  }
                },
                { term: { isActive: true } }
              ]
            }
          },
          size: limit,
          _source: ['id', 'name', 'primaryImage', 'pricing.minPrice', 'brand.name', 'category.name']
        }
      });

      const products = response.hits.hits.map((hit: any) => hit._source) as SearchDocument[];

      // Extract unique suggestions
      const suggestions = Array.from(new Set([
        ...products.map((p: SearchDocument) => p.name),
        ...products.map((p: SearchDocument) => p.brand?.name).filter(Boolean),
        ...products.map((p: SearchDocument) => p.category?.name).filter(Boolean)
      ])).slice(0, limit).map(text => ({
        text: text as string,
        type: 'query' as const,
        score: 1
      }));

      return {
        suggestions,
        products,
        categories: [], // TODO: Implement category suggestions
        brands: [] // TODO: Implement brand suggestions
      };

    } catch (error) {
      this.logger.error('Autocomplete failed', error);
      return {
        suggestions: [],
        products: [],
        categories: [],
        brands: []
      };
    }
  }

  async getTrending(category?: string, limit = 20): Promise<TrendingResult> {
    try {
      const filter: any[] = [{ term: { isActive: true } }];
      if (category) {
        filter.push({ term: { 'category.id': category } });
      }

      const response = await this.elasticsearchClient.search({
        index: this.getIndexName(),
        body: {
          query: {
            bool: { filter }
          },
          sort: [
            { 'popularity.score': { order: 'desc' } },
            { 'popularity.viewCount': { order: 'desc' } }
          ],
          size: limit
        }
      });

      const products = response.hits.hits.map((hit: any) => hit._source) as SearchDocument[];

      return {
        products,
        categories: [], // TODO: Implement trending categories
        brands: [], // TODO: Implement trending brands
        queries: [] // TODO: Implement trending queries
      };

    } catch (error) {
      this.logger.error('Get trending failed', error);
      return {
        products: [],
        categories: [],
        brands: [],
        queries: []
      };
    }
  }

  async getRecommendations(userId?: string, productId?: string, limit = 10): Promise<RecommendationResult> {
    // TODO: Implement ML-based recommendations
    // For now, return popular products
    const trending = await this.getTrending(undefined, limit);
    
    return {
      recommendations: trending.products,
      type: 'trending',
      metadata: {
        userId,
        productId,
        algorithm: 'popularity_fallback',
        confidence: 0.5
      }
    };
  }

  private buildCacheKey(query: SearchQuery): string {
    return `search:${JSON.stringify(query)}`;
  }

  private extractFilters(query: SearchQuery): Record<string, any> {
    const { q, page, limit, sortBy, sortOrder, userId, ...filters } = query;
    return filters;
  }

  // Legacy methods for backward compatibility
  async searchProducts(query: any) {
    return this.search(query);
  }

  async getSearchSuggestions(q: string) {
    const result = await this.getAutocomplete(q);
    return { suggestions: result.suggestions.map(s => s.text) };
  }

  async getTrendingProducts(query: any) {
    const result = await this.getTrending(query?.category, query?.limit);
    return {
      results: result.products,
      meta: { category: query?.category, limit: query?.limit ?? 10 }
    };
  }

  async getRecommendationsLegacy(query: any) {
    const result = await this.getRecommendations(query?.userId, query?.productId, query?.limit);
    return {
      recommendations: result.recommendations,
      meta: { userId: query?.userId, productId: query?.productId }
    };
  }

  async getPopularCategories() {
    // TODO: Implement popularity calculation
    return { categories: [] };
  }
}
