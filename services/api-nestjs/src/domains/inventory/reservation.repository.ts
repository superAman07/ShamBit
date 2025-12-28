import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Reservation } from './reservation.service';

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    variantId: string;
    sellerId: string;
    quantity: number;
    orderId: string;
    status: string;
    expiresAt: Date;
  }): Promise<Reservation> {
    const reservation = await this.prisma.inventoryReservation.create({
      data,
    });

    return {
      id: reservation.id,
      variantId: reservation.variantId,
      sellerId: reservation.sellerId,
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
      variantId: reservation.variantId,
      sellerId: reservation.sellerId,
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