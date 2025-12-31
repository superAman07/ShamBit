import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  SellerWallet,
  SellerWalletTransaction,
} from '../entities/seller-wallet.entity';
import {
  WalletTransactionType,
  WalletTransactionCategory,
} from '../enums/settlement-status.enum';
import {
  ISellerWalletRepository,
  WalletFilters,
  PaginationOptions,
  SortOptions,
  WalletIncludeOptions,
  PaginatedResult,
} from '../interfaces/settlement-repository.interface';

type TransactionClient = any; // Use any to avoid Prisma transaction type issues

@Injectable()
export class SellerWalletRepository implements ISellerWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async create(data: Partial<SellerWallet>): Promise<SellerWallet> {
    const wallet = await this.prisma.sellerWallet.create({
      data: {
        sellerId: data.sellerId!,
        availableBalance: data.availableBalance || 0,
        pendingBalance: data.pendingBalance || 0,
        reservedBalance: data.reservedBalance || 0,
        totalBalance: data.totalBalance || 0,
        currency: data.currency || 'INR',
        lastSettlementAt: data.lastSettlementAt,
        lastSettlementAmount: data.lastSettlementAmount,
        metadata: data.metadata || {},
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(wallet);
  }

  async findById(
    id: string,
    includes?: WalletIncludeOptions,
  ): Promise<SellerWallet | null> {
    const wallet = await this.prisma.sellerWallet.findUnique({
      where: { id },
      include: this.buildInclude(includes),
    });

    return wallet ? this.mapToEntity(wallet) : null;
  }

  async findBySellerId(
    sellerId: string,
    includes?: WalletIncludeOptions,
  ): Promise<SellerWallet | null> {
    const wallet = await this.prisma.sellerWallet.findUnique({
      where: { sellerId },
      include: this.buildInclude(includes),
    });

    return wallet ? this.mapToEntity(wallet) : null;
  }

  async update(id: string, data: Partial<SellerWallet>): Promise<SellerWallet> {
    const wallet = await this.prisma.sellerWallet.update({
      where: { id },
      data: {
        availableBalance: data.availableBalance,
        pendingBalance: data.pendingBalance,
        reservedBalance: data.reservedBalance,
        totalBalance: data.totalBalance,
        currency: data.currency,
        lastSettlementAt: data.lastSettlementAt,
        lastSettlementAmount: data.lastSettlementAmount,
        metadata: data.metadata,
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(wallet);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sellerWallet.delete({
      where: { id },
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async findAll(
    filters?: WalletFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: WalletIncludeOptions,
  ): Promise<PaginatedResult<SellerWallet>> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sort);
    const { skip, take } = this.buildPagination(pagination);

    const [wallets, total] = await Promise.all([
      this.prisma.sellerWallet.findMany({
        where,
        orderBy,
        skip,
        take,
        include: this.buildInclude(includes),
      }),
      this.prisma.sellerWallet.count({ where }),
    ]);

    const mappedWallets = wallets.map((w) => this.mapToEntity(w));

    return this.buildPaginatedResult(mappedWallets, total, pagination);
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  async findWalletsWithBalance(
    minBalance?: number,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<SellerWallet>> {
    return this.findAll({ minBalance: minBalance || 0 }, pagination);
  }

  async findWalletsForSettlement(
    minAmount?: number,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<SellerWallet>> {
    return this.findAll(
      { minBalance: minAmount || 100 }, // Default minimum settlement amount
      pagination,
    );
  }

  // ============================================================================
  // ATOMIC BALANCE OPERATIONS
  // ============================================================================

  async creditBalance(
    walletId: string,
    amount: number,
    category: string,
    transactionData: Partial<SellerWalletTransaction>,
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await (tx as any).sellerWallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new BadRequestException(`Wallet not found: ${walletId}`);
      }

      const wallet = this.mapToEntity(currentWallet);
      const balanceBefore = wallet.getBalanceSnapshot();

      // Credit the wallet
      wallet.credit(amount, category as WalletTransactionCategory);

      // Update wallet in database
      const updatedWallet = await (tx as any).sellerWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalBalance: wallet.totalBalance,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await (tx as any).sellerWalletTransaction.create({
        data: {
          walletId,
          sellerAccountId: transactionData.sellerAccountId,
          transactionId:
            transactionData.transactionId || this.generateTransactionId(),
          type: WalletTransactionType.CREDIT,
          category: category as WalletTransactionCategory,
          amount,
          currency: wallet.currency,
          balanceBefore: balanceBefore.totalBalance,
          balanceAfter: wallet.totalBalance,
          referenceType: transactionData.referenceType,
          referenceId: transactionData.referenceId,
          orderId: transactionData.orderId,
          paymentId: transactionData.paymentId,
          settlementId: transactionData.settlementId,
          description: transactionData.description || `Credit - ${category}`,
          metadata: transactionData.metadata || {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });

      return {
        wallet: this.mapToEntity(updatedWallet),
        transaction: this.mapTransactionToEntity(transaction),
      };
    });
  }

  async debitBalance(
    walletId: string,
    amount: number,
    category: string,
    transactionData: Partial<SellerWalletTransaction>,
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await (tx as any).sellerWallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new BadRequestException(`Wallet not found: ${walletId}`);
      }

      const wallet = this.mapToEntity(currentWallet);
      const balanceBefore = wallet.getBalanceSnapshot();

      // Debit the wallet
      wallet.debit(amount, category as WalletTransactionCategory);

      // Update wallet in database
      const updatedWallet = await (tx as any).sellerWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalBalance: wallet.totalBalance,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await (tx as any).sellerWalletTransaction.create({
        data: {
          walletId,
          sellerAccountId: transactionData.sellerAccountId,
          transactionId:
            transactionData.transactionId || this.generateTransactionId(),
          type: WalletTransactionType.DEBIT,
          category: category as WalletTransactionCategory,
          amount,
          currency: wallet.currency,
          balanceBefore: balanceBefore.totalBalance,
          balanceAfter: wallet.totalBalance,
          referenceType: transactionData.referenceType,
          referenceId: transactionData.referenceId,
          orderId: transactionData.orderId,
          paymentId: transactionData.paymentId,
          settlementId: transactionData.settlementId,
          description: transactionData.description || `Debit - ${category}`,
          metadata: transactionData.metadata || {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });

      return {
        wallet: this.mapToEntity(updatedWallet),
        transaction: this.mapTransactionToEntity(transaction),
      };
    });
  }

  async reserveBalance(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>,
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await (tx as any).sellerWallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new BadRequestException(`Wallet not found: ${walletId}`);
      }

      const wallet = this.mapToEntity(currentWallet);
      const balanceBefore = wallet.getBalanceSnapshot();

      // Reserve balance
      wallet.reserve(amount);

      // Update wallet in database
      const updatedWallet = await (tx as any).sellerWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalBalance: wallet.totalBalance,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await (tx as any).sellerWalletTransaction.create({
        data: {
          walletId,
          sellerAccountId: transactionData.sellerAccountId,
          transactionId:
            transactionData.transactionId || this.generateTransactionId(),
          type: WalletTransactionType.DEBIT,
          category: WalletTransactionCategory.ADJUSTMENT,
          amount,
          currency: wallet.currency,
          balanceBefore: balanceBefore.totalBalance,
          balanceAfter: wallet.totalBalance,
          referenceType: transactionData.referenceType,
          referenceId: transactionData.referenceId,
          description: transactionData.description || `Reserve balance`,
          metadata: transactionData.metadata || {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });

      return {
        wallet: this.mapToEntity(updatedWallet),
        transaction: this.mapTransactionToEntity(transaction),
      };
    });
  }

  async releaseReserve(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>,
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await (tx as any).sellerWallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new BadRequestException(`Wallet not found: ${walletId}`);
      }

      const wallet = this.mapToEntity(currentWallet);
      const balanceBefore = wallet.getBalanceSnapshot();

      // Release reserve
      wallet.releaseReserve(amount);

      // Update wallet in database
      const updatedWallet = await (tx as any).sellerWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalBalance: wallet.totalBalance,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await (tx as any).sellerWalletTransaction.create({
        data: {
          walletId,
          sellerAccountId: transactionData.sellerAccountId,
          transactionId:
            transactionData.transactionId || this.generateTransactionId(),
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.ADJUSTMENT,
          amount,
          currency: wallet.currency,
          balanceBefore: balanceBefore.totalBalance,
          balanceAfter: wallet.totalBalance,
          referenceType: transactionData.referenceType,
          referenceId: transactionData.referenceId,
          description: transactionData.description || `Release reserve`,
          metadata: transactionData.metadata || {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });

      return {
        wallet: this.mapToEntity(updatedWallet),
        transaction: this.mapTransactionToEntity(transaction),
      };
    });
  }

  async movePendingToAvailable(
    walletId: string,
    amount: number,
    transactionData: Partial<SellerWalletTransaction>,
  ): Promise<{ wallet: SellerWallet; transaction: SellerWalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await (tx as any).sellerWallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new BadRequestException(`Wallet not found: ${walletId}`);
      }

      const wallet = this.mapToEntity(currentWallet);
      const balanceBefore = wallet.getBalanceSnapshot();

      // Move pending to available
      wallet.movePendingToAvailable(amount);

      // Update wallet in database
      const updatedWallet = await (tx as any).sellerWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalBalance: wallet.totalBalance,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await (tx as any).sellerWalletTransaction.create({
        data: {
          walletId,
          sellerAccountId: transactionData.sellerAccountId,
          transactionId:
            transactionData.transactionId || this.generateTransactionId(),
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.ADJUSTMENT,
          amount,
          currency: wallet.currency,
          balanceBefore: balanceBefore.totalBalance,
          balanceAfter: wallet.totalBalance,
          referenceType: transactionData.referenceType,
          referenceId: transactionData.referenceId,
          description:
            transactionData.description || `Move pending to available`,
          metadata: transactionData.metadata || {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });

      return {
        wallet: this.mapToEntity(updatedWallet),
        transaction: this.mapTransactionToEntity(transaction),
      };
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildWhereClause(filters?: WalletFilters): any {
    if (!filters) return {};

    const where: any = {};

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
      where.availableBalance = {};
      if (filters.minBalance !== undefined)
        where.availableBalance.gte = filters.minBalance;
      if (filters.maxBalance !== undefined)
        where.availableBalance.lte = filters.maxBalance;
    }

    if (filters.hasTransactions !== undefined) {
      if (filters.hasTransactions) {
        where.transactions = { some: {} };
      } else {
        where.transactions = { none: {} };
      }
    }

    if (filters.lastSettlementFrom || filters.lastSettlementTo) {
      where.lastSettlementAt = {};
      if (filters.lastSettlementFrom)
        where.lastSettlementAt.gte = filters.lastSettlementFrom;
      if (filters.lastSettlementTo)
        where.lastSettlementAt.lte = filters.lastSettlementTo;
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

  private buildInclude(includes?: WalletIncludeOptions): any {
    if (!includes) return {};

    const include: any = {};

    if (includes.transactions) {
      include.transactions = {
        orderBy: { createdAt: 'desc' },
        take: 20,
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

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  private mapToEntity(wallet: any): SellerWallet {
    return new SellerWallet({
      id: wallet.id,
      sellerId: wallet.sellerId,
      availableBalance: parseFloat(wallet.availableBalance.toString()),
      pendingBalance: parseFloat(wallet.pendingBalance.toString()),
      reservedBalance: parseFloat(wallet.reservedBalance.toString()),
      totalBalance: parseFloat(wallet.totalBalance.toString()),
      currency: wallet.currency,
      lastSettlementAt: wallet.lastSettlementAt,
      lastSettlementAmount: wallet.lastSettlementAmount
        ? parseFloat(wallet.lastSettlementAmount.toString())
        : undefined,
      metadata: wallet.metadata,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      transactions: wallet.transactions?.map((t: any) =>
        this.mapTransactionToEntity(t),
      ),
    });
  }

  private mapTransactionToEntity(transaction: any): SellerWalletTransaction {
    return new SellerWalletTransaction({
      id: transaction.id,
      walletId: transaction.walletId,
      sellerAccountId: transaction.sellerAccountId,
      transactionId: transaction.transactionId,
      type: transaction.type,
      category: transaction.category,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency,
      balanceBefore: parseFloat(transaction.balanceBefore.toString()),
      balanceAfter: parseFloat(transaction.balanceAfter.toString()),
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      orderId: transaction.orderId,
      paymentId: transaction.paymentId,
      settlementId: transaction.settlementId,
      description: transaction.description,
      metadata: transaction.metadata,
      processedAt: transaction.processedAt,
      createdAt: transaction.createdAt,
    });
  }
}
