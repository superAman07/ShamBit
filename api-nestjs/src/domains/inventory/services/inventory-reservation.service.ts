import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export enum ReservationType {
  CART = 'CART',
  ORDER = 'ORDER',
  SYSTEM = 'SYSTEM',
}

export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
  RELEASED = 'RELEASED',
}

export enum ReservationPriority {
  CART = 'CART',
  ORDER = 'ORDER',
  SYSTEM = 'SYSTEM',
}

export interface InventoryReservation {
  id: string;
  variantId: string;
  quantity: number;
  referenceType: ReservationType;
  referenceId: string;
  status: ReservationStatus;
  priority: ReservationPriority;
  expiresAt?: Date;
  parentReservationId?: string;
  convertedToReservationId?: string;
  createdBy?: string;
  releasedBy?: string;
  releasedAt?: Date;
  releaseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationRequest {
  variantId: string;
  quantity: number;
  referenceType: ReservationType;
  referenceId: string;
  priority: ReservationPriority;
  expiresAt?: Date;
  createdBy?: string;
}

export interface AvailabilityResult {
  isFullyAvailable: boolean;
  unavailableItems: ItemAvailabilityResult[];
  partiallyAvailableItems: ItemAvailabilityResult[];
  itemResults: ItemAvailabilityResult[];
}

export interface ItemAvailabilityResult {
  itemId: string;
  variantId: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  reason: string;
  suggestedQuantity?: number;
}

export class InsufficientInventoryException extends BadRequestException {
  constructor(
    message: string,
    public readonly availableQuantity: number = 0,
  ) {
    super(message);
  }
}

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create soft reservations for cart items
   */
  async createCartReservations(
    cartId: string,
    items: any[],
  ): Promise<InventoryReservation[]> {
    const reservations: InventoryReservation[] = [];

    for (const item of items) {
      try {
        const reservation = await this.createSoftReservation({
          variantId: item.variantId,
          quantity: item.quantity,
          referenceType: ReservationType.CART,
          referenceId: cartId,
          priority: ReservationPriority.CART,
          expiresAt: this.calculateReservationExpiry(),
          createdBy: item.userId || 'GUEST',
        });

        reservations.push(reservation);
      } catch (error) {
        await this.handleReservationFailure(item, error);
      }
    }

    // Emit event
    this.eventEmitter.emit('inventory.reservations_created', {
      cartId,
      reservations: reservations.map((r) => ({
        itemId: r.referenceId,
        variantId: r.variantId,
        quantity: r.quantity,
        reservationId: r.id,
        expiresAt: r.expiresAt,
      })),
    });

    return reservations;
  }

  /**
   * Create soft reservation with availability check
   */
  async createSoftReservation(
    request: ReservationRequest,
  ): Promise<InventoryReservation> {
    // 1. Validate request
    this.validateReservationRequest(request);

    // 2. Check current availability
    const availableQuantity = await this.getAvailableQuantity(
      request.variantId,
    );

    if (availableQuantity < request.quantity) {
      throw new InsufficientInventoryException(
        `Only ${availableQuantity} units available for variant ${request.variantId}`,
        availableQuantity,
      );
    }

    // 3. Create reservation record
    const reservation = await this.createReservationRecord(request);

    // 4. Update inventory reserved quantity
    await this.addReservedQuantity(request.variantId, request.quantity);

    // 5. Schedule cleanup if expiry is set
    if (request.expiresAt) {
      await this.scheduleReservationCleanup(reservation);
    }

    this.logger.log(
      `Created soft reservation ${reservation.id} for ${request.quantity} units of variant ${request.variantId}`,
    );

    return reservation;
  }

  /**
   * Convert soft reservations to hard reservations (on order creation)
   */
  async convertToHardReservations(
    cartId: string,
    orderId: string,
  ): Promise<InventoryReservation[]> {
    const cartReservations = await this.findReservationsByReference(
      ReservationType.CART,
      cartId,
    );

    const hardReservations: InventoryReservation[] = [];

    for (const reservation of cartReservations) {
      try {
        // Create hard reservation
        const hardReservation = await this.createReservationRecord({
          variantId: reservation.variantId,
          quantity: reservation.quantity,
          referenceType: ReservationType.ORDER,
          referenceId: orderId,
          priority: ReservationPriority.ORDER,
          // Hard reservations don't expire
          createdBy: reservation.createdBy,
        });

        // Link reservations
        await this.linkReservations(reservation.id, hardReservation.id);

        // Mark soft reservation as converted
        await this.updateReservationStatus(
          reservation.id,
          ReservationStatus.CONVERTED,
        );

        hardReservations.push(hardReservation);
      } catch (error) {
        this.logger.error(
          `Failed to convert reservation ${reservation.id}: ${error.message}`,
        );
        // Continue with other reservations
      }
    }

    // Emit event
    this.eventEmitter.emit('inventory.reservations_converted', {
      cartId,
      orderId,
      convertedCount: hardReservations.length,
      hardReservations: hardReservations.map((r) => r.id),
    });

    return hardReservations;
  }

  /**
   * Release reservation and return inventory
   */
  async releaseReservation(
    reservationId: string,
    reason: string,
    releasedBy?: string,
  ): Promise<void> {
    const reservation = await this.findReservationById(reservationId);

    if (!reservation) {
      this.logger.warn(`Reservation ${reservationId} not found for release`);
      return;
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      this.logger.warn(
        `Reservation ${reservationId} is not active (status: ${reservation.status})`,
      );
      return;
    }

    // Update reservation status
    await this.updateReservationStatus(
      reservationId,
      ReservationStatus.RELEASED,
      {
        releasedBy,
        releasedAt: new Date(),
        releaseReason: reason,
      },
    );

    // Return inventory
    await this.removeReservedQuantity(
      reservation.variantId,
      reservation.quantity,
    );

    // Emit event
    this.eventEmitter.emit('inventory.reservation_released', {
      reservationId,
      variantId: reservation.variantId,
      quantity: reservation.quantity,
      reason,
      releasedBy,
    });

    this.logger.log(
      `Released reservation ${reservationId}: ${reservation.quantity} units of variant ${reservation.variantId}`,
    );
  }

  /**
   * Check real-time availability for cart items
   */
  async checkCartAvailability(cartItems: any[]): Promise<AvailabilityResult> {
    const results = await Promise.all(
      cartItems.map((item) => this.checkItemAvailability(item)),
    );

    const unavailableItems = results.filter((result) => !result.isAvailable);
    const partiallyAvailableItems = results.filter(
      (result) =>
        result.isAvailable &&
        result.availableQuantity < result.requestedQuantity,
    );

    return {
      isFullyAvailable:
        unavailableItems.length === 0 && partiallyAvailableItems.length === 0,
      unavailableItems,
      partiallyAvailableItems,
      itemResults: results,
    };
  }

  /**
   * Cleanup expired reservations (scheduled job)
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async cleanupExpiredReservations(): Promise<void> {
    const expiredReservations = await this.findExpiredReservations();

    let cleanedCount = 0;

    for (const reservation of expiredReservations) {
      try {
        await this.releaseReservation(reservation.id, 'EXPIRED', 'SYSTEM');
        cleanedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to cleanup expired reservation ${reservation.id}: ${error.message}`,
        );
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired reservations`);
    }
  }

  // Legacy methods for backward compatibility
  async reserveInventory(data: {
    inventoryId: string;
    quantity: number;
    reservationKey: string;
    referenceType: string;
    referenceId: string;
    expiresAt: Date;
    createdBy: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; reservation?: any; error?: string }> {
    try {
      const reservation = await this.createSoftReservation({
        variantId: data.inventoryId,
        quantity: data.quantity,
        referenceType: data.referenceType as ReservationType,
        referenceId: data.referenceId,
        priority:
          data.referenceType === 'ORDER'
            ? ReservationPriority.ORDER
            : ReservationPriority.CART,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
      });

      return {
        success: true,
        reservation: {
          ...reservation,
          reservationKey: data.reservationKey,
          isActive: () => reservation.status === ReservationStatus.ACTIVE,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to create reservation', error);
      return { success: false, error: error.message };
    }
  }

  async getReservation(reservationKey: string): Promise<any | null> {
    // For backward compatibility, try to find by reference ID
    const reservation = await this.prisma.inventoryReservation.findFirst({
      where: {
        OR: [{ referenceId: reservationKey }, { id: reservationKey }],
      },
    });

    return reservation ? this.transformToEntity(reservation) : null;
  }

  async commitReservation(
    reservationKey: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const reservation = await this.getReservation(reservationKey);
    if (reservation) {
      await this.updateReservationStatus(
        reservation.id,
        ReservationStatus.CONVERTED,
        {
          releaseReason: reason,
        },
      );
    }
  }

  // Private helper methods

  private validateReservationRequest(request: ReservationRequest): void {
    if (!request.variantId) {
      throw new BadRequestException('Variant ID is required');
    }

    if (!request.quantity || request.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (request.quantity > 1000) {
      throw new BadRequestException(
        'Quantity cannot exceed 1000 per reservation',
      );
    }

    if (!request.referenceId) {
      throw new BadRequestException('Reference ID is required');
    }
  }

  private async checkItemAvailability(
    item: any,
  ): Promise<ItemAvailabilityResult> {
    const inventory = await this.getInventoryDetails(item.variantId);

    if (!inventory) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        isAvailable: false,
        reason: 'VARIANT_NOT_FOUND',
      };
    }

    const availableQuantity = inventory.quantity - inventory.reservedQuantity;

    if (availableQuantity <= 0) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        isAvailable: false,
        reason: 'OUT_OF_STOCK',
      };
    }

    if (availableQuantity < item.quantity) {
      return {
        itemId: item.id,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableQuantity,
        isAvailable: true,
        reason: 'PARTIAL_AVAILABILITY',
        suggestedQuantity: availableQuantity,
      };
    }

    return {
      itemId: item.id,
      variantId: item.variantId,
      requestedQuantity: item.quantity,
      availableQuantity,
      isAvailable: true,
      reason: 'AVAILABLE',
    };
  }

  private calculateReservationExpiry(): Date {
    // 30 minutes for cart reservations
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private async handleReservationFailure(
    item: any,
    error: Error,
  ): Promise<void> {
    this.logger.error(
      `Failed to create reservation for item ${item.id}: ${error.message}`,
    );

    // Emit event
    this.eventEmitter.emit('inventory.reservation_failed', {
      itemId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      error: error.message,
    });
  }

  // Database operations
  private async createReservationRecord(
    request: ReservationRequest,
  ): Promise<InventoryReservation> {
    const data: any = {
      variantId: request.variantId,
      quantity: request.quantity,
      referenceType: request.referenceType,
      referenceId: request.referenceId,
      status: ReservationStatus.ACTIVE,
      priority: request.priority,
      createdBy: request.createdBy,
    };

    if (request.expiresAt) {
      data.expiresAt = request.expiresAt;
    }

    const reservation = await this.prisma.inventoryReservation.create({
      data,
    });

    return this.transformToEntity(reservation);
  }

  private async findReservationById(
    id: string,
  ): Promise<InventoryReservation | null> {
    const reservation = await this.prisma.inventoryReservation.findUnique({
      where: { id },
    });

    return reservation ? this.transformToEntity(reservation) : null;
  }

  private async findReservationsByReference(
    type: ReservationType,
    referenceId: string,
  ): Promise<InventoryReservation[]> {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        referenceType: type,
        referenceId,
      },
    });

    return reservations.map((r) => this.transformToEntity(r));
  }

  private async findExpiredReservations(): Promise<InventoryReservation[]> {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return reservations.map((r) => this.transformToEntity(r));
  }

  private async updateReservationStatus(
    id: string,
    status: ReservationStatus,
    updates?: any,
  ): Promise<void> {
    await this.prisma.inventoryReservation.update({
      where: { id },
      data: {
        status,
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  private async linkReservations(
    parentId: string,
    childId: string,
  ): Promise<void> {
    // Use raw queries to work around Prisma type issues
    try {
      await this.prisma.$executeRaw`
        UPDATE "InventoryReservation" 
        SET "parentReservationId" = ${parentId}
        WHERE "id" = ${childId}
      `;

      await this.prisma.$executeRaw`
        UPDATE "InventoryReservation" 
        SET "convertedToReservationId" = ${childId}
        WHERE "id" = ${parentId}
      `;
    } catch (error) {
      this.logger.error(`Failed to link reservations: ${error.message}`);
      // Continue without linking - not critical for functionality
    }
  }

  // Integration with inventory service
  private async getAvailableQuantity(variantId: string): Promise<number> {
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { variantId },
    });

    if (!inventory) {
      return 0;
    }

    return inventory.availableQuantity;
  }

  private async getInventoryDetails(variantId: string): Promise<any> {
    return await this.prisma.variantInventory.findUnique({
      where: { variantId },
    });
  }

  private async addReservedQuantity(
    variantId: string,
    quantity: number,
  ): Promise<void> {
    await this.prisma.variantInventory.update({
      where: { variantId },
      data: {
        reservedQuantity: { increment: quantity },
        availableQuantity: { decrement: quantity },
      },
    });
  }

  private async removeReservedQuantity(
    variantId: string,
    quantity: number,
  ): Promise<void> {
    await this.prisma.variantInventory.update({
      where: { variantId },
      data: {
        reservedQuantity: { decrement: quantity },
        availableQuantity: { increment: quantity },
      },
    });
  }

  private async scheduleReservationCleanup(
    reservation: InventoryReservation,
  ): Promise<void> {
    // This would schedule a cleanup job for the reservation
    // Could use a job queue like Bull or similar
  }

  private transformToEntity(reservation: any): InventoryReservation {
    return {
      id: reservation.id,
      variantId: reservation.variantId,
      quantity: reservation.quantity,
      referenceType: reservation.referenceType,
      referenceId: reservation.referenceId,
      status: reservation.status,
      priority: reservation.priority,
      expiresAt: reservation.expiresAt,
      parentReservationId: reservation.parentReservationId,
      convertedToReservationId: reservation.convertedToReservationId,
      createdBy: reservation.createdBy,
      releasedBy: reservation.releasedBy,
      releasedAt: reservation.releasedAt,
      releaseReason: reservation.releaseReason,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  async cleanupExpiredReservationsLegacy(): Promise<{
    released: number;
    errors: string[];
  }> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    });

    let released = 0;
    const errors: string[] = [];

    for (const res of expired) {
      try {
        await this.prisma.inventoryReservation.update({
          where: { id: res.id },
          data: { status: 'EXPIRED' },
        });
        released++;
      } catch (e: any) {
        errors.push(`Failed to expire reservation ${res.id}: ${e.message}`);
      }
    }
    return { released, errors };
  }

  async getReservationsForInventory(inventoryId: string): Promise<any[]> {
    // Note: Using inventoryId to find variant, then find reservations by variantId
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) return [];

    // Use raw query to work around Prisma type issues
    const reservations = await this.prisma.$queryRaw`
      SELECT * FROM "InventoryReservation" 
      WHERE "variantId" = ${inventory.variantId} 
      AND "status" = 'ACTIVE'
    `;

    return (reservations as any[]).map((r) => ({
      ...r,
      isActive: () => r.status === 'ACTIVE',
    }));
  }
}
