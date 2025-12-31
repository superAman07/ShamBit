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
    previousQuantity?: number;
    newQuantity?: number;
    reason: string;
    referenceId?: string;
    referenceType?: string;
    userId: string;
  }): Promise<StockMovement> {
    // Resolve inventory record for the provided variantId
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { variantId: data.variantId },
      include: { variant: { include: { product: true } } },
    });

    if (!inventory) {
      throw new Error(
        `Variant inventory not found for variantId=${data.variantId}`,
      );
    }

    // Ensure seller matches (if provided)
    const product = inventory.variant?.product;
    if (data.sellerId && product && product.sellerId !== data.sellerId) {
      throw new Error('SellerId mismatch for variant inventory');
    }

    const reference =
      data.referenceType && data.referenceId
        ? `${data.referenceType}:${data.referenceId}`
        : (data.referenceId ?? null);

    const movement = await this.prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        reference,
        createdBy: data.userId,
      },
      include: {
        inventory: { include: { variant: { include: { product: true } } } },
      },
    });

    return {
      id: movement.id,
      variantId: movement.inventory.variantId,
      sellerId: movement.inventory.variant.product.sellerId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      reference: movement.reference,
      userId: movement.createdBy,
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
        inventory: {
          variantId,
          variant: {
            product: {
              sellerId,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        inventory: { include: { variant: { include: { product: true } } } },
      },
    });

    return movements.map((movement) => ({
      id: movement.id,
      variantId: movement.inventory.variantId,
      sellerId: movement.inventory.variant.product.sellerId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      reference: movement.reference,
      userId: movement.createdBy,
      createdAt: movement.createdAt,
    }));
  }
}
