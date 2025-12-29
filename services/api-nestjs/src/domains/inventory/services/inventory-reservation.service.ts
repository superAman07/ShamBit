import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class InventoryReservationService {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) { }

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
    this.logger.log('InventoryReservationService.reserveInventory', data);

    // Fetch inventory to get variant info
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { id: data.inventoryId },
    });

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    try {
      // Create reservation (schema uses inventoryId + reservationKey)
      const reservation = await this.prisma.inventoryReservation.create({
        data: {
          inventoryId: inventory.id,
          reservationKey: data.reservationKey,
          quantity: data.quantity,
          expiresAt: data.expiresAt,
          status: 'ACTIVE',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          metadata: data.metadata || {},
          createdBy: data.createdBy,
        }
      });

      return {
        success: true,
        reservation: {
          ...reservation,
          isActive: () => reservation.status === 'ACTIVE'
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to create reservation', error);
      return { success: false, error: error.message };
    }
  }

  async getReservation(reservationKey: string): Promise<any | null> {
    const reservation = await this.prisma.inventoryReservation.findFirst({
      where: { reservationKey }
    });
    return reservation;
  }

  async commitReservation(reservationKey: string, userId: string, reason?: string): Promise<void> {
    this.logger.log('InventoryReservationService.commitReservation', { reservationKey, userId, reason });
    // Find reservation by reservationKey
    const reservation = await this.prisma.inventoryReservation.findFirst({ where: { reservationKey } });

    if (reservation && reservation.status === 'ACTIVE') {
      await this.prisma.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CONFIRMED',
          // Assuming schema allows these fields as per ReservationService update
          // confirmedAt: new Date(),
          // confirmReason: reason
        }
      });
    }
  }

  async releaseReservation(reservationKey: string, userId: string, reason?: string): Promise<void> {
    this.logger.log('InventoryReservationService.releaseReservation', { reservationKey, userId, reason });
    const reservation = await this.prisma.inventoryReservation.findFirst({ where: { reservationKey } });

    if (reservation && reservation.status === 'ACTIVE') {
      await this.prisma.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'RELEASED',
          // releasedAt: new Date(),
          // releaseReason: reason
        }
      });
    }
  }

  async cleanupExpiredReservations(): Promise<{ released: number; errors: string[] }> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } }
    });

    let released = 0;
    const errors: string[] = [];

    for (const res of expired) {
      try {
        await this.prisma.inventoryReservation.update({ where: { id: res.id }, data: { status: 'EXPIRED', isExpired: true } });
        released++;
      } catch (e: any) {
        errors.push(`Failed to expire reservation ${res.id}: ${e.message}`);
      }
    }
    return { released, errors };
  }

  async getReservationsForInventory(inventoryId: string): Promise<any[]> {
    const inventory = await this.prisma.variantInventory.findUnique({ where: { id: inventoryId } });
    if (!inventory) return [];

    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { inventoryId: inventory.id, status: 'ACTIVE' }
    });

    return reservations.map(r => ({
      ...r,
      isActive: () => r.status === 'ACTIVE'
    }));
  }
}