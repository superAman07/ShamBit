import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { OrderItemService } from './order-item.service';
import { OrderItemRepository } from './order-item.repository';
import { OrderStateMachine } from './order-state-machine.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [InventoryModule, PricingModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    OrderItemService,
    OrderItemRepository,
    OrderStateMachine,
  ],
  exports: [OrderService, OrderItemService],
})
export class OrderModule {}