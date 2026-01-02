export const ELASTICSEARCH_CONFIG = {
  // Index settings
  settings: {
    number_of_shards: 5,
    number_of_replicas: 1,
    max_result_window: 50000,
    analysis: {
      analyzer: {
        product_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'stop',
            'synonym_filter',
            'stemmer',
            'edge_ngram_filter'
          ]
        },
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase', 'edge_ngram_filter']
        },
        search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'stop',
            'synonym_filter',
            'stemmer'
          ]
        }
      },
      filter: {
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20
        },
        synonym_filter: {
          type: 'synonym',
          synonyms: [
            'mobile,phone,smartphone',
            'laptop,notebook,computer',
            'tv,television',
            'fridge,refrigerator',
            'ac,air conditioner'
          ]
        }
      }
    }
  },

  // Index mappings
  mappings: {
    properties: {
      id: { type: 'keyword' },
      type: { type: 'keyword' },

      // Basic information
      name: {
        type: 'text',
        analyzer: 'product_analyzer',
        search_analyzer: 'search_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'search_analyzer'
          },
          raw: { type: 'keyword' }
        }
      },
      description: {
        type: 'text',
        analyzer: 'product_analyzer',
        search_analyzer: 'search_analyzer'
      },
      slug: { type: 'keyword' },

      // Category hierarchy
      'category.id': { type: 'keyword' },
      'category.name': {
        type: 'text',
        analyzer: 'product_analyzer',
        fields: { keyword: { type: 'keyword' } }
      },
      'category.path': { type: 'keyword' },
      'category.pathIds': { type: 'keyword' },
      'category.level': { type: 'integer' },

      // Brand
      'brand.id': { type: 'keyword' },
      'brand.name': {
        type: 'text',
        analyzer: 'product_analyzer',
        fields: { keyword: { type: 'keyword' } }
      },
      'brand.slug': { type: 'keyword' },

      // Seller
      'seller.id': { type: 'keyword' },
      'seller.businessName': {
        type: 'text',
        analyzer: 'product_analyzer',
        fields: { keyword: { type: 'keyword' } }
      },
      'seller.rating': { type: 'float' },
      'seller.isVerified': { type: 'boolean' },

      // Pricing
      'pricing.minPrice': { type: 'double' },
      'pricing.maxPrice': { type: 'double' },
      'pricing.currency': { type: 'keyword' },
      'pricing.hasDiscount': { type: 'boolean' },
      'pricing.discountPercentage': { type: 'float' },

      // Inventory
      'inventory.totalQuantity': { type: 'integer' },
      'inventory.isInStock': { type: 'boolean' },
      'inventory.lowStock': { type: 'boolean' },

      // Attributes (dynamic mapping)
      attributes: {
        type: 'nested',
        properties: {
          name: { type: 'keyword' },
          value: { type: 'keyword' },
          type: { type: 'keyword' },
          displayValue: { type: 'text' }
        }
      },

      // Variants
      variants: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          sku: { type: 'keyword' },
          price: { type: 'double' },
          inventory: { type: 'integer' },
          attributes: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              value: { type: 'keyword' }
            }
          }
        }
      },

      // Media
      images: { type: 'keyword' },
      primaryImage: { type: 'keyword' },

      // Search optimization
      searchText: {
        type: 'text',
        analyzer: 'product_analyzer',
        search_analyzer: 'search_analyzer'
      },
      keywords: { type: 'keyword' },
      tags: { type: 'keyword' },

      // Popularity metrics
      'popularity.viewCount': { type: 'long' },
      'popularity.orderCount': { type: 'long' },
      'popularity.rating': { type: 'float' },
      'popularity.reviewCount': { type: 'integer' },
      'popularity.wishlistCount': { type: 'integer' },
      'popularity.score': { type: 'float' },

      // Status and flags
      status: { type: 'keyword' },
      isActive: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      isPromoted: { type: 'boolean' },

      // Localization
      locale: { type: 'keyword' },

      // Timestamps
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      indexedAt: { type: 'date' },

      // Geo location (for location-based search)
      location: { type: 'geo_point' }
    }
  }
} as const;

export const INDEX_ALIASES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  SEARCH_ALL: 'search_all'
};

export const SEARCH_CONSTANTS = {
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
  DEFAULT_FROM: 0,
  MAX_FROM: 10000,
  AUTOCOMPLETE_SIZE: 10,
  FACET_SIZE: 50,
  CACHE_TTL: 300, // 5 minutes
  BULK_SIZE: 1000,
  SCROLL_SIZE: 5000,
  SCROLL_TIMEOUT: '5m'
};