import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InventoryRepository } from './inventory.repository';
import { ReservationService } from './reservation.service';
import { StockMovementService } from './stock-movement.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

export interface InventoryItem {
  id: string;
  variantId: string;
  sellerId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  updatedAt: Date;
}

export interface StockUpdateDto {
  variantId: string;
  sellerId: string;
  quantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
}

export interface StockReservationDto {
  variantId: string;
  sellerId: string;
  quantity: number;
  orderId: string;
  expiresAt: Date;
}

@Injectable()
export class InventoryService {
  private readonly LOCK_PREFIX = 'inventory_lock:';
  private readonly LOCK_TTL = 30; // 30 seconds

  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly reservationService: ReservationService,
    private readonly stockMovementService: StockMovementService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  async getInventory(variantId: string, sellerId: string): Promise<InventoryItem> {
    const inventory = await this.inventoryRepository.findByVariantAndSeller(
      variantId,
      sellerId,
    );

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  async updateStock(updateDto: StockUpdateDto, userId: string): Promise<InventoryItem> {
    const lockKey = `${this.LOCK_PREFIX}${updateDto.variantId}:${updateDto.sellerId}`;

    // Acquire distributed lock for atomic stock update
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      throw new ConflictException('Stock update in progress, please try again');
    }

    try {
      this.logger.log('InventoryService.updateStock', { updateDto, userId });

      // Get current inventory
      let inventory = await this.inventoryRepository.findByVariantAndSeller(
        updateDto.variantId,
        updateDto.sellerId,
      );

      // Create inventory if it doesn't exist
      if (!inventory) {
        inventory = await this.inventoryRepository.create({
          variantId: updateDto.variantId,
          sellerId: updateDto.sellerId,
          quantity: 0,
          reservedQuantity: 0,
          lowStockThreshold: 10,
          allowBackorders: false,
        });
      }

      const previousQuantity = inventory.quantity;
      const newQuantity = Math.max(0, previousQuantity + updateDto.quantity);

      // Validate stock reduction doesn't go below reserved quantity
      if (newQuantity < inventory.reservedQuantity) {
        throw new BadRequestException(
          `Cannot reduce stock below reserved quantity (${inventory.reservedQuantity})`,
        );
      }

      // Update inventory
      const updatedInventory = await this.inventoryRepository.update(inventory.id, {
        quantity: newQuantity,
      });

      // Record stock movement
      await this.stockMovementService.recordMovement({
        variantId: updateDto.variantId,
        sellerId: updateDto.sellerId,
        type: updateDto.quantity > 0 ? 'STOCK_IN' : 'STOCK_OUT',
        quantity: Math.abs(updateDto.quantity),
        previousQuantity,
        newQuantity,
        reason: updateDto.reason,
        referenceId: updateDto.referenceId,
        referenceType: updateDto.referenceType,
        userId,
      });

      // Emit stock updated event
      this.eventEmitter.emit('inventory.stock_updated', {
        variantId: updateDto.variantId,
        sellerId: updateDto.sellerId,
        previousQuantity,
        newQuantity,
        change: updateDto.quantity,
        reason: updateDto.reason,
        timestamp: new Date(),
      });

      // Check for low stock alert
      if (newQuantity <= updatedInventory.lowStockThreshold) {
        this.eventEmitter.emit('inventory.low_stock_alert', {
          variantId: updateDto.variantId,
          sellerId: updateDto.sellerId,
          currentQuantity: newQuantity,
          threshold: updatedInventory.lowStockThreshold,
          timestamp: new Date(),
        });
      }

      this.logger.log('Stock updated successfully', {
        variantId: updateDto.variantId,
        sellerId: updateDto.sellerId,
        previousQuantity,
        newQuantity,
      });

      return updatedInventory;
    } finally {
      // Always release the lock
      await this.releaseLock(lockKey);
    }
  }

  async reserveStock(reservationDto: StockReservationDto): Promise<string> {
    const lockKey = `${this.LOCK_PREFIX}${reservationDto.variantId}:${reservationDto.sellerId}`;

    // Acquire distributed lock for atomic reservation
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      throw new ConflictException('Stock reservation in progress, please try again');
    }

    try {
      this.logger.log('InventoryService.reserveStock', { reservationDto });

      const inventory = await this.inventoryRepository.findByVariantAndSeller(
        reservationDto.variantId,
        reservationDto.sellerId,
      );

      if (!inventory) {
        throw new NotFoundException('Inventory not found');
      }

      const availableQuantity = inventory.quantity - inventory.reservedQuantity;

      // Check if enough stock is available
      if (availableQuantity < reservationDto.quantity && !inventory.allowBackorders) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${availableQuantity}, Requested: ${reservationDto.quantity}`,
        );
      }

      // Create reservation
      const reservation = await this.reservationService.createReservation({
        variantId: reservationDto.variantId,
        sellerId: reservationDto.sellerId,
        quantity: reservationDto.quantity,
        orderId: reservationDto.orderId,
        expiresAt: reservationDto.expiresAt,
      });

      // Update reserved quantity
      await this.inventoryRepository.update(inventory.id, {
        reservedQuantity: inventory.reservedQuantity + reservationDto.quantity,
      });

      // Emit stock reserved event
      this.eventEmitter.emit('inventory.stock_reserved', {
        reservationId: reservation.id,
        variantId: reservationDto.variantId,
        sellerId: reservationDto.sellerId,
        quantity: reservationDto.quantity,
        orderId: reservationDto.orderId,
        timestamp: new Date(),
      });

      this.logger.log('Stock reserved successfully', {
        reservationId: reservation.id,
        variantId: reservationDto.variantId,
        quantity: reservationDto.quantity,
      });

      return reservation.id;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async releaseReservation(reservationId: string, reason: string): Promise<void> {
    this.logger.log('InventoryService.releaseReservation', { reservationId, reason });

    const reservation = await this.reservationService.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException('Reservation is not active');
    }

    const lockKey = `${this.LOCK_PREFIX}${reservation.variantId}:${reservation.sellerId}`;
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      throw new ConflictException('Stock operation in progress, please try again');
    }

    try {
      // Release reservation
      await this.reservationService.releaseReservation(reservationId, reason);

      // Update reserved quantity
      const inventory = await this.inventoryRepository.findByVariantAndSeller(
        reservation.variantId,
        reservation.sellerId,
      );

      if (inventory) {
        await this.inventoryRepository.update(inventory.id, {
          reservedQuantity: Math.max(0, inventory.reservedQuantity - reservation.quantity),
        });
      }

      // Emit reservation released event
      this.eventEmitter.emit('inventory.reservation_released', {
        reservationId,
        variantId: reservation.variantId,
        sellerId: reservation.sellerId,
        quantity: reservation.quantity,
        reason,
        timestamp: new Date(),
      });

      this.logger.log('Reservation released successfully', { reservationId });
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async confirmReservation(reservationId: string, reason: string): Promise<void> {
    this.logger.log('InventoryService.confirmReservation', { reservationId, reason });

    const reservation = await this.reservationService.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException('Reservation is not active');
    }

    const lockKey = `${this.LOCK_PREFIX}${reservation.variantId}:${reservation.sellerId}`;
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      throw new ConflictException('Stock operation in progress, please try again');
    }

    try {
      // Confirm reservation
      await this.reservationService.confirmReservation(reservationId, reason);

      // Update inventory quantities
      const inventory = await this.inventoryRepository.findByVariantAndSeller(
        reservation.variantId,
        reservation.sellerId,
      );

      if (inventory) {
        await this.inventoryRepository.update(inventory.id, {
          quantity: Math.max(0, inventory.quantity - reservation.quantity),
          reservedQuantity: Math.max(0, inventory.reservedQuantity - reservation.quantity),
        });

        // Record stock movement
        await this.stockMovementService.recordMovement({
          variantId: reservation.variantId,
          sellerId: reservation.sellerId,
          type: 'RESERVATION_CONFIRMED',
          quantity: reservation.quantity,
          previousQuantity: inventory.quantity,
          newQuantity: inventory.quantity - reservation.quantity,
          reason,
          referenceId: reservation.orderId,
          referenceType: 'ORDER',
          userId: 'system',
        });
      }

      // Emit reservation confirmed event
      this.eventEmitter.emit('inventory.reservation_confirmed', {
        reservationId,
        variantId: reservation.variantId,
        sellerId: reservation.sellerId,
        quantity: reservation.quantity,
        orderId: reservation.orderId,
        timestamp: new Date(),
      });

      this.logger.log('Reservation confirmed successfully', { reservationId });
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async acquireLock(key: string): Promise<boolean> {
    try {
      const result = await this.redisService.set(key, 'locked', this.LOCK_TTL);
      return result === 'OK';
    } catch (error) {
      this.logger.error('Failed to acquire lock', { key, error });
      return false;
    }
  }

  private async releaseLock(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error('Failed to release lock', { key, error });
    }
  }
}