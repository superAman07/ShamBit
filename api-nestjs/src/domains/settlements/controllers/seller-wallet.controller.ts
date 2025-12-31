import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';

import { SellerWalletRepository } from '../repositories/seller-wallet.repository';

import {
  CreditWalletDto,
  DebitWalletDto,
  ReserveWalletBalanceDto,
  ReleaseWalletReserveDto,
  MovePendingToAvailableDto,
} from '../dtos/wallet-transaction.dto';

import type {
  WalletFilters,
  WalletTransactionFilters,
  PaginationOptions,
  WalletIncludeOptions,
} from '../interfaces/settlement-repository.interface';

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// Mock guards - replace with actual guards
@Injectable()
class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: Implement JWT validation
    return true; // Allow all for now
  }
}

@Injectable()
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: Implement role-based access control
    return true; // Allow all for now
  }
}

const Roles =
  (...roles: string[]) =>
  (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
const CurrentUser =
  () => (target: any, propertyName: string, parameterIndex: number) => {};

@ApiTags('Seller Wallets')
@ApiBearerAuth()
@Controller('seller-wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellerWalletController {
  constructor(
    private readonly sellerWalletRepository: SellerWalletRepository,
  ) {}

  // ============================================================================
  // WALLET CRUD OPERATIONS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get all seller wallets' })
  @ApiResponse({
    status: 200,
    description: 'Seller wallets retrieved successfully',
  })
  @Roles('ADMIN', 'FINANCE')
  async findAll(
    @Query() filters: WalletFilters,
    @Query() pagination: PaginationOptions,
    @Query() includes: WalletIncludeOptions,
  ) {
    return this.sellerWalletRepository.findAll(
      filters,
      pagination,
      undefined,
      includes,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller wallet by ID' })
  @ApiResponse({
    status: 200,
    description: 'Seller wallet retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Seller wallet not found' })
  async findById(
    @Param('id') id: string,
    @Query() includes: WalletIncludeOptions,
    @CurrentUser() user: any,
  ) {
    const wallet = await this.sellerWalletRepository.findById(id, includes);

    // Sellers can only view their own wallet
    if (user.role === 'SELLER' && wallet?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return wallet;
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get seller wallet by seller ID' })
  @ApiResponse({
    status: 200,
    description: 'Seller wallet retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Seller wallet not found' })
  async findBySellerId(
    @Param('sellerId') sellerId: string,
    @Query() includes: WalletIncludeOptions,
    @CurrentUser() user: any,
  ) {
    // Sellers can only view their own wallet
    if (user.role === 'SELLER' && sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.sellerWalletRepository.findBySellerId(sellerId, includes);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new seller wallet' })
  @ApiResponse({
    status: 201,
    description: 'Seller wallet created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid wallet data' })
  @Roles('ADMIN', 'SYSTEM')
  async createWallet(
    @Body() dto: { sellerId: string; currency?: string; metadata?: any },
  ) {
    return this.sellerWalletRepository.create({
      sellerId: dto.sellerId,
      currency: dto.currency || 'INR',
      metadata: dto.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // BALANCE OPERATIONS
  // ============================================================================

  @Post(':id/credit')
  @ApiOperation({
    summary: 'Credit wallet balance',
    description:
      'Add funds to a seller wallet. Used for order payments, refunds, and adjustments.',
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiBody({
    description: 'Credit wallet request',
    schema: {
      type: 'object',
      required: ['amount', 'category', 'description'],
      properties: {
        amount: { type: 'number', minimum: 0.01, example: 1000.0 },
        category: {
          type: 'string',
          enum: ['SALE', 'REFUND', 'ADJUSTMENT', 'SETTLEMENT'],
          example: 'SALE',
        },
        description: { type: 'string', example: 'Payment for order #12345' },
        referenceType: { type: 'string', example: 'ORDER' },
        referenceId: { type: 'string', example: 'order_12345' },
        orderId: { type: 'string', example: 'order_12345' },
        paymentId: { type: 'string', example: 'pay_67890' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet credited successfully',
    schema: {
      type: 'object',
      properties: {
        wallet: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sellerId: { type: 'string' },
            availableBalance: { type: 'number' },
            pendingBalance: { type: 'number' },
            totalBalance: { type: 'number' },
            currency: { type: 'string' },
          },
        },
        transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            transactionId: { type: 'string' },
            type: { type: 'string', example: 'CREDIT' },
            amount: { type: 'number' },
            balanceAfter: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid credit operation' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @Roles('ADMIN', 'SYSTEM')
  async creditWallet(
    @Param('id') id: string,
    @Body() dto: Omit<CreditWalletDto, 'walletId'>,
  ) {
    const creditDto: CreditWalletDto = {
      ...dto,
      walletId: id,
    };

    return this.sellerWalletRepository.creditBalance(
      id,
      creditDto.amount,
      creditDto.category,
      {
        transactionId: this.generateTransactionId(),
        referenceType: creditDto.referenceType,
        referenceId: creditDto.referenceId,
        orderId: creditDto.orderId,
        paymentId: creditDto.paymentId,
        description: creditDto.description,
        metadata: creditDto.metadata,
      },
    );
  }

  @Post(':id/debit')
  @ApiOperation({ summary: 'Debit wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet debited successfully' })
  @ApiResponse({ status: 400, description: 'Invalid debit operation' })
  @Roles('ADMIN', 'SYSTEM')
  async debitWallet(
    @Param('id') id: string,
    @Body() dto: Omit<DebitWalletDto, 'walletId'>,
  ) {
    const debitDto: DebitWalletDto = {
      ...dto,
      walletId: id,
    };

    return this.sellerWalletRepository.debitBalance(
      id,
      debitDto.amount,
      debitDto.category,
      {
        transactionId: this.generateTransactionId(),
        referenceType: debitDto.referenceType,
        referenceId: debitDto.referenceId,
        settlementId: debitDto.settlementId,
        description: debitDto.description,
        metadata: debitDto.metadata,
      },
    );
  }

  @Post(':id/reserve')
  @ApiOperation({ summary: 'Reserve wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance reserved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid reserve operation' })
  @Roles('ADMIN', 'SYSTEM')
  async reserveBalance(
    @Param('id') id: string,
    @Body() dto: Omit<ReserveWalletBalanceDto, 'walletId'>,
  ) {
    const reserveDto: ReserveWalletBalanceDto = {
      ...dto,
      walletId: id,
    };

    return this.sellerWalletRepository.reserveBalance(id, reserveDto.amount, {
      transactionId: this.generateTransactionId(),
      referenceType: reserveDto.referenceType,
      referenceId: reserveDto.referenceId,
      description: reserveDto.description,
      metadata: reserveDto.metadata,
    });
  }

  @Post(':id/release-reserve')
  @ApiOperation({ summary: 'Release reserved balance' })
  @ApiResponse({
    status: 200,
    description: 'Reserved balance released successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid release operation' })
  @Roles('ADMIN', 'SYSTEM')
  async releaseReserve(
    @Param('id') id: string,
    @Body() dto: Omit<ReleaseWalletReserveDto, 'walletId'>,
  ) {
    const releaseDto: ReleaseWalletReserveDto = {
      ...dto,
      walletId: id,
    };

    return this.sellerWalletRepository.releaseReserve(id, releaseDto.amount, {
      transactionId: this.generateTransactionId(),
      referenceType: releaseDto.referenceType,
      referenceId: releaseDto.referenceId,
      description: releaseDto.description,
      metadata: releaseDto.metadata,
    });
  }

  @Post(':id/move-pending')
  @ApiOperation({ summary: 'Move pending balance to available' })
  @ApiResponse({ status: 200, description: 'Balance moved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid move operation' })
  @Roles('ADMIN', 'SYSTEM')
  async movePendingToAvailable(
    @Param('id') id: string,
    @Body() dto: Omit<MovePendingToAvailableDto, 'walletId'>,
  ) {
    const moveDto: MovePendingToAvailableDto = {
      ...dto,
      walletId: id,
    };

    return this.sellerWalletRepository.movePendingToAvailable(
      id,
      moveDto.amount,
      {
        transactionId: this.generateTransactionId(),
        referenceType: moveDto.referenceType,
        referenceId: moveDto.referenceId,
        description: moveDto.description,
        metadata: moveDto.metadata,
      },
    );
  }

  // ============================================================================
  // WALLET ANALYTICS
  // ============================================================================

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get wallet balance details' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
  })
  async getWalletBalance(@Param('id') id: string, @CurrentUser() user: any) {
    const wallet = await this.sellerWalletRepository.findById(id);

    // Sellers can only view their own wallet balance
    if (user.role === 'SELLER' && wallet?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      walletId: wallet.id,
      sellerId: wallet.sellerId,
      balances: wallet.getBalanceSnapshot(),
      currency: wallet.currency,
      settlableAmount: wallet.getSettlableAmount(),
      lastSettlement: {
        at: wallet.lastSettlementAt,
        amount: wallet.lastSettlementAmount,
      },
      updatedAt: wallet.updatedAt,
    };
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
  })
  async getWalletTransactions(
    @Param('id') id: string,
    @Query() filters: Omit<WalletTransactionFilters, 'walletId'>,
    @Query() pagination: PaginationOptions,
    @CurrentUser() user: any,
  ) {
    const wallet = await this.sellerWalletRepository.findById(id);

    // Sellers can only view their own wallet transactions
    if (user.role === 'SELLER' && wallet?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    // This would be implemented in a WalletTransactionRepository
    return {
      message:
        'Wallet transactions endpoint - to be implemented with WalletTransactionRepository',
      walletId: id,
      filters,
      pagination,
    };
  }

  @Get('with-balance')
  @ApiOperation({ summary: 'Get wallets with balance' })
  @ApiResponse({
    status: 200,
    description: 'Wallets with balance retrieved successfully',
  })
  @Roles('ADMIN', 'FINANCE')
  async getWalletsWithBalance(
    @Query('minBalance') minBalance: number = 0,
    @Query() pagination: PaginationOptions = {},
  ) {
    return this.sellerWalletRepository.findWalletsWithBalance(
      minBalance,
      pagination,
    );
  }

  @Get('for-settlement')
  @ApiOperation({ summary: 'Get wallets eligible for settlement' })
  @ApiResponse({
    status: 200,
    description: 'Settlement-eligible wallets retrieved successfully',
  })
  @Roles('ADMIN', 'FINANCE')
  async getWalletsForSettlement(
    @Query('minAmount') minAmount: number = 100,
    @Query() pagination: PaginationOptions = {},
  ) {
    return this.sellerWalletRepository.findWalletsForSettlement(
      minAmount,
      pagination,
    );
  }

  // ============================================================================
  // SELLER ACCESS ENDPOINTS
  // ============================================================================

  @Get('my-wallet')
  @ApiOperation({ summary: 'Get current seller wallet' })
  @ApiResponse({
    status: 200,
    description: 'Seller wallet retrieved successfully',
  })
  @Roles('SELLER')
  async getMyWallet(
    @Query() includes: WalletIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.sellerWalletRepository.findBySellerId(user.id, includes);
  }

  @Get('my-wallet/balance')
  @ApiOperation({
    summary: 'Get current seller wallet balance',
    description:
      'Get detailed balance information for the authenticated seller',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        walletId: { type: 'string' },
        sellerId: { type: 'string' },
        balances: {
          type: 'object',
          properties: {
            availableBalance: {
              type: 'number',
              description: 'Available for settlement',
            },
            pendingBalance: {
              type: 'number',
              description: 'Pending clearance',
            },
            reservedBalance: {
              type: 'number',
              description: 'Reserved for refunds',
            },
            totalBalance: {
              type: 'number',
              description: 'Total wallet balance',
            },
          },
        },
        currency: { type: 'string', example: 'INR' },
        settlableAmount: {
          type: 'number',
          description: 'Amount available for settlement',
        },
        lastSettlement: {
          type: 'object',
          properties: {
            at: { type: 'string', format: 'date-time', nullable: true },
            amount: { type: 'number', nullable: true },
          },
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @Roles('SELLER')
  async getMyWalletBalance(@CurrentUser() user: any) {
    const wallet = await this.sellerWalletRepository.findBySellerId(user.id);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      walletId: wallet.id,
      sellerId: wallet.sellerId,
      balances: wallet.getBalanceSnapshot(),
      currency: wallet.currency,
      settlableAmount: wallet.getSettlableAmount(),
      lastSettlement: {
        at: wallet.lastSettlementAt,
        amount: wallet.lastSettlementAmount,
      },
      updatedAt: wallet.updatedAt,
    };
  }

  @Get('my-wallet/transactions')
  @ApiOperation({ summary: 'Get current seller wallet transactions' })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
  })
  @Roles('SELLER')
  async getMyWalletTransactions(
    @Query() filters: Omit<WalletTransactionFilters, 'walletId' | 'sellerId'>,
    @Query() pagination: PaginationOptions,
    @CurrentUser() user: any,
  ) {
    const wallet = await this.sellerWalletRepository.findBySellerId(user.id);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // This would be implemented in a WalletTransactionRepository
    return {
      message:
        'My wallet transactions endpoint - to be implemented with WalletTransactionRepository',
      walletId: wallet.id,
      sellerId: user.id,
      filters,
      pagination,
    };
  }

  @Post('my-wallet/initialize')
  @ApiOperation({ summary: 'Initialize wallet for current seller' })
  @ApiResponse({ status: 201, description: 'Wallet initialized successfully' })
  @Roles('SELLER')
  async initializeMyWallet(
    @Body() dto: { currency?: string; metadata?: any },
    @CurrentUser() user: any,
  ) {
    // Check if wallet already exists
    const existingWallet = await this.sellerWalletRepository.findBySellerId(
      user.id,
    );
    if (existingWallet) {
      throw new Error('Wallet already exists');
    }

    return this.sellerWalletRepository.create({
      sellerId: user.id,
      currency: dto.currency || 'INR',
      metadata: dto.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }
}
