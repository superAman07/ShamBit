import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryLedger, LedgerEntryType } from './entities/inventory-ledger.entity';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToInventoryModel(record: any): Inventory {
    return new Inventory({
      id: record.id,
      variantId: record.variantId,
      sellerId: record.sellerId,
      warehouseId: record.warehouseId,
      availableQuantity: record.availableQuantity ?? (record.quantity - record.reservedQuantity),
      reservedQuantity: record.reservedQuantity ?? 0,
      totalQuantity: record.quantity ?? (record.availableQuantity + record.reservedQuantity),
      lowStockThreshold: record.lowStockThreshold,
      outOfStockThreshold: record.outOfStockThreshold,
      metadata: record.metadata,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  private mapToLedgerModel(record: any): InventoryLedger {
    return new InventoryLedger({
      id: record.id,
      inventoryId: record.inventoryId,
      type: record.type as LedgerEntryType,
      quantity: record.quantity,
      runningBalance: record.runningBalance,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      reason: record.reason,
      metadata: record.metadata,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
    });
  }

  async findAll(filters: any = {}, pagination: any = {}, includes: any = {}): Promise<{ data: Inventory[]; total: number }> {
    const where: any = { ...(filters || {}) };
    const take = pagination.limit || 20;
    const skip = ((pagination.page || 1) - 1) * take;

    const [records, total] = await Promise.all([
      this.prisma.variantInventory.findMany({ where, take, skip }),
      this.prisma.variantInventory.count({ where }),
    ]);

    return { data: records.map(r => this.mapToInventoryModel(r)), total };
  }

  async findById(id: string, includes: any = {}): Promise<Inventory | null> {
    const record = await this.prisma.variantInventory.findUnique({ where: { id } });
    if (!record) return null;
    return this.mapToInventoryModel(record);
  }

  async findByVariant(variantId: string, sellerId?: string, warehouseId?: string): Promise<Inventory | null> {
    const where: any = { variantId, ...(sellerId ? { sellerId } : {}), ...(warehouseId ? { warehouseId } : {}) };
    const record = await this.prisma.variantInventory.findFirst({ where });
    if (!record) return null;
    return this.mapToInventoryModel(record);
  }

  async findBySeller(sellerId: string, filters: any = {}, pagination: any = {}, includes: any = {}): Promise<{ data: Inventory[]; total: number }> {
    const where = { sellerId, ...(filters || {}) };
    const take = pagination.limit || 20;
    const skip = ((pagination.page || 1) - 1) * take;

    const [records, total] = await Promise.all([
      this.prisma.variantInventory.findMany({ where, take, skip }),
      this.prisma.variantInventory.count({ where }),
    ]);

    return { data: records.map(r => this.mapToInventoryModel(r)), total };
  }

  async create(data: any): Promise<Inventory> {
    const record = await this.prisma.variantInventory.create({ data });
    return this.mapToInventoryModel(record);
  }

  async updateQuantities(id: string, available: number, reserved: number, total: number, updatedBy: string): Promise<Inventory> {
    const record = await this.prisma.variantInventory.update({
      where: { id },
      data: {
        quantity: total,
        reservedQuantity: reserved,
        availableQuantity: available,
        updatedBy,
      },
    });
    return this.mapToInventoryModel(record);
  }

  async getMovements(inventoryId: string, filters: any = {}, pagination: any = {}): Promise<{ data: InventoryLedger[]; total: number }> {
    const where: any = { inventoryId, ...(filters || {}) };
    const take = pagination.limit || 50;
    const skip = ((pagination.page || 1) - 1) * take;

    const [records, total] = await Promise.all([
      this.prisma.inventoryLedger.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
      this.prisma.inventoryLedger.count({ where }),
    ]);

    return { data: records.map(r => this.mapToLedgerModel(r)), total };
  }

  async getStockLevels(filters: any = {}, pagination: any = {}): Promise<{ data: Inventory[]; total: number }> {
    return this.findAll(filters, pagination);
  }

  async getLowStockItems(sellerId?: string, threshold?: number, pagination: any = {}): Promise<{ data: Inventory[]; total: number }> {
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (threshold !== undefined) {
      where.availableQuantity = { lte: threshold };
    }
    const take = pagination.limit || 50;
    const skip = ((pagination.page || 1) - 1) * take;
    const [records, total] = await Promise.all([
      this.prisma.variantInventory.findMany({ where, take, skip }),
      this.prisma.variantInventory.count({ where }),
    ]);
    return { data: records.map(r => this.mapToInventoryModel(r)), total };
  }

  async getOutOfStockItems(sellerId?: string, pagination: any = {}): Promise<{ data: Inventory[]; total: number }> {
    const where: any = { availableQuantity: { lte: 0 } };
    if (sellerId) where.sellerId = sellerId;
    const take = pagination.limit || 50;
    const skip = ((pagination.page || 1) - 1) * take;
    const [records, total] = await Promise.all([
      this.prisma.variantInventory.findMany({ where, take, skip }),
      this.prisma.variantInventory.count({ where }),
    ]);
    return { data: records.map(r => this.mapToInventoryModel(r)), total };
  }

  async createLedgerEntry(data: any): Promise<InventoryLedger> {
    const record = await this.prisma.inventoryLedger.create({ data });
    return this.mapToLedgerModel(record);
  }
}