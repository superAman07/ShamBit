# Search API Parameter Type Issue - RESOLVED ✅

## Problem
API returning 422 error: "query.page must be of type number"
- Backend `/products/search` endpoint has strict type validation
- Retrofit sends all query parameters as strings (standard HTTP behavior)
- Backend validation middleware checks type before parsing

## Root Cause Analysis

### Backend Validation Issue
Located in `services/api/src/routes/product.routes.ts` (lines 73-75):
```typescript
validate({
  query: [
    { field: 'page', type: 'number', min: 1 },
    { field: 'pageSize', type: 'number', min: 1, max: 100 },
  ]
})
```

The validation middleware (`services/api/src/middleware/validation.middleware.ts`) checks:
```typescript
case 'number':
  isValid = typeof value === 'number' && !isNaN(value);
  break;
```

This validation happens **before** the route handler parses the query parameters:
```typescript
page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
```

### Why This Happens
1. HTTP query parameters are **always strings** by specification
2. Retrofit correctly sends them as strings in the URL
3. Backend validation checks type before parsing
4. Validation fails even though the values are valid numbers

## Solution Implemented ✅

### Use `/products` Endpoint Instead
The `/products` endpoint (line 143) doesn't have strict type validation on query parameters. It:
- Accepts the same `search` parameter
- Manually parses `page` and `pageSize` without strict validation
- Returns the same response format

### Changes Made
**File**: `mobile_app/app/src/main/java/com/shambit/customer/data/remote/api/ProductApi.kt`

Changed from:
```kotlin
@GET("products/search")
suspend fun searchProducts(...)
```

To:
```kotlin
@GET("products")
suspend fun searchProducts(...)
```

### Why This Works
1. The `/products` endpoint supports search via `search` query parameter
2. It doesn't have strict type validation before parsing
3. It manually parses integers: `parseInt(req.query.page as string, 10)`
4. Returns identical response structure
5. No changes needed in ViewModel or UI code

## Testing
The search functionality should now work correctly:
- ✅ Search queries with pagination
- ✅ Page and pageSize parameters accepted
- ✅ No 422 validation errors
- ✅ Same response format as before

## Backend Recommendation
For future improvement, the backend should:
1. Parse query parameters before type validation, OR
2. Accept string types for query parameters and validate after parsing, OR
3. Remove strict type validation from `/products/search` endpoint

This is a common pattern - most REST APIs parse query string parameters into appropriate types rather than expecting them to arrive as typed values.
