# API Gateway and Middleware

This directory contains all middleware components for the ShamBit API Gateway. The middleware provides security, validation, rate limiting, logging, and other cross-cutting concerns.

## Middleware Components

### 1. Authentication & Authorization (`auth.middleware.ts`)

Handles JWT-based authentication and role-based authorization.

**Middleware Functions:**
- `authenticate`: Verifies JWT token and attaches user to request
- `authorize(...types)`: Checks if user has required type (customer/admin/delivery)
- `authorizeRole(...roles)`: Checks if user has required role
- `optionalAuthenticate`: Authenticates if token present, doesn't fail otherwise
- `requireAdmin`: Shorthand for authenticate + authorize admin

**Usage:**
```typescript
import { authenticate, authorize, requireAdmin } from './middleware';

// Require authentication
router.get('/profile', authenticate, profileController.get);

// Require specific user type
router.post('/orders', authenticate, authorize('customer'), orderController.create);

// Require specific role
router.post('/products', authenticate, authorizeRole('super_admin'), productController.create);

// Admin only
router.get('/analytics', requireAdmin, analyticsController.get);
```

### 2. Rate Limiting (`rateLimiter.ts`)

Provides multiple rate limiters for different use cases.

**Available Rate Limiters:**
- `defaultRateLimiter()`: General API requests (100 req/min)
- `authRateLimiter`: Authentication endpoints (5 req/15min)
- `otpRateLimiter`: OTP requests (3 req/10min)
- `adminRateLimiter`: Admin operations (200 req/min)
- `webhookRateLimiter`: Payment webhooks (1000 req/min)
- `createRateLimiter(options)`: Custom rate limiter factory

**Usage:**
```typescript
import { authRateLimiter, otpRateLimiter } from './middleware';

// Apply to specific routes
router.post('/auth/login', authRateLimiter, authController.login);
router.post('/auth/send-otp', otpRateLimiter, authController.sendOTP);
```

### 3. Request Validation (`validation.middleware.ts`)

Validates request data using Zod schemas.

**Middleware Functions:**
- `validate(schema, source)`: Generic validation
- `validateBody(schema)`: Validate request body
- `validateQuery(schema)`: Validate query parameters
- `validateParams(schema)`: Validate URL parameters
- `sanitizeInput`: Sanitize input to prevent XSS

**Common Schemas:**
- `commonSchemas.uuidParam`: UUID parameter validation
- `commonSchemas.pagination`: Pagination query validation
- `commonSchemas.search`: Search query validation
- `commonSchemas.dateRange`: Date range validation
- `commonSchemas.mobileNumber`: Mobile number validation
- `commonSchemas.email`: Email validation
- `commonSchemas.otp`: OTP validation

**Usage:**
```typescript
import { validateBody, validateQuery, commonSchemas } from './middleware';
import { z } from 'zod';

// Define schema
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
});

// Apply validation
router.post('/products', validateBody(createProductSchema), productController.create);

// Use common schemas
router.get('/products', validateQuery(commonSchemas.pagination), productController.list);
```

### 4. CORS Configuration (`cors.middleware.ts`)

Configures Cross-Origin Resource Sharing.

**Features:**
- Origin validation with whitelist
- Wildcard subdomain support (*.example.com)
- Credentials support
- Preflight caching
- Exposed headers for rate limiting info

**Usage:**
```typescript
import cors from 'cors';
import { getCorsOptions } from './middleware';

app.use(cors(getCorsOptions()));
```

**Configuration:**
Set `CORS_ORIGIN` environment variable:
- Single origin: `https://example.com`
- Multiple origins: `https://example.com,https://admin.example.com`
- Wildcard subdomain: `*.example.com`
- Allow all (dev only): `*`

### 5. API Versioning (`apiVersion.middleware.ts`)

Handles API versioning and client compatibility.

**Middleware Functions:**
- `apiVersioning`: Adds version headers to responses
- `checkApiVersion(versions)`: Validates requested API version
- `trackClientVersion`: Tracks client app versions

**Usage:**
```typescript
import { apiVersioning, trackClientVersion, checkApiVersion } from './middleware';

// Add to app
app.use(apiVersioning);
app.use(trackClientVersion);

// Check version for specific routes
router.use(checkApiVersion(['v1', 'v2']));
```

**Client Headers:**
- `X-Client-Version`: Client app version (e.g., "1.2.3")
- `X-Client-Platform`: Client platform (e.g., "android", "web")

**Response Headers:**
- `X-API-Version`: Current API version
- `X-API-Deprecated`: "true" if using deprecated version
- `X-Client-Update-Required`: "true" if client update needed

### 6. Security Middleware (`security.middleware.ts`)

Provides additional security features.

**Middleware Functions:**
- `securityHeaders()`: Helmet configuration with security headers
- `csrfProtection`: CSRF token validation
- `requestSizeLimiter(maxSize)`: Limit request payload size
- `ipWhitelist(ips)`: Restrict access to specific IPs
- `requestTimeout(ms)`: Timeout long-running requests

**Usage:**
```typescript
import { securityHeaders, requestTimeout, ipWhitelist } from './middleware';

// Apply security headers
app.use(securityHeaders());

// Request timeout
app.use(requestTimeout(30000)); // 30 seconds

// IP whitelist for admin endpoints
router.use('/admin', ipWhitelist(['192.168.1.1', '10.0.0.1']));
```

### 7. Error Handling (`errorHandler.ts`)

Centralized error handling and formatting.

**Middleware Functions:**
- `errorHandler`: Global error handler
- `notFoundHandler`: 404 handler
- `asyncHandler(fn)`: Wrapper for async route handlers

**Usage:**
```typescript
import { asyncHandler } from './middleware';

// Wrap async handlers
router.get('/products', asyncHandler(async (req, res) => {
  const products = await productService.list();
  res.json({ success: true, data: products });
}));
```

### 8. Request Logging (`requestLogger.ts`)

Logs all incoming requests and responses.

**Features:**
- Generates unique request ID
- Logs request details (method, path, query, IP)
- Logs response details (status code, duration)
- Structured logging format

**Log Format:**
```json
{
  "timestamp": "2025-10-24T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/v1/products",
  "statusCode": 200,
  "duration": 45
}
```

## Middleware Stack Order

The order of middleware is important. Here's the recommended order:

1. **Trust Proxy** - For rate limiting behind load balancers
2. **Security Headers** - Helmet security headers
3. **CORS** - Cross-origin resource sharing
4. **Body Parsing** - JSON and URL-encoded parsing
5. **Compression** - Response compression
6. **Request Timeout** - Timeout protection
7. **Input Sanitization** - XSS prevention
8. **Request Logging** - Log incoming requests
9. **API Versioning** - Version headers
10. **Client Tracking** - Track client versions
11. **Rate Limiting** - Default rate limiter
12. **Routes** - Application routes
13. **404 Handler** - Not found handler
14. **Error Handler** - Global error handler (must be last)

## Best Practices

### 1. Rate Limiting

- Use specific rate limiters for sensitive endpoints
- Consider user-based rate limiting for authenticated endpoints
- Monitor rate limit hits to detect abuse

### 2. Validation

- Always validate input data
- Use Zod schemas for type safety
- Sanitize input to prevent XSS
- Validate at the edge (middleware) not in business logic

### 3. Authentication

- Use short-lived access tokens (15 minutes)
- Implement refresh token rotation
- Check session validity for admin users
- Use HTTPS only in production

### 4. Error Handling

- Use `asyncHandler` for all async route handlers
- Throw `AppError` subclasses for known errors
- Log all errors with context
- Never expose internal errors to clients

### 5. Security

- Enable all security headers in production
- Use CSRF protection for session-based auth
- Implement request timeouts
- Limit request payload sizes
- Use IP whitelisting for sensitive endpoints

## Environment Variables

Required environment variables for middleware:

```env
# API Configuration
API_VERSION=v1
API_RATE_LIMIT_WINDOW=60000
API_RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=*

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
```

## Testing Middleware

Example test for validation middleware:

```typescript
import request from 'supertest';
import { createApp } from '../app';

describe('Validation Middleware', () => {
  const app = createApp();

  it('should reject invalid input', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .send({ name: '' }); // Invalid: empty name

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should accept valid input', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .send({
        name: 'Test Product',
        price: 100,
        categoryId: 'uuid',
      });

    expect(response.status).toBe(201);
  });
});
```

## Monitoring

Monitor these metrics for middleware:

- **Rate Limiting**: Number of rate limit hits per endpoint
- **Authentication**: Failed authentication attempts
- **Validation**: Validation error rates
- **Response Times**: Request duration by endpoint
- **Error Rates**: Error rates by type and endpoint

## Future Enhancements

- [ ] GraphQL support
- [ ] WebSocket authentication
- [ ] Advanced rate limiting (Redis-based)
- [ ] Request replay protection
- [ ] API key management
- [ ] Webhook signature verification
- [ ] Request/response caching
- [ ] Circuit breaker pattern
