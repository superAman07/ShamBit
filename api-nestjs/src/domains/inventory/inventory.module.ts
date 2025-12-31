import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ReservationService } from './reservation.service';
import { ReservationRepository } from './reservation.repository';
import { StockMovementService } from './stock-movement.service';
import { StockMovementRepository } from './stock-movement.repository';
import { InventoryAuditService } from './services/inventory-audit.service';
import { InventoryReservationService } from './services/inventory-reservation.service';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    ReservationService,
    ReservationRepository,
    StockMovementService,
    StockMovementRepository,
    InventoryAuditService,
    InventoryReservationService,
  ],
  exports: [
    InventoryService,
    ReservationService,
    StockMovementService,
    InventoryReservationService,
    InventoryAuditService,
  ],
})
export class InventoryModule {}
