import { Settlement } from '../entities/settlement.entity';
import { SellerAccount } from '../entities/seller-account.entity';
import { SellerWallet, SellerWalletTransaction } from '../entities/seller-wallet.entity';

// ============================================================================
// FILTER INTERFACES
// ============================================================================

export interface SettlementFilters {
  sellerId?: string;
  sellerAccountId?: string;
  status?: string | string[];
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
  settlementDateFrom?: Date;
  settlementDateTo?: Date;
  netAmountMin?: number;
  netAmountMax?: number;
  isReconciled?: boolean;
  razorpayPayoutId?: string;
  razorpayTransferId?: string;
  createdBy?: string;
  tags?: string[];
}

export interface SellerAccountFilters {
  sellerId?: string;
  status?: string | string[];
  kycStatus?: string | string[];
  isVerified?: boolean;
  bankName?: string;
  accountType?: string;
  hasRazorpayIntegration?: boolean;
  businessType?: string;
}

export interface WalletFilters {
  sellerId?: string;
  currency?: string;
  minBalance?: number;
  maxBalance?: number;
  hasTransactions?: boolean;
  lastSettlementFrom?: Date;
  lastSettlementTo?: Date;
}

export interface WalletTransactionFilters {
  walletId?: string;
  sellerId?: string;
  type?: string | string[];
  category?: string | string[];
  referenceType?: string;
  referenceId?: string;
  orderId?: string;
  paymentId?: string;
  settlementId?: string;
  amountMin?: number;
  amountMax?: number;
  processedFrom?: Date;
  processedTo?: Date;
}

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// INCLUDE OPTIONS
// ============================================================================

export interface SettlementIncludeOptions {
  transactions?: boolean;
  auditLogs?: boolean;
  seller?: boolean;
  sellerAccount?: boolean;
}

export interface SellerAccountIncludeOptions {
  settlements?: boolean;
  wallet?: boolean;
  schedules?: boolean;
}

export interface WalletIncludeOptions {
  transactions?: boolean;
  seller?: boolean;
  sellerAccount?: boolean;
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ISettlementRepository {
  // Basic CRUD
  create(data: Partial<Settlement>): Promise<Settlement>;
  findById(id: string, includes?: SettlementIncludeOptions): Promise<Settlement | null>;
  findBySettlementId(settlementId: string, includes?: SettlementIncludeOptions): Promise<Settlement | null>;
  update(id: string, data: Partial<Settlement>): Promise<Settlement>;
  delete(id: string): Promise<void>;

  // Query methods
  findAll(
    filters?: SettlementFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: SettlementIncludeOptions
  ): Promise<PaginatedResult<Settlement>>;

  findBySellerId(
    sellerId: string,
    filters?: Omit<SettlementFilters, 'sellerId'>,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions
  ): Promise<PaginatedResult<Settlement>>;

  findByStatus(
    status: string | string[],
    filters?: Omit<SettlementFilters, 'status'>,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions
  ): Promise<PaginatedResult<Settlement>>;

  findByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: SettlementFilters,
    pagination?: PaginationOptions,
    includes?: SettlementIncludeOptions
  ): Promise<PaginatedResult<Settlement>>;

  // Business logic methods
  findPendingSettlements(
    sellerId?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Settlement>>;

  findRetryableSettlements(
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Settlement>>;

  findUnreconciledSettlements(
    dateFrom?: Date,
    dateTo?: Date,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Settlement>>;

  // Locking methods
  lockForProcessing(id: string, userId: string): Promise<Settlement>;
  unlock(id: string): Promise<Settlement>;
  findLockedSettlements(): Promise<Settlement[]>;

  // Aggregation methods
  getSettlementSummary(
    sellerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalSettlements: number;
    totalAmount: number;
    completedSettlements: number;
    completedAmount: number;
    pendingSettlements: number;
    pendingAmount: number;
    failedSettlements: number;
    failedAmount: number;
  }>;

  // Concurrency control
  updateWithVersion(id: string, data: Partial<Settlement>, expectedVersion: number): Promise<Settlement>;
}

export interface ISellerAccountRepository {
  // Basic CRUD
  create(data: Partial<SellerAccount>): Promise<SellerAccount>;
  findById(id: string, includes?: SellerAccountIncludeOptions): Promise<SellerAccount | null>;
  findBySellerId(sellerId: string, includes?: SellerAccountIncludeOptions): Promise<SellerAccount | null>;
  update(id: string, data: Partial<SellerAccount>): Promise<SellerAccount>;
  delete(id: string): Promise<void>;

  // Query methods
  findAll(
    filters?: SellerAccountFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>>;

  findByStatus(
    status: string | string[],
    pagination?: PaginationOptions,
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>>;

  findByKycStatus(
    kycStatus: string | string[],
    pagination?: PaginationOptions,
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>>;

  // Business logic methods
  findVerifiedAccounts(
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerAccount>>;

  findAccountsRequiringKyc(
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerAccount>>;

  findByRazorpayAccountId(razorpayAccountId: string): Promise<SellerAccount | null>;
}

export interface ISellerWalletRepository {
  // Basic CRUD
  create(data: Partial<SellerWallet>): Promise<SellerWallet>;
  findById(id: string, includes?: WalletIncludeOptions): Promise<SellerWallet | null>;
  findBySellerId(sellerId: string, includes?: WalletIncludeOptions): Promise<SellerWallet | null>;
  update(id: string, data: Partial<SellerWallet>): Promise<SellerWallet>;
  delete(id: string): Promise<void>;

  // Query methods
  findAll(
    filters?: WalletFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: WalletIncludeOptions
  ): Promise<PaginatedResult<SellerWallet>>;

  // Business logic methods
  findWalletsWithBalance(
    minBalance?: number,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerWallet>>;

  findWalletsForSettlement(
    minAmount?: number,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerWallet>>;

  // Balance operations (atomic)
  creditBalance(
    walletId: string,
    amount: number,
    category: string,
    transactionData: Partial<SellerWalletTransaction>
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }>;

  debitBalance(
    walletId: string,
    amount: number,
    category: string,
    transactionData: Partial<SellerWalletTransaction>
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }>;

  reserveBalance(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }>;

  releaseReserve(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }>;

  movePendingToAvailable(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }>;
}

export interface IWalletTransactionRepository {
  // Basic CRUD
  create(data: Partial<SellerWalletTransaction>): Promise<SellerWalletTransaction>;
  findById(id: string): Promise<SellerWalletTransaction | null>;
  findByTransactionId(transactionId: string): Promise<SellerWalletTransaction | null>;
  update(id: string, data: Partial<SellerWalletTransaction>): Promise<SellerWalletTransaction>;
  delete(id: string): Promise<void>;

  // Query methods
  findAll(
    filters?: WalletTransactionFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[]
  ): Promise<PaginatedResult<SellerWalletTransaction>>;

  findByWalletId(
    walletId: string,
    filters?: Omit<WalletTransactionFilters, 'walletId'>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerWalletTransaction>>;

  findBySellerId(
    sellerId: string,
    filters?: Omit<WalletTransactionFilters, 'sellerId'>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerWalletTransaction>>;

  findByReference(
    referenceType: string,
    referenceId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerWalletTransaction>>;

  // Aggregation methods
  getTransactionSummary(
    walletId?: string,
    sellerId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    netAmount: number;
    creditCount: number;
    debitCount: number;
  }>;
}

// ============================================================================
// BATCH PROCESSING INTERFACES
// ============================================================================

export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

// ============================================================================
// TRANSACTION INTERFACES
// ============================================================================

export interface TransactionContext {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
}

export interface ITransactionManager {
  executeInTransaction<T>(
    operation: (tx: any) => Promise<T>,
    context?: TransactionContext
  ): Promise<T>;
}