import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { EventsModule } from './infrastructure/events/events.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { FeatureFlagsModule } from './infrastructure/feature-flags/feature-flags.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { WebhookModule } from './infrastructure/webhook/webhook.module';

// Domains
import { AuthModule } from './domains/auth/auth.module';
import { CategoryModule } from './domains/category/category.module';
import { ProductModule } from './domains/product/product.module';
import { InventoryModule } from './domains/inventory/inventory.module';
import { OrderModule } from './domains/order/order.module';
import { PricingModule } from './domains/pricing/pricing.module';
import { CartModule } from './domains/cart/cart.module';
import { BrandModule } from './domains/brand/brand.module';
import { MediaModule } from './domains/media/media.module';
import { NotificationModule } from './domains/notification/notification.module';
import { ReviewModule } from './domains/review/review.module';
import { BannerModule } from './domains/banner/banner.module';
import { CareerModule } from './domains/career/career.module';
import { SearchModule } from './domains/search/search.module';

// Common
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    
    // Infrastructure
    PrismaModule,
    RedisModule,
    EventsModule,
    ObservabilityModule,
    JobsModule,
    FeatureFlagsModule,
    AuditModule,
    WebhookModule,
    
    // Core modules
    HealthModule,
    
    // Domain modules
    AuthModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    OrderModule,
    PricingModule,
    CartModule,
    BrandModule,
    MediaModule,
    NotificationModule,
    ReviewModule,
    BannerModule,
    CareerModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}