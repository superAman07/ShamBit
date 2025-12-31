import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderItemService } from './order-item.service';
import { OrderItemRepository } from './repositories/order-item.repository';
import { OrderStateMachine } from './order-state-machine.service';
import { OrderAuditService } from './services/order-audit.service';
import { OrderOrchestrationService } from './services/order-orchestration.service';
import { OrderFulfillmentService } from './services/order-fulfillment.service';
import { OrderRefundService } from './services/order-refund.service';
import { OrderEventService } from './services/order-event.service';
import { OrderValidationService } from './services/order-validation.service';
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
    OrderAuditService,
    OrderOrchestrationService,
    OrderFulfillmentService,
    OrderRefundService,
    OrderEventService,
    OrderValidationService,
  ],
  exports: [OrderService, OrderItemService],
})
export class OrderModule {}
