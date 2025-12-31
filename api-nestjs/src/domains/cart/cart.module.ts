import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Infrastructure
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// Controllers
import { CartController } from './cart.controller';
import { CartHealthController } from './cart-health.controller';

// Services
import { CartService } from './cart.service';
import { CartPricingService } from './cart-pricing.service';
import { CartCacheService } from './services/cart-cache.service';
import { CartAnalyticsService } from './services/cart-analytics.service';

// Related domain services
import { PromotionEngineService } from '../promotions/promotion-engine.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';

// Repositories
import { CartRepository } from './repositories/cart.repository';

// Event listeners
import { CartEventListeners } from './listeners/cart-event.listeners';

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  controllers: [CartController, CartHealthController],
  providers: [
    // Infrastructure
    PrismaService,

    // Core services
    CartService,
    CartPricingService,
    CartCacheService,
    CartAnalyticsService,

    // Related domain services
    PromotionEngineService,
    InventoryReservationService,

    // Event listeners
    CartEventListeners,

    // Repository implementations
    CartRepository,

    // Repository interfaces
    {
      provide: 'ICartRepository',
      useClass: CartRepository,
    },
  ],
  exports: [
    CartService,
    CartPricingService,
    CartCacheService,
    CartAnalyticsService,
    PromotionEngineService,
    InventoryReservationService,
  ],
})
export class CartModule {}
