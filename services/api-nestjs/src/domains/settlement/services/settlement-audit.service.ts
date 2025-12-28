import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { SettlementAuditRepository } from '../repositories/settlement-audit.repository';
import { SettlementAuditLog } from '../entities/settlement-audit-log.entity';

export interface AuditLogFilters {
  settlementId?: string;
  userId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AuditLogOptions {
  includeUser?: boolean;
  includeSettlement?: boolean;
}

@Injectable()
export class SettlementAuditService {
  constructor(
    private readonly settlementAuditRepository: SettlementAuditRepository,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // AUDIT LOG CREATION
  // ============================================================================

  async logAction(
    settlementId: string | null,
    action: string,
    userId: string,
    oldValues: any,
    newValues: any,
    reason?: string,
    tx?: any
  ): Promise<SettlementAuditLog> {
    this.logger.log('SettlementAuditService.logAction', {
      settlementId,
      action,
      userId,
      reason,
    });

    const auditData = {
      settlementId,
      action,
      userId,
      oldValues: this.sanitizeValues(oldValues),
      newValues: this.sanitizeValues(newValues),
      reason,
      metadata: this.extractMetadata(action, oldValues, newValues),
    };

    const auditLog = await this.settlementAuditRepository.create(auditData, tx);

    this.logger.log('Settlement audit log created', {
      auditLogId: auditLog.id,
      settlementId,
      action,
      userId,
    });

    return auditLog;
  }

  async logSettlementCreation(
    settlementId: string,
    userId: string,
    settlementData: any,
    tx?: any
  ): Promise<SettlementAuditLog> {
    return this.logAction(
      settlementId,
      'CREATE',
      userId,
      null,
      settlementData,
      'Settlement created',
      tx
    );
  }

  async logSettlementStatusChange(
    settlementId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    reason?: string,
    tx?: any
  ): Promise<SettlementAuditLog> {
    return this.logAction(
      settlementId,
      'UPDATE_STATUS',
      userId,
      { status: oldStatus },
      { status: newStatus },
      reason || `Status changed from ${oldStatus} to ${newStatus}`,
      tx
    );
  }

  async logSettlementProcessing(
    settlementId: string,
    userId: string,
    processingData: any,
    tx?: any
  ): Promise<SettlementAuditLog> {
    return this.logAction(
      settlementId,
      'PROCESS',
      userId,
      null,
      processingData,
      'Settlement processed',
      tx
    );
  }

  async logSettlementFailure(
    settlementId: string,
    userId: string,
    errorData: any,
    tx?: any
  ): Promise<SettlementAuditLog> {
    return this.logAction(
      settlementId,
      'FAIL',
      userId,
      null,
      errorData,
      'Settlement failed',
      tx
    );
  }

  async logSellerAccountAction(
    userId: string,
    action: string,
    oldValues: any,
    newValues: any,
    reason?: string,
    tx?: any
  ): Promise<SettlementAuditLog> {
    return this.logAction(
      null,
      action,
      userId,
      oldValues,
      newValues,
      reason,
      tx
    );
  }

  // ============================================================================
  // AUDIT LOG RETRIEVAL
  // ============================================================================

  async findAuditLogs(
    filters: AuditLogFilters = {},
    options: AuditLogOptions = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    auditLogs: SettlementAuditLog[];
    total: number;
  }> {
    this.logger.log('SettlementAuditService.findAuditLogs', { filters, limit, offset });

    return this.settlementAuditRepository.findAll(filters, options, limit, offset);
  }

  async findBySettlementId(
    settlementId: string,
    options: AuditLogOptions = {},
    limit: number = 50
  ): Promise<SettlementAuditLog[]> {
    const result = await this.findAuditLogs(
      { settlementId },
      options,
      limit
    );

    return result.auditLogs;
  }

  async findByUserId(
    userId: string,
    options: AuditLogOptions = {},
    limit: number = 50
  ): Promise<SettlementAuditLog[]> {
    const result = await this.findAuditLogs(
      { userId },
      options,
      limit
    );

    return result.auditLogs;
  }

  async findByAction(
    action: string,
    options: AuditLogOptions = {},
    limit: number = 50
  ): Promise<SettlementAuditLog[]> {
    const result = await this.findAuditLogs(
      { action },
      options,
      limit
    );

    return result.auditLogs;
  }

  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options: AuditLogOptions = {},
    limit: number = 100
  ): Promise<SettlementAuditLog[]> {
    const result = await this.findAuditLogs(
      { fromDate, toDate },
      options,
      limit
    );

    return result.auditLogs;
  }

  // ============================================================================
  // AUDIT TRAIL ANALYSIS
  // ============================================================================

  async getSettlementAuditTrail(settlementId: string): Promise<{
    timeline: Array<{
      timestamp: Date;
      action: string;
      user: string;
      description: string;
      changes?: any;
    }>;
    summary: {
      totalActions: number;
      uniqueUsers: number;
      firstAction: Date;
      lastAction: Date;
      statusChanges: number;
    };
  }> {
    this.logger.log('SettlementAuditService.getSettlementAuditTrail', { settlementId });

    const auditLogs = await this.findBySettlementId(settlementId, { includeUser: true }, 1000);

    // Build timeline
    const timeline = auditLogs.map(log => ({
      timestamp: log.createdAt,
      action: log.action,
      user: log.user?.name || log.userId,
      description: this.formatActionDescription(log),
      changes: this.formatChanges(log.oldValues, log.newValues),
    }));

    // Calculate summary
    const uniqueUsers = new Set(auditLogs.map(log => log.userId)).size;
    const statusChanges = auditLogs.filter(log => log.action === 'UPDATE_STATUS').length;
    const timestamps = auditLogs.map(log => log.createdAt);

    const summary = {
      totalActions: auditLogs.length,
      uniqueUsers,
      firstAction: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
      lastAction: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date(),
      statusChanges,
    };

    return { timeline, summary };
  }

  async getUserActivitySummary(
    userId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    settlementsAffected: number;
    activityByDate: Record<string, number>;
  }> {
    this.logger.log('SettlementAuditService.getUserActivitySummary', { userId, fromDate, toDate });

    const filters: AuditLogFilters = { userId };
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const result = await this.findAuditLogs(filters, {}, 10000);
    const auditLogs = result.auditLogs;

    // Calculate action breakdown
    const actionBreakdown: Record<string, number> = {};
    const settlementsAffected = new Set<string>();
    const activityByDate: Record<string, number> = {};

    for (const log of auditLogs) {
      // Action breakdown
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;

      // Settlements affected
      if (log.settlementId) {
        settlementsAffected.add(log.settlementId);
      }

      // Activity by date
      const dateKey = log.createdAt.toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
    }

    return {
      totalActions: auditLogs.length,
      actionBreakdown,
      settlementsAffected: settlementsAffected.size,
      activityByDate,
    };
  }

  // ============================================================================
  // COMPLIANCE & REPORTING
  // ============================================================================

  async generateComplianceReport(
    fromDate: Date,
    toDate: Date
  ): Promise<{
    period: { from: Date; to: Date };
    statistics: {
      totalSettlements: number;
      totalActions: number;
      uniqueUsers: number;
      failedSettlements: number;
      processedSettlements: number;
    };
    actionBreakdown: Record<string, number>;
    userActivity: Array<{
      userId: string;
      userName: string;
      actionCount: number;
      settlementsAffected: number;
    }>;
    riskIndicators: Array<{
      type: string;
      description: string;
      count: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
  }> {
    this.logger.log('SettlementAuditService.generateComplianceReport', { fromDate, toDate });

    const result = await this.findAuditLogs({ fromDate, toDate }, { includeUser: true }, 50000);
    const auditLogs = result.auditLogs;

    // Calculate statistics
    const uniqueSettlements = new Set(auditLogs.filter(log => log.settlementId).map(log => log.settlementId!));
    const uniqueUsers = new Set(auditLogs.map(log => log.userId));
    const failedActions = auditLogs.filter(log => log.action === 'FAIL');
    const processedActions = auditLogs.filter(log => log.action === 'PROCESS');

    const statistics = {
      totalSettlements: uniqueSettlements.size,
      totalActions: auditLogs.length,
      uniqueUsers: uniqueUsers.size,
      failedSettlements: failedActions.length,
      processedSettlements: processedActions.length,
    };

    // Action breakdown
    const actionBreakdown: Record<string, number> = {};
    for (const log of auditLogs) {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    }

    // User activity
    const userActivityMap = new Map<string, { actionCount: number; settlementsAffected: Set<string> }>();
    for (const log of auditLogs) {
      if (!userActivityMap.has(log.userId)) {
        userActivityMap.set(log.userId, { actionCount: 0, settlementsAffected: new Set() });
      }
      const activity = userActivityMap.get(log.userId)!;
      activity.actionCount++;
      if (log.settlementId) {
        activity.settlementsAffected.add(log.settlementId);
      }
    }

    const userActivity = Array.from(userActivityMap.entries()).map(([userId, activity]) => {
      const user = auditLogs.find(log => log.userId === userId)?.user;
      return {
        userId,
        userName: user?.name || 'Unknown',
        actionCount: activity.actionCount,
        settlementsAffected: activity.settlementsAffected.size,
      };
    }).sort((a, b) => b.actionCount - a.actionCount);

    // Risk indicators
    const riskIndicators = this.calculateRiskIndicators(auditLogs);

    return {
      period: { from: fromDate, to: toDate },
      statistics,
      actionBreakdown,
      userActivity,
      riskIndicators,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private sanitizeValues(values: any): any {
    if (!values) return null;

    // Remove sensitive information
    const sanitized = { ...values };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'bankAccount'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private extractMetadata(action: string, oldValues: any, newValues: any): any {
    const metadata: any = {
      action,
      timestamp: new Date().toISOString(),
    };

    // Add action-specific metadata
    switch (action) {
      case 'UPDATE_STATUS':
        if (oldValues?.status && newValues?.status) {
          metadata.statusTransition = `${oldValues.status} -> ${newValues.status}`;
        }
        break;
      case 'PROCESS':
        if (newValues?.gatewaySettlementId) {
          metadata.gatewaySettlementId = newValues.gatewaySettlementId;
        }
        if (newValues?.netAmount) {
          metadata.amount = newValues.netAmount;
        }
        break;
      case 'FAIL':
        if (newValues?.failureReason) {
          metadata.failureReason = newValues.failureReason;
        }
        if (newValues?.failureCode) {
          metadata.failureCode = newValues.failureCode;
        }
        break;
    }

    return metadata;
  }

  private formatActionDescription(log: SettlementAuditLog): string {
    const actionDescriptions: Record<string, string> = {
      'CREATE': 'Settlement created',
      'UPDATE': 'Settlement updated',
      'UPDATE_STATUS': 'Status changed',
      'PROCESS': 'Settlement processed',
      'FAIL': 'Settlement failed',
      'RETRY': 'Settlement retried',
      'CREATE_SELLER_ACCOUNT': 'Seller account created',
      'UPDATE_SELLER_ACCOUNT': 'Seller account updated',
      'UPDATE_SELLER_ACCOUNT_STATUS': 'Seller account status changed',
    };

    let description = actionDescriptions[log.action] || log.action;

    // Add specific details based on action
    if (log.action === 'UPDATE_STATUS' && log.newValues?.status) {
      description += ` to ${log.newValues.status}`;
    }

    if (log.reason) {
      description += ` - ${log.reason}`;
    }

    return description;
  }

  private formatChanges(oldValues: any, newValues: any): any {
    if (!oldValues && !newValues) return null;

    const changes: any = {};

    if (oldValues && newValues) {
      // Find changed fields
      const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
      for (const key of allKeys) {
        if (oldValues[key] !== newValues[key]) {
          changes[key] = {
            from: oldValues[key],
            to: newValues[key],
          };
        }
      }
    } else if (newValues) {
      // New record
      changes.created = newValues;
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private calculateRiskIndicators(auditLogs: SettlementAuditLog[]): Array<{
    type: string;
    description: string;
    count: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const indicators: Array<{
      type: string;
      description: string;
      count: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = [];

    // High failure rate
    const failedActions = auditLogs.filter(log => log.action === 'FAIL');
    const totalProcessingActions = auditLogs.filter(log => log.action === 'PROCESS' || log.action === 'FAIL');
    if (totalProcessingActions.length > 0) {
      const failureRate = failedActions.length / totalProcessingActions.length;
      if (failureRate > 0.1) { // More than 10% failure rate
        indicators.push({
          type: 'HIGH_FAILURE_RATE',
          description: `High settlement failure rate: ${(failureRate * 100).toFixed(1)}%`,
          count: failedActions.length,
          severity: failureRate > 0.2 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Frequent status changes
    const statusChanges = auditLogs.filter(log => log.action === 'UPDATE_STATUS');
    const settlementsWithStatusChanges = new Set(statusChanges.map(log => log.settlementId));
    if (settlementsWithStatusChanges.size > 0) {
      const avgStatusChanges = statusChanges.length / settlementsWithStatusChanges.size;
      if (avgStatusChanges > 3) {
        indicators.push({
          type: 'FREQUENT_STATUS_CHANGES',
          description: `High average status changes per settlement: ${avgStatusChanges.toFixed(1)}`,
          count: statusChanges.length,
          severity: avgStatusChanges > 5 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Manual interventions
    const manualActions = auditLogs.filter(log => 
      log.action === 'UPDATE' || log.action === 'RETRY' || log.action.includes('MANUAL')
    );
    if (manualActions.length > 10) {
      indicators.push({
        type: 'HIGH_MANUAL_INTERVENTION',
        description: `High number of manual interventions`,
        count: manualActions.length,
        severity: manualActions.length > 50 ? 'HIGH' : 'MEDIUM',
      });
    }

    return indicators;
  }
}