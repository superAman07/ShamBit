import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SecurityModule } from './infrastructure/security/security.module';

// Domain modules (in dependency order)
import { AttributeModule } from './domains/attribute/attribute.module';
import { CategoryModule } from './domains/category/category.module';
import { BrandModule } from './domains/brand/brand.module';
import { InventoryModule } from './domains/inventory/inventory.module';
import { PricingModule } from './domains/pricing/pricing.module';
import { ProductModule } from './domains/product/product.module';
import { CartModule } from './domains/cart/cart.module';
import { OrderModule } from './domains/order/order.module';
import { AuthModule } from './domains/auth/auth.module';
import { MediaModule } from './domains/media/media.module';
import { BannerModule } from './domains/banner/banner.module';
import { NotificationModule } from './domains/notification/notification.module';
import { ReviewModule } from './domains/review/review.module';
import { SearchModule } from './domains/search/search.module';
import { CareerModule } from './domains/career/career.module';
import { SettlementModule } from './domains/settlements/settlement.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
      },
    ]),

    // Event system
    EventEmitterModule.forRoot(),

    // Infrastructure
    PrismaModule,
    ObservabilityModule,
    RedisModule,
    SecurityModule,

    // Core modules
    HealthModule,

    // Domain modules (in dependency order)
    AttributeModule,
    CategoryModule,
    BrandModule,
    InventoryModule,
    PricingModule,
    ProductModule,
    CartModule,
    OrderModule,
    AuthModule,
    MediaModule,
    BannerModule,
    NotificationModule,
    ReviewModule,
    SearchModule,
    CareerModule,
    SettlementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
