# ShamBit API Documentation

A simplified REST API for the ShamBit quick commerce platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Health Checks](#health-checks)
- [Testing](#testing)

---

## Overview

The ShamBit API is a simplified, monolithic REST API built with Node.js, Express, and TypeScript. It provides all backend functionality for the mobile app and admin portal.

**Key Features:**
- Simple, direct database queries (no caching layer)
- JWT-based authentication
- File-based logging with Winston
- Health check endpoints for monitoring
- Rate limiting for security
- Input validation with Zod

**What We Removed:**
- ❌ Redis caching
- ❌ Batch/lot inventory tracking
- ❌ Separate delivery app service
- ❌ Analytics backend
- ❌ OpenTelemetry tracing
- ❌ Prometheus metrics
- ❌ Warehouse management

---

## Architecture

### Simplified Stack

```
┌─────────────────┐
│  Mobile App     │ (Android - Kotlin)
│  Admin Portal   │ (React + Vite)
└────────┬────────┘
         │
         │ HTTPS/REST
         │
┌────────┴────────┐
│   API Service   │ (Node.js + Express + TypeScript)
│                 │
│  - Routes       │
│  - Services     │
│  - Middleware   │
│  - Validation   │
└────────┬────────┘
         │
         │ PostgreSQL Protocol
         │
┌────────┴────────┐
│   PostgreSQL    │ (Managed Database)
└─────────────────┘
```

### Directory Structure

```
services/api/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── index.ts         # Entry point
├── database/
│   └── migrations/      # Database migrations
├── logs/                # Application logs
├── tests/               # Test files
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Navigate to API directory
cd services/api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

See [ENV_VARIABLES.md](../../ENV_VARIABLES.md) for complete reference.

**Required:**
- `DATABASE_URL` or individual `DB_*` variables
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- Firebase credentials (for push notifications)

### Running the API

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3000` by default.

---

## Authentication

### JWT-Based Authentication

The API uses JSON Web Tokens (JWT) for authentication with access and refresh tokens.

**Token Types:**
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (30 days), used to obtain new access tokens

### Authentication Flow

1. **Login**: POST `/api/v1/auth/login`
   - Returns access token and refresh token
   
2. **Use Access Token**: Include in Authorization header
   ```
   Authorization: Bearer <access-token>
   ```

3. **Refresh Token**: POST `/api/v1/auth/refresh`
   - When access token expires, use refresh token to get new access token

### User Roles

- **Customer**: Regular users who place orders
- **Admin**: Full access to admin portal and management features
- **Delivery Personnel**: Managed through admin portal (no separate app)

---

## API Endpoints

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new customer | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | Yes (Refresh Token) |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |
| PUT | `/auth/password` | Change password | Yes |

### Product Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | List all products | No |
| GET | `/products/:id` | Get product details | No |
| GET | `/products/search` | Search products | No |
| POST | `/products` | Create product | Yes (Admin) |
| PUT | `/products/:id` | Update product | Yes (Admin) |
| DELETE | `/products/:id` | Delete product | Yes (Admin) |
| POST | `/products/:id/image` | Upload product image | Yes (Admin) |

### Category Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | List all categories | No |
| GET | `/categories/:id` | Get category details | No |
| POST | `/categories` | Create category | Yes (Admin) |
| PUT | `/categories/:id` | Update category | Yes (Admin) |
| DELETE | `/categories/:id` | Delete category | Yes (Admin) |

### Brand Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/brands` | List all brands | No |
| GET | `/brands/:id` | Get brand details | No |
| POST | `/brands` | Create brand | Yes (Admin) |
| PUT | `/brands/:id` | Update brand | Yes (Admin) |
| DELETE | `/brands/:id` | Delete brand | Yes (Admin) |

### Inventory Endpoints

**Simple inventory tracking - just quantities, no batch/lot tracking**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/inventory` | List inventory | Yes (Admin) |
| GET | `/inventory/:productId` | Get product inventory | Yes (Admin) |
| POST | `/inventory` | Add inventory | Yes (Admin) |
| PUT | `/inventory/:id` | Update inventory | Yes (Admin) |
| DELETE | `/inventory/:id` | Remove inventory | Yes (Admin) |

### Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | List orders | Yes |
| GET | `/orders/:id` | Get order details | Yes |
| POST | `/orders` | Create order | Yes (Customer) |
| PUT | `/orders/:id/status` | Update order status | Yes (Admin) |
| PUT | `/orders/:id/cancel` | Cancel order | Yes |
| GET | `/orders/user/:userId` | Get user orders | Yes |

### Promotion Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/promotions` | List promotions | Yes (Admin) |
| GET | `/promotions/active` | Get active promotions | No |
| POST | `/promotions` | Create promotion | Yes (Admin) |
| PUT | `/promotions/:id` | Update promotion | Yes (Admin) |
| DELETE | `/promotions/:id` | Delete promotion | Yes (Admin) |
| POST | `/promotions/validate` | Validate promo code | Yes (Customer) |

### Delivery Endpoints

**Delivery management integrated into admin portal - no separate delivery app**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/delivery/personnel` | List delivery personnel | Yes (Admin) |
| POST | `/delivery/personnel` | Add delivery person | Yes (Admin) |
| PUT | `/delivery/personnel/:id` | Update delivery person | Yes (Admin) |
| POST | `/delivery/assign` | Assign order to delivery person | Yes (Admin) |
| PUT | `/delivery/:id/status` | Update delivery status | Yes (Admin) |
| GET | `/delivery/order/:orderId` | Get delivery for order | Yes |
| GET | `/delivery/active` | Get active deliveries | Yes (Admin) |

**Delivery Status Flow:**
1. `pending` - Order created, awaiting assignment
2. `assigned` - Assigned to delivery person
3. `out_for_delivery` - Out for delivery
4. `delivered` - Successfully delivered

### Notification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications/device-token` | Register device token | Yes |
| DELETE | `/notifications/device-token` | Unregister device token | Yes |
| GET | `/notifications/preferences` | Get notification preferences | Yes |
| PUT | `/notifications/preferences` | Update preferences | Yes |
| GET | `/notifications/history` | Get notification history | Yes |
| POST | `/notifications/test` | Send test notification | Yes |

### Offer Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/offers` | List offers | No |
| GET | `/offers/active` | Get active offers | No |
| POST | `/offers` | Create offer | Yes (Admin) |
| PUT | `/offers/:id` | Update offer | Yes (Admin) |
| DELETE | `/offers/:id` | Delete offer | Yes (Admin) |

### Location Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/locations` | Save user location | Yes |
| GET | `/locations/user/:userId` | Get user locations | Yes |
| PUT | `/locations/:id` | Update location | Yes |
| DELETE | `/locations/:id` | Delete location | Yes |

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Unexpected server error

---

## Rate Limiting

The API implements rate limiting to prevent abuse.

**Default Limits:**
- 100 requests per minute per IP address
- Configurable via `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW`

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

**When Exceeded:**
- HTTP 429 status code
- Retry-After header with seconds to wait

---

## Health Checks

The API provides multiple health check endpoints for monitoring.

### Endpoints

#### 1. Main Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "responseTime": "5ms"
  }
}
```

#### 2. Liveness Probe
```
GET /health/live
```

Simple check if the app is running. Returns 200 if alive.

#### 3. Readiness Probe
```
GET /health/ready
```

Checks if the app is ready to serve traffic (database connected, etc.).

#### 4. Detailed Health
```
GET /health/detailed
```

Comprehensive health information including memory, CPU, and all dependencies.

### Monitoring Setup

See [MONITORING_SETUP.md](../../docs/MONITORING_SETUP.md) for complete monitoring guide including:
- UptimeRobot setup (free)
- Railway/Render built-in monitoring
- Alert configuration

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
```

### Postman Collection

Import the Postman collection for manual API testing:

**File:** `services/api/docs/ShamBit_API_Tests.postman_collection.json`

**Includes:**
- Authentication flows
- Product management
- Order creation
- Promotion validation
- Delivery assignment
- Notification testing

### Manual Testing

1. Start the API: `npm run dev`
2. Import Postman collection
3. Set `baseUrl` variable to `http://localhost:3000/api/v1`
4. Run authentication requests to get tokens
5. Test other endpoints with valid tokens

---

## Logging

The API uses Winston for structured logging.

**Log Levels:**
- `error` - Error messages with stack traces
- `warn` - Warning messages
- `info` - Informational messages (default)
- `debug` - Debug messages

**Log Files:**
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

**Log Rotation:**
- Daily rotation
- Keep 7 days of logs
- Automatic cleanup

**What Gets Logged:**
- All API requests (method, path, status, duration)
- Errors with stack traces
- Order events (created, status changed)
- Delivery assignments
- Product/inventory changes
- Authentication events
- Slow queries (> 1 second)

---

## Deployment

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**

1. Push to GitHub
2. Connect Railway or Render
3. Add environment variables
4. Deploy automatically

**No Docker required!** The API runs as a standard Node.js process.

---

## Support

- **Documentation**: See main [README.md](../../README.md)
- **Deployment**: See [DEPLOYMENT.md](../../DEPLOYMENT.md)
- **Environment Variables**: See [ENV_VARIABLES.md](../../ENV_VARIABLES.md)
- **Monitoring**: See [MONITORING_SETUP.md](../../docs/MONITORING_SETUP.md)

---

## API Versioning

Current version: **v1**

All endpoints are prefixed with `/api/v1/`

Future versions will use `/api/v2/`, `/api/v3/`, etc.

---

**Built for simplicity and speed. No unnecessary complexity.**
