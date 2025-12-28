# Advanced Platform Foundations

This document outlines the advanced platform foundations implemented in the NestJS API service.

## 🏢 Multi-Tenancy

### Features
- **Tenant Isolation**: Complete data isolation per tenant
- **Tenant-Aware Queries**: All database operations are tenant-scoped
- **Tenant-Level Rate Limiting**: Different rate limits per tenant type
- **Feature Flags per Tenant**: Enable/disable features per tenant
- **Tenant Caching**: Redis-based tenant context caching

### Implementation
- `TenantService`: Core tenant management
- `TenantGuard`: Automatic tenant context injection
- `@CurrentTenant()` decorator: Access tenant context in controllers
- Database models: `Tenant`, `UserTenant`, `TenantFeature`

### Usage
```typescript
@Controller('products')
@UseGuards(TenantGuard)
export class ProductController {
  @Get()
  async findAll(@CurrentTenant() tenant: TenantContext) {
    // Automatically tenant-scoped
  }
}
```

## 🔄 API Versioning

### Features
- **URL-based Versioning**: `/api/v1`, `/api/v2`
- **Backward Compatibility**: Support multiple versions
- **Deprecation Lifecycle**: Sunset headers and warnings
- **Versioned DTOs**: Transform data between versions

### Implementation
- `@ApiVersion()` decorator: Mark endpoint versions
- `@Deprecated()` decorator: Mark deprecated endpoints
- `ApiVersionInterceptor`: Add version headers
- `DtoTransformer`: Transform between DTO versions

### Usage
```typescript
@Controller('products')
@ApiVersion('v1')
export class ProductV1Controller {
  @Get()
  @Deprecated(new Date('2024-12-31'), 'Use v2 API')
  async findAll() {
    // V1 implementation
  }
}
```

## 🏗️ Domain Ownership & Event-Driven Architecture

### Features
- **Aggregate Root Pattern**: Domain aggregates with event sourcing
- **Domain Events**: Event-driven communication between modules
- **Event Store**: Persistent event storage for replay
- **Cross-Module Coordination**: Read-only projections only

### Implementation
- `AggregateRoot`: Base class for domain aggregates
- `DomainEventService`: Event publishing and storage
- `@OnEvent()` handlers: Event processing
- Event replay capabilities

### Usage
```typescript
export class Product extends AggregateRoot {
  updatePrice(newPrice: number) {
    this.addEvent('product.price.updated', { 
      productId: this.id, 
      oldPrice: this.price, 
      newPrice 
    });
    this.price = newPrice;
  }
}
```

## 🔄 Workflow Orchestration (Saga Pattern)

### Features
- **Saga Orchestration**: Long-running transaction management
- **Compensation Logic**: Automatic rollback on failures
- **Step Orchestration**: Sequential step execution
- **Failure Recovery**: Retry and compensation mechanisms

### Implementation
- `SagaOrchestratorService`: Core saga management
- `SagaStep` interface: Individual saga steps
- Compensation patterns for each step
- Saga state persistence

### Usage
```typescript
// Register saga
sagaOrchestrator.registerSaga({
  sagaType: 'order-fulfillment',
  steps: [
    new ReserveInventoryStep(),
    new ProcessPaymentStep(),
    new ConfirmOrderStep(),
  ],
});

// Start saga
await sagaOrchestrator.startSaga(
  'order-fulfillment',
  tenantId,
  userId,
  { orderId, items, paymentDetails }
);
```

## 📊 Read Models & Projections

### Features
- **Denormalized Read Tables**: Optimized query models
- **Event-Driven Projections**: Auto-update from domain events
- **Cached Query Models**: Redis caching for performance
- **Async Rebuilds**: Rebuild projections from events

### Implementation
- `ProjectionService`: Projection management
- `ProjectionHandler` interface: Event-to-projection mapping
- Read model tables: `ProductReadModel`, `OrderReadModel`
- Failed projection retry mechanism

### Usage
```typescript
@Injectable()
export class ProductReadModelHandler implements ProjectionHandler {
  eventType = 'product.*';

  @OnEvent('product.created')
  async handle(event: DomainEvent) {
    await this.createProductReadModel(event);
  }
}
```

## 🔐 Advanced Authorization (RBAC + ABAC)

### Features
- **Role-Based Access Control**: Traditional role permissions
- **Attribute-Based Access Control**: Context-aware permissions
- **Ownership Validation**: Resource ownership checks
- **Policy Conditions**: Complex authorization rules

### Implementation
- `AuthorizationService`: Core authorization logic
- `PermissionGuard`: Automatic permission checking
- `@RequirePermissions()` decorator: Declarative permissions
- Policy condition evaluation engine

### Usage
```typescript
@Controller('products')
export class ProductController {
  @Get(':id')
  @RequirePermissions('product:read')
  async findOne(@Param('id') id: string) {
    // Automatically checks permissions
  }
}
```

## ⚙️ Dynamic Configuration

### Features
- **Database-Backed Config**: Runtime configuration storage
- **Environment Overrides**: Environment-specific values
- **Tenant-Specific Config**: Per-tenant configuration
- **Runtime Reload**: Hot configuration updates

### Implementation
- `DynamicConfigService`: Configuration management
- Hierarchical configuration resolution
- Redis caching for performance
- Configuration change events

### Usage
```typescript
// Get configuration
const maxRetries = await configService.get<number>('api.maxRetries', 3, tenantId);

// Set configuration
await configService.set('feature.enabled', true, 'boolean', tenantId);
```

## 🗄️ Data Lifecycle Management

### Features
- **Soft Delete**: Logical deletion with recovery
- **Archival Policies**: Automatic data archiving
- **Retention Rules**: Compliance-based data retention
- **Cleanup Jobs**: Scheduled data cleanup

### Implementation
- `DataLifecycleService`: Lifecycle management
- Configurable retention policies
- Automated archival and cleanup
- Data restoration capabilities

### Usage
```typescript
// Policies are configured via dynamic config
const retentionPolicies = [
  {
    entityType: 'Order',
    retentionDays: 2555, // 7 years
    archiveBeforeDelete: true,
  }
];
```

## 🌐 API Exposure Layers

### Features
- **Public API**: Open endpoints
- **Internal API**: Service-to-service communication
- **Admin API**: Administrative functions
- **Partner API**: Third-party integrations

### Implementation
- `@ApiLayerAccess()` decorator: Layer specification
- `ApiLayerGuard`: Layer access validation
- API key management
- Layer-specific rate limiting

### Usage
```typescript
@Controller('admin/users')
@ApiLayerAccess(ApiLayer.ADMIN)
export class AdminUserController {
  @Get()
  async findAll() {
    // Admin-only endpoint
  }
}

@Controller('api/products')
@ApiLayerAccess(ApiLayer.PARTNER)
@ApiKeyRequired()
export class PartnerProductController {
  @Get()
  async findAll() {
    // Partner API with key required
  }
}
```

## 🗃️ Database Schema Updates

### New Models Added
- **Multi-Tenancy**: `Tenant`, `UserTenant`, `TenantFeature`, `Feature`
- **Authorization**: `Role`, `Permission`, `UserRole`, `RolePermission`
- **Configuration**: `Configuration`
- **Saga**: `SagaInstance`
- **Projections**: `ProductReadModel`, `OrderReadModel`, `InventoryReadModel`, `FailedProjection`
- **Lifecycle**: `ArchivedData`
- **API Management**: `ApiKey`

### Schema Migration Required
```bash
# Generate migration
npm run db:migrate

# Apply migration
npm run db:migrate:deploy
```

## 🚀 Getting Started

### 1. Environment Setup
Update your `.env` file with new configuration:
```env
# Multi-Tenancy
DEFAULT_TENANT_ID="default"
TENANT_CACHE_TTL=3600

# API Security
INTERNAL_API_TOKEN="your-internal-api-token"

# Data Lifecycle
DATA_RETENTION_DAYS=2555
ARCHIVE_AFTER_DAYS=365

# Feature Flags
ENABLE_MULTI_TENANCY=true
ENABLE_ADVANCED_AUTH=true
```

### 2. Database Migration
```bash
npm run db:generate
npm run db:migrate
```

### 3. Seed Initial Data
Create initial tenant, roles, and permissions:
```typescript
// In your seed script
await prisma.tenant.create({
  data: {
    id: 'default',
    name: 'Default Tenant',
    type: 'BUSINESS',
  }
});

await prisma.role.create({
  data: {
    name: 'ADMIN',
    tenantId: 'default',
    rolePermissions: {
      create: [
        { permission: { connect: { name: 'user:read' } } },
        { permission: { connect: { name: 'user:write' } } },
      ]
    }
  }
});
```

## 📈 Performance Considerations

### Caching Strategy
- **Tenant Context**: 1 hour TTL
- **User Permissions**: 30 minutes TTL
- **Configuration**: 5 minutes TTL
- **Read Models**: 5 minutes TTL

### Database Optimization
- Proper indexing on `tenantId` fields
- Partitioning for large event tables
- Read replicas for projection queries

### Monitoring
- Saga execution metrics
- Projection lag monitoring
- Cache hit rates
- API layer usage statistics

## 🔧 Configuration Examples

### Tenant Features
```json
{
  "tenantId": "acme-corp",
  "features": [
    "advanced_analytics",
    "custom_branding",
    "api_access",
    "webhooks"
  ]
}
```

### Authorization Policies
```json
{
  "permission": "product:write",
  "conditions": [
    {
      "attribute": "resource.sellerId",
      "operator": "equals",
      "value": "user.id"
    },
    {
      "attribute": "tenant.type",
      "operator": "in",
      "value": ["BUSINESS", "ENTERPRISE"]
    }
  ]
}
```

### Retention Policies
```json
{
  "entityType": "AuditLog",
  "retentionDays": 2555,
  "archiveBeforeDelete": true,
  "conditions": {
    "severity": { "not_in": ["CRITICAL", "ERROR"] }
  }
}
```

This comprehensive platform foundation provides enterprise-grade capabilities for multi-tenant SaaS applications with advanced authorization, workflow orchestration, and data management features.