import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { Prisma } from '@prisma/client';

export interface AuditLogEntry {
  settlementId: string;
  action: string;
  userId?: string;
  userRole?: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class SettlementAuditService {
  private readonly logger = new Logger(SettlementAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  async logAction(
    settlementId: string,
    action: string,
    userId?: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any,
    userRole?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Calculate changes if both old and new values are provided
      const changes = this.calculateChanges(oldValues, newValues);

      await this.prisma.settlementAuditLog.create({
        data: {
          settlementId,
          action,
          userId,
          userRole,
          oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
          newValues: newValues ? JSON.stringify(newValues) : undefined,
          changes: changes ? JSON.stringify(changes) : undefined,
          ipAddress,
          userAgent,
          metadata: metadata || {},
          createdAt: new Date(),
        },
      });

      this.loggerService.log('Settlement audit log created', {
        settlementId,
        action,
        userId,
        hasChanges: !!changes,
      });

    } catch (error) {
      this.logger.error('Failed to create audit log', {
        settlementId,
        action,
        userId,
        error: error.message,
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  async logBulkAction(
    action: string,
    userId: string,
    affectedSettlements: string[],
    metadata?: any,
    userRole?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const auditEntries = affectedSettlements.map(settlementId => ({
        settlementId,
        action,
        userId,
        userRole,
        oldValues: Prisma.JsonNull,
        newValues: Prisma.JsonNull,
        changes: Prisma.JsonNull,
        ipAddress,
        userAgent,
        metadata: {
          ...metadata,
          bulkOperation: true,
          totalAffected: affectedSettlements.length,
        },
        createdAt: new Date(),
      }));

      await this.prisma.settlementAuditLog.createMany({
        data: auditEntries,
      });

      this.loggerService.log('Bulk settlement audit logs created', {
        action,
        userId,
        count: affectedSettlements.length,
      });

    } catch (error) {
      this.logger.error('Failed to create bulk audit logs', {
        action,
        userId,
        count: affectedSettlements.length,
        error: error.message,
      });
    }
  }

  // ============================================================================
  // AUDIT QUERIES
  // ============================================================================

  async getAuditTrail(
    settlementId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const [logs, total] = await Promise.all([
      this.prisma.settlementAuditLog.findMany({
        where: { settlementId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.settlementAuditLog.count({
        where: { settlementId },
      }),
    ]);

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      oldValues: this.parseJsonValue(log.oldValues),
      newValues: this.parseJsonValue(log.newValues),
      changes: this.parseJsonValue(log.changes),
    }));

    return { logs: parsedLogs, total };
  }

  async getUserActivity(
    userId: string,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const where: any = { userId };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.settlementAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          settlement: {
            select: {
              settlementId: true,
              sellerId: true,
              netAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.settlementAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getSystemActivity(
    fromDate?: Date,
    toDate?: Date,
    actions?: string[],
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const where: any = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    if (actions && actions.length > 0) {
      where.action = { in: actions };
    }

    const [logs, total] = await Promise.all([
      this.prisma.settlementAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          settlement: {
            select: {
              settlementId: true,
              sellerId: true,
              netAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.settlementAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  // ============================================================================
  // AUDIT ANALYTICS
  // ============================================================================

  async getAuditStatistics(
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    userBreakdown: Record<string, number>;
    dailyActivity: Array<{ date: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    const where: any = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const logs = await this.prisma.settlementAuditLog.findMany({
      where,
      select: {
        action: true,
        userId: true,
        createdAt: true,
      },
    });

    const totalActions = logs.length;
    const actionBreakdown: Record<string, number> = {};
    const userBreakdown: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    for (const log of logs) {
      // Action breakdown
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;

      // User breakdown
      if (log.userId) {
        userBreakdown[log.userId] = (userBreakdown[log.userId] || 0) + 1;
      }

      // Daily activity
      const date = log.createdAt.toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    }

    // Convert daily activity to array and sort
    const dailyActivityArray = Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top users
    const topUsers = Object.entries(userBreakdown)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActions,
      actionBreakdown,
      userBreakdown,
      dailyActivity: dailyActivityArray,
      topUsers,
    };
  }

  async getComplianceReport(
    fromDate: Date,
    toDate: Date
  ): Promise<{
    totalSettlements: number;
    settlementsWithAuditTrail: number;
    compliancePercentage: number;
    criticalActions: Array<{
      settlementId: string;
      action: string;
      userId?: string;
      createdAt: Date;
    }>;
    suspiciousActivity: Array<{
      userId: string;
      actionCount: number;
      actions: string[];
    }>;
  }> {
    // Get all settlements in the period
    const settlements = await this.prisma.settlement.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        settlementId: true,
      },
    });

    // Get settlements with audit trails
    const settlementsWithAudit = await this.prisma.settlementAuditLog.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        settlementId: true,
      },
      distinct: ['settlementId'],
    });

    // Get critical actions (status changes, cancellations, etc.)
    const criticalActions = await this.prisma.settlementAuditLog.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        action: {
          in: ['CANCELLED', 'FAILED', 'PROCESSING_STARTED', 'COMPLETED'],
        },
      },
      select: {
        settlementId: true,
        action: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).then(actions => actions.map(action => ({
      settlementId: action.settlementId,
      action: action.action,
      userId: action.userId || undefined,
      createdAt: action.createdAt,
    })));

    // Detect suspicious activity (users with high activity)
    const userActivity = await this.prisma.settlementAuditLog.groupBy({
      by: ['userId', 'action'],
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        userId: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    const userActivityMap: Record<string, { count: number; actions: Set<string> }> = {};
    
    for (const activity of userActivity) {
      if (!activity.userId) continue;
      
      if (!userActivityMap[activity.userId]) {
        userActivityMap[activity.userId] = { count: 0, actions: new Set() };
      }
      
      userActivityMap[activity.userId].count += activity._count.id;
      userActivityMap[activity.userId].actions.add(activity.action);
    }

    const suspiciousActivity = Object.entries(userActivityMap)
      .filter(([_, data]) => data.count > 100) // Threshold for suspicious activity
      .map(([userId, data]) => ({
        userId,
        actionCount: data.count,
        actions: Array.from(data.actions),
      }))
      .sort((a, b) => b.actionCount - a.actionCount);

    const totalSettlements = settlements.length;
    const settlementsWithAuditTrail = settlementsWithAudit.length;
    const compliancePercentage = totalSettlements > 0 
      ? (settlementsWithAuditTrail / totalSettlements) * 100 
      : 100;

    return {
      totalSettlements,
      settlementsWithAuditTrail,
      compliancePercentage: Math.round(compliancePercentage * 100) / 100,
      criticalActions,
      suspiciousActivity,
    };
  }

  // ============================================================================
  // AUDIT CLEANUP
  // ============================================================================

  async cleanupOldAuditLogs(olderThanDays: number = 365): Promise<number> {
    this.logger.log(`Cleaning up audit logs older than ${olderThanDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.settlementAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old audit logs`);
    return result.count;
  }

  async archiveAuditLogs(
    olderThanDays: number = 90,
    archiveLocation?: string
  ): Promise<number> {
    // This would typically export audit logs to an external storage system
    // For now, we'll just mark them as archived
    
    this.logger.log(`Archiving audit logs older than ${olderThanDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // In a real implementation, you would:
    // 1. Export logs to external storage (S3, etc.)
    // 2. Verify the export
    // 3. Delete from primary database
    
    const logsToArchive = await this.prisma.settlementAuditLog.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // Simulate archiving process
    this.logger.log(`Would archive ${logsToArchive.length} audit logs to ${archiveLocation || 'default location'}`);

    return logsToArchive.length;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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

  private parseJsonValue(value: any): any {
    // If value is already a parsed JSON object, return it as is
    if (value === null || value === undefined) {
      return null;
    }

    // If value is already an object (parsed JSON), return it
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      return value;
    }

    // If value is a string, try to parse it as JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        // If parsing fails, return the original string
        return value;
      }
    }

    // For other types (number, boolean, etc.), return as is
    return value;
  }

  // ============================================================================
  // AUDIT SEARCH
  // ============================================================================

  async searchAuditLogs(
    query: {
      settlementId?: string;
      userId?: string;
      action?: string;
      fromDate?: Date;
      toDate?: Date;
      ipAddress?: string;
      searchText?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const where: any = {};

    if (query.settlementId) {
      where.settlementId = query.settlementId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.ipAddress) {
      where.ipAddress = query.ipAddress;
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = query.fromDate;
      if (query.toDate) where.createdAt.lte = query.toDate;
    }

    // For text search, we would typically use full-text search
    // This is a simplified version
    if (query.searchText) {
      where.OR = [
        { action: { contains: query.searchText, mode: 'insensitive' } },
        { settlementId: { contains: query.searchText, mode: 'insensitive' } },
        { userId: { contains: query.searchText, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.settlementAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          settlement: {
            select: {
              settlementId: true,
              sellerId: true,
              netAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.settlementAuditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
