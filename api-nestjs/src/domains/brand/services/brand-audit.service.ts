import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Brand } from '../entities/brand.entity';
import { BrandRequest } from '../entities/brand-request.entity';

export interface AuditLogEntry {
  id: string;
  brandId: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  createdAt: Date;
}

@Injectable()
export class BrandAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    brandId: string,
    action: string,
    userId: string,
    oldValues?: any,
    newValues?: any,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
    userRole: string = 'UNKNOWN',
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);

    await this.prisma.brandAuditLog.create({
      data: {
        brandId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        userId,
        userRole,
        ipAddress,
        userAgent,
        reason,
      },
    });
  }

  async logRequestAction(
    requestId: string,
    action: string,
    userId: string,
    oldValues?: BrandRequest,
    newValues?: BrandRequest,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
    userRole: string = 'ADMIN',
  ): Promise<void> {
    // For brand requests, we create a special audit entry
    // This could be extended to have a separate BrandRequestAuditLog table
    const changes = this.calculateChanges(oldValues, newValues);

    await this.prisma.brandAuditLog.create({
      data: {
        brandId: requestId, // Using requestId as brandId for request audits
        action: `REQUEST_${action}`,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        userId,
        userRole,
        ipAddress,
        userAgent,
        reason,
      },
    });
  }

  async getBrandAuditHistory(
    brandId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.brandAuditLog.findMany({
        where: { brandId },
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
      this.prisma.brandAuditLog.count({ where: { brandId } }),
    ]);

    return {
      data: data.map(this.mapToAuditLogEntry),
      total,
    };
  }

  async getUserAuditHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.brandAuditLog.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          brand: {
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
      this.prisma.brandAuditLog.count({ where: { userId } }),
    ]);

    return {
      data: data.map(this.mapToAuditLogEntry),
      total,
    };
  }

  async getAuditStatistics(
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    actionsByDay: Record<string, number>;
  }> {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalActions, actionsByType, actionsByUser, actionsByDay] =
      await Promise.all([
        this.prisma.brandAuditLog.count({ where }),
        this.prisma.brandAuditLog.groupBy({
          by: ['action'],
          where,
          _count: true,
        }),
        this.prisma.brandAuditLog.groupBy({
          by: ['userId'],
          where,
          _count: true,
        }),
        this.prisma.brandAuditLog.groupBy({
          by: ['createdAt'],
          where,
          _count: true,
        }),
      ]);

    return {
      totalActions,
      actionsByType: actionsByType.reduce(
        (acc, item) => {
          acc[item.action] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      actionsByUser: actionsByUser.reduce(
        (acc, item) => {
          acc[item.userId] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      actionsByDay: actionsByDay.reduce(
        (acc, item) => {
          const day = item.createdAt.toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  private calculateChanges(oldValues: any, newValues: any): any {
    if (!oldValues || !newValues) {
      return null;
    }

    const changes: any = {};
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

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

  private mapToAuditLogEntry(prismaData: any): AuditLogEntry {
    return {
      id: prismaData.id,
      brandId: prismaData.brandId,
      action: prismaData.action,
      oldValues: prismaData.oldValues,
      newValues: prismaData.newValues,
      changes: prismaData.changes,
      userId: prismaData.userId,
      userRole: prismaData.userRole,
      ipAddress: prismaData.ipAddress,
      userAgent: prismaData.userAgent,
      reason: prismaData.reason,
      createdAt: prismaData.createdAt,
    };
  }
}
