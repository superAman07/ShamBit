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
import { AttributeModule } from './domains-backup/attribute/attribute.module';
import { CategoryModule } from './domains-backup/category/category.module';
import { BrandModule } from './domains-backup/brand/brand.module';
import { InventoryModule } from './domains-backup/inventory/inventory.module';
import { PricingModule } from './domains-backup/pricing/pricing.module';
import { ProductModule } from './domains-backup/product/product.module';
import { CartModule } from './domains-backup/cart/cart.module';
import { OrderModule } from './domains-backup/order/order.module';
import { AuthModule } from './domains-backup/auth/auth.module';
import { MediaModule } from './domains-backup/media/media.module';
import { BannerModule } from './domains-backup/banner/banner.module';
import { NotificationModule } from './domains-backup/notification/notification.module';
import { ReviewModule } from './domains-backup/review/review.module';
import { SearchModule } from './domains-backup/search/search.module';
import { CareerModule } from './domains-backup/career/career.module';
import { SettlementModule } from './domains/settlement/settlement.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),
    
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