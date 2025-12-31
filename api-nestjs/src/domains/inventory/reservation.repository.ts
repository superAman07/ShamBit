import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  InventoryReservation,
  ReservationType,
  ReservationStatus,
  ReservationPriority,
  ReservationRequest,
} from './reservation.service';

// Legacy interface for backward compatibility
export interface Reservation {
  id: string;
  variantId: string;
  sellerId: string;
  quantity: number;
  orderId: string | null;
  status: 'ACTIVE' | 'RELEASED' | 'CONFIRMED';
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class ReservationRepository {
  private readonly logger = new Logger(ReservationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // Enhanced methods for new cart system
  async createEnhanced(
    request: ReservationRequest,
  ): Promise<InventoryReservation> {
    try {
      const reservation = await this.prisma.inventoryReservation.create({
        data: {
          variantId: request.variantId,
          quantity: request.quantity,
          referenceType: request.referenceType,
          referenceId: request.referenceId,
          status: ReservationStatus.ACTIVE,
          priority: request.priority,
          expiresAt: request.expiresAt,
          createdBy: request.createdBy,
        },
      });

      return this.transformToEnhancedEntity(reservation);
    } catch (error) {
      this.logger.error(
        `Failed to create enhanced reservation: ${error.message}`,
      );
      throw error;
    }
  }

  async findByReference(
    type: ReservationType,
    referenceId: string,
  ): Promise<InventoryReservation[]> {
    try {
      const reservations = await this.prisma.inventoryReservation.findMany({
        where: {
          referenceType: type,
          referenceId,
        },
        orderBy: { createdAt: 'asc' },
      });

      return reservations.map((reservation) =>
        this.transformToEnhancedEntity(reservation),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find reservations by reference: ${error.message}`,
      );
      throw error;
    }
  }

  async findExpired(): Promise<InventoryReservation[]> {
    try {
      const reservations = await this.prisma.inventoryReservation.findMany({
        where: {
          status: ReservationStatus.ACTIVE,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return reservations.map((reservation) =>
        this.transformToEnhancedEntity(reservation),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find expired reservations: ${error.message}`,
      );
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    additionalData?: any,
  ): Promise<void> {
    try {
      await this.prisma.inventoryReservation.update({
        where: { id },
        data: {
          status,
          ...additionalData,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update reservation status: ${error.message}`,
      );
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  async create(data: {
    variantId: string;
    sellerId: string;
    quantity: number;
    orderId: string | null;
    status: string;
    expiresAt: Date;
  }): Promise<Reservation> {
    const reservationKey = randomUUID();

    const reservation = await this.prisma.inventoryReservation.create({
      data: {
        variantId: data.variantId,
        quantity: data.quantity,
        referenceType: data.orderId
          ? ReservationType.ORDER
          : ReservationType.CART,
        referenceId: data.orderId ?? reservationKey,
        status: data.status as ReservationStatus,
        priority: data.orderId
          ? ReservationPriority.ORDER
          : ReservationPriority.CART,
        expiresAt: data.expiresAt,
        createdBy: data.sellerId,
      },
    });

    return this.transformToLegacyEntity(reservation);
  }

  async findById(id: string): Promise<InventoryReservation | null> {
    try {
      const reservation = await this.prisma.inventoryReservation.findUnique({
        where: { id },
      });

      return reservation ? this.transformToEnhancedEntity(reservation) : null;
    } catch (error) {
      this.logger.error(`Failed to find reservation by ID: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<void> {
    try {
      await this.prisma.inventoryReservation.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update reservation: ${error.message}`);
      throw error;
    }
  }

  // Transform methods
  private transformToEnhancedEntity(reservation: any): InventoryReservation {
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

  private transformToLegacyEntity(reservation: any): Reservation {
    return {
      id: reservation.id,
      variantId: reservation.variantId,
      sellerId: reservation.createdBy,
      quantity: reservation.quantity,
      orderId:
        reservation.referenceType === ReservationType.ORDER
          ? reservation.referenceId
          : null,
      status: reservation.status as 'ACTIVE' | 'RELEASED' | 'CONFIRMED',
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }
}
