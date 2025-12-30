import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { CartItemService } from './cart-item.service';
import { CartItemRepository } from './cart-item.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [InventoryModule, PricingModule],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartItemService,
    CartItemRepository,
  ],
  exports: [CartService, CartItemService],
})
export class CartModule {}