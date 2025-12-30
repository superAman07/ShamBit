import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicConfigService } from '../config/dynamic-config.service';

export interface RetentionPolicy {
  entityType: string;
  retentionDays: number;
  archiveBeforeDelete: boolean;
  conditions?: Record<string, any>;
}

export interface ArchivalRule {
  entityType: string;
  archiveAfterDays: number;
  conditions?: Record<string, any>;
}

@Injectable()
export class DataLifecycleService {
  private readonly logger = new Logger(DataLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: DynamicConfigService,
  ) {}

  // Run cleanup job daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDataCleanup(): Promise<void> {
    this.logger.log('Starting data lifecycle cleanup job');

    try {
      await this.softDeleteExpiredData();
      await this.archiveOldData();
      await this.hardDeleteArchivedData();
      
      this.logger.log('Data lifecycle cleanup job completed');
    } catch (error) {
      this.logger.error('Data lifecycle cleanup job failed', error);
    }
  }

  async softDeleteExpiredData(): Promise<void> {
    const retentionPolicies = await this.getRetentionPolicies();

    for (const policy of retentionPolicies) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        const count = await this.applySoftDelete(policy.entityType, cutoffDate, policy.conditions);
        
        if (count > 0) {
          this.logger.log(`Soft deleted ${count} ${policy.entityType} records older than ${policy.retentionDays} days`);
        }
      } catch (error) {
        this.logger.error(`Failed to apply soft delete for ${policy.entityType}`, error);
      }
    }
  }

  async archiveOldData(): Promise<void> {
    const archivalRules = await this.getArchivalRules();

    for (const rule of archivalRules) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - rule.archiveAfterDays);

        const count = await this.archiveData(rule.entityType, cutoffDate, rule.conditions);
        
        if (count > 0) {
          this.logger.log(`Archived ${count} ${rule.entityType} records older than ${rule.archiveAfterDays} days`);
        }
      } catch (error) {
        this.logger.error(`Failed to archive ${rule.entityType}`, error);
      }
    }
  }

  async hardDeleteArchivedData(): Promise<void> {
    const hardDeleteAfterDays = await this.configService.get<number>('data.hardDeleteAfterDays', 365);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - hardDeleteAfterDays);

    try {
      // Delete archived data older than specified days
      const deletedCount = await (this.prisma as any).archivedData.deleteMany({
        where: {
          archivedAt: {
            lt: cutoffDate,
          },
        },
      });

      if (deletedCount.count > 0) {
        this.logger.log(`Hard deleted ${deletedCount.count} archived records older than ${hardDeleteAfterDays} days`);
      }
    } catch (error) {
      this.logger.error('Failed to hard delete archived data', error);
    }
  }

  private async applySoftDelete(
    entityType: string,
    cutoffDate: Date,
    conditions?: Record<string, any>,
  ): Promise<number> {
    const whereClause = {
      createdAt: { lt: cutoffDate },
      deletedAt: null,
      ...conditions,
    };

    switch (entityType) {
      case 'Order':
        const orderResult = await this.prisma.order.updateMany({
          where: whereClause,
          data: {
            deletedAt: new Date(),
            deletedBy: 'system',
          } as any,
        });
        return orderResult.count;

      case 'Product':
        const productResult = await this.prisma.product.updateMany({
          where: {
            ...whereClause,
            status: 'INACTIVE',
          },
          data: {
            deletedAt: new Date(),
            deletedBy: 'system',
          } as any,
        });
        return productResult.count;

      case 'User':
        const userResult = await this.prisma.user.updateMany({
          where: {
            ...whereClause,
            status: 'INACTIVE',
          },
          data: {
            deletedAt: new Date(),
            deletedBy: 'system',
          } as any,
        });
        return userResult.count;

      case 'AuditLog':
        const auditResult = await this.prisma.auditLog.updateMany({
          where: whereClause,
          data: {
            deletedAt: new Date(),
          } as any,
        });
        return auditResult.count;

      default:
        this.logger.warn(`Soft delete not implemented for entity type: ${entityType}`);
        return 0;
    }
  }

  private async archiveData(
    entityType: string,
    cutoffDate: Date,
    conditions?: Record<string, any>,
  ): Promise<number> {
    const whereClause = {
      createdAt: { lt: cutoffDate },
      ...conditions,
    };

    let records: any[] = [];
    let tableName = '';

    switch (entityType) {
      case 'Order':
        tableName = 'orders';
        records = await this.prisma.order.findMany({
          where: {
            ...whereClause,
            status: { in: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: true,
            payments: true,
            shipments: true,
          },
        });
        break;

      case 'AuditLog':
        tableName = 'audit_logs';
        records = await this.prisma.auditLog.findMany({
          where: whereClause,
        });
        break;

      case 'DomainEvent':
        tableName = 'domain_events';
        // DomainEvent uses `occurredAt` in the generated types, map our createdAt cutoff
        records = await (this.prisma as any).domainEvent.findMany({
          where: {
            occurredAt: (whereClause as any).createdAt,
            ...(conditions || {}),
          },
        });
        break;

      default:
        this.logger.warn(`Archival not implemented for entity type: ${entityType}`);
        return 0;
    }

    if (records.length === 0) {
      return 0;
    }

    // Store in archive table
    for (const record of records) {
      await (this.prisma as any).archivedData.create({
        data: {
          entityType,
          entityId: record.id,
          tableName,
          data: record,
          archivedAt: new Date(),
          tenantId: record.tenantId || '',
        },
      });
    }

    // Delete original records
    const recordIds = records.map(r => r.id);
    
    switch (entityType) {
      case 'Order':
        await this.prisma.order.deleteMany({
          where: { id: { in: recordIds } },
        });
        break;
      case 'AuditLog':
        await this.prisma.auditLog.deleteMany({
          where: { id: { in: recordIds } },
        });
        break;
      case 'DomainEvent':
        await (this.prisma as any).domainEvent.deleteMany({
          where: { id: { in: recordIds } },
        });
        break;
    }

    return records.length;
  }

  private async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    const policies = await this.configService.get<RetentionPolicy[]>('data.retentionPolicies', [
      {
        entityType: 'AuditLog',
        retentionDays: 2555, // 7 years
        archiveBeforeDelete: true,
      },
      {
        entityType: 'DomainEvent',
        retentionDays: 365, // 1 year
        archiveBeforeDelete: true,
      },
      {
        entityType: 'Order',
        retentionDays: 2555, // 7 years for completed orders
        archiveBeforeDelete: true,
        conditions: { status: { in: ['COMPLETED', 'CANCELLED'] } },
      },
      {
        entityType: 'User',
        retentionDays: 1095, // 3 years for inactive users
        archiveBeforeDelete: false,
        conditions: { status: 'INACTIVE' },
      },
    ]);

    return policies;
  }

  private async getArchivalRules(): Promise<ArchivalRule[]> {
    const rules = await this.configService.get<ArchivalRule[]>('data.archivalRules', [
      {
        entityType: 'Order',
        archiveAfterDays: 365, // Archive orders after 1 year
        conditions: { status: { in: ['COMPLETED', 'CANCELLED'] } },
      },
      {
        entityType: 'AuditLog',
        archiveAfterDays: 90, // Archive audit logs after 3 months
      },
      {
        entityType: 'DomainEvent',
        archiveAfterDays: 30, // Archive domain events after 1 month
      },
    ]);

    return rules;
  }

  async restoreFromArchive(entityType: string, entityId: string): Promise<boolean> {
    try {
      const archivedData = await (this.prisma as any).archivedData.findFirst({
        where: {
          entityType,
          entityId,
        },
      });

      if (!archivedData) {
        return false;
      }

      // Restore data to original table
      switch (entityType) {
        case 'Order':
          await this.prisma.order.create({
            data: archivedData.data as any,
              });
          break;
        case 'AuditLog':
          await this.prisma.auditLog.create({
            data: archivedData.data as any,
              });
          break;
        case 'DomainEvent':
          await (this.prisma as any).domainEvent.create({
            data: archivedData.data as any,
              });
          break;
        default:
          return false;
      }

      // Remove from archive
      await (this.prisma as any).archivedData.delete({
        where: { id: archivedData.id },
      });

      this.logger.log(`Restored ${entityType} ${entityId} from archive`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to restore ${entityType} ${entityId} from archive`, error);
      return false;
    }
  }
}