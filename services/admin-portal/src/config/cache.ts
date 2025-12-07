/**
 * Cache Configuration
 * Centralized configuration for API response caching
 */

export interface CacheEndpointConfig {
  ttl: number
  tags: string[]
  enabled: boolean
}

export interface CacheConfiguration {
  // Global cache settings
  enabled: boolean
  defaultTTL: number
  maxSize: number
  cleanupInterval: number
  
  // Endpoint-specific configurations
  endpoints: {
    [pattern: string]: CacheEndpointConfig
  }
  
  // Feature flags
  features: {
    autoInvalidation: boolean
    backgroundRefresh: boolean
    compressionEnabled: boolean
    persistToStorage: boolean
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfiguration = {
  // Global settings
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 60 * 1000, // 1 minute
  
  // Endpoint-specific configurations
  endpoints: {
    // Dashboard endpoints - short TTL for real-time data
    '/dashboard/*': {
      ttl: 30 * 1000, // 30 seconds
      tags: ['dashboard'],
      enabled: true,
    },
    '/analytics/*': {
      ttl: 60 * 1000, // 1 minute
      tags: ['analytics', 'dashboard'],
      enabled: true,
    },
    
    // Product endpoints - medium TTL
    '/products': {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['products'],
      enabled: true,
    },
    '/products/*': {
      ttl: 10 * 60 * 1000, // 10 minutes for individual products
      tags: ['products'],
      enabled: true,
    },
    
    // Category endpoints - long TTL (categories change less frequently)
    '/categories': {
      ttl: 30 * 60 * 1000, // 30 minutes
      tags: ['categories'],
      enabled: true,
    },
    '/categories/*': {
      ttl: 30 * 60 * 1000, // 30 minutes
      tags: ['categories'],
      enabled: true,
    },
    
    // Order endpoints - short TTL (frequently changing)
    '/orders/*': {
      ttl: 30 * 1000, // 30 seconds
      tags: ['orders'],
      enabled: true,
    },
    
    // Inventory endpoints - medium TTL
    '/inventory/*': {
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['inventory'],
      enabled: true,
    },
    
    // Delivery endpoints - short TTL
    '/delivery/*': {
      ttl: 60 * 1000, // 1 minute
      tags: ['delivery'],
      enabled: true,
    },
    
    // Admin endpoints - medium TTL
    '/admins/*': {
      ttl: 10 * 60 * 1000, // 10 minutes
      tags: ['admins'],
      enabled: true,
    },
    
    // Promotion endpoints - medium TTL
    '/promotions/*': {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['promotions'],
      enabled: true,
    },
  },
  
  // Feature flags
  features: {
    autoInvalidation: true, // Automatically invalidate cache on mutations
    backgroundRefresh: false, // Refresh cache in background before expiry
    compressionEnabled: false, // Compress cached data (future feature)
    persistToStorage: false, // Persist cache to localStorage (future feature)
  },
}

/**
 * Get cache configuration for a specific endpoint
 */
export function getCacheConfigForEndpoint(url: string): CacheEndpointConfig | null {
  const config = defaultCacheConfig
  
  if (!config.enabled) {
    return null
  }
  
  // Find matching endpoint pattern
  for (const [pattern, endpointConfig] of Object.entries(config.endpoints)) {
    if (matchesPattern(url, pattern)) {
      return endpointConfig.enabled ? endpointConfig : null
    }
  }
  
  // Return default configuration if no specific pattern matches
  return {
    ttl: config.defaultTTL,
    tags: [],
    enabled: true,
  }
}

/**
 * Check if URL matches a pattern
 */
function matchesPattern(url: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*') // Replace * with .*
    .replace(/\?/g, '\\?') // Escape ?
    .replace(/\./g, '\\.') // Escape .
  
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(url)
}

/**
 * Cache invalidation rules
 * Defines which cache tags should be invalidated for different operations
 */
export const cacheInvalidationRules: Record<string, string[]> = {
  // Product operations
  'POST /products': ['products', 'dashboard', 'analytics'],
  'PUT /products/*': ['products', 'dashboard', 'analytics'],
  'DELETE /products/*': ['products', 'dashboard', 'analytics'],
  'POST /products/bulk-*': ['products', 'dashboard', 'analytics'],
  
  // Category operations
  'POST /categories': ['categories', 'products'],
  'PUT /categories/*': ['categories', 'products'],
  'DELETE /categories/*': ['categories', 'products'],
  
  // Order operations
  'POST /orders': ['orders', 'dashboard', 'analytics'],
  'PUT /orders/*': ['orders', 'dashboard', 'analytics'],
  'DELETE /orders/*': ['orders', 'dashboard', 'analytics'],
  
  // Inventory operations
  'POST /inventory/*': ['inventory', 'products', 'dashboard'],
  'PUT /inventory/*': ['inventory', 'products', 'dashboard'],
  
  // Any mutation operation should clear dashboard cache
  'POST *': ['dashboard'],
  'PUT *': ['dashboard'],
  'DELETE *': ['dashboard'],
}

/**
 * Get cache tags to invalidate for a specific operation
 */
export function getInvalidationTags(method: string, url: string): string[] {
  const operation = `${method} ${url}`
  
  // Find exact match first
  const exactMatch = cacheInvalidationRules[operation]
  if (exactMatch) {
    return exactMatch
  }
  
  // Find pattern match
  for (const [pattern, tags] of Object.entries(cacheInvalidationRules)) {
    if (matchesPattern(operation, pattern)) {
      return tags
    }
  }
  
  // Default invalidation for mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return ['dashboard']
  }
  
  return []
}