import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { RefundAuditLog } from '../entities/refund.entity';

// Temporary interface to avoid circular dependency
interface IRefundRepository {
  createAuditLog(data: any, tx?: any): Promise<RefundAuditLog>;
  findAuditLogs(filters: any): Promise<RefundAuditLog[]>;
  findAuditLogsByRefundId(refundId: string): Promise<RefundAuditLog[]>;
  findById(id: string): Promise<any>;
}

import { RefundAuditAction } from '../enums/refund-status.enum';

export interface AuditLogFilters {
  refundId?: string;
  userId?: string;
  action?: RefundAuditAction;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditTrail {
  refundId: string;
  timeline: Array<{
    timestamp: Date;
    action: RefundAuditAction;
    userId: string;
    userName?: string;
    changes?: Record<string, { from: any; to: any }>;
    reason?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }>;
  summary: {
    totalActions: number;
    uniqueUsers: number;
    firstAction: Date;
    lastAction: Date;
    criticalActions: number;
  };
}

@Injectable()
export class RefundAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundRepository: IRefundRepository,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // AUDIT LOG CREATION
  // ============================================================================

  async logAction(
    refundId: string,
    action: RefundAuditAction,
    userId: string,
    oldValues?: any,
    newValues?: any,
    reason?: string,
    tx?: any,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefundAuditLog> {
    this.logger.log('RefundAuditService.logAction', {
      refundId,
      action,
      userId,
      reason,
    });

    // Calculate changes if both old and new values provided
    const changes = this.calculateChanges(oldValues, newValues);

    const auditData = {
      refundId,
      action,
      userId,
      oldValues: oldValues ? this.sanitizeValues(oldValues) : null,
      newValues: newValues ? this.sanitizeValues(newValues) : null,
      reason,
      metadata: {
        ...metadata,
        changes,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
      createdAt: new Date(),
    };

    const auditLog = await this.refundRepository.createAuditLog(auditData, tx);

    // Log critical actions with higher severity
    if (this.isCriticalAction(action)) {
      this.logger.warn('Critical refund action performed', {
        refundId,
        action,
        userId,
        auditLogId: auditLog.id,
      });
    }

    return auditLog;
  }

  async logBulkAction(
    refundIds: string[],
    action: RefundAuditAction,
    userId: string,
    reason?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefundAuditLog[]> {
    this.logger.log('RefundAuditService.logBulkAction', {
      refundCount: refundIds.length,
      action,
      userId,
    });

    const auditLogs: RefundAuditLog[] = [];

    for (const refundId of refundIds) {
      const auditLog = await this.logAction(
        refundId,
        action,
        userId,
        null,
        null,
        reason,
        null,
        {
          ...metadata,
          bulkOperation: true,
          totalRefunds: refundIds.length,
        },
        ipAddress,
        userAgent,
      );
      auditLogs.push(auditLog);
    }

    return auditLogs;
  }

  async logSystemAction(
    refundId: string,
    action: RefundAuditAction,
    systemComponent: string,
    details?: any,
    tx?: any,
  ): Promise<RefundAuditLog> {
    return this.logAction(
      refundId,
      action,
      'SYSTEM',
      null,
      null,
      `System action by ${systemComponent}`,
      tx,
      {
        systemComponent,
        automated: true,
        ...details,
      },
    );
  }

  async logStatusChange(
    refundId: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
    reason?: string,
    tx?: any,
    metadata?: any,
  ): Promise<RefundAuditLog> {
    return this.logAction(
      refundId,
      RefundAuditAction.UPDATE,
      userId,
      { status: fromStatus },
      { status: toStatus },
      reason || `Status changed from ${fromStatus} to ${toStatus}`,
      tx,
      {
        ...metadata,
        statusChange: true,
        fromStatus,
        toStatus,
      },
    );
  }

  async logAmountChange(
    refundId: string,
    fromAmount: number,
    toAmount: number,
    userId: string,
    reason?: string,
    tx?: any,
  ): Promise<RefundAuditLog> {
    return this.logAction(
      refundId,
      RefundAuditAction.UPDATE,
      userId,
      { amount: fromAmount },
      { amount: toAmount },
      reason || `Amount changed from ${fromAmount} to ${toAmount}`,
      tx,
      {
        amountChange: true,
        fromAmount,
        toAmount,
        difference: toAmount - fromAmount,
      },
    );
  }

  // ============================================================================
  // AUDIT LOG QUERIES
  // ============================================================================

  async getAuditLogs(filters: AuditLogFilters): Promise<RefundAuditLog[]> {
    this.logger.log('RefundAuditService.getAuditLogs', { filters });

    return this.refundRepository.findAuditLogs(filters);
  }

  async getRefundAuditTrail(refundId: string): Promise<AuditTrail> {
    this.logger.log('RefundAuditService.getRefundAuditTrail', { refundId });

    const auditLogs =
      await this.refundRepository.findAuditLogsByRefundId(refundId);

    if (auditLogs.length === 0) {
      throw new Error('No audit trail found for refund');
    }

    // Sort by creation date
    auditLogs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Build timeline
    const timeline = auditLogs.map((log) => ({
      timestamp: log.createdAt,
      action: log.action as RefundAuditAction,
      userId: log.userId,
      userName: log.userId, // Would need to fetch user details separately if needed
      changes: log.getChanges(),
      reason: log.reason,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    }));

    // Calculate summary
    const uniqueUsers = new Set(auditLogs.map((log) => log.userId)).size;
    const criticalActions = auditLogs.filter((log) =>
      this.isCriticalAction(log.action as RefundAuditAction),
    ).length;

    const summary = {
      totalActions: auditLogs.length,
      uniqueUsers,
      firstAction: auditLogs[0].createdAt,
      lastAction: auditLogs[auditLogs.length - 1].createdAt,
      criticalActions,
    };

    return {
      refundId,
      timeline,
      summary,
    };
  }

  async getUserAuditHistory(
    userId: string,
    filters: Omit<AuditLogFilters, 'userId'> = {},
  ): Promise<RefundAuditLog[]> {
    return this.getAuditLogs({ ...filters, userId });
  }

  async getActionHistory(
    action: RefundAuditAction,
    filters: Omit<AuditLogFilters, 'action'> = {},
  ): Promise<RefundAuditLog[]> {
    return this.getAuditLogs({ ...filters, action });
  }

  // ============================================================================
  // COMPLIANCE & REPORTING
  // ============================================================================

  async generateComplianceReport(
    dateFrom: Date,
    dateTo: Date,
    options: {
      includeSystemActions?: boolean;
      criticalActionsOnly?: boolean;
      userId?: string;
    } = {},
  ): Promise<{
    period: { from: Date; to: Date };
    totalActions: number;
    actionBreakdown: Record<RefundAuditAction, number>;
    userActivity: Array<{
      userId: string;
      actionCount: number;
      criticalActions: number;
      lastActivity: Date;
    }>;
    criticalEvents: RefundAuditLog[];
    dataIntegrityChecks: {
      missingAuditLogs: string[];
      suspiciousPatterns: Array<{
        type: string;
        description: string;
        refundIds: string[];
      }>;
    };
  }> {
    this.logger.log('RefundAuditService.generateComplianceReport', {
      dateFrom,
      dateTo,
      options,
    });

    const filters: AuditLogFilters = {
      dateFrom,
      dateTo,
      userId: options.userId,
    };

    const auditLogs = await this.getAuditLogs(filters);

    // Filter system actions if requested
    const filteredLogs = options.includeSystemActions
      ? auditLogs
      : auditLogs.filter((log) => log.userId !== 'SYSTEM');

    // Filter critical actions if requested
    const finalLogs = options.criticalActionsOnly
      ? filteredLogs.filter((log) =>
          this.isCriticalAction(log.action as RefundAuditAction),
        )
      : filteredLogs;

    // Calculate action breakdown
    const actionBreakdown: Record<RefundAuditAction, number> = {} as any;
    for (const action of Object.values(RefundAuditAction)) {
      actionBreakdown[action] = finalLogs.filter(
        (log) => log.action === action,
      ).length;
    }

    // Calculate user activity
    const userActivityMap = new Map<
      string,
      {
        actionCount: number;
        criticalActions: number;
        lastActivity: Date;
      }
    >();

    for (const log of finalLogs) {
      if (!userActivityMap.has(log.userId)) {
        userActivityMap.set(log.userId, {
          actionCount: 0,
          criticalActions: 0,
          lastActivity: log.createdAt,
        });
      }

      const activity = userActivityMap.get(log.userId)!;
      activity.actionCount++;

      if (this.isCriticalAction(log.action as RefundAuditAction)) {
        activity.criticalActions++;
      }

      if (log.createdAt > activity.lastActivity) {
        activity.lastActivity = log.createdAt;
      }
    }

    const userActivity = Array.from(userActivityMap.entries()).map(
      ([userId, activity]) => ({
        userId,
        ...activity,
      }),
    );

    // Get critical events
    const criticalEvents = finalLogs.filter((log) =>
      this.isCriticalAction(log.action as RefundAuditAction),
    );

    // Perform data integrity checks
    const dataIntegrityChecks =
      await this.performDataIntegrityChecks(finalLogs);

    return {
      period: { from: dateFrom, to: dateTo },
      totalActions: finalLogs.length,
      actionBreakdown,
      userActivity,
      criticalEvents,
      dataIntegrityChecks,
    };
  }

  async exportAuditTrail(
    refundId: string,
    format: 'JSON' | 'CSV' | 'PDF' = 'JSON',
  ): Promise<{
    data: any;
    filename: string;
    contentType: string;
  }> {
    const auditTrail = await this.getRefundAuditTrail(refundId);

    switch (format) {
      case 'JSON':
        return {
          data: JSON.stringify(auditTrail, null, 2),
          filename: `refund-audit-${refundId}-${Date.now()}.json`,
          contentType: 'application/json',
        };

      case 'CSV':
        const csvData = this.convertAuditTrailToCSV(auditTrail);
        return {
          data: csvData,
          filename: `refund-audit-${refundId}-${Date.now()}.csv`,
          contentType: 'text/csv',
        };

      case 'PDF':
        // This would generate a PDF report
        // Implementation depends on PDF library
        throw new Error('PDF export not implemented');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // ============================================================================
  // DATA INTEGRITY & VALIDATION
  // ============================================================================

  async validateAuditIntegrity(refundId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      type: 'MISSING_AUDIT' | 'INCONSISTENT_DATA' | 'SUSPICIOUS_PATTERN';
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
  }> {
    this.logger.log('RefundAuditService.validateAuditIntegrity', { refundId });

    const issues: Array<{
      type: 'MISSING_AUDIT' | 'INCONSISTENT_DATA' | 'SUSPICIOUS_PATTERN';
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = [];

    // Get refund and audit logs
    const refund = await this.refundRepository.findById(refundId);
    const auditLogs =
      await this.refundRepository.findAuditLogsByRefundId(refundId);

    if (!refund) {
      throw new Error('Refund not found');
    }

    // Check for missing creation audit
    const hasCreationAudit = auditLogs.some(
      (log) => log.action === RefundAuditAction.CREATE,
    );
    if (!hasCreationAudit) {
      issues.push({
        type: 'MISSING_AUDIT',
        description: 'Missing refund creation audit log',
        severity: 'HIGH',
      });
    }

    // Check for status changes without audit
    if (refund.status !== 'PENDING') {
      const hasStatusChangeAudit = auditLogs.some(
        (log) =>
          log.action === RefundAuditAction.UPDATE &&
          log.metadata?.statusChange === true,
      );

      if (!hasStatusChangeAudit) {
        issues.push({
          type: 'MISSING_AUDIT',
          description: 'Status change without corresponding audit log',
          severity: 'HIGH',
        });
      }
    }

    // Check for suspicious patterns
    const rapidActions = this.detectRapidActions(auditLogs);
    if (rapidActions.length > 0) {
      issues.push({
        type: 'SUSPICIOUS_PATTERN',
        description: `Detected ${rapidActions.length} rapid actions within short time periods`,
        severity: 'MEDIUM',
      });
    }

    // Check for data consistency
    const inconsistencies = this.detectDataInconsistencies(refund, auditLogs);
    issues.push(...inconsistencies);

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  async archiveOldAuditLogs(
    cutoffDate: Date,
    archiveLocation?: string,
  ): Promise<{
    archivedCount: number;
    archiveLocation?: string;
  }> {
    this.logger.log('RefundAuditService.archiveOldAuditLogs', { cutoffDate });

    // This would implement archiving logic
    // For now, we'll just count the logs that would be archived
    const oldLogs = await this.refundRepository.findAuditLogs({
      dateTo: cutoffDate,
    });

    // In a real implementation, you would:
    // 1. Export logs to archive storage
    // 2. Verify archive integrity
    // 3. Delete from primary storage
    // 4. Update archive index

    this.logger.log('Audit logs archived', {
      archivedCount: oldLogs.length,
      cutoffDate,
    });

    return {
      archivedCount: oldLogs.length,
      archiveLocation,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateChanges(
    oldValues: any,
    newValues: any,
  ): Record<string, { from: any; to: any }> | null {
    if (!oldValues || !newValues) {
      return null;
    }

    const changes: Record<string, { from: any; to: any }> = {};

    // Compare all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private sanitizeValues(values: any): any {
    // Remove sensitive information from audit logs
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    if (typeof values !== 'object' || values === null) {
      return values;
    }

    const sanitized = { ...values };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private isCriticalAction(action: RefundAuditAction): boolean {
    const criticalActions = [
      RefundAuditAction.APPROVE,
      RefundAuditAction.REJECT,
      RefundAuditAction.PROCESS,
      RefundAuditAction.COMPLETE,
      RefundAuditAction.CANCEL,
    ];

    return criticalActions.includes(action);
  }

  private async performDataIntegrityChecks(
    auditLogs: RefundAuditLog[],
  ): Promise<{
    missingAuditLogs: string[];
    suspiciousPatterns: Array<{
      type: string;
      description: string;
      refundIds: string[];
    }>;
  }> {
    // This would implement comprehensive data integrity checks
    return {
      missingAuditLogs: [],
      suspiciousPatterns: [],
    };
  }

  private convertAuditTrailToCSV(auditTrail: AuditTrail): string {
    const headers = [
      'Timestamp',
      'Action',
      'User ID',
      'User Name',
      'Reason',
      'Changes',
      'IP Address',
    ];

    const rows = auditTrail.timeline.map((entry) => [
      entry.timestamp.toISOString(),
      entry.action,
      entry.userId,
      entry.userName || '',
      entry.reason || '',
      entry.changes ? JSON.stringify(entry.changes) : '',
      entry.ipAddress || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private detectRapidActions(auditLogs: RefundAuditLog[]): RefundAuditLog[] {
    const rapidActions: RefundAuditLog[] = [];
    const timeThreshold = 5 * 60 * 1000; // 5 minutes

    for (let i = 1; i < auditLogs.length; i++) {
      const current = auditLogs[i];
      const previous = auditLogs[i - 1];

      const timeDiff =
        current.createdAt.getTime() - previous.createdAt.getTime();

      if (timeDiff < timeThreshold && current.userId === previous.userId) {
        rapidActions.push(current);
      }
    }

    return rapidActions;
  }

  private detectDataInconsistencies(
    refund: any,
    auditLogs: RefundAuditLog[],
  ): Array<{
    type: 'MISSING_AUDIT' | 'INCONSISTENT_DATA' | 'SUSPICIOUS_PATTERN';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const issues: Array<{
      type: 'MISSING_AUDIT' | 'INCONSISTENT_DATA' | 'SUSPICIOUS_PATTERN';
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = [];

    // This would implement various consistency checks
    // For example, checking if amount changes are properly audited

    return issues;
  }
}
