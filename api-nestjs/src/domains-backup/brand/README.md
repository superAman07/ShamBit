# Brand Domain - Enterprise Edition

## Overview
Enterprise-grade brand management system with comprehensive ownership models, lifecycle management, and access control.

## Domain Structure

```
src/domains/brand/
├── brand.module.ts               # Module configuration
├── brand.controller.ts           # REST API endpoints
├── brand.service.ts              # Core brand business logic
├── brand.policies.ts             # Business rules and policies
├── brand.validators.ts           # Validation rules and utilities
├── enums/
│   ├── brand-status.enum.ts      # Brand lifecycle states
│   ├── brand-scope.enum.ts       # Ownership and visibility scopes
│   └── request-status.enum.ts    # Request workflow states
├── entities/
│   ├── brand.entity.ts           # Brand domain entity
│   └── brand-request.entity.ts   # Brand request domain entity
├── dtos/
│   ├── create-brand.dto.ts       # Create brand DTO
│   ├── update-brand.dto.ts       # Update brand DTO
│   ├── brand-request.dto.ts      # Brand request DTOs
│   ├── brand-response.dto.ts     # Response DTOs
│   └── grant-brand-access.dto.ts # Access control DTOs
├── repositories/
│   ├── brand.repository.ts       # Brand data access
│   └── brand-request.repository.ts # Brand request data access
├── services/
│   ├── brand-request.service.ts  # Brand request workflow
│   ├── brand-audit.service.ts    # Audit trail management
│   └── brand-access.service.ts   # Access control management
├── guards/
│   └── brand-ownership.guard.ts  # Brand ownership validation
└── events/
    └── brand.events.ts           # Domain events
```

## Key Features

### 🏢 Enterprise Ownership Model
- **GLOBAL**: Visible to all sellers
- **SELLER_PRIVATE**: Only creator seller
- **SELLER_SHARED**: Shared across selected sellers
- Granular access control with VIEW/USE permissions

### 🔄 Formal Lifecycle Management
```
DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE
                     ↓         ↓
                  REJECTED   INACTIVE/SUSPENDED → ARCHIVED
```

### 🛡️ Security & Validation
- Comprehensive validation rules
- Reserved word filtering
- Profanity detection
- Trademark conflict checking
- Unicode normalization
- Idempotency support

### 📊 Audit & Compliance
- Complete audit trail
- Change tracking
- User action logging
- IP and user agent tracking
- Compliance reporting

### 🎯 Category Constraints
- Allowed categories per brand
- Restricted categories
- Validation at product creation
- Inheritance rules

### 🔔 Event-Driven Architecture
- Standardized event naming: `brand.created`, `brand.approved`, etc.
- Integration hooks for:
  - Search indexing
  - Notifications
  - Analytics
  - External systems

## API Endpoints

### Brand Management
- `GET /brands` - List brands with filtering
- `GET /brands/:id` - Get brand by ID
- `GET /brands/slug/:slug` - Get brand by slug
- `POST /brands` - Create brand (Admin)
- `PUT /brands/:id` - Update brand
- `PUT /brands/:id/status` - Update status
- `DELETE /brands/:id` - Delete brand (Admin)

### Brand Requests
- `POST /brands/requests` - Create request (Seller)
- `GET /brands/requests` - List requests
- `PUT /brands/requests/:id/handle` - Handle request (Admin)
- `PUT /brands/requests/:id/cancel` - Cancel request (Seller)

### Access Control
- `POST /brands/:id/access` - Grant access
- `DELETE /brands/:id/access/:sellerId` - Revoke access
- `GET /brands/:id/access` - List brand access
- `GET /sellers/:id/brand-access` - List seller access

### Audit & Reporting
- `GET /brands/:id/audit` - Audit history
- `GET /brands/audit/statistics` - Audit statistics

## Business Rules

### State Transitions
- Only ADMIN can approve/reject brands
- Only ACTIVE brands usable in products
- ARCHIVED is terminal state
- Soft delete moves to ARCHIVED

### Access Control
- Admins can access any brand
- Global brands visible to all sellers
- Private brands only to owner
- Shared brands require explicit access grants

### Validation Rules
- Name: 2-100 chars, no profanity, no reserved words
- Slug: lowercase, hyphens only, unique
- Categories: 1-10 per brand, valid UUIDs
- Business justification: 50-2000 chars

## Performance Optimizations
- Strategic database indexes
- Efficient query patterns
- Pagination support
- Caching-friendly design

## Future Extensibility
- Plugin architecture for validation rules
- External trademark API integration
- Advanced search capabilities
- Multi-language support
- Brand analytics and insights