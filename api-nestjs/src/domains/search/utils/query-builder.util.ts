import { SearchQuery } from '../types/search.types';

export class QueryBuilderUtil {
  static buildElasticsearchQuery(query: SearchQuery) {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Text search with multi-field matching
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
            'keywords^2',
            'tags^1',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and',
          minimum_should_match: '75%',
        },
      });

      // Boost exact matches
      should.push({
        term: {
          'name.keyword': {
            value: query.q,
            boost: 10,
          },
        },
      });

      // Boost phrase matches
      should.push({
        match_phrase: {
          name: {
            query: query.q,
            boost: 5,
          },
        },
      });

      // Boost prefix matches
      should.push({
        prefix: {
          'name.keyword': {
            value: query.q.toLowerCase(),
            boost: 3,
          },
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    // Category hierarchy filter
    if (query.category) {
      filter.push({
        bool: {
          should: [
            { term: { 'category.id': query.category } },
            { term: { 'category.pathIds': query.category } },
          ],
        },
      });
    }

    // Brand filter
    if (query.brand) {
      if (Array.isArray(query.brand)) {
        filter.push({
          terms: { 'brand.id': query.brand },
        });
      } else {
        filter.push({
          term: { 'brand.id': query.brand },
        });
      }
    }

    // Seller filter
    if (query.seller) {
      filter.push({
        term: { 'seller.id': query.seller },
      });
    }

    // Price range filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: any = {};
      if (query.minPrice !== undefined) priceFilter.gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice;

      filter.push({
        range: { 'pricing.minPrice': priceFilter },
      });
    }

    // Rating filter
    if (query.rating !== undefined) {
      filter.push({
        range: { 'popularity.rating': { gte: query.rating } },
      });
    }

    // In stock filter
    if (query.inStock === true) {
      filter.push({
        term: { 'inventory.isInStock': true },
      });
    }

    // Location-based filter
    if (query.location) {
      filter.push({
        geo_distance: {
          distance: query.location.radius || '50km',
          location: {
            lat: query.location.lat,
            lon: query.location.lon,
          },
        },
      });
    }

    // Attribute filters
    if (query.attributes) {
      Object.entries(query.attributes).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Multiple values for same attribute (OR condition)
          filter.push({
            nested: {
              path: 'attributes',
              query: {
                bool: {
                  must: [
                    { term: { 'attributes.name': key } },
                    { terms: { 'attributes.value': value } },
                  ],
                },
              },
            },
          });
        } else {
          // Single value
          filter.push({
            nested: {
              path: 'attributes',
              query: {
                bool: {
                  must: [
                    { term: { 'attributes.name': key } },
                    { term: { 'attributes.value': value } },
                  ],
                },
              },
            },
          });
        }
      });
    }

    // Active products only
    filter.push({ term: { isActive: true } });

    // Locale filter
    if (query.locale) {
      filter.push({ term: { locale: query.locale } });
    }

    return {
      bool: {
        must,
        filter,
        should,
        minimum_should_match: should.length > 0 ? 1 : 0,
      },
    };
  }

  static buildSortClause(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const sort: any[] = [];

    switch (sortBy) {
      case 'price_asc':
        sort.push({ 'pricing.minPrice': { order: 'asc' } });
        break;
      case 'price_desc':
        sort.push({ 'pricing.minPrice': { order: 'desc' } });
        break;
      case 'rating':
        sort.push({ 'popularity.rating': { order: 'desc' } });
        break;
      case 'popularity':
        sort.push({ 'popularity.score': { order: 'desc' } });
        break;
      case 'newest':
        sort.push({ createdAt: { order: 'desc' } });
        break;
      case 'best_selling':
        sort.push({ 'popularity.orderCount': { order: 'desc' } });
        break;
      case 'name_asc':
        sort.push({ 'name.keyword': { order: 'asc' } });
        break;
      case 'name_desc':
        sort.push({ 'name.keyword': { order: 'desc' } });
        break;
      case 'relevance':
      default:
        sort.push({ _score: { order: 'desc' } });
        break;
    }

    // Secondary sort by popularity score for consistent ordering
    if (sortBy !== 'popularity' && sortBy !== 'relevance') {
      sort.push({ 'popularity.score': { order: 'desc' } });
    }

    // Tertiary sort by creation date for tie-breaking
    if (sortBy !== 'newest') {
      sort.push({ createdAt: { order: 'desc' } });
    }

    return sort;
  }

  static buildAggregations(query: SearchQuery, facetSize = 50) {
    const aggs: any = {
      categories: {
        terms: {
          field: 'category.id',
          size: facetSize,
        },
        aggs: {
          category_name: {
            terms: { field: 'category.name.keyword', size: 1 },
          },
        },
      },
      brands: {
        terms: {
          field: 'brand.id',
          size: facetSize,
        },
        aggs: {
          brand_name: {
            terms: { field: 'brand.name.keyword', size: 1 },
          },
        },
      },
      price_ranges: {
        range: {
          field: 'pricing.minPrice',
          ranges: [
            { key: '0-500', from: 0, to: 500 },
            { key: '500-1000', from: 500, to: 1000 },
            { key: '1000-5000', from: 1000, to: 5000 },
            { key: '5000-10000', from: 5000, to: 10000 },
            { key: '10000-50000', from: 10000, to: 50000 },
            { key: '50000+', from: 50000 },
          ],
        },
      },
      ratings: {
        range: {
          field: 'popularity.rating',
          ranges: [
            { key: '4+', from: 4 },
            { key: '3+', from: 3 },
            { key: '2+', from: 2 },
            { key: '1+', from: 1 },
          ],
        },
      },
      availability: {
        terms: {
          field: 'inventory.isInStock',
          size: 2,
        },
      },
    };

    // Add dynamic attribute aggregations if category is specified
    if (query.category) {
      aggs.attributes = {
        nested: {
          path: 'attributes',
        },
        aggs: {
          attribute_names: {
            terms: {
              field: 'attributes.name',
              size: 20,
            },
            aggs: {
              attribute_values: {
                terms: {
                  field: 'attributes.value',
                  size: 20,
                },
              },
            },
          },
        },
      };
    }

    return aggs;
  }

  static buildHighlightClause(query: SearchQuery) {
    if (!query.q) return undefined;

    return {
      fields: {
        name: {
          fragment_size: 150,
          number_of_fragments: 1,
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        description: {
          fragment_size: 200,
          number_of_fragments: 2,
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
      },
    };
  }

  static buildFunctionScore(query: SearchQuery) {
    const functions: any[] = [];

    // Boost featured products
    functions.push({
      filter: { term: { isFeatured: true } },
      weight: 1.5,
    });

    // Boost promoted products
    functions.push({
      filter: { term: { isPromoted: true } },
      weight: 1.3,
    });

    // Boost verified sellers
    functions.push({
      filter: { term: { 'seller.isVerified': true } },
      weight: 1.2,
    });

    // Boost products with high ratings
    functions.push({
      filter: { range: { 'popularity.rating': { gte: 4 } } },
      weight: 1.1,
    });

    // Decay function for freshness (newer products get slight boost)
    functions.push({
      exp: {
        createdAt: {
          origin: 'now',
          scale: '30d',
          decay: 0.5,
        },
      },
    });

    // Popularity score boost
    functions.push({
      field_value_factor: {
        field: 'popularity.score',
        factor: 0.1,
        modifier: 'log1p',
        missing: 0,
      },
    });

    return {
      score_mode: 'multiply',
      boost_mode: 'multiply',
      functions,
    };
  }
}
