export const SEARCH_CONFIG = {
  // Elasticsearch configuration
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
    maxRetries: 3,
    requestTimeout: 30000,
    sniffOnStart: true,
    sniffInterval: 300000, // 5 minutes
  },

  // Index configuration
  indices: {
    prefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'marketplace',
    products: 'products',
    categories: 'categories',
    brands: 'brands',
    analytics: 'analytics',
  },

  // Search behavior
  search: {
    defaultSize: 20,
    maxSize: 100,
    maxFrom: 10000,
    autocompleteSize: 10,
    facetSize: 50,
    highlightFragmentSize: 150,
    highlightFragments: 2,
    fuzziness: 'AUTO',
    minimumShouldMatch: '75%',
  },

  // Cache configuration
  cache: {
    ttl: 300, // 5 minutes
    searchResultsTtl: 300,
    facetsTtl: 600, // 10 minutes
    autocompleteTtl: 3600, // 1 hour
    popularQueriesTtl: 1800, // 30 minutes
  },

  // Analytics configuration
  analytics: {
    enabled: true,
    trackSearches: true,
    trackClicks: true,
    trackConversions: true,
    batchSize: 100,
    flushInterval: 30000, // 30 seconds
  },

  // Popularity scoring weights
  popularity: {
    weights: {
      orders: 0.4,
      reviews: 0.2,
      rating: 0.2,
      views: 0.1,
      freshness: 0.1,
    },
    decayFactor: 0.95, // Daily decay for time-based metrics
    minOrdersForTrending: 5,
    trendingPeriodDays: 7,
  },

  // Personalization
  personalization: {
    enabled: true,
    userHistoryDays: 90,
    collaborativeFilteringEnabled: true,
    contentBasedEnabled: true,
    minInteractionsForPersonalization: 5,
  },

  // Performance tuning
  performance: {
    bulkIndexSize: 1000,
    scrollSize: 5000,
    scrollTimeout: '5m',
    refreshInterval: '1s',
    numberOfShards: 5,
    numberOfReplicas: 1,
  },

  // Feature flags
  features: {
    spellCorrection: true,
    autoComplete: true,
    facetedSearch: true,
    geoSearch: false,
    visualSearch: false,
    voiceSearch: false,
    mlRecommendations: false,
  },

  // Rate limiting
  rateLimiting: {
    searchRequestsPerMinute: 100,
    autocompleteRequestsPerMinute: 200,
    reindexRequestsPerHour: 10,
  },

  // Monitoring and alerting
  monitoring: {
    slowQueryThreshold: 1000, // 1 second
    errorRateThreshold: 0.05, // 5%
    availabilityThreshold: 0.99, // 99%
    indexSizeAlertThreshold: '10GB',
  },

  // Multi-language support
  localization: {
    defaultLocale: 'en-IN',
    supportedLocales: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN'],
    fallbackLocale: 'en-IN',
  },

  // Business rules
  business: {
    boostFeaturedProducts: 1.5,
    boostPromotedProducts: 1.3,
    boostVerifiedSellers: 1.2,
    boostHighRatedProducts: 1.1,
    penalizeOutOfStock: 0.8,
    penalizeLowRated: 0.9,
  },
};

export const getSearchConfig = () => SEARCH_CONFIG;

export const getElasticsearchConfig = () => SEARCH_CONFIG.elasticsearch;

export const getCacheConfig = () => SEARCH_CONFIG.cache;

export const getAnalyticsConfig = () => SEARCH_CONFIG.analytics;
