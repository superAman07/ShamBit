import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Reservation } from './reservation.service';

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        inventoryId: data.variantId,
        orderId: data.orderId,
        quantity: data.quantity,
        reservationKey,
        expiresAt: data.expiresAt,
        status: data.status,
        referenceType: 'ORDER',
        referenceId: data.orderId ?? reservationKey,
        createdBy: data.sellerId,
      },
    });

    return {
      id: reservation.id,
      variantId: reservation.inventoryId,
      sellerId: reservation.createdBy,
      quantity: reservation.quantity,
      orderId: reservation.orderId,
      status: reservation.status as 'ACTIVE' | 'RELEASED' | 'CONFIRMED',
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.inventoryReservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return null;
    }

    return {
      id: reservation.id,
      variantId: reservation.inventoryId,
      sellerId: reservation.createdBy,
      quantity: reservation.quantity,
      orderId: reservation.orderId,
      status: reservation.status as 'ACTIVE' | 'RELEASED' | 'CONFIRMED',
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }

  async update(id: string, data: any): Promise<void> {
    await this.prisma.inventoryReservation.update({
      where: { id },
      data,
    });
  }
}