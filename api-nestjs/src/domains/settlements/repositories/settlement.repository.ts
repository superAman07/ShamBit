import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Settlement } from '../entities/settlement.entity';
import {
  ISettlementRepository,
  SettlementFilters,
  PaginationOptions,
  SortOptions,
  SettlementIncludeOptions,
  PaginatedResult,
} from '../interfaces/settlement-repository.interface';

@Injectable()
export class SettlementRepository implements ISettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async create(data: Partial<Settlement>): Promise<Settlement> {
    const settlement = await (this.prisma as any).settlement.create({
      data: {
        settlementId: data.settlementId!,
        sellerId: data.sellerId!,
        sellerAccountId: data.sellerAccountId!,
        periodStart: data.periodStart!,
        periodEnd: data.periodEnd!,
        grossAmount: data.grossAmount!,
        commissionAmount: data.commissionAmount!,
        platformFeeAmount: data.platformFeeAmount || 0,
        taxAmount: data.taxAmount || 0,
        adjustmentAmount: data.adjustmentAmount || 0,
        netAmount: data.netAmount!,
        currency: data.currency || 'INR',
        status: data.status!,
        settlementDate: data.settlementDate,
        scheduledDate: data.scheduledDate,
        processedAt: data.processedAt,
        completedAt: data.completedAt,
        failedAt: data.failedAt,
        razorpayPayoutId: data.razorpayPayoutId,
        razorpayTransferId: data.razorpayTransferId,
        gatewayResponse: data.gatewayResponse,
        failureReason: data.failureReason,
        failureCode: data.failureCode,
        retryCount: data.retryCount || 0,
        maxRetries: data.maxRetries || 3,
        nextRetryAt: data.nextRetryAt,
        isReconciled: data.isReconciled || false,
        reconciledAt: data.reconciledAt,
        reconciledBy: data.reconciledBy,
        version: data.version || 1,
        lockedAt: data.lockedAt,
        lockedBy: data.lockedBy,
        metadata: data.metadata || {},
        notes: data.notes,
        createdBy: data.createdBy!,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(settlement);
  }

  async findById(
    id: string,
    includes?: SettlementIncludeOptions,
  ): Promise<Settlement | null> {
    const settlement = await (this.prisma as any).settlement.findUnique({
      where: { id },
      include: this.buildInclude(includes),
    });

    return settlement ? this.mapToEntity(settlement) : null;
  }

  async findBySettlementId(
    settlementId: string,
    includes?: SettlementIncludeOptions,
  ): Promise<Settlement | null> {
    const settlement = await (this.prisma as any).settlement.findUnique({
      where: { settlementId },
      include: this.buildInclude(includes),
    });

    return settlement ? this.mapToEntity(settlement) : null;
  }

  async update(id: string, data: Partial<Settlement>): Promise<Settlement> {
    const settlement = await (this.prisma as any).settlement.update({
      where: { id },
      data: {
        status: data.status,
        settlementDate: data.settlementDate,
        scheduledDate: data.scheduledDate,
        processedAt: data.processedAt,
        completedAt: data.completedAt,
        failedAt: data.failedAt,
        razorpayPayoutId: data.razorpayPayoutId,
        razorpayTransferId: data.razorpayTransferId,
        gatewayResponse: data.gatewayResponse,
        failureReason: data.failureReason,
        failureCode: data.failureCode,
        retryCount: data.retryCount,
        nextRetryAt: data.nextRetryAt,
        isReconciled: data.isReconciled,
        reconciledAt: data.reconciledAt,
        reconciledBy: data.reconciledBy,
        version: data.version,
        lockedAt: data.lockedAt,
        lockedBy: data.lockedBy,
        metadata: data.metadata,
        notes: data.notes,
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(settlement);
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).settlement.delete({
      where: { id },
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async findAll(
    filters?: SettlementFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: SettlementIncludeOptions,
  ): Promise<PaginatedResult<Settlement>> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sort);
    const { skip, take } = this.buildPagination(pagination);

    const [settlements, total] = await Promise.all([
      (this.prisma as any).settlement.findMany({
        where,
        orderBy,
        skip,
        take,
        include: this.buildInclude(includes),
      }),
      (this.prisma as any).settlement.count({ where }),
    ]);

    const mappedSettlements = settlements.map((s) => this.mapToEntity(s));

    return this.buildPaginatedResult(mappedSettlements, total, pagination);
  }

  async findBySellerId(
    sellerId: string,
    filters?: Omit<SettlementFilters, 'sellerId'>,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions,
  ): Promise<PaginatedResult<Settlement>> {
    return this.findAll(
      { ...filters, sellerId },
      pagination,
      undefined,
      includes,
    );
  }

  async findByStatus(
    status: string | string[],
    filters?: Omit<SettlementFilters, 'status'>,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions,
  ): Promise<PaginatedResult<Settlement>> {
    return this.findAll(
      { ...filters, status },
      pagination,
      undefined,
      includes,
    );
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: SettlementFilters,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions,
  ): Promise<PaginatedResult<Settlement>> {
    return this.findAll(
      { ...filters, periodStart: startDate, periodEnd: endDate },
      pagination,
      undefined,
      includes,
    );
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  async findPendingSettlements(
    sellerId?: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Settlement>> {
    const filters: SettlementFilters = {
      status: 'PENDING',
    };

    if (sellerId) {
      filters.sellerId = sellerId;
    }

    return this.findAll(filters, pagination);
  }

  async findRetryableSettlements(
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Settlement>> {
    const where = {
      status: 'FAILED',
      retryCount: {
        lt: (this.prisma as any).settlement.fields.maxRetries,
      },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    };

    const [settlements, total] = await Promise.all([
      (this.prisma as any).settlement.findMany({
        where,
        orderBy: { nextRetryAt: 'asc' },
        ...this.buildPagination(pagination),
      }),
      (this.prisma as any).settlement.count({ where }),
    ]);

    const mappedSettlements = settlements.map((s) => this.mapToEntity(s));

    return this.buildPaginatedResult(mappedSettlements, total, pagination);
  }

  async findUnreconciledSettlements(
    dateFrom?: Date,
    dateTo?: Date,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Settlement>> {
    const filters: SettlementFilters = {
      status: 'COMPLETED',
      isReconciled: false,
    };

    if (dateFrom) {
      filters.settlementDateFrom = dateFrom;
    }

    if (dateTo) {
      filters.settlementDateTo = dateTo;
    }

    return this.findAll(filters, pagination);
  }

  // ============================================================================
  // LOCKING METHODS
  // ============================================================================

  async lockForProcessing(id: string, userId: string): Promise<Settlement> {
    try {
      const settlement = await (this.prisma as any).settlement.update({
        where: {
          id,
          OR: [
            { lockedAt: null },
            { lockedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } }, // 30 minutes ago
          ],
        },
        data: {
          lockedAt: new Date(),
          lockedBy: userId,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return this.mapToEntity(settlement);
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found
        throw new ConflictException(
          'Settlement is already locked or not found',
        );
      }
      throw error;
    }
  }

  async unlock(id: string): Promise<Settlement> {
    const settlement = await (this.prisma as any).settlement.update({
      where: { id },
      data: {
        lockedAt: null,
        lockedBy: null,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(settlement);
  }

  async findLockedSettlements(): Promise<Settlement[]> {
    const settlements = await (this.prisma as any).settlement.findMany({
      where: {
        lockedAt: { not: null },
        lockedBy: { not: null },
      },
      orderBy: { lockedAt: 'asc' },
    });

    return settlements.map((s) => this.mapToEntity(s));
  }

  // ============================================================================
  // AGGREGATION METHODS
  // ============================================================================

  async getSettlementSummary(
    sellerId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalSettlements: number;
    totalAmount: number;
    completedSettlements: number;
    completedAmount: number;
    pendingSettlements: number;
    pendingAmount: number;
    failedSettlements: number;
    failedAmount: number;
  }> {
    const where: any = {};

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const summary = await (this.prisma as any).settlement.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { netAmount: true },
    });

    let totalSettlements = 0;
    let totalAmount = 0;
    let completedSettlements = 0;
    let completedAmount = 0;
    let pendingSettlements = 0;
    let pendingAmount = 0;
    let failedSettlements = 0;
    let failedAmount = 0;

    for (const group of summary) {
      const count = group._count.id;
      const amount = parseFloat(group._sum.netAmount?.toString() || '0');

      totalSettlements += count;
      totalAmount += amount;

      switch (group.status) {
        case 'COMPLETED':
          completedSettlements += count;
          completedAmount += amount;
          break;
        case 'PENDING':
        case 'PROCESSING':
          pendingSettlements += count;
          pendingAmount += amount;
          break;
        case 'FAILED':
        case 'CANCELLED':
          failedSettlements += count;
          failedAmount += amount;
          break;
      }
    }

    return {
      totalSettlements,
      totalAmount,
      completedSettlements,
      completedAmount,
      pendingSettlements,
      pendingAmount,
      failedSettlements,
      failedAmount,
    };
  }

  // ============================================================================
  // CONCURRENCY CONTROL
  // ============================================================================

  async updateWithVersion(
    id: string,
    data: Partial<Settlement>,
    expectedVersion: number,
  ): Promise<Settlement> {
    try {
      const settlement = await (this.prisma as any).settlement.update({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          ...data,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return this.mapToEntity(settlement);
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found
        throw new ConflictException('Settlement version mismatch or not found');
      }
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildWhereClause(filters?: SettlementFilters): any {
    if (!filters) return {};

    const where: any = {};

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.sellerAccountId) {
      where.sellerAccountId = filters.sellerAccountId;
    }

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.periodStart || filters.periodEnd) {
      where.periodStart = {};
      if (filters.periodStart) where.periodStart.gte = filters.periodStart;
      if (filters.periodEnd) where.periodStart.lte = filters.periodEnd;
    }

    if (filters.settlementDateFrom || filters.settlementDateTo) {
      where.settlementDate = {};
      if (filters.settlementDateFrom)
        where.settlementDate.gte = filters.settlementDateFrom;
      if (filters.settlementDateTo)
        where.settlementDate.lte = filters.settlementDateTo;
    }

    if (
      filters.netAmountMin !== undefined ||
      filters.netAmountMax !== undefined
    ) {
      where.netAmount = {};
      if (filters.netAmountMin !== undefined)
        where.netAmount.gte = filters.netAmountMin;
      if (filters.netAmountMax !== undefined)
        where.netAmount.lte = filters.netAmountMax;
    }

    if (filters.isReconciled !== undefined) {
      where.isReconciled = filters.isReconciled;
    }

    if (filters.razorpayPayoutId) {
      where.razorpayPayoutId = filters.razorpayPayoutId;
    }

    if (filters.razorpayTransferId) {
      where.razorpayTransferId = filters.razorpayTransferId;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.metadata = {
        path: ['tags'],
        array_contains: filters.tags,
      };
    }

    return where;
  }

  private buildOrderBy(sort?: SortOptions[]): any {
    if (!sort || sort.length === 0) {
      return { createdAt: 'desc' };
    }

    return sort.map((s) => ({ [s.field]: s.direction.toLowerCase() }));
  }

  private buildPagination(pagination?: PaginationOptions): {
    skip?: number;
    take?: number;
  } {
    if (!pagination) return {};

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;

    return {
      skip: pagination.offset || (page - 1) * limit,
      take: limit,
    };
  }

  private buildInclude(includes?: SettlementIncludeOptions): any {
    if (!includes) return {};

    const include: any = {};

    if (includes.transactions) {
      include.transactions = true;
    }

    if (includes.auditLogs) {
      include.auditLogs = {
        orderBy: { createdAt: 'desc' },
        take: 10, // Limit audit logs to prevent large payloads
      };
    }

    if (includes.seller) {
      include.seller = {
        select: {
          id: true,
          name: true,
          email: true,
        },
      };
    }

    if (includes.sellerAccount) {
      include.sellerAccount = true;
    }

    return include;
  }

  private buildPaginatedResult<T>(
    data: T[],
    total: number,
    pagination?: PaginationOptions,
  ): PaginatedResult<T> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private mapToEntity(settlement: any): Settlement {
    return new Settlement({
      id: settlement.id,
      settlementId: settlement.settlementId,
      sellerId: settlement.sellerId,
      sellerAccountId: settlement.sellerAccountId,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      grossAmount: parseFloat(settlement.grossAmount.toString()),
      commissionAmount: parseFloat(settlement.commissionAmount.toString()),
      platformFeeAmount: parseFloat(settlement.platformFeeAmount.toString()),
      taxAmount: parseFloat(settlement.taxAmount.toString()),
      adjustmentAmount: parseFloat(settlement.adjustmentAmount.toString()),
      netAmount: parseFloat(settlement.netAmount.toString()),
      currency: settlement.currency,
      status: settlement.status,
      settlementDate: settlement.settlementDate,
      scheduledDate: settlement.scheduledDate,
      processedAt: settlement.processedAt,
      completedAt: settlement.completedAt,
      failedAt: settlement.failedAt,
      razorpayPayoutId: settlement.razorpayPayoutId,
      razorpayTransferId: settlement.razorpayTransferId,
      gatewayResponse: settlement.gatewayResponse,
      failureReason: settlement.failureReason,
      failureCode: settlement.failureCode,
      retryCount: settlement.retryCount,
      maxRetries: settlement.maxRetries,
      nextRetryAt: settlement.nextRetryAt,
      isReconciled: settlement.isReconciled,
      reconciledAt: settlement.reconciledAt,
      reconciledBy: settlement.reconciledBy,
      version: settlement.version,
      lockedAt: settlement.lockedAt,
      lockedBy: settlement.lockedBy,
      metadata: settlement.metadata,
      notes: settlement.notes,
      createdBy: settlement.createdBy,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
      transactions: settlement.transactions,
      auditLogs: settlement.auditLogs,
    });
  }
}
