import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StockMovement } from './stock-movement.service';

@Injectable()
export class StockMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    variantId: string;
    sellerId: string;
    type: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    referenceId?: string;
    referenceType?: string;
    userId: string;
  }): Promise<StockMovement> {
    const movement = await this.prisma.inventoryMovement.create({
      data,
    });

    return {
      id: movement.id,
      variantId: movement.variantId,
      sellerId: movement.sellerId,
      type: movement.type,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      reason: movement.reason,
      referenceId: movement.referenceId,
      referenceType: movement.referenceType,
      userId: movement.userId,
      createdAt: movement.createdAt,
    };
  }

  async findByVariantAndSeller(
    variantId: string,
    sellerId: string,
    limit: number,
  ): Promise<StockMovement[]> {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        variantId,
        sellerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return movements.map(movement => ({
      id: movement.id,
      variantId: movement.variantId,
      sellerId: movement.sellerId,
      type: movement.type,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      reason: movement.reason,
      referenceId: movement.referenceId,
      referenceType: movement.referenceType,
      userId: movement.userId,
      createdAt: movement.createdAt,
    }));
  }
}