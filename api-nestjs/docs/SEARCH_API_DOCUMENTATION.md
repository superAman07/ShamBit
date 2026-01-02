# Search & Discovery API Documentation

## Overview

The Search & Discovery API provides comprehensive search functionality for the marketplace, including full-text search, faceted filtering, autocomplete, recommendations, and analytics.

## Base URL

```
/api/search
```

## Authentication

Most endpoints are public, but some administrative and personalized endpoints require authentication:

- **Public**: Search, autocomplete, filters, trending
- **Authenticated**: Recommendations, click tracking
- **Admin**: Reindexing, analytics

## Endpoints

### 1. Product Search

**GET** `/search`

Search for products with advanced filtering and faceting.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query | `"smartphone"` |
| `category` | string | Category ID filter | `"cat_123"` |
| `brand` | string | Brand ID filter | `"brand_456"` |
| `seller` | string | Seller ID filter | `"seller_789"` |
| `minPrice` | number | Minimum price filter | `1000` |
| `maxPrice` | number | Maximum price filter | `50000` |
| `rating` | number | Minimum rating filter | `4` |
| `inStock` | boolean | In stock filter | `true` |
| `page` | number | Page number (1-based) | `1` |
| `limit` | number | Results per page (max 100) | `20` |
| `sortBy` | string | Sort option | `"relevance"` |
| `sortOrder` | string | Sort order | `"desc"` |
| `locale` | string | Locale for results | `"en-IN"` |

#### Sort Options

- `relevance` - Relevance score (default)
- `price_asc` - Price low to high
- `price_desc` - Price high to low
- `rating` - Rating high to low
- `popularity` - Popularity score
- `newest` - Newest first
- `best_selling` - Best selling first
- `name_asc` - Name A to Z
- `name_desc` - Name Z to A

#### Response

```json
{
  "results": [
    {
      "id": "prod_123",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with advanced features",
      "slug": "iphone-15-pro",
      "category": {
        "id": "cat_phones",
        "name": "Smartphones",
        "path": ["Electronics", "Mobile Phones", "Smartphones"]
      },
      "brand": {
        "id": "brand_apple",
        "name": "Apple",
        "slug": "apple"
      },
      "seller": {
        "id": "seller_123",
        "businessName": "TechStore",
        "rating": 4.5,
        "isVerified": true
      },
      "pricing": {
        "minPrice": 99999,
        "maxPrice": 149999,
        "currency": "INR",
        "hasDiscount": true,
        "discountPercentage": 10
      },
      "inventory": {
        "totalQuantity": 50,
        "isInStock": true,
        "lowStock": false
      },
      "images": ["https://example.com/image1.jpg"],
      "primaryImage": "https://example.com/image1.jpg",
      "popularity": {
        "rating": 4.5,
        "reviewCount": 1250,
        "orderCount": 500,
        "score": 85.5
      },
      "_score": 12.5
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 20,
  "facets": {
    "categories": [
      {
        "key": "cat_phones",
        "label": "Smartphones",
        "count": 850
      }
    ],
    "brands": [
      {
        "key": "brand_apple",
        "label": "Apple",
        "count": 120
      }
    ],
    "priceRanges": [
      {
        "key": "10000-50000",
        "label": "₹10,000 - ₹50,000",
        "count": 650
      }
    ],
    "ratings": [
      {
        "key": "4+",
        "label": "4★ & above",
        "count": 800
      }
    ],
    "attributes": {
      "color": [
        {
          "key": "black",
          "label": "Black",
          "count": 300
        }
      ]
    }
  },
  "took": 45
}
```

### 2. Autocomplete

**GET** `/search/autocomplete`

Get search suggestions and autocomplete results.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query (required) | `"iph"` |
| `limit` | number | Number of suggestions | `10` |

#### Response

```json
{
  "suggestions": [
    {
      "text": "iPhone",
      "type": "query",
      "score": 1.0
    }
  ],
  "products": [
    {
      "id": "prod_123",
      "name": "iPhone 15 Pro",
      "primaryImage": "https://example.com/image.jpg",
      "pricing": {
        "minPrice": 99999
      }
    }
  ],
  "categories": [
    {
      "id": "cat_phones",
      "name": "Smartphones",
      "path": ["Electronics", "Mobile Phones"],
      "productCount": 850
    }
  ],
  "brands": [
    {
      "id": "brand_apple",
      "name": "Apple",
      "productCount": 120
    }
  ]
}
```

### 3. Filters

**GET** `/search/filters`

Get available filters for search refinement.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Category ID for context | `"cat_123"` |
| `q` | string | Search query for context | `"smartphone"` |

#### Response

```json
{
  "categories": [
    {
      "key": "cat_phones",
      "label": "Smartphones",
      "count": 850
    }
  ],
  "brands": [
    {
      "key": "brand_apple",
      "label": "Apple",
      "count": 120
    }
  ],
  "priceRanges": [
    {
      "key": "10000-50000",
      "label": "₹10,000 - ₹50,000",
      "count": 650
    }
  ],
  "ratings": [
    {
      "key": "4+",
      "label": "4★ & above",
      "count": 800
    }
  ],
  "attributes": {
    "color": [
      {
        "key": "black",
        "label": "Black",
        "count": 300
      }
    ],
    "storage": [
      {
        "key": "128gb",
        "label": "128GB",
        "count": 200
      }
    ]
  }
}
```

### 4. Trending Products

**GET** `/search/trending`

Get trending products based on recent activity.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Category ID filter | `"cat_123"` |
| `limit` | number | Number of results | `20` |

#### Response

```json
{
  "results": [
    {
      "id": "prod_123",
      "name": "iPhone 15 Pro",
      // ... product details
    }
  ],
  "meta": {
    "category": "cat_123",
    "limit": 20
  }
}
```

### 5. Recommendations

**GET** `/search/recommendations` 🔒

Get personalized product recommendations.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `userId` | string | User ID for personalization | `"user_123"` |
| `productId` | string | Product ID for related items | `"prod_456"` |
| `limit` | number | Number of recommendations | `10` |

#### Response

```json
{
  "recommendations": [
    {
      "id": "prod_789",
      "name": "iPhone Case",
      // ... product details
    }
  ],
  "type": "collaborative",
  "metadata": {
    "userId": "user_123",
    "algorithm": "collaborative_filtering",
    "confidence": 0.85
  }
}
```

### 6. Popular Categories

**GET** `/search/categories/popular`

Get popular categories based on activity.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | number | Number of categories | `10` |

#### Response

```json
{
  "categories": [
    {
      "categoryId": "cat_phones",
      "score": 1250
    }
  ]
}
```

### 7. Track Click

**POST** `/search/track/click` 🔒

Track product clicks for analytics and relevance improvement.

#### Request Body

```json
{
  "productId": "prod_123",
  "query": "smartphone",
  "position": 1,
  "userId": "user_456"
}
```

#### Response

```json
{
  "success": true
}
```

## Administrative Endpoints

### 8. Reindex All

**POST** `/search/reindex` 🔐

Trigger full search index rebuild.

#### Response

```json
{
  "success": true,
  "totalIndexed": 125000
}
```

### 9. Reindex Entity

**POST** `/search/reindex/:entityType/:entityId` 🔐

Reindex specific entity.

#### Parameters

- `entityType`: Type of entity (`product`, `category`, `brand`)
- `entityId`: ID of the entity

#### Response

```json
{
  "success": true
}
```

### 10. Analytics Endpoints

**GET** `/search/analytics/popular-queries` 🔐

Get popular search queries.

**GET** `/search/analytics/zero-results` 🔐

Get queries with zero results.

**GET** `/search/analytics/metrics` 🔐

Get search analytics metrics.

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "error": "Bad Request"
}
```

### 429 Too Many Requests

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Search service unavailable",
  "error": "Internal Server Error"
}
```

## Rate Limits

- Search requests: 100 per minute per IP
- Autocomplete requests: 200 per minute per IP
- Admin requests: 10 per hour per user

## Performance

- Average response time: < 100ms
- 95th percentile: < 200ms
- 99th percentile: < 500ms
- Availability: 99.9%

## Caching

- Search results: 5 minutes
- Facets: 10 minutes
- Autocomplete: 1 hour
- Popular queries: 30 minutes

## Best Practices

1. **Use pagination**: Always use `page` and `limit` parameters
2. **Cache on client**: Cache results for repeated queries
3. **Debounce autocomplete**: Wait 300ms before making requests
4. **Track clicks**: Use click tracking for better relevance
5. **Handle errors**: Implement proper error handling and fallbacks
6. **Use filters**: Combine text search with filters for better results
7. **Monitor performance**: Track response times and error rates

## SDKs and Libraries

- JavaScript/TypeScript SDK available
- React hooks for search components
- Vue.js composables
- Mobile SDKs for iOS and Android

## Support

For API support and questions:
- Documentation: `/docs/search`
- Status page: `/status/search`
- Support: `search-support@marketplace.com`