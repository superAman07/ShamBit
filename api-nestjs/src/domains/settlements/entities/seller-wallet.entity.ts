import {
  WalletTransactionType,
  WalletTransactionCategory,
} from '../enums/settlement-status.enum';

export interface WalletBalanceSnapshot {
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
  totalBalance: number;
}

export interface WalletMetadata {
  tags?: string[];
  customFields?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export class SellerWallet {
  id: string;
  sellerId: string;

  // Balance Information
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
  totalBalance: number;
  currency: string;

  // Last Settlement
  lastSettlementAt?: Date;
  lastSettlementAmount?: number;

  // Metadata
  metadata: WalletMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  transactions?: SellerWalletTransaction[];

  constructor(data: Partial<SellerWallet>) {
    Object.assign(this, data);
    this.metadata = this.metadata || {};
    this.availableBalance = this.availableBalance || 0;
    this.pendingBalance = this.pendingBalance || 0;
    this.reservedBalance = this.reservedBalance || 0;
    this.totalBalance = this.totalBalance || 0;
    this.currency = this.currency || 'INR';
  }

  // ============================================================================
  // BALANCE MANAGEMENT
  // ============================================================================

  getBalanceSnapshot(): WalletBalanceSnapshot {
    return {
      availableBalance: this.availableBalance,
      pendingBalance: this.pendingBalance,
      reservedBalance: this.reservedBalance,
      totalBalance: this.totalBalance,
    };
  }

  updateTotalBalance(): void {
    this.totalBalance =
      this.availableBalance + this.pendingBalance + this.reservedBalance;
    this.updatedAt = new Date();
  }

  validateBalances(): void {
    const calculatedTotal =
      this.availableBalance + this.pendingBalance + this.reservedBalance;

    if (Math.abs(calculatedTotal - this.totalBalance) > 0.01) {
      throw new Error(
        `Total balance mismatch: calculated ${calculatedTotal}, stored ${this.totalBalance}`,
      );
    }

    if (this.availableBalance < 0) {
      throw new Error('Available balance cannot be negative');
    }

    if (this.pendingBalance < 0) {
      throw new Error('Pending balance cannot be negative');
    }

    if (this.reservedBalance < 0) {
      throw new Error('Reserved balance cannot be negative');
    }
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  canDebit(amount: number): boolean {
    return this.availableBalance >= amount;
  }

  credit(
    amount: number,
    category: WalletTransactionCategory,
  ): WalletBalanceSnapshot {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    const balanceBefore = this.getBalanceSnapshot();

    // Add to appropriate balance based on category
    switch (category) {
      case WalletTransactionCategory.SALE:
        this.pendingBalance += amount;
        break;
      case WalletTransactionCategory.SETTLEMENT:
        // Settlement moves from pending to available
        this.pendingBalance -= amount;
        this.availableBalance += amount;
        break;
      default:
        this.availableBalance += amount;
        break;
    }

    this.updateTotalBalance();
    this.validateBalances();

    return balanceBefore;
  }

  debit(
    amount: number,
    category: WalletTransactionCategory,
  ): WalletBalanceSnapshot {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }

    const balanceBefore = this.getBalanceSnapshot();

    // Deduct from appropriate balance based on category
    switch (category) {
      case WalletTransactionCategory.SETTLEMENT:
        if (!this.canDebit(amount)) {
          throw new Error('Insufficient available balance for settlement');
        }
        this.availableBalance -= amount;
        break;
      case WalletTransactionCategory.REFUND:
        // Refunds can come from pending balance
        if (this.pendingBalance >= amount) {
          this.pendingBalance -= amount;
        } else if (this.availableBalance >= amount) {
          this.availableBalance -= amount;
        } else {
          throw new Error('Insufficient balance for refund');
        }
        break;
      default:
        if (!this.canDebit(amount)) {
          throw new Error('Insufficient available balance');
        }
        this.availableBalance -= amount;
        break;
    }

    this.updateTotalBalance();
    this.validateBalances();

    return balanceBefore;
  }

  reserve(amount: number): WalletBalanceSnapshot {
    if (amount <= 0) {
      throw new Error('Reserve amount must be positive');
    }

    if (!this.canDebit(amount)) {
      throw new Error('Insufficient available balance to reserve');
    }

    const balanceBefore = this.getBalanceSnapshot();

    this.availableBalance -= amount;
    this.reservedBalance += amount;

    this.updateTotalBalance();
    this.validateBalances();

    return balanceBefore;
  }

  releaseReserve(amount: number): WalletBalanceSnapshot {
    if (amount <= 0) {
      throw new Error('Release amount must be positive');
    }

    if (this.reservedBalance < amount) {
      throw new Error('Insufficient reserved balance to release');
    }

    const balanceBefore = this.getBalanceSnapshot();

    this.reservedBalance -= amount;
    this.availableBalance += amount;

    this.updateTotalBalance();
    this.validateBalances();

    return balanceBefore;
  }

  // ============================================================================
  // SETTLEMENT OPERATIONS
  // ============================================================================

  getSettlableAmount(): number {
    return this.availableBalance;
  }

  canSettle(amount: number): boolean {
    return this.getSettlableAmount() >= amount;
  }

  recordSettlement(amount: number): void {
    if (!this.canSettle(amount)) {
      throw new Error('Insufficient settlable amount');
    }

    this.lastSettlementAt = new Date();
    this.lastSettlementAmount = amount;
    this.updatedAt = new Date();
  }

  // ============================================================================
  // BALANCE MOVEMENTS
  // ============================================================================

  movePendingToAvailable(amount: number): WalletBalanceSnapshot {
    if (amount <= 0) {
      throw new Error('Move amount must be positive');
    }

    if (this.pendingBalance < amount) {
      throw new Error('Insufficient pending balance to move');
    }

    const balanceBefore = this.getBalanceSnapshot();

    this.pendingBalance -= amount;
    this.availableBalance += amount;

    this.updateTotalBalance();
    this.validateBalances();

    return balanceBefore;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate(): void {
    if (!this.sellerId) {
      throw new Error('Seller ID is required');
    }

    if (!this.currency) {
      throw new Error('Currency is required');
    }

    this.validateBalances();
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  toJSON(): any {
    return {
      id: this.id,
      sellerId: this.sellerId,
      balances: this.getBalanceSnapshot(),
      currency: this.currency,
      lastSettlement: {
        at: this.lastSettlementAt,
        amount: this.lastSettlementAmount,
      },
      settlableAmount: this.getSettlableAmount(),
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ============================================================================
// WALLET TRANSACTION ENTITY
// ============================================================================

export interface WalletTransactionMetadata {
  orderId?: string;
  paymentId?: string;
  settlementId?: string;
  batchId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export class SellerWalletTransaction {
  id: string;
  walletId: string;
  sellerAccountId?: string;

  // Transaction Details
  transactionId: string;
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  amount: number;
  currency: string;

  // Balance Snapshots
  balanceBefore: number;
  balanceAfter: number;

  // Reference Information
  referenceType?: string;
  referenceId?: string;
  orderId?: string;
  paymentId?: string;
  settlementId?: string;

  // Description & Metadata
  description: string;
  metadata: WalletTransactionMetadata;

  // Timestamps
  processedAt: Date;
  createdAt: Date;

  constructor(data: Partial<SellerWalletTransaction>) {
    Object.assign(this, data);
    this.metadata = this.metadata || {};
    this.currency = this.currency || 'INR';
    this.processedAt = this.processedAt || new Date();
    this.createdAt = this.createdAt || new Date();
  }

  // ============================================================================
  // BUSINESS LOGIC
  // ============================================================================

  isCredit(): boolean {
    return this.type === WalletTransactionType.CREDIT;
  }

  isDebit(): boolean {
    return this.type === WalletTransactionType.DEBIT;
  }

  getSignedAmount(): number {
    return this.isCredit() ? this.amount : -this.amount;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate(): void {
    if (!this.walletId) {
      throw new Error('Wallet ID is required');
    }

    if (!this.transactionId) {
      throw new Error('Transaction ID is required');
    }

    if (this.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    if (!this.description) {
      throw new Error('Transaction description is required');
    }

    // Validate balance calculation
    const expectedBalance = this.balanceBefore + this.getSignedAmount();
    if (Math.abs(expectedBalance - this.balanceAfter) > 0.01) {
      throw new Error(
        `Balance calculation error: expected ${expectedBalance}, got ${this.balanceAfter}`,
      );
    }
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  toJSON(): any {
    return {
      id: this.id,
      walletId: this.walletId,
      sellerAccountId: this.sellerAccountId,
      transactionId: this.transactionId,
      type: this.type,
      category: this.category,
      amount: this.amount,
      signedAmount: this.getSignedAmount(),
      currency: this.currency,
      balanceSnapshot: {
        before: this.balanceBefore,
        after: this.balanceAfter,
      },
      reference: {
        type: this.referenceType,
        id: this.referenceId,
        orderId: this.orderId,
        paymentId: this.paymentId,
        settlementId: this.settlementId,
      },
      description: this.description,
      metadata: this.metadata,
      processedAt: this.processedAt,
      createdAt: this.createdAt,
    };
  }
}
