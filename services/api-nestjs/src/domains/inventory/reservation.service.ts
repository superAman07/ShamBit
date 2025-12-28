import { Injectable } from '@nestjs/common';
import { ReservationRepository } from './reservation.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export interface Reservation {
  id: string;
  variantId: string;
  sellerId: string;
  quantity: number;
  orderId: string;
  status: 'ACTIVE' | 'RELEASED' | 'CONFIRMED';
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly logger: LoggerService,
  ) {}

  async createReservation(data: {
    variantId: string;
    sellerId: string;
    quantity: number;
    orderId: string;
    expiresAt: Date;
  }): Promise<Reservation> {
    this.logger.log('ReservationService.createReservation', data);
    
    return this.reservationRepository.create({
      ...data,
      status: 'ACTIVE',
    });
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.reservationRepository.findById(id);
  }

  async releaseReservation(id: string, reason: string): Promise<void> {
    this.logger.log('ReservationService.releaseReservation', { id, reason });
    
    await this.reservationRepository.update(id, {
      status: 'RELEASED',
      releasedAt: new Date(),
      releaseReason: reason,
    });
  }

  async confirmReservation(id: string, reason: string): Promise<void> {
    this.logger.log('ReservationService.confirmReservation', { id, reason });
    
    await this.reservationRepository.update(id, {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmReason: reason,
    });
  }
}