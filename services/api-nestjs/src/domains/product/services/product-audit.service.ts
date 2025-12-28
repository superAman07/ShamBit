import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Product } from '../entities/product.entity';

export interface AuditLogEntry {
  id: string;
  productId: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: any;
  batchId?: string;
  createdAt: Date;
}

export interface AuditStatistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Record<string, number>;
  actionsByDay: Record<string, number>;
  recentActions: AuditLogEntry[];
}

@Injectable()
export class ProductAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    productId: string,
    action: string,
    userId: string,
    oldValues?: any,
    newValues?: any,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
    userRole: string = 'UNKNOWN',
    metadata?: any,
    batchId?: string
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);

    await this.prisma.productAuditLog.create({
      data: {
        productId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        userId,
        userRole,
        ipAddress,
        userAgent,
        reason,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        batchId,
      },
    });
  }

  async logBatchAction(
    productIds: string[],
    action: string,
    userId: string,
    reason?: string,
    metadata?: any,
    userRole: string = 'ADMIN'
  ): Promise<string> {
    const batchId = this.generateBatchId();

    await this.prisma.$transaction(async (tx) => {
      for (const productId of productIds) {
        await tx.productAuditLog.create({
          data: {
            productId,
            action: `BATCH_${action}`,
            userId,
            userRole,
            reason,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
            batchId,
          },
        });
      }
    });

    return batchId;
  }

  async getProductAuditHistory(
    productId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.productAuditLog.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.productAuditLog.count({ where: { productId } }),
    ]);

    return {
      data: data.map(this.mapToAuditLogEntry),
      total,
    };
  }

  async getUserAuditHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.productAuditLog.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.productAuditLog.count({ where: { userId } }),
    ]);

    return {
      data: data.map(this.mapToAuditLogEntry),
      total,
    };
  }

  async getBatchAuditHistory(batchId: string): Promise<AuditLogEntry[]> {
    const data = await this.prisma.productAuditLog.findMany({
      where: { batchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return data.map(this.mapToAuditLogEntry);
  }

  async getAuditStatistics(
    dateFrom?: Date,
    dateTo?: Date,
    productId?: string
  ): Promise<AuditStatistics> {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    if (productId) {
      where.productId = productId;
    }

    const [
      totalActions,
      actionsByType,
      actionsByUser,
      actionsByDay,
      recentActions,
    ] = await Promise.all([
      this.prisma.productAuditLog.count({ where }),
      this.prisma.productAuditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      this.prisma.productAuditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
      this.prisma.productAuditLog.groupBy({
        by: ['createdAt'],
        where,
        _count: true,
      }),
      this.prisma.productAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      actionsByType: actionsByType.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      actionsByUser: actionsByUser.reduce((acc, item) => {
        acc[item.userId] = item._count;
        return acc;
      }, {} as Record<string, number>),
      actionsByDay: actionsByDay.reduce((acc, item) => {
        const day = item.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + item._count;
        return acc;
      }, {} as Record<string, number>),
      recentActions: recentActions.map(this.mapToAuditLogEntry),
    };
  }

  async exportAuditLog(
    productId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const where: any = {};
    
    if (productId) {
      where.productId = productId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const data = await this.prisma.productAuditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const auditEntries = data.map(this.mapToAuditLogEntry);

    if (format === 'csv') {
      return this.convertToCSV(auditEntries);
    }

    return JSON.stringify(auditEntries, null, 2);
  }

  async cleanupOldAuditLogs(
    retentionDays: number = 365,
    dryRun: boolean = true
  ): Promise<{ deletedCount: number; oldestRetainedDate: Date }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const countResult = await this.prisma.productAuditLog.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    let deletedCount = 0;

    if (!dryRun && countResult > 0) {
      const deleteResult = await this.prisma.productAuditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
      deletedCount = deleteResult.count;
    } else {
      deletedCount = countResult;
    }

    return {
      deletedCount,
      oldestRetainedDate: cutoffDate,
    };
  }

  // Private helper methods
  private calculateChanges(oldValues: any, newValues: any): any {
    if (!oldValues || !newValues) {
      return null;
    }

    const changes: any = {};
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToAuditLogEntry(prismaData: any): AuditLogEntry {
    return {
      id: prismaData.id,
      productId: prismaData.productId,
      action: prismaData.action,
      oldValues: prismaData.oldValues,
      newValues: prismaData.newValues,
      changes: prismaData.changes,
      userId: prismaData.userId,
      userRole: prismaData.userRole,
      ipAddress: prismaData.ipAddress,
      userAgent: prismaData.userAgent,
      reason: prismaData.reason,
      metadata: prismaData.metadata,
      batchId: prismaData.batchId,
      createdAt: prismaData.createdAt,
    };
  }

  private convertToCSV(auditEntries: AuditLogEntry[]): string {
    if (auditEntries.length === 0) {
      return '';
    }

    const headers = [
      'ID',
      'Product ID',
      'Action',
      'User ID',
      'User Role',
      'Reason',
      'Created At',
      'Batch ID',
    ];

    const rows = auditEntries.map(entry => [
      entry.id,
      entry.productId,
      entry.action,
      entry.userId,
      entry.userRole,
      entry.reason || '',
      entry.createdAt.toISOString(),
      entry.batchId || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}