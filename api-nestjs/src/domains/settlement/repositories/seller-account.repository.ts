import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SellerAccount } from '../entities/seller-account.entity';
import { PublicSellerDto, PublicSellerListResponse } from '../dtos/public-seller.dto';
import {
  ISellerAccountRepository,
  SellerAccountFilters,
  PaginationOptions,
  SortOptions,
  SellerAccountIncludeOptions,
  PaginatedResult,
} from '../interfaces/settlement-repository.interface';

@Injectable()
export class SellerAccountRepository implements ISellerAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async create(data: Partial<SellerAccount>): Promise<SellerAccount> {
    const account = await this.prisma.sellerAccount.create({
      data: {
        sellerId: data.sellerId!,
        accountHolderName: data.accountHolderName!,
        accountNumber: data.accountNumber!,
        ifscCode: data.ifscCode!,
        bankName: data.bankName!,
        branchName: data.branchName,
        accountType: data.accountType || 'SAVINGS',
        upiId: data.upiId,
        kycStatus: data.kycStatus || 'PENDING',
        kycDocuments: data.kycDocuments ? JSON.stringify(data.kycDocuments) : undefined,
        verificationDetails: data.verificationDetails ? JSON.stringify(data.verificationDetails) : undefined,
        verifiedAt: data.verifiedAt,
        status: data.status || 'ACTIVE',
        isVerified: data.isVerified || false,
        razorpayAccountId: data.razorpayAccountId,
        razorpayContactId: data.razorpayContactId,
        razorpayFundAccountId: data.razorpayFundAccountId,
        businessName: data.businessName,
        businessType: data.businessType,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        metadata: data.metadata || {},
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(account);
  }

  async findById(id: string, includes?: SellerAccountIncludeOptions): Promise<SellerAccount | null> {
    const account = await this.prisma.sellerAccount.findUnique({
      where: { id },
      include: this.buildInclude(includes),
    });

    return account ? this.mapToEntity(account) : null;
  }

  async findBySellerId(sellerId: string, includes?: SellerAccountIncludeOptions): Promise<SellerAccount | null> {
    const account = await this.prisma.sellerAccount.findUnique({
      where: { sellerId },
      include: this.buildInclude(includes),
    });

    return account ? this.mapToEntity(account) : null;
  }

  async update(id: string, data: Partial<SellerAccount>): Promise<SellerAccount> {
    const account = await this.prisma.sellerAccount.update({
      where: { id },
      data: {
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        branchName: data.branchName,
        accountType: data.accountType,
        upiId: data.upiId,
        kycStatus: data.kycStatus,
        kycDocuments: data.kycDocuments ? JSON.stringify(data.kycDocuments) : undefined,
        verificationDetails: data.verificationDetails ? JSON.stringify(data.verificationDetails) : undefined,
        verifiedAt: data.verifiedAt,
        status: data.status,
        isVerified: data.isVerified,
        razorpayAccountId: data.razorpayAccountId,
        razorpayContactId: data.razorpayContactId,
        razorpayFundAccountId: data.razorpayFundAccountId,
        businessName: data.businessName,
        businessType: data.businessType,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        metadata: data.metadata,
        updatedAt: data.updatedAt || new Date(),
      },
    });

    return this.mapToEntity(account);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sellerAccount.delete({
      where: { id },
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async findAll(
    filters?: SellerAccountFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[],
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sort);
    const { skip, take } = this.buildPagination(pagination);

    const [accounts, total] = await Promise.all([
      this.prisma.sellerAccount.findMany({
        where,
        orderBy,
        skip,
        take,
        include: this.buildInclude(includes),
      }),
      this.prisma.sellerAccount.count({ where }),
    ]);

    const mappedAccounts = accounts.map(a => this.mapToEntity(a));

    return this.buildPaginatedResult(mappedAccounts, total, pagination);
  }

  async findByStatus(
    status: string | string[],
    pagination?: PaginationOptions,
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>> {
    return this.findAll(
      { status },
      pagination,
      undefined,
      includes
    );
  }

  async findByKycStatus(
    kycStatus: string | string[],
    pagination?: PaginationOptions,
    includes?: SellerAccountIncludeOptions
  ): Promise<PaginatedResult<SellerAccount>> {
    return this.findAll(
      { kycStatus },
      pagination,
      undefined,
      includes
    );
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  async findVerifiedAccounts(
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerAccount>> {
    return this.findAll(
      { isVerified: true, kycStatus: 'VERIFIED' },
      pagination
    );
  }

  async findAccountsRequiringKyc(
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<SellerAccount>> {
    return this.findAll(
      { kycStatus: ['PENDING', 'REJECTED'] },
      pagination
    );
  }

  async findByRazorpayAccountId(razorpayAccountId: string): Promise<SellerAccount | null> {
    const account = await this.prisma.sellerAccount.findUnique({
      where: { razorpayAccountId },
    });

    return account ? this.mapToEntity(account) : null;
  }

  // ============================================================================
  // PUBLIC METHODS (FOR ECOMMERCE LISTINGS)
  // ============================================================================

  async findAllPublic(
    filters?: SellerAccountFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions[]
  ): Promise<PublicSellerListResponse> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sort);
    const { skip, take } = this.buildPagination(pagination);

    const [accounts, total] = await Promise.all([
      this.prisma.sellerAccount.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          accountHolderName: true,
          businessName: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.sellerAccount.count({ where }),
    ]);

    const publicData = accounts.map(account => this.mapToPublicDto(account));
    
    return this.buildPublicPaginatedResult(publicData, total, pagination);
  }

  private mapToPublicDto(account: any): PublicSellerDto {
    return {
      id: account.id,
      sellerName: account.accountHolderName,
      storeName: account.businessName || undefined,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
    };
  }

  private buildPublicPaginatedResult(
    data: PublicSellerDto[],
    total: number,
    pagination?: PaginationOptions
  ): PublicSellerListResponse {
    const page = parseInt(String(pagination?.page || 1), 10);
    const limit = parseInt(String(pagination?.limit || 50), 10);
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildWhereClause(filters?: SellerAccountFilters): any {
    if (!filters) return {};

    const where: any = {};

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }

    if (filters.kycStatus) {
      where.kycStatus = Array.isArray(filters.kycStatus)
        ? { in: filters.kycStatus }
        : filters.kycStatus;
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    if (filters.bankName) {
      where.bankName = { contains: filters.bankName, mode: 'insensitive' };
    }

    if (filters.accountType) {
      where.accountType = filters.accountType;
    }

    if (filters.hasRazorpayIntegration !== undefined) {
      if (filters.hasRazorpayIntegration) {
        where.AND = [
          { razorpayAccountId: { not: null } },
          { razorpayContactId: { not: null } },
          { razorpayFundAccountId: { not: null } },
        ];
      } else {
        where.OR = [
          { razorpayAccountId: null },
          { razorpayContactId: null },
          { razorpayFundAccountId: null },
        ];
      }
    }

    if (filters.businessType) {
      where.businessType = filters.businessType;
    }

    return where;
  }

  private buildOrderBy(sort?: SortOptions[]): any {
    if (!sort || sort.length === 0) {
      return { createdAt: 'desc' };
    }

    return sort.map(s => ({ [s.field]: s.direction.toLowerCase() }));
  }

  private buildPagination(pagination?: PaginationOptions): { skip?: number; take?: number } {
    if (!pagination) return {};

    const page = parseInt(String(pagination.page || 1), 10);
    const limit = parseInt(String(pagination.limit || 50), 10);

    return {
      skip: pagination.offset ? parseInt(String(pagination.offset), 10) : (page - 1) * limit,
      take: limit,
    };
  }

  private buildInclude(includes?: SellerAccountIncludeOptions): any {
    if (!includes) return {};

    const include: any = {};

    if (includes.settlements) {
      include.settlements = {
        orderBy: { createdAt: 'desc' },
        take: 10,
      };
    }

    if (includes.wallet) {
      include.walletTransactions = {
        orderBy: { createdAt: 'desc' },
        take: 10,
      };
    }

    if (includes.schedules) {
      include.schedules = true;
    }

    return include;
  }

  private buildPaginatedResult<T>(
    data: T[],
    total: number,
    pagination?: PaginationOptions
  ): PaginatedResult<T> {
    const page = parseInt(String(pagination?.page || 1), 10);
    const limit = parseInt(String(pagination?.limit || 50), 10);
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

  private mapToEntity(account: any): SellerAccount {
    return new SellerAccount({
      id: account.id,
      sellerId: account.sellerId,
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      bankName: account.bankName,
      branchName: account.branchName,
      accountType: account.accountType,
      upiId: account.upiId,
      kycStatus: account.kycStatus,
      kycDocuments: account.kycDocuments,
      verificationDetails: account.verificationDetails,
      verifiedAt: account.verifiedAt,
      status: account.status,
      isVerified: account.isVerified,
      razorpayAccountId: account.razorpayAccountId,
      razorpayContactId: account.razorpayContactId,
      razorpayFundAccountId: account.razorpayFundAccountId,
      businessName: account.businessName,
      businessType: account.businessType,
      gstNumber: account.gstNumber,
      panNumber: account.panNumber,
      metadata: account.metadata,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  }
}
