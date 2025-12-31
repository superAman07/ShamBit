import {
  Refund,
  RefundItem,
  RefundLedgerEntry,
  RefundAuditLog,
} from '../entities/refund.entity';
import {
  RefundStatus,
  RefundType,
  RefundCategory,
  RefundReason,
} from '../enums/refund-status.enum';

export interface RefundFilters {
  orderId?: string;
  customerId?: string;
  sellerId?: string;
  status?: RefundStatus;
  statuses?: RefundStatus[];
  refundType?: RefundType;
  refundCategory?: RefundCategory;
  reason?: RefundReason;
  gatewayRefundId?: string;
  refundNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  processedAfter?: Date;
  processedBefore?: Date;
  search?: string;
  tags?: string[];
  createdBy?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RefundIncludeOptions {
  includeOrder?: boolean;
  includeItems?: boolean;
  includeLedger?: boolean;
  includeAuditLogs?: boolean;
  includeWebhooks?: boolean;
  includeJobs?: boolean;
}

export interface CreateRefundData {
  refundId: string;
  refundNumber: string;
  orderId: string;
  paymentIntentId?: string;
  paymentTransactionId?: string;
  refundType: RefundType;
  refundCategory: RefundCategory;
  requestedAmount: number;
  approvedAmount: number;
  currency: string;
  reason: RefundReason;
  reasonCode?: string;
  description?: string;
  customerNotes?: string;
  merchantNotes?: string;
  status: RefundStatus;
  requiresApproval: boolean;
  gatewayProvider: string;
  idempotencyKey: string;
  eligibilityChecked: boolean;
  eligibilityResult?: any;
  restockRequired: boolean;
  refundFees: number;
  adjustmentAmount: number;
  metadata: any;
  tags: string[];
  createdBy: string;
}

export interface UpdateRefundData {
  status?: RefundStatus;
  approvedAmount?: number;
  processedAmount?: number;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  gatewayRefundId?: string;
  gatewayResponse?: any;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  failureReason?: string;
  retryCount?: number;
  nextRetryAt?: Date;
  restockCompleted?: boolean;
  restockJobId?: string;
  metadata?: any;
  tags?: string[];
  updatedBy?: string;
}

export interface CreateRefundItemData {
  refundId: string;
  orderItemId: string;
  variantId: string;
  productId: string;
  sellerId: string;
  sku: string;
  productName: string;
  variantName?: string;
  requestedQuantity: number;
  approvedQuantity: number;
  unitPrice: number;
  totalAmount: number;
  reason?: string;
  reasonCode?: string;
  condition?: string;
  restockQuantity: number;
  restockStatus: string;
  itemSnapshot: any;
}

export interface UpdateRefundItemData {
  approvedQuantity?: number;
  reason?: string;
  reasonCode?: string;
  condition?: string;
  restockQuantity?: number;
  restockStatus?: string;
}

export interface CreateRefundLedgerEntryData {
  refundId: string;
  entryType: string;
  amount: number;
  currency: string;
  accountType: string;
  accountId?: string;
  description: string;
  reference?: string;
  runningBalance?: number;
  metadata: any;
  createdBy: string;
}

export interface RefundStatistics {
  totalRefunds: number;
  totalRefundAmount: number;
  refundsByStatus: Record<RefundStatus, number>;
  refundsByType: Record<RefundType, number>;
  refundsByReason: Record<RefundReason, number>;
  avgProcessingTime: number;
  avgApprovalTime: number;
  refundRate: number;
}

export interface RefundRepository {
  // Basic CRUD operations
  findAll(
    filters?: RefundFilters,
    pagination?: PaginationOptions,
    includes?: RefundIncludeOptions,
  ): Promise<{ refunds: Refund[]; total: number; hasMore: boolean }>;

  findById(id: string, includes?: RefundIncludeOptions): Promise<Refund | null>;

  findByRefundNumber(
    refundNumber: string,
    includes?: RefundIncludeOptions,
  ): Promise<Refund | null>;

  findByIdempotencyKey(idempotencyKey: string): Promise<Refund | null>;

  findByOrderId(orderId: string, filters?: RefundFilters): Promise<Refund[]>;

  findByGatewayRefundId(gatewayRefundId: string): Promise<Refund | null>;

  create(data: CreateRefundData, tx?: any): Promise<Refund>;

  update(id: string, data: UpdateRefundData, tx?: any): Promise<Refund>;

  updateStatus(
    id: string,
    status: RefundStatus,
    updatedBy: string,
    tx?: any,
  ): Promise<Refund>;

  delete(id: string, deletedBy: string, tx?: any): Promise<void>;

  // Refund items
  createItem(data: CreateRefundItemData, tx?: any): Promise<RefundItem>;

  updateItem(
    id: string,
    data: UpdateRefundItemData,
    tx?: any,
  ): Promise<RefundItem>;

  findItemsByRefundId(refundId: string): Promise<RefundItem[]>;

  // Ledger entries
  createLedgerEntry(
    data: CreateRefundLedgerEntryData,
    tx?: any,
  ): Promise<RefundLedgerEntry>;

  findLedgerEntriesByRefundId(refundId: string): Promise<RefundLedgerEntry[]>;

  // Audit logs
  findAuditLogsByRefundId(refundId: string): Promise<RefundAuditLog[]>;

  // Specialized queries
  findReadyForProcessing(limit?: number): Promise<Refund[]>;

  findRetryableRefunds(limit?: number): Promise<Refund[]>;

  findExpiredPendingRefunds(expiryHours?: number): Promise<Refund[]>;

  findRefundsByCustomer(
    customerId: string,
    filters?: RefundFilters,
    pagination?: PaginationOptions,
  ): Promise<{ refunds: Refund[]; total: number }>;

  findRefundsBySeller(
    sellerId: string,
    filters?: RefundFilters,
    pagination?: PaginationOptions,
  ): Promise<{ refunds: Refund[]; total: number }>;

  // Statistics and analytics
  getRefundStatistics(
    filters?: RefundFilters,
    groupBy?: 'day' | 'week' | 'month' | 'year',
  ): Promise<RefundStatistics>;

  getRefundCountForYear(year: number): Promise<number>;

  getRefundAmountByPeriod(
    startDate: Date,
    endDate: Date,
    groupBy?: 'day' | 'week' | 'month',
  ): Promise<Array<{ period: string; amount: number; count: number }>>;

  // Bulk operations
  bulkUpdateStatus(
    refundIds: string[],
    status: RefundStatus,
    updatedBy: string,
    tx?: any,
  ): Promise<number>;

  bulkDelete(refundIds: string[], deletedBy: string, tx?: any): Promise<number>;

  // Search and filtering
  searchRefunds(
    query: string,
    filters?: RefundFilters,
    pagination?: PaginationOptions,
  ): Promise<{ refunds: Refund[]; total: number }>;

  // Concurrency and locking
  findByIdWithLock(id: string, tx?: any): Promise<Refund | null>;

  // Health checks
  checkDatabaseHealth(): Promise<boolean>;
}
