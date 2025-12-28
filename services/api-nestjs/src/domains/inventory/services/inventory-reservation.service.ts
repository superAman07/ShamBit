import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InventoryReservation } from '../entities/inventory-reservation.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';

export interface ReservationRequest {
  inventoryId: string;
  quantity: number;
  reservationKey: string;
  referenceType: string;
  referenceId: string;
  expiresAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface ReservationResult {
  success: boolean;
  reservation?: InventoryReservation;
  error?: string;
}

@Injectable()
export class InventoryReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Reserve inventory with idempotent key
   */
  async reserveInventory(request: ReservationRequest): Promise<ReservationResult> {
    this.logger.log('InventoryReservationService.reserveInventory', {
      inventoryId: request.inventoryId,
      quantity: request.quantity,
      reservationKey: request.reservationKey,
    });

    return this.prisma.$transaction(async (tx) => {
      try {
        // Check for existing reservation with same key (idempotency)
        const existingReservation = await tx.inventoryReservation.findUnique({
          where: { reservationKey: request.reservationKey },
        });

        if (existingReservation) {
          if (existingReservation.status === ReservationStatus.ACTIVE) {
            this.logger.log('Reservation already exists', { reservationKey: request.reservationKey });
            return {
              success: true,
              reservation: this.mapToEntity(existingReservation),
            };
          }
          
          // If reservation exists but is not active, we can't reuse it
          return {
            success: false,
            error: `Reservation with key ${request.reservationKey} already exists in ${existingReservation.status} status`,
          };
        }

        // Lock inventory row for update
        const inventory = await tx.variantInventory.findUnique({
          where: { id: request.inventoryId },
        });

        if (!inventory) {
          return {
            success: false,
            error: 'Inventory not found',
          };
        }

        // Check if enough stock is available
        if (inventory.availableQuantity < request.quantity) {
          return {
            success: false,
            error: `Insufficient stock. Available: ${inventory.availableQuantity}, Requested: ${request.quantity}`,
          };
        }

        // Create reservation
        const reservation = await tx.inventoryReservation.create({
          data: {
            inventoryId: request.inventoryId,
            quantity: request.quantity,
            reservationKey: request.reservationKey,
            referenceType: request.referenceType,
            referenceId: request.referenceId,
            expiresAt: request.expiresAt,
            status: ReservationStatus.ACTIVE,
            metadata: request.metadata || {},
            createdBy: request.createdBy,
          },
        });

        // Update inventory quantities
        await tx.variantInventory.update({
          where: { id: request.inventoryId },
          data: {
            availableQuantity: { decrement: request.quantity },
            reservedQuantity: { increment: request.quantity },
            // version: { increment: 1 }, // VariantInventory doesn't have version field
            // updatedBy: request.createdBy, // VariantInventory doesn't have updatedBy field
          },
        });

        // Create ledger entry
        await tx.inventoryMovement.create({
          data: {
            inventoryId: request.inventoryId,
            type: 'RESERVED',
            quantity: request.quantity,
            reason: `Reserved for ${request.referenceType}`,
            reference: reservation.id,
            createdBy: request.createdBy,
          },
        });

        const result = this.mapToEntity(reservation);

        // Emit event
        this.eventEmitter.emit('inventory.reserved', {
          inventoryId: request.inventoryId,
          reservationId: reservation.id,
          quantity: request.quantity,
          reservationKey: request.reservationKey,
          createdBy: request.createdBy,
          timestamp: new Date(),
        });

        this.logger.log('Inventory reserved successfully', {
          reservationId: reservation.id,
          inventoryId: request.inventoryId,
          quantity: request.quantity,
        });

        return {
          success: true,
          reservation: result,
        };

      } catch (error) {
        this.logger.error('Failed to reserve inventory', error, {
          inventoryId: request.inventoryId,
          reservationKey: request.reservationKey,
        });

        return {
          success: false,
          error: error.message,
        };
      }
    }, {
      isolationLevel: 'Serializable', // Highest isolation level for inventory operations
    });
  }

  /**
   * Release a reservation
   */
  async releaseReservation(
    reservationKey: string,
    releasedBy: string,
    reason?: string
  ): Promise<ReservationResult> {
    this.logger.log('InventoryReservationService.releaseReservation', {
      reservationKey,
      releasedBy,
      reason,
    });

    return this.prisma.$transaction(async (tx) => {
      try {
        // Find and lock reservation
        const reservation = await tx.inventoryReservation.findUnique({
          where: { reservationKey },
        });

        if (!reservation) {
          return {
            success: false,
            error: 'Reservation not found',
          };
        }

        if (reservation.status !== ReservationStatus.ACTIVE) {
          return {
            success: false,
            error: `Cannot release reservation in ${reservation.status} status`,
          };
        }

        // Update reservation status
        const updatedReservation = await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            status: ReservationStatus.RELEASED,
            updatedBy: releasedBy,
          },
        });

        // Get current inventory
        const inventory = await tx.variantInventory.findUnique({
          where: { id: reservation.inventoryId },
        });

        if (!inventory) {
          throw new Error('Inventory not found');
        }

        // Update inventory quantities
        await tx.variantInventory.update({
          where: { id: reservation.inventoryId },
          data: {
            availableQuantity: { increment: reservation.quantity },
            reservedQuantity: { decrement: reservation.quantity },
            // version: { increment: 1 }, // VariantInventory doesn't have version field
            // updatedBy: releasedBy, // VariantInventory doesn't have updatedBy field
          },
        });

        // Create ledger entry
        await tx.inventoryMovement.create({
          data: {
            inventoryId: reservation.inventoryId,
            type: 'RELEASED',
            quantity: reservation.quantity,
            reason: reason || 'Reservation released',
            reference: reservation.id,
            createdBy: releasedBy,
          },
        });

        // Emit event
        this.eventEmitter.emit('inventory.released', {
          inventoryId: reservation.inventoryId,
          reservationId: reservation.id,
          quantity: reservation.quantity,
          reservationKey,
          releasedBy,
          reason,
          timestamp: new Date(),
        });

        this.logger.log('Reservation released successfully', {
          reservationId: reservation.id,
          reservationKey,
          quantity: reservation.quantity,
        });

        return {
          success: true,
          reservation: this.mapToEntity(updatedReservation),
        };

      } catch (error) {
        this.logger.error('Failed to release reservation', error, { reservationKey });
        return {
          success: false,
          error: error.message,
        };
      }
    });
  }

  /**
   * Commit a reservation (convert to actual stock movement)
   */
  async commitReservation(
    reservationKey: string,
    committedBy: string,
    reason?: string
  ): Promise<ReservationResult> {
    this.logger.log('InventoryReservationService.commitReservation', {
      reservationKey,
      committedBy,
      reason,
    });

    return this.prisma.$transaction(async (tx) => {
      try {
        // Find and lock reservation
        const reservation = await tx.inventoryReservation.findUnique({
          where: { reservationKey },
        });

        if (!reservation) {
          return {
            success: false,
            error: 'Reservation not found',
          };
        }

        if (reservation.status !== ReservationStatus.ACTIVE) {
          return {
            success: false,
            error: `Cannot commit reservation in ${reservation.status} status`,
          };
        }

        // Update reservation status
        const updatedReservation = await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            status: ReservationStatus.COMMITTED,
            updatedBy: committedBy,
          },
        });

        // Get current inventory
        const inventory = await tx.variantInventory.findUnique({
          where: { id: reservation.inventoryId },
        });

        if (!inventory) {
          throw new Error('Inventory not found');
        }

        // Update inventory quantities (remove from reserved, reduce total)
        // Note: VariantInventory doesn't have totalQuantity, so we just update reservedQuantity
        await tx.variantInventory.update({
          where: { id: reservation.inventoryId },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
            // totalQuantity: newTotalQuantity, // VariantInventory doesn't have totalQuantity
            // version: { increment: 1 }, // VariantInventory doesn't have version field
            // updatedBy: committedBy, // VariantInventory doesn't have updatedBy field
          },
        });

        // Create ledger entry for the actual outbound movement
        await tx.inventoryMovement.create({
          data: {
            inventoryId: reservation.inventoryId,
            type: 'OUT',
            quantity: reservation.quantity,
            reason: reason || 'Reservation committed',
            reference: reservation.referenceId,
            createdBy: committedBy,
          },
        });

        // Emit event
        this.eventEmitter.emit('inventory.committed', {
          inventoryId: reservation.inventoryId,
          reservationId: reservation.id,
          quantity: reservation.quantity,
          reservationKey,
          committedBy,
          reason,
          timestamp: new Date(),
        });

        this.logger.log('Reservation committed successfully', {
          reservationId: reservation.id,
          reservationKey,
          quantity: reservation.quantity,
        });

        return {
          success: true,
          reservation: this.mapToEntity(updatedReservation),
        };

      } catch (error) {
        this.logger.error('Failed to commit reservation', error, { reservationKey });
        return {
          success: false,
          error: error.message,
        };
      }
    });
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<{ released: number; errors: string[] }> {
    this.logger.log('InventoryReservationService.cleanupExpiredReservations');

    const results = { released: 0, errors: [] as string[] };

    try {
      // Find expired reservations
      const expiredReservations = await this.prisma.inventoryReservation.findMany({
        where: {
          status: ReservationStatus.ACTIVE,
          expiresAt: { lt: new Date() },
        },
        take: 100, // Process in batches
      });

      this.logger.log('Found expired reservations', { count: expiredReservations.length });

      // Release each expired reservation
      for (const reservation of expiredReservations) {
        try {
          await this.releaseReservation(
            reservation.reservationKey,
            'SYSTEM',
            'Reservation expired'
          );
          results.released++;
        } catch (error) {
          results.errors.push(`Failed to release ${reservation.reservationKey}: ${error.message}`);
        }
      }

      this.logger.log('Expired reservations cleanup completed', results);
      return results;

    } catch (error) {
      this.logger.error('Failed to cleanup expired reservations', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Get reservation by key
   */
  async getReservation(reservationKey: string): Promise<InventoryReservation | null> {
    const reservation = await this.prisma.inventoryReservation.findUnique({
      where: { reservationKey },
    });

    return reservation ? this.mapToEntity(reservation) : null;
  }

  /**
   * Get reservations for inventory
   */
  async getReservationsForInventory(inventoryId: string): Promise<InventoryReservation[]> {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map(r => this.mapToEntity(r));
  }

  private mapToEntity(data: any): InventoryReservation {
    return new InventoryReservation({
      id: data.id,
      inventoryId: data.inventoryId,
      quantity: data.quantity,
      reservationKey: data.reservationKey,
      expiresAt: data.expiresAt,
      isExpired: data.isExpired,
      status: data.status,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      metadata: data.metadata,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}