import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { InventoryItem } from './inventory.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVariantAndSeller(
    variantId: string,
    sellerId: string,
  ): Promise<InventoryItem | null> {
    const inventory = await this.prisma.variantInventory.findUnique({
      where: {
        variantId_sellerId: {
          variantId,
          sellerId,
        },
      },
    });

    if (!inventory) {
      return null;
    }

    return {
      id: inventory.id,
      variantId: inventory.variantId,
      sellerId: inventory.sellerId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      allowBackorders: inventory.allowBackorders,
      updatedAt: inventory.updatedAt,
    };
  }

  async create(data: {
    variantId: string;
    sellerId: string;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    allowBackorders: boolean;
  }): Promise<InventoryItem> {
    const inventory = await this.prisma.variantInventory.create({
      data,
    });

    return {
      id: inventory.id,
      variantId: inventory.variantId,
      sellerId: inventory.sellerId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      allowBackorders: inventory.allowBackorders,
      updatedAt: inventory.updatedAt,
    };
  }

  async update(
    id: string,
    data: Partial<{
      quantity: number;
      reservedQuantity: number;
      lowStockThreshold: number;
      allowBackorders: boolean;
    }>,
  ): Promise<InventoryItem> {
    const inventory = await this.prisma.variantInventory.update({
      where: { id },
      data,
    });

    return {
      id: inventory.id,
      variantId: inventory.variantId,
      sellerId: inventory.sellerId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      allowBackorders: inventory.allowBackorders,
      updatedAt: inventory.updatedAt,
    };
  }

  async findLowStockItems(sellerId?: string): Promise<InventoryItem[]> {
    const where = {
      quantity: {
        lte: this.prisma.variantInventory.fields.lowStockThreshold,
      },
      ...(sellerId && { sellerId }),
    };

    const inventories = await this.prisma.variantInventory.findMany({
      where,
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    return inventories.map(inventory => ({
      id: inventory.id,
      variantId: inventory.variantId,
      sellerId: inventory.sellerId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      allowBackorders: inventory.allowBackorders,
      updatedAt: inventory.updatedAt,
    }));
  }
}