# Cart & Promotions System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the enterprise-grade cart and promotions system designed for your multi-seller marketplace.

## Implementation Status

### ✅ Completed Components

1. **System Design Document** - Complete architectural design
2. **Enhanced Prisma Schema** - Database models and migrations
3. **Cart Domain Entities** - Core business entities with methods
4. **Cart Service Layer** - Business logic and orchestration
5. **Cart Validation & Policies** - Security and business rules
6. **Cart Events System** - Comprehensive event handling
7. **Promotions Engine** - Flexible promotion calculation system
8. **Inventory Reservation Service** - Soft and hard reservation management
9. **Cart Pricing Service** - Real-time pricing calculations
10. **REST API Controllers** - Complete API endpoints with Swagger docs
11. **DTOs & Validation** - Request/response models with validation
12. **Cart Module** - NestJS module configuration

### 🚧 Pending Implementation

1. **Repository Implementations** - Concrete Prisma repository classes
2. **Integration Services** - Connections to existing product/inventory services
3. **Caching Layer** - Redis implementation for performance
4. **Job Queues** - Background job processing
5. **Notification Services** - Email/SMS notifications
6. **Analytics Integration** - Event tracking and metrics
7. **Testing Suite** - Unit and integration tests

## Step-by-Step Implementation

### Phase 1: Database Setup (Week 1)

#### 1.1 Apply Database Migrations

```bash
# Apply the enhanced cart schema migration
cd api-nestjs
npx prisma db push --schema=prisma/enhanced-cart-promotions-schema.prisma

# Or run the SQL migration directly
psql -d your_database -f prisma/migrations/enhance_cart_promotions_system.sql
```

#### 1.2 Update Main Prisma Schema

Add the enhanced models from `prisma/enhanced-cart-promotions-schema.prisma` to your main `prisma/schema.prisma` file.

#### 1.3 Generate Prisma Client

```bash
npx prisma generate
```

### Phase 2: Repository Implementation (Week 1-2)

#### 2.1 Create Cart Repository

```typescript
// src/domains/cart/repositories/cart.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ICartRepository } from '../interfaces/cart.repository.interface';
import { Cart, CartItem, AppliedPromotion } from '../entities/cart.entity';

@Injectable()
export class CartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, includes?: CartIncludeOptions): Promise<Cart | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: this.buildIncludeClause(includes)
    });

    return cart ? new Cart(cart) : null;
  }

  async findActiveCart(userId?: string, sessionId?: string): Promise<Cart | null> {
    const where: any = {
      status: 'ACTIVE',
      OR: []
    };

    if (userId) {
      where.OR.push({ userId });
    }
    if (sessionId) {
      where.OR.push({ sessionId });
    }

    if (where.OR.length === 0) {
      return null;
    }

    const cart = await this.prisma.cart.findFirst({
      where,
      include: {
        items: true,
        appliedPromotionDetails: true
      }
    });

    return cart ? new Cart(cart) : null;
  }

  async create(cartData: Partial<Cart>): Promise<Cart> {
    const cart = await this.prisma.cart.create({
      data: {
        ...cartData,
        subtotal: cartData.subtotal?.toString(),
        discountAmount: cartData.discountAmount?.toString(),
        taxAmount: cartData.taxAmount?.toString(),
        shippingAmount: cartData.shippingAmount?.toString(),
        totalAmount: cartData.totalAmount?.toString()
      },
      include: {
        items: true,
        appliedPromotionDetails: true
      }
    });

    return new Cart(cart);
  }

  // Implement other repository methods...
  
  private buildIncludeClause(includes?: CartIncludeOptions) {
    const include: any = {};
    
    if (includes?.items) {
      include.items = {
        include: {
          variant: {
            include: {
              product: true,
              pricing: true,
              inventory: true
            }
          }
        }
      };
    }
    
    if (includes?.appliedPromotions) {
      include.appliedPromotionDetails = {
        include: {
          promotion: true
        }
      };
    }
    
    return include;
  }
}
```

#### 2.2 Create Other Repositories

Follow similar patterns for:
- `CartItemRepository`
- `AppliedPromotionRepository`
- `InventoryReservationRepository`

### Phase 3: Service Integration (Week 2-3)

#### 3.1 Integrate with Existing Services

Update the cart service to integrate with your existing services:

```typescript
// src/domains/cart/cart.service.ts (updates)

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly productService: ProductService, // Add existing service
    private readonly inventoryService: InventoryService, // Add existing service
    private readonly pricingService: PricingService, // Add existing service
  ) {}

  private async getVariantDetails(variantId: string): Promise<any> {
    return await this.productService.getVariantById(variantId);
  }

  private async validateItemAvailability(variantId: string, quantity: number): Promise<void> {
    const available = await this.inventoryService.checkAvailability(variantId, quantity);
    if (!available) {
      throw new BadRequestException('Insufficient inventory');
    }
  }

  private async getCurrentVariantPricing(variantId: string): Promise<any> {
    return await this.pricingService.getCurrentPricing(variantId);
  }
}
```

#### 3.2 Update Module Dependencies

```typescript
// src/domains/cart/cart.module.ts (updates)

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ProductModule, // Add existing modules
    InventoryModule,
    PricingModule,
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartPricingService,
    PromotionEngineService,
    InventoryReservationService,
    CartEventListeners,
    
    // Repository implementations
    CartRepository,
    CartItemRepository,
    AppliedPromotionRepository,
    
    // Repository interfaces
    {
      provide: 'ICartRepository',
      useClass: CartRepository,
    },
  ],
  exports: [CartService, CartPricingService],
})
export class CartModule {}
```

### Phase 4: Caching Implementation (Week 3)

#### 4.1 Add Redis Caching

```typescript
// src/domains/cart/services/cart-cache.service.ts

@Injectable()
export class CartCacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async cacheCart(cart: Cart): Promise<void> {
    const cacheKey = `cart:${cart.id}`;
    const ttl = cart.userId ? 86400 : 3600; // 24h for users, 1h for guests
    
    await this.redis.setex(cacheKey, ttl, JSON.stringify(cart));
  }

  async getCachedCart(cartId: string): Promise<Cart | null> {
    const cacheKey = `cart:${cartId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return new Cart(JSON.parse(cached));
    }
    
    return null;
  }

  async invalidateCartCaches(cartId: string): Promise<void> {
    const keys = [
      `cart:${cartId}`,
      `cart_promotions:${cartId}`,
      `cart_pricing:${cartId}`,
    ];
    
    await this.redis.del(...keys);
  }
}
```

#### 4.2 Update Cart Service with Caching

```typescript
// Add caching to cart service methods
async getCart(cartId: string, userId?: string, sessionId?: string): Promise<Cart> {
  // Try cache first
  let cart = await this.cartCacheService.getCachedCart(cartId);
  
  if (!cart) {
    // Fallback to database
    cart = await this.cartRepository.findById(cartId, {
      items: true,
      appliedPromotions: true
    });
    
    if (cart) {
      // Cache the result
      await this.cartCacheService.cacheCart(cart);
    }
  }

  if (!cart) {
    throw new NotFoundException('Cart not found');
  }

  CartPolicies.validateCartAccess(cart, userId, sessionId);
  return cart;
}
```

### Phase 5: Background Jobs (Week 3-4)

#### 5.1 Setup Job Queue

```bash
npm install @nestjs/bull bull
npm install @types/bull --save-dev
```

#### 5.2 Create Cart Cleanup Jobs

```typescript
// src/domains/cart/jobs/cart-cleanup.processor.ts

@Processor('cart-cleanup')
export class CartCleanupProcessor {
  private readonly logger = new Logger(CartCleanupProcessor.name);

  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly inventoryReservationService: InventoryReservationService,
  ) {}

  @Process('cleanup-expired-carts')
  async handleExpiredCarts(job: Job) {
    this.logger.log('Starting expired cart cleanup');
    
    const expiredCount = await this.cartRepository.cleanupExpiredCarts();
    
    this.logger.log(`Cleaned up ${expiredCount} expired carts`);
    return { cleanedCount: expiredCount };
  }

  @Process('cleanup-expired-reservations')
  async handleExpiredReservations(job: Job) {
    this.logger.log('Starting expired reservation cleanup');
    
    await this.inventoryReservationService.cleanupExpiredReservations();
    
    this.logger.log('Completed expired reservation cleanup');
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async scheduleCartCleanup() {
    // Schedule cleanup jobs
  }
}
```

### Phase 6: API Integration (Week 4)

#### 6.1 Add to Main App Module

```typescript
// src/app.module.ts

@Module({
  imports: [
    // ... existing imports
    CartModule,
  ],
})
export class AppModule {}
```

#### 6.2 Add Authentication Guards

```typescript
// Update cart controller with proper guards

@Controller('cart')
@UseGuards(AuthGuard, RateLimitGuard)
export class CartController {
  // ... existing methods
}
```

### Phase 7: Testing (Week 5)

#### 7.1 Unit Tests

```typescript
// src/domains/cart/cart.service.spec.ts

describe('CartService', () => {
  let service: CartService;
  let repository: jest.Mocked<ICartRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: 'ICartRepository',
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            // ... other methods
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    repository = module.get('ICartRepository');
  });

  describe('addItem', () => {
    it('should add item to cart successfully', async () => {
      // Test implementation
    });

    it('should throw error for invalid quantity', async () => {
      // Test implementation
    });
  });
});
```

#### 7.2 Integration Tests

```typescript
// test/cart.e2e-spec.ts

describe('Cart API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/cart (GET)', () => {
    return request(app.getHttpServer())
      .get('/cart')
      .expect(200);
  });

  it('/cart/:id/items (POST)', () => {
    return request(app.getHttpServer())
      .post('/cart/test-cart-id/items')
      .send({
        variantId: 'test-variant-id',
        quantity: 2
      })
      .expect(201);
  });
});
```

### Phase 8: Monitoring & Analytics (Week 6)

#### 8.1 Add Metrics Collection

```typescript
// src/domains/cart/services/cart-analytics.service.ts

@Injectable()
export class CartAnalyticsService {
  constructor(
    @Inject('METRICS_CLIENT') private readonly metrics: any,
  ) {}

  trackCartCreated(cart: Cart) {
    this.metrics.increment('cart.created', {
      userType: cart.userId ? 'authenticated' : 'guest'
    });
  }

  trackItemAdded(cart: Cart, item: CartItem) {
    this.metrics.increment('cart.item_added', {
      sellerId: item.sellerId,
      category: item.variantSnapshot?.categoryId
    });
  }

  trackCartConverted(cart: Cart, orderId: string) {
    this.metrics.increment('cart.converted');
    this.metrics.histogram('cart.conversion_value', cart.totalAmount.toNumber());
  }
}
```

#### 8.2 Add Health Checks

```typescript
// src/domains/cart/health/cart.health.ts

@Injectable()
export class CartHealthIndicator extends HealthIndicator {
  constructor(
    private readonly cartRepository: ICartRepository,
  ) {
    super();
  }

  @HealthCheck()
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check database connectivity
      await this.cartRepository.getStatistics();
      
      return this.getStatus(key, true);
    } catch (error) {
      return this.getStatus(key, false, { error: error.message });
    }
  }
}
```

## Configuration

### Environment Variables

```env
# Cart Configuration
CART_EXPIRY_HOURS_GUEST=24
CART_EXPIRY_HOURS_USER=720
CART_MAX_ITEMS=100
CART_MAX_VALUE=1000000

# Reservation Configuration
RESERVATION_EXPIRY_MINUTES=30
RESERVATION_CLEANUP_INTERVAL=5

# Cache Configuration
REDIS_URL=redis://localhost:6379
CART_CACHE_TTL_GUEST=3600
CART_CACHE_TTL_USER=86400

# Rate Limiting
CART_RATE_LIMIT_WINDOW=3600
CART_RATE_LIMIT_MAX=100
```

### Feature Flags

```typescript
// src/common/config/feature-flags.ts

export const FEATURE_FLAGS = {
  CART_SOFT_RESERVATIONS: true,
  CART_PRICE_CHANGE_NOTIFICATIONS: true,
  CART_PROMOTION_STACKING: true,
  CART_BULK_OPERATIONS: true,
  CART_ANALYTICS_TRACKING: true,
};
```

## API Documentation

The system provides comprehensive Swagger documentation. After implementation, access it at:

```
http://localhost:3000/api/docs
```

### Key Endpoints

- `GET /cart` - Get or create cart
- `POST /cart/:id/items` - Add item to cart
- `PUT /cart/:id/items/:itemId` - Update item quantity
- `DELETE /cart/:id/items/:itemId` - Remove item
- `POST /cart/merge` - Merge guest cart with user cart
- `GET /cart/:id/pricing` - Get detailed pricing
- `POST /cart/:id/refresh` - Refresh cart data

## Performance Considerations

### Database Optimization

1. **Indexes**: Ensure proper indexes are created (included in migration)
2. **Connection Pooling**: Configure Prisma connection pool
3. **Query Optimization**: Use selective includes and projections

### Caching Strategy

1. **Cart Data**: Cache complete cart objects
2. **Promotion Eligibility**: Cache promotion calculations
3. **Pricing Data**: Cache pricing calculations
4. **Inventory Status**: Cache availability checks

### Monitoring

1. **Response Times**: Monitor API response times
2. **Error Rates**: Track error rates by endpoint
3. **Cache Hit Rates**: Monitor cache effectiveness
4. **Database Performance**: Track query performance

## Security Considerations

### Input Validation

- All DTOs have comprehensive validation
- Rate limiting on cart operations
- Abuse detection patterns

### Access Control

- Cart ownership validation
- Session-based access for guests
- Role-based permissions for admin operations

### Data Protection

- Sensitive data encryption
- Audit logging for all operations
- GDPR compliance for user data

## Troubleshooting

### Common Issues

1. **Cart Not Found**: Check user/session ownership
2. **Price Inconsistencies**: Verify pricing service integration
3. **Reservation Failures**: Check inventory service connectivity
4. **Performance Issues**: Review caching configuration

### Debug Logging

Enable debug logging for troubleshooting:

```typescript
// In your service
this.logger.debug(`Cart operation: ${operation}`, { cartId, userId });
```

## Next Steps

1. **Complete Repository Implementation**
2. **Add Integration Tests**
3. **Implement Caching Layer**
4. **Add Monitoring & Analytics**
5. **Performance Testing**
6. **Security Audit**
7. **Production Deployment**

This implementation provides a solid foundation for an enterprise-grade cart and promotions system. The modular design allows for incremental implementation and easy extension as your business requirements evolve.