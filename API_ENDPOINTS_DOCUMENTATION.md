# API Endpoints Documentation

This document provides a comprehensive list of all API endpoints available in the Shambit e-commerce platform.

## Base URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Health Check Endpoints

### GET /health
- **Description**: Main health check endpoint with database status
- **Access**: Public
- **Response**: Application health status, uptime, database connection status

### GET /health/live
- **Description**: Liveness probe for container orchestration
- **Access**: Public
- **Response**: Simple alive status

### GET /health/ready
- **Description**: Readiness probe checking if app is ready to serve traffic
- **Access**: Public
- **Response**: Readiness status with dependency checks

### GET /health/detailed
- **Description**: Detailed health check with all system information
- **Access**: Public
- **Response**: Comprehensive system health including memory, CPU usage

---

## Authentication Endpoints

### POST /auth/register
- **Description**: Register new user with mobile number and terms acceptance
- **Access**: Public
- **Body**: `{ mobileNumber, acceptedTerms }`
- **Response**: OTP sent confirmation

### POST /auth/send-otp
- **Description**: Send OTP to mobile number for login
- **Access**: Public
- **Body**: `{ mobileNumber }`
- **Response**: OTP sent confirmation

### POST /auth/verify-otp
- **Description**: Verify OTP and complete login/registration
- **Access**: Public
- **Body**: `{ mobileNumber, otp }`
- **Response**: User data and JWT tokens

### POST /auth/refresh-token
- **Description**: Refresh access token using refresh token
- **Access**: Public
- **Body**: `{ refreshToken }`
- **Response**: New JWT tokens

### POST /auth/logout
- **Description**: Logout user and invalidate refresh token
- **Access**: Public
- **Body**: `{ refreshToken }`
- **Response**: Logout confirmation

### DELETE /auth/account
- **Description**: Delete user account permanently
- **Access**: Private (User)
- **Response**: Account deletion confirmation

### GET /auth/me
- **Description**: Get current user profile information
- **Access**: Private (User)
- **Response**: User profile data

---

## Admin Authentication Endpoints

### POST /auth/admin/login
- **Description**: Admin login with username and password
- **Access**: Public
- **Body**: `{ username, password }`
- **Response**: Admin data and JWT tokens

### POST /auth/admin/refresh-token
- **Description**: Refresh admin access token
- **Access**: Public
- **Body**: `{ refreshToken }`
- **Response**: New JWT tokens

### POST /auth/admin/logout
- **Description**: Logout admin user
- **Access**: Private (Admin)
- **Body**: `{ refreshToken }`
- **Response**: Logout confirmation

### GET /auth/admin/me
- **Description**: Get current admin profile
- **Access**: Private (Admin)
- **Response**: Admin profile data

### POST /auth/admin/create
- **Description**: Create new admin account (super admin only)
- **Access**: Private (Super Admin)
- **Body**: `{ username, password, name, email, role }`
- **Response**: New admin account details

### GET /auth/admin/audit-logs
- **Description**: Get audit logs with filtering options
- **Access**: Private (Admin)
- **Query**: `limit, offset, adminId, action, resourceType, startDate, endDate`
- **Response**: Paginated audit logs

### GET /auth/admin/audit-logs/:id
- **Description**: Get specific audit log by ID
- **Access**: Private (Admin)
- **Response**: Audit log details

---

## Seller Management Endpoints

### POST /sellers/register
- **Description**: Register new seller with comprehensive business details
- **Access**: Public
- **Body**: Complete seller registration data including business info, addresses
- **Response**: Seller ID and verification requirements

### POST /sellers/verify-mobile
- **Description**: Send OTP to seller's mobile for verification
- **Access**: Public
- **Body**: `{ mobile }`
- **Response**: OTP sent confirmation

### POST /sellers/verify-mobile-otp
- **Description**: Verify seller's mobile OTP
- **Access**: Public
- **Body**: `{ mobile, otp }`
- **Response**: Mobile verification status

### POST /sellers/verify-email
- **Description**: Send OTP to seller's email for verification
- **Access**: Public
- **Body**: `{ email }`
- **Response**: OTP sent confirmation

### POST /sellers/verify-email-otp
- **Description**: Verify seller's email OTP
- **Access**: Public
- **Body**: `{ email, otp }`
- **Response**: Email verification status

### GET /sellers
- **Description**: Get all sellers with pagination and filtering (admin only)
- **Access**: Private (Admin)
- **Query**: `page, pageSize, status, search`
- **Response**: Paginated seller list

### GET /sellers/:id
- **Description**: Get seller details by ID (admin only)
- **Access**: Private (Admin)
- **Response**: Complete seller information

### PUT /sellers/:id/status
- **Description**: Update seller status (admin only)
- **Access**: Private (Admin)
- **Body**: `{ status, notes }`
- **Response**: Updated seller status

### POST /sellers/:id/documents
- **Description**: Upload seller verification documents
- **Access**: Public (during registration)
- **Body**: Document upload data with file URLs
- **Response**: Document upload confirmation

### GET /sellers/:id/documents
- **Description**: Get seller document verification status
- **Access**: Public/Private
- **Response**: Document verification status list

### PUT /sellers/:id/documents/verify
- **Description**: Verify individual seller document (admin only)
- **Access**: Private (Admin)
- **Body**: `{ documentType, verified, notes }`
- **Response**: Document verification result

### PUT /sellers/:id/verify
- **Description**: Complete seller verification and approve/reject (admin only)
- **Access**: Private (Admin)
- **Body**: `{ status, verificationNotes, rejectionReason, adminId }`
- **Response**: Final verification result

### PUT /sellers/:id
- **Description**: Update seller information
- **Access**: Private (Seller/Admin)
- **Body**: Updated seller data
- **Response**: Updated seller information

### GET /sellers/:id/products
- **Description**: Get products by seller (admin only)
- **Access**: Private (Admin)
- **Query**: `page, pageSize, verificationStatus`
- **Response**: Seller's product list

### PUT /sellers/products/:productId/verify
- **Description**: Verify seller product (admin only)
- **Access**: Private (Admin)
- **Body**: `{ action, notes, adminId }`
- **Response**: Product verification result

### GET /sellers/products/pending
- **Description**: Get all pending products for verification (admin only)
- **Access**: Private (Admin)
- **Query**: `page, pageSize`
- **Response**: Pending products list

### PUT /sellers/products/:productId/featured
- **Description**: Toggle product featured status (admin only)
- **Access**: Private (Admin)
- **Body**: `{ isFeatured }`
- **Response**: Updated featured status

### GET /sellers/requests/category
- **Description**: Get category creation requests (admin only)
- **Access**: Private (Admin)
- **Query**: `page, pageSize, status`
- **Response**: Category requests list

### GET /sellers/requests/brand
- **Description**: Get brand creation requests (admin only)
- **Access**: Private (Admin)
- **Query**: `page, pageSize, status`
- **Response**: Brand requests list

### PUT /sellers/requests/:requestId/respond
- **Description**: Respond to category/brand request (admin only)
- **Access**: Private (Admin)
- **Body**: `{ action, notes, adminId }`
- **Response**: Request response result

### GET /sellers/statistics/overview
- **Description**: Get seller statistics overview (admin only)
- **Access**: Private (Admin)
- **Response**: Comprehensive seller statistics

---

## Seller Authentication Endpoints

### POST /seller-auth/login
- **Description**: Seller login with email, password, and CAPTCHA
- **Access**: Public
- **Body**: `{ email, password, captcha }`
- **Response**: OTP requirement for 2FA

### POST /seller-auth/verify-otp
- **Description**: Verify OTP and complete seller login
- **Access**: Public
- **Body**: `{ sellerId, otp }`
- **Response**: Seller data and JWT tokens

### POST /seller-auth/forgot-password
- **Description**: Send password reset OTP to seller email
- **Access**: Public
- **Body**: `{ email }`
- **Response**: Password reset OTP sent

### POST /seller-auth/reset-password
- **Description**: Reset seller password with OTP
- **Access**: Public
- **Body**: `{ email, otp, newPassword }`
- **Response**: Password reset confirmation

### POST /seller-auth/refresh-token
- **Description**: Refresh seller access token
- **Access**: Public
- **Body**: `{ refreshToken }`
- **Response**: New JWT tokens

### POST /seller-auth/logout
- **Description**: Logout seller
- **Access**: Private (Seller)
- **Body**: `{ refreshToken }`
- **Response**: Logout confirmation

### GET /seller-auth/me
- **Description**: Get current seller profile
- **Access**: Private (Seller)
- **Response**: Seller profile data

### GET /seller-auth/captcha
- **Description**: Generate CAPTCHA for seller login
- **Access**: Public
- **Response**: CAPTCHA image and token

---

## Seller Portal Endpoints

### GET /seller-portal/dashboard
- **Description**: Get seller dashboard data with analytics
- **Access**: Private (Seller)
- **Response**: Dashboard metrics and statistics

### GET /seller-portal/products
- **Description**: Get seller's products with pagination and filters
- **Access**: Private (Seller)
- **Query**: `page, pageSize, search, status, isActive`
- **Response**: Seller's product list

### POST /seller-portal/products
- **Description**: Create new product (seller)
- **Access**: Private (Seller)
- **Body**: Product creation data
- **Response**: Created product details

### GET /seller-portal/products/:id
- **Description**: Get seller's product by ID
- **Access**: Private (Seller)
- **Response**: Product details

### PUT /seller-portal/products/:id
- **Description**: Update seller's product
- **Access**: Private (Seller)
- **Body**: Updated product data
- **Response**: Updated product details

### POST /seller-portal/products/:id/images
- **Description**: Upload product images
- **Access**: Private (Seller)
- **Body**: `{ imageUrls }`
- **Response**: Updated product with images

### GET /seller-portal/inventory
- **Description**: Get seller's inventory with stock levels
- **Access**: Private (Seller)
- **Query**: `page, pageSize, search, stockLevel`
- **Response**: Inventory list with stock information

### PUT /seller-portal/inventory/:productId
- **Description**: Update product inventory
- **Access**: Private (Seller)
- **Body**: `{ totalStock, thresholdStock }`
- **Response**: Updated inventory details

### GET /seller-portal/categories
- **Description**: Get available categories (read-only for sellers)
- **Access**: Private (Seller)
- **Response**: Active categories list

### GET /seller-portal/brands
- **Description**: Get available brands (read-only for sellers)
- **Access**: Private (Seller)
- **Response**: Active brands list

### POST /seller-portal/category-request
- **Description**: Request new category creation
- **Access**: Private (Seller)
- **Body**: `{ categoryName, description, reason }`
- **Response**: Category request submission

### POST /seller-portal/brand-request
- **Description**: Request new brand creation
- **Access**: Private (Seller)
- **Body**: `{ brandName, description, reason }`
- **Response**: Brand request submission

### GET /seller-portal/requests
- **Description**: Get seller's category/brand requests
- **Access**: Private (Seller)
- **Query**: `type` (category/brand)
- **Response**: Request history

### GET /seller-portal/notifications
- **Description**: Get seller notifications
- **Access**: Private (Seller)
- **Query**: `page, pageSize, unreadOnly`
- **Response**: Notification list

### PUT /seller-portal/notifications/:id/read
- **Description**: Mark notification as read
- **Access**: Private (Seller)
- **Response**: Read confirmation

---

## Product Endpoints

### GET /products/barcode/:barcode
- **Description**: Get product by barcode
- **Access**: Public
- **Response**: Product details

### GET /products/sku/:sku
- **Description**: Get product by SKU
- **Access**: Public
- **Response**: Product details

### GET /products/search
- **Description**: Search products with full-text search and filters
- **Access**: Public
- **Query**: `search, q, page, pageSize, categoryId, brandId, minPrice, maxPrice, isActive, isFeatured, isSellable`
- **Response**: Filtered product list

### GET /products
- **Description**: Get all products with pagination and filters
- **Access**: Public
- **Query**: Various filtering options
- **Response**: Paginated product list

### POST /products
- **Description**: Create new product (admin only)
- **Access**: Private (Admin)
- **Body**: Product creation data
- **Response**: Created product

### GET /products/:id
- **Description**: Get product by ID
- **Access**: Public
- **Response**: Product details

### PUT /products/:id
- **Description**: Update product (admin only)
- **Access**: Private (Admin)
- **Body**: Updated product data
- **Response**: Updated product

### DELETE /products/:id
- **Description**: Delete product (admin only)
- **Access**: Private (Admin)
- **Response**: Deletion confirmation

---

## Newsletter Endpoints

### POST /newsletter/signup
- **Description**: Subscribe to newsletter
- **Access**: Public
- **Body**: `{ email, source, metadata }`
- **Response**: Subscription confirmation

### POST /newsletter/unsubscribe
- **Description**: Unsubscribe from newsletter
- **Access**: Public
- **Body**: `{ email }`
- **Response**: Unsubscription confirmation

---

## Upload Endpoints

### POST /upload/image
- **Description**: Upload single image file
- **Access**: Private (Admin)
- **Body**: Form data with image file
- **Response**: Uploaded image URL

### POST /upload/images
- **Description**: Upload multiple image files
- **Access**: Private (Admin)
- **Body**: Form data with multiple image files
- **Response**: Array of uploaded image URLs

### POST /upload/banner
- **Description**: Upload banner image
- **Access**: Private (Admin)
- **Body**: Form data with banner image
- **Response**: Uploaded banner URL

---

## Settings Endpoints

### GET /settings
- **Description**: Get all application settings
- **Access**: Private (Admin)
- **Response**: All settings key-value pairs

### GET /settings/:key
- **Description**: Get specific setting by key
- **Access**: Private (Admin)
- **Response**: Setting value

### PUT /settings/:key
- **Description**: Update specific setting
- **Access**: Private (Admin)
- **Body**: `{ value }`
- **Response**: Updated setting

---

## Additional Endpoints

The API also includes endpoints for:

- **Categories** (`/categories`) - Category management
- **Brands** (`/brands`) - Brand management  
- **Orders** (`/orders`) - Order processing and management
- **Cart** (`/cart`) - Shopping cart operations
- **Inventory** (`/inventory`) - Stock management
- **Promotions** (`/promotions`) - Promotional campaigns
- **Delivery** (`/delivery`) - Delivery management
- **Notifications** (`/notifications`) - System notifications
- **Reports** (`/admin/reports`) - Analytics and reporting
- **Dashboard** (`/dashboard`) - Dashboard data
- **Profile** (`/profile`) - User profile management
- **Location** (`/location`) - Location services
- **Home** (`/home`) - Homepage content

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for paginated endpoints)
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 100
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique-request-id"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique-request-id"
  }
}
```

---

## Rate Limiting

- **General**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Password Reset**: 3 requests per hour per IP

---

## Error Codes

Common error codes used throughout the API:

- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Server error

---

*Last updated: December 2025*