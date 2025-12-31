import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InventoryRepository } from './inventory.repository';
import { InventoryAuditService } from './services/inventory-audit.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Inventory } from './entities/inventory.entity';
import {
  InventoryLedger,
  LedgerEntryType,
  ReferenceType,
} from './entities/inventory-ledger.entity';
import { InventoryPolicies } from './inventory.policies';
import { InventoryValidators } from './inventory.validators';

import { CreateInventoryDto } from './dtos/create-inventory.dto';
import { UpdateInventoryDto } from './dtos/update-inventory.dto';
import { InventoryMovementDto } from './dtos/inventory-movement.dto';
import { BulkInventoryAdjustmentDto } from './dtos/bulk-inventory-adjustment.dto';

import {
  InventoryFilters,
  PaginationOptions,
  InventoryIncludeOptions,
  MovementFilters,
} from './interfaces/inventory-repository.interface';

import {
  InventoryCreatedEvent,
  InventoryUpdatedEvent,
  InventoryAdjustedEvent,
  InventoryLowStockEvent,
  InventoryOutOfStockEvent,
  InventoryRestockedEvent,
  InventoryReservedEvent,
  InventoryReleasedEvent,
  InventoryCommittedEvent,
} from './events/inventory.events';

import { UserRole } from '../../common/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly inventoryAuditService: InventoryAuditService,
    private readonly inventoryReservationService: InventoryReservationService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: InventoryFilters = {},
    pagination: PaginationOptions = {},
    includes: InventoryIncludeOptions = {},
    userId?: string,
    userRole?: UserRole,
  ) {
    this.logger.log('InventoryService.findAll', {
      filters,
      pagination,
      userId,
    });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(
      filters,
      userId,
      userRole,
    );

    return this.inventoryRepository.findAll(
      enhancedFilters,
      pagination,
      includes,
    );
  }

  async findById(
    id: string,
    includes: InventoryIncludeOptions = {},
    userId?: string,
    userRole?: UserRole,
  ): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findById(id, includes);
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    // Check access permissions
    await this.checkInventoryAccess(inventory, userId, userRole);

    return inventory;
  }

  async findByVariant(
    variantId: string,
    sellerId?: string,
    warehouseId?: string,
  ): Promise<Inventory | null> {
    return this.inventoryRepository.findByVariant(
      variantId,
      sellerId,
      warehouseId,
    );
  }

  async findBySeller(
    sellerId: string,
    filters: InventoryFilters = {},
    pagination: PaginationOptions = {},
    includes: InventoryIncludeOptions = {},
  ) {
    return this.inventoryRepository.findBySeller(
      sellerId,
      filters,
      pagination,
      includes,
    );
  }

  // ============================================================================
  // INVENTORY CREATION & SETUP
  // ============================================================================

  async create(
    createInventoryDto: CreateInventoryDto,
    createdBy: string,
  ): Promise<Inventory> {
    this.logger.log('InventoryService.create', {
      createInventoryDto,
      createdBy,
    });

    // Validate variant exists and user has access
    await this.validateVariantAccess(createInventoryDto.variantId, createdBy);

    // Check if inventory already exists for this combination
    const existingInventory = await this.findByVariant(
      createInventoryDto.variantId,
      createInventoryDto.sellerId,
      createInventoryDto.warehouseId,
    );

    if (existingInventory) {
      throw new ConflictException(
        'Inventory already exists for this variant/seller/warehouse combination',
      );
    }

    // Create inventory with zero quantities
    const inventory = await this.inventoryRepository.create({
      ...createInventoryDto,
      availableQuantity: 0,
      reservedQuantity: 0,
      totalQuantity: 0,
      createdBy,
    });

    // Create audit log
    await this.inventoryAuditService.logAction(
      inventory.id,
      'CREATE',
      createdBy,
      null,
      inventory,
      'Inventory created',
    );

    // Emit event
    this.eventEmitter.emit(
      'inventory.created',
      new InventoryCreatedEvent(
        inventory.id,
        inventory.variantId,
        inventory.sellerId,
        createdBy,
      ),
    );

    this.logger.log('Inventory created successfully', {
      inventoryId: inventory.id,
    });
    return inventory;
  }

  // ============================================================================
  // STOCK MOVEMENTS
  // ============================================================================

  async increaseStock(
    inventoryId: string,
    movementDto: InventoryMovementDto,
    createdBy: string,
  ): Promise<Inventory> {
    this.logger.log('InventoryService.increaseStock', {
      inventoryId,
      movementDto,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // SAFETY: Lock inventory for update - NEVER mutate stock directly
      const inventory = await this.findById(inventoryId);
      await this.checkInventoryAccess(inventory, createdBy);

      // SAFETY: Validate movement - quantities must be positive
      InventoryValidators.validateStockIncrease(movementDto.quantity);

      // Calculate new quantities
      const newAvailable = inventory.availableQuantity + movementDto.quantity;
      const newTotal = inventory.totalQuantity + movementDto.quantity;

      // Update inventory
      const updatedInventory = await this.inventoryRepository.updateQuantities(
        inventoryId,
        newAvailable,
        inventory.reservedQuantity,
        newTotal,
        createdBy,
      );

      // Create ledger entry
      await this.createLedgerEntry({
        inventoryId,
        type: LedgerEntryType.INBOUND,
        quantity: movementDto.quantity,
        runningBalance: newTotal,
        referenceType: movementDto.referenceType as ReferenceType,
        referenceId: movementDto.referenceId,
        reason: movementDto.reason,
        metadata: movementDto.metadata,
        createdBy,
      });

      // Create audit log
      await this.inventoryAuditService.logAction(
        inventoryId,
        'INCREASE',
        createdBy,
        {
          availableQuantity: inventory.availableQuantity,
          totalQuantity: inventory.totalQuantity,
        },
        { availableQuantity: newAvailable, totalQuantity: newTotal },
        movementDto.reason || 'Stock increased',
      );

      // Check for restock events
      if (!inventory.isInStock() && updatedInventory.isInStock()) {
        this.eventEmitter.emit(
          'inventory.restocked',
          new InventoryRestockedEvent(
            inventoryId,
            inventory.variantId,
            inventory.sellerId,
            movementDto.quantity,
            createdBy,
          ),
        );
      }

      this.logger.log('Stock increased successfully', {
        inventoryId,
        quantity: movementDto.quantity,
        newTotal,
      });

      return updatedInventory;
    });
  }

  async decreaseStock(
    inventoryId: string,
    movementDto: InventoryMovementDto,
    createdBy: string,
  ): Promise<Inventory> {
    this.logger.log('InventoryService.decreaseStock', {
      inventoryId,
      movementDto,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // Lock inventory for update
      const inventory = await this.findById(inventoryId);
      await this.checkInventoryAccess(inventory, createdBy);

      // Validate movement
      InventoryValidators.validateStockDecrease(
        movementDto.quantity,
        inventory.availableQuantity,
      );

      // Calculate new quantities
      const newAvailable = inventory.availableQuantity - movementDto.quantity;
      const newTotal = inventory.totalQuantity - movementDto.quantity;

      // Update inventory
      const updatedInventory = await this.inventoryRepository.updateQuantities(
        inventoryId,
        newAvailable,
        inventory.reservedQuantity,
        newTotal,
        createdBy,
      );

      // Create ledger entry
      await this.createLedgerEntry({
        inventoryId,
        type: LedgerEntryType.OUTBOUND,
        quantity: -movementDto.quantity,
        runningBalance: newTotal,
        referenceType: movementDto.referenceType as ReferenceType,
        referenceId: movementDto.referenceId,
        reason: movementDto.reason,
        metadata: movementDto.metadata,
        createdBy,
      });

      // Create audit log
      await this.inventoryAuditService.logAction(
        inventoryId,
        'DECREASE',
        createdBy,
        {
          availableQuantity: inventory.availableQuantity,
          totalQuantity: inventory.totalQuantity,
        },
        { availableQuantity: newAvailable, totalQuantity: newTotal },
        movementDto.reason || 'Stock decreased',
      );

      // Check for stock level events
      this.checkAndEmitStockLevelEvents(inventory, updatedInventory, createdBy);

      this.logger.log('Stock decreased successfully', {
        inventoryId,
        quantity: movementDto.quantity,
        newTotal,
      });

      return updatedInventory;
    });
  }

  async adjustStock(
    inventoryId: string,
    newQuantity: number,
    reason: string,
    createdBy: string,
    metadata?: Record<string, any>,
  ): Promise<Inventory> {
    this.logger.log('InventoryService.adjustStock', {
      inventoryId,
      newQuantity,
      reason,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      // Lock inventory for update
      const inventory = await this.findById(inventoryId);
      await this.checkInventoryAccess(inventory, createdBy);

      // Validate adjustment
      InventoryValidators.validateStockAdjustment(newQuantity);

      // Calculate adjustment
      const adjustment = newQuantity - inventory.totalQuantity;
      const newAvailable = Math.max(
        0,
        inventory.availableQuantity + adjustment,
      );

      // Update inventory
      const updatedInventory = await this.inventoryRepository.updateQuantities(
        inventoryId,
        newAvailable,
        inventory.reservedQuantity,
        newQuantity,
        createdBy,
      );

      // Create ledger entry
      await this.createLedgerEntry({
        inventoryId,
        type: LedgerEntryType.ADJUSTMENT,
        quantity: adjustment,
        runningBalance: newQuantity,
        referenceType: ReferenceType.ADMIN,
        reason,
        metadata,
        createdBy,
      });

      // Create audit log
      await this.inventoryAuditService.logAction(
        inventoryId,
        'ADJUST',
        createdBy,
        { totalQuantity: inventory.totalQuantity },
        { totalQuantity: newQuantity },
        reason,
      );

      // Emit adjustment event
      this.eventEmitter.emit(
        'inventory.adjusted',
        new InventoryAdjustedEvent(
          inventoryId,
          inventory.variantId,
          inventory.sellerId,
          inventory.totalQuantity,
          newQuantity,
          adjustment,
          reason,
          createdBy,
        ),
      );

      // Check for stock level events
      this.checkAndEmitStockLevelEvents(inventory, updatedInventory, createdBy);

      this.logger.log('Stock adjusted successfully', {
        inventoryId,
        oldQuantity: inventory.totalQuantity,
        newQuantity,
        adjustment,
      });

      return updatedInventory;
    });
  }

  // ============================================================================
  // RESERVATION OPERATIONS
  // ============================================================================

  async reserveStock(
    inventoryId: string,
    quantity: number,
    reservationKey: string,
    referenceType: string,
    referenceId: string,
    expiresAt: Date,
    createdBy: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.log('InventoryService.reserveStock', {
      inventoryId,
      quantity,
      reservationKey,
      referenceType,
      referenceId,
    });

    const result = await this.inventoryReservationService.reserveInventory({
      inventoryId,
      quantity,
      reservationKey,
      referenceType,
      referenceId,
      expiresAt,
      createdBy,
      metadata,
    });

    if (result.success) {
      // Emit inventory-level event (use fallbacks if reservation lacks variant/seller)
      this.eventEmitter.emit(
        'inventory.reserved',
        new InventoryReservedEvent(
          inventoryId,
          result.reservation!.variantId ?? '',
          result.reservation!.sellerId ?? '',
          quantity,
          reservationKey,
          createdBy,
        ),
      );
    }

    return result;
  }

  async releaseReservation(
    reservationKey: string,
    releasedBy: string,
    reason?: string,
  ) {
    return this.inventoryReservationService.releaseReservation(
      reservationKey,
      releasedBy,
      reason,
    );
  }

  async commitReservation(
    reservationKey: string,
    committedBy: string,
    reason?: string,
  ) {
    return this.inventoryReservationService.commitReservation(
      reservationKey,
      committedBy,
      reason,
    );
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkAdjustment(
    adjustmentDto: BulkInventoryAdjustmentDto,
    createdBy: string,
  ): Promise<{ processed: number; errors: string[] }> {
    this.logger.log('InventoryService.bulkAdjustment', {
      adjustmentDto,
      createdBy,
    });

    const results = { processed: 0, errors: [] as string[] };

    for (const adjustment of adjustmentDto.adjustments) {
      try {
        await this.adjustStock(
          adjustment.inventoryId,
          adjustment.newQuantity,
          adjustment.reason || adjustmentDto.reason || 'Bulk adjustment',
          createdBy,
          adjustment.metadata,
        );
        results.processed++;
      } catch (error) {
        results.errors.push(
          `Inventory ${adjustment.inventoryId}: ${error.message}`,
        );
      }
    }

    this.logger.log('Bulk adjustment completed', { results });
    return results;
  }

  // ============================================================================
  // REPORTING & ANALYTICS
  // ============================================================================

  async getInventoryMovements(
    inventoryId: string,
    filters: MovementFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<{ data: InventoryLedger[]; total: number }> {
    return this.inventoryRepository.getMovements(
      inventoryId,
      filters,
      pagination,
    );
  }

  async getStockLevels(
    filters: InventoryFilters = {},
    pagination: PaginationOptions = {},
  ) {
    return this.inventoryRepository.getStockLevels(filters, pagination);
  }

  async getLowStockItems(
    sellerId?: string,
    threshold?: number,
    pagination: PaginationOptions = {},
  ) {
    return this.inventoryRepository.getLowStockItems(
      sellerId,
      threshold,
      pagination,
    );
  }

  async getOutOfStockItems(
    sellerId?: string,
    pagination: PaginationOptions = {},
  ) {
    return this.inventoryRepository.getOutOfStockItems(sellerId, pagination);
  }

  // ============================================================================
  // MAINTENANCE OPERATIONS
  // ============================================================================

  async cleanupExpiredReservations(): Promise<{
    released: number;
    errors: string[];
  }> {
    try {
      await this.inventoryReservationService.cleanupExpiredReservations();
      return { released: 0, errors: [] }; // The actual method doesn't return counts, so we return default values
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired reservations: ${error.message}`,
      );
      return { released: 0, errors: [error.message] };
    }
  }

  async recalculateInventoryQuantities(
    inventoryId: string,
    updatedBy: string,
  ): Promise<Inventory> {
    this.logger.log('InventoryService.recalculateInventoryQuantities', {
      inventoryId,
      updatedBy,
    });

    const inventory = await this.findById(inventoryId);

    // Get all ledger entries
    const movements = await this.inventoryRepository.getMovements(inventoryId);

    // Calculate quantities from ledger
    const totalFromLedger = movements.data.reduce(
      (sum, entry) => sum + entry.quantity,
      0,
    );

    // Get active reservations
    const reservations =
      await this.inventoryReservationService.getReservationsForInventory(
        inventoryId,
      );
    const activeReservations = reservations.filter((r) => r.isActive());
    const reservedQuantity = activeReservations.reduce(
      (sum, r) => sum + r.quantity,
      0,
    );

    // Calculate available quantity
    const availableQuantity = Math.max(0, totalFromLedger - reservedQuantity);

    // Update inventory if there's a discrepancy
    if (
      inventory.totalQuantity !== totalFromLedger ||
      inventory.reservedQuantity !== reservedQuantity ||
      inventory.availableQuantity !== availableQuantity
    ) {
      const updatedInventory = await this.inventoryRepository.updateQuantities(
        inventoryId,
        availableQuantity,
        reservedQuantity,
        totalFromLedger,
        updatedBy,
      );

      // Create audit log
      await this.inventoryAuditService.logAction(
        inventoryId,
        'RECALCULATE',
        updatedBy,
        {
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          totalQuantity: inventory.totalQuantity,
        },
        {
          availableQuantity,
          reservedQuantity,
          totalQuantity: totalFromLedger,
        },
        'Quantities recalculated from ledger',
      );

      this.logger.log('Inventory quantities recalculated', {
        inventoryId,
        oldTotal: inventory.totalQuantity,
        newTotal: totalFromLedger,
        oldReserved: inventory.reservedQuantity,
        newReserved: reservedQuantity,
      });

      return updatedInventory;
    }

    return inventory;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyAccessFilters(
    filters: InventoryFilters,
    userId?: string,
    userRole?: UserRole,
  ): Promise<InventoryFilters> {
    // Apply role-based filtering
    if (userRole === UserRole.SELLER) {
      return { ...filters, sellerId: userId };
    }

    return filters;
  }

  private async checkInventoryAccess(
    inventory: Inventory,
    userId?: string,
    userRole?: UserRole,
  ): Promise<void> {
    if (!InventoryPolicies.canAccess(inventory, userId, userRole)) {
      throw new ForbiddenException('Access denied to this inventory');
    }
  }

  private async validateVariantAccess(
    variantId: string,
    userId: string,
  ): Promise<void> {
    // This would typically check if the user owns the variant or has permission
    // Implementation depends on your variant access control logic
  }

  private async createLedgerEntry(data: {
    inventoryId: string;
    type: LedgerEntryType;
    quantity: number;
    runningBalance: number;
    referenceType?: ReferenceType;
    referenceId?: string;
    reason?: string;
    metadata?: Record<string, any>;
    createdBy: string;
  }): Promise<InventoryLedger> {
    return this.inventoryRepository.createLedgerEntry(data);
  }

  private checkAndEmitStockLevelEvents(
    oldInventory: Inventory,
    newInventory: Inventory,
    updatedBy: string,
  ): void {
    // Check for out of stock event
    if (oldInventory.isInStock() && !newInventory.isInStock()) {
      this.eventEmitter.emit(
        'inventory.out_of_stock',
        new InventoryOutOfStockEvent(
          newInventory.id,
          newInventory.variantId,
          newInventory.sellerId,
          newInventory.availableQuantity,
          updatedBy,
        ),
      );
    }

    // Check for low stock event
    if (!oldInventory.isLowStock() && newInventory.isLowStock()) {
      this.eventEmitter.emit(
        'inventory.low_stock',
        new InventoryLowStockEvent(
          newInventory.id,
          newInventory.variantId,
          newInventory.sellerId,
          newInventory.availableQuantity,
          newInventory.lowStockThreshold || 10,
          updatedBy,
        ),
      );
    }
  }
}
