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
  ApiProduces
} from '@nestjs/swagger';

import { SettlementService } from '../settlement.service';
import { SettlementCalculationService } from '../services/settlement-calculation.service';
import { SettlementValidationService } from '../services/settlement-validation.service';

import {
  CreateSettlementDto,
  ProcessSettlementDto,
  CancelSettlementDto,
  BulkSettlementDto,
  ReconcileSettlementDto,
  RetrySettlementDto,
} from '../dtos/create-settlement.dto';

import type {
  SettlementFilters,
  PaginationOptions,
  SettlementIncludeOptions,
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

const Roles = (...roles: string[]) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
const CurrentUser = () => (target: any, propertyName: string, parameterIndex: number) => {};

@ApiTags('Settlements')
@ApiBearerAuth()
@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementController {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly settlementCalculationService: SettlementCalculationService,
    private readonly settlementValidationService: SettlementValidationService,
  ) {}

  // ============================================================================
  // SETTLEMENT CRUD OPERATIONS
  // ============================================================================

  @Get()
  @ApiOperation({ 
    summary: 'Get all settlements',
    description: 'Retrieve a paginated list of settlements with optional filtering and includes'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Settlements retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              settlementId: { type: 'string' },
              sellerId: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
              grossAmount: { type: 'number' },
              netAmount: { type: 'number' },
              currency: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @ApiQuery({ name: 'sellerId', required: false, description: 'Filter by seller ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by settlement status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  async findAll(
    @Query() filters: SettlementFilters,
    @Query() pagination: PaginationOptions,
    @Query() includes: SettlementIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.settlementService.findAll(
      filters,
      pagination,
      includes,
      user.id,
      user.role
    );
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get settlement by ID',
    description: 'Retrieve a specific settlement by its unique identifier'
  })
  @ApiParam({ name: 'id', description: 'Settlement unique identifier' })
  @ApiResponse({ 
    status: 200, 
    description: 'Settlement retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        settlementId: { type: 'string' },
        sellerId: { type: 'string' },
        sellerAccountId: { type: 'string' },
        status: { type: 'string' },
        grossAmount: { type: 'number' },
        commissionAmount: { type: 'number' },
        netAmount: { type: 'number' },
        currency: { type: 'string' },
        periodStart: { type: 'string', format: 'date-time' },
        periodEnd: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async findById(
    @Param('id') id: string,
    @Query() includes: SettlementIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.settlementService.findById(id, includes, user.id, user.role);
  }

  @Get('settlement-id/:settlementId')
  @ApiOperation({ summary: 'Get settlement by settlement ID' })
  @ApiResponse({ status: 200, description: 'Settlement retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async findBySettlementId(
    @Param('settlementId') settlementId: string,
    @Query() includes: SettlementIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.settlementService.findBySettlementId(settlementId, includes, user.id, user.role);
  }

  // ============================================================================
  // SETTLEMENT CREATION
  // ============================================================================

  @Post()
  @ApiOperation({ 
    summary: 'Create a new settlement',
    description: 'Create a new settlement for a seller with calculated amounts'
  })
  @ApiBody({ 
    type: CreateSettlementDto,
    description: 'Settlement creation data',
    examples: {
      example1: {
        summary: 'Basic settlement creation',
        value: {
          sellerId: 'seller_123',
          sellerAccountId: 'acc_456',
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-01-31T23:59:59Z',
          grossAmount: 10000.00,
          commissionAmount: 500.00,
          platformFeeAmount: 100.00,
          taxAmount: 90.00,
          netAmount: 9310.00,
          currency: 'INR',
          notes: 'Monthly settlement for January 2024'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Settlement created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        settlementId: { type: 'string' },
        status: { type: 'string', example: 'PENDING' },
        message: { type: 'string', example: 'Settlement created successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid settlement data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @Roles('ADMIN', 'FINANCE')
  async createSettlement(
    @Body() dto: CreateSettlementDto,
    @CurrentUser() user: any,
  ) {
    dto.createdBy = user.id;
    return this.settlementService.createSettlement(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create bulk settlements' })
  @ApiResponse({ status: 202, description: 'Bulk settlement job created' })
  @ApiResponse({ status: 400, description: 'Invalid bulk settlement data' })
  @Roles('ADMIN', 'FINANCE')
  async createBulkSettlements(
    @Body() dto: BulkSettlementDto,
    @CurrentUser() user: any,
  ) {
    dto.createdBy = user.id;
    return this.settlementService.createBulkSettlements(dto);
  }

  // ============================================================================
  // SETTLEMENT PROCESSING
  // ============================================================================

  @Put(':id/process')
  @ApiOperation({ summary: 'Process a settlement' })
  @ApiResponse({ status: 200, description: 'Settlement processing started' })
  @ApiResponse({ status: 400, description: 'Settlement cannot be processed' })
  @Roles('ADMIN', 'FINANCE')
  async processSettlement(
    @Param('id') id: string,
    @Body() dto: Omit<ProcessSettlementDto, 'settlementId'>,
    @CurrentUser() user: any,
  ) {
    const processDto: ProcessSettlementDto = {
      ...dto,
      settlementId: id,
      processedBy: user.id,
    };
    return this.settlementService.processSettlement(processDto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a settlement' })
  @ApiResponse({ status: 200, description: 'Settlement cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Settlement cannot be cancelled' })
  @Roles('ADMIN', 'FINANCE')
  async cancelSettlement(
    @Param('id') id: string,
    @Body() dto: Omit<CancelSettlementDto, 'settlementId' | 'cancelledBy'>,
    @CurrentUser() user: any,
  ) {
    const cancelDto: CancelSettlementDto = {
      ...dto,
      settlementId: id,
      cancelledBy: user.id,
    };
    return this.settlementService.cancelSettlement(cancelDto);
  }

  @Put(':id/retry')
  @ApiOperation({ summary: 'Retry a failed settlement' })
  @ApiResponse({ status: 200, description: 'Settlement retry initiated' })
  @ApiResponse({ status: 400, description: 'Settlement cannot be retried' })
  @Roles('ADMIN', 'FINANCE')
  async retrySettlement(
    @Param('id') id: string,
    @Body() dto: Omit<RetrySettlementDto, 'settlementId' | 'retriedBy'>,
    @CurrentUser() user: any,
  ) {
    const retryDto: RetrySettlementDto = {
      ...dto,
      settlementId: id,
      retriedBy: user.id,
    };
    return this.settlementService.retrySettlement(retryDto);
  }

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  @Put(':id/reconcile')
  @ApiOperation({ summary: 'Reconcile a settlement' })
  @ApiResponse({ status: 200, description: 'Settlement reconciled successfully' })
  @ApiResponse({ status: 400, description: 'Settlement cannot be reconciled' })
  @Roles('ADMIN', 'FINANCE')
  async reconcileSettlement(
    @Param('id') id: string,
    @Body() dto: Omit<ReconcileSettlementDto, 'settlementId' | 'reconciledBy'>,
    @CurrentUser() user: any,
  ) {
    const reconcileDto: ReconcileSettlementDto = {
      ...dto,
      settlementId: id,
      reconciledBy: user.id,
    };
    return this.settlementService.reconcileSettlement(reconcileDto);
  }

  // ============================================================================
  // SETTLEMENT CALCULATION & VALIDATION
  // ============================================================================

  @Post('calculate')
  @ApiOperation({ 
    summary: 'Calculate settlement for a seller',
    description: 'Calculate settlement amounts for a seller within a specific period'
  })
  @ApiBody({
    description: 'Settlement calculation parameters',
    schema: {
      type: 'object',
      required: ['sellerId', 'periodStart', 'periodEnd'],
      properties: {
        sellerId: { type: 'string', description: 'Seller unique identifier' },
        periodStart: { type: 'string', format: 'date-time', description: 'Settlement period start date' },
        periodEnd: { type: 'string', format: 'date-time', description: 'Settlement period end date' },
        currency: { type: 'string', default: 'INR', description: 'Settlement currency' }
      }
    },
    examples: {
      example1: {
        summary: 'Calculate monthly settlement',
        value: {
          sellerId: 'seller_123',
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-01-31T23:59:59Z',
          currency: 'INR'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Settlement calculated successfully',
    schema: {
      type: 'object',
      properties: {
        sellerId: { type: 'string' },
        periodStart: { type: 'string', format: 'date-time' },
        periodEnd: { type: 'string', format: 'date-time' },
        grossAmount: { type: 'number' },
        commissionAmount: { type: 'number' },
        platformFeeAmount: { type: 'number' },
        taxAmount: { type: 'number' },
        netAmount: { type: 'number' },
        currency: { type: 'string' },
        orderCount: { type: 'number' },
        transactionCount: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Access denied - sellers can only calculate their own settlements' })
  @Roles('ADMIN', 'FINANCE', 'SELLER')
  async calculateSettlement(
    @Body() dto: {
      sellerId: string;
      periodStart: string;
      periodEnd: string;
      currency?: string;
    },
    @CurrentUser() user: any,
  ) {
    // Sellers can only calculate their own settlements
    if (user.role === 'SELLER' && dto.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.settlementCalculationService.calculateSettlement(
      dto.sellerId,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      dto.currency || 'INR'
    );
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate settlement creation' })
  @ApiResponse({ status: 200, description: 'Settlement validation completed' })
  @Roles('ADMIN', 'FINANCE')
  async validateSettlement(
    @Body() dto: {
      sellerId: string;
      periodStart: string;
      periodEnd: string;
      netAmount: number;
    },
  ) {
    return this.settlementValidationService.validateSettlementCreation(
      dto.sellerId,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      dto.netAmount
    );
  }

  @Get('seller/:sellerId/eligibility')
  @ApiOperation({ summary: 'Check seller settlement eligibility' })
  @ApiResponse({ status: 200, description: 'Eligibility check completed' })
  @Roles('ADMIN', 'FINANCE', 'SELLER')
  async checkEligibility(
    @Param('sellerId') sellerId: string,
    @Query('amount') amount: number,
    @CurrentUser() user: any,
  ) {
    // Sellers can only check their own eligibility
    if (user.role === 'SELLER' && sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.settlementValidationService.checkSettlementEligibility(sellerId, amount);
  }

  // ============================================================================
  // REPORTING & ANALYTICS
  // ============================================================================

  @Get('seller/:sellerId/summary')
  @ApiOperation({ summary: 'Get settlement summary for seller' })
  @ApiResponse({ status: 200, description: 'Settlement summary retrieved' })
  @Roles('ADMIN', 'FINANCE', 'SELLER')
  async getSellerSummary(
    @Param('sellerId') sellerId: string,
    @Query('periodStart') periodStart: string = '',
    @Query('periodEnd') periodEnd: string = '',
    @CurrentUser() user: any,
  ) {
    // Sellers can only view their own summary
    if (user.role === 'SELLER' && sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.settlementCalculationService.getSettlementSummary(
      sellerId,
      periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
      periodEnd ? new Date(periodEnd) : new Date()
    );
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get settlement analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles('ADMIN', 'FINANCE')
  async getAnalyticsOverview(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    // This would be implemented to return settlement analytics
    return {
      message: 'Analytics endpoint - to be implemented',
      dateFrom,
      dateTo,
    };
  }

  // ============================================================================
  // SELLER ACCESS ENDPOINTS
  // ============================================================================

  @Get('my-settlements')
  @ApiOperation({ summary: 'Get current seller settlements' })
  @ApiResponse({ status: 200, description: 'Seller settlements retrieved' })
  @Roles('SELLER')
  async getMySettlements(
    @Query() pagination: PaginationOptions,
    @Query() includes: SettlementIncludeOptions,
    @CurrentUser() user: any,
  ) {
    const filters: SettlementFilters = {
      sellerId: user.id,
    };

    return this.settlementService.findAll(
      filters,
      pagination,
      includes,
      user.id,
      user.role
    );
  }

  @Get('my-settlements/pending')
  @ApiOperation({ summary: 'Get current seller pending settlements' })
  @ApiResponse({ status: 200, description: 'Pending settlements retrieved' })
  @Roles('SELLER')
  async getMyPendingSettlements(
    @Query() pagination: PaginationOptions,
    @CurrentUser() user: any,
  ) {
    const filters: SettlementFilters = {
      sellerId: user.id,
      status: ['PENDING', 'PROCESSING'],
    };

    return this.settlementService.findAll(
      filters,
      pagination,
      {},
      user.id,
      user.role
    );
  }
}