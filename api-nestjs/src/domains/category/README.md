# Category Domain - Enterprise Edition

## Overview
Enterprise-grade hierarchical category management system with unlimited depth, attribute inheritance, and brand integration.

## Domain Structure

```
src/domains/category/
├── category.module.ts            # Module configuration
├── category.controller.ts        # REST API endpoints
├── category.service.ts           # Core category business logic
├── category.policies.ts          # Business rules and policies
├── category.validators.ts        # Validation rules and utilities
├── enums/
│   ├── category-status.enum.ts   # Category lifecycle states
│   ├── category-visibility.enum.ts # Visibility and access levels
│   └── attribute-type.enum.ts    # Attribute data types
├── entities/
│   ├── category.entity.ts        # Category domain entity
│   ├── category-attribute.entity.ts # Category attribute entity
│   └── category-tree.entity.ts   # Tree structure entity
├── dtos/
│   ├── create-category.dto.ts    # Create category DTO
│   ├── update-category.dto.ts    # Update category DTO
│   ├── move-category.dto.ts      # Category re-parenting DTO
│   ├── category-response.dto.ts  # Response DTOs
│   └── category-attribute.dto.ts # Attribute DTOs
├── repositories/
│   ├── category.repository.ts    # Category data access
│   ├── category-tree.repository.ts # Tree operations
│   └── category-attribute.repository.ts # Attribute management
├── services/
│   ├── category-tree.service.ts  # Tree operations and validation
│   ├── category-attribute.service.ts # Attribute inheritance logic
│   ├── category-audit.service.ts # Audit trail management
│   └── category-brand.service.ts # Brand integration logic
├── guards/
│   └── category-admin.guard.ts   # Admin-only access control
├── events/
│   └── category.events.ts        # Domain events
└── strategies/
    ├── tree-traversal.strategy.ts # Tree traversal algorithms
    └── attribute-inheritance.strategy.ts # Attribute inheritance rules
```

## Key Features

### 🌳 Hierarchical Tree Management
- Unlimited depth categories
- Efficient tree traversal with materialized paths
- Safe re-parenting with consistency checks
- Bulk operations support

### 🔄 Lifecycle Management
```
DRAFT → ACTIVE → ARCHIVED
   ↓       ↓
REJECTED  INACTIVE
```

### 🏢 Enterprise Access Control
- Admin-only category management
- Delegated permissions
- Visibility rules (PUBLIC, INTERNAL, RESTRICTED)

### 🎯 Brand Integration
- Category-brand constraints
- Allowed/restricted brand mappings
- Validation at product creation

### 📊 Attribute System
- Type-safe attribute definitions
- Inheritance from parent categories
- Override capabilities
- Validation rules per attribute type

### ⚡ Performance Optimization
- Read-optimized queries
- Materialized path indexing
- Cached tree statistics
- Efficient bulk operations

### 🔔 Event-Driven Architecture
- Standardized events: `category.created`, `category.moved`, etc.
- Integration with brand system
- Audit trail automation
- Search index updates