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

import { SellerAccountRepository } from '../repositories/seller-account.repository';
import { SettlementValidationService } from '../services/settlement-validation.service';
import { RazorpayPayoutService } from '../services/razorpay-payout.service';

import {
  CreateSellerAccountDto,
  UpdateSellerAccountDto,
  SubmitKycDto,
  VerifyKycDto,
  RejectKycDto,
  UpdateAccountStatusDto,
  SetupRazorpayAccountDto,
} from '../dtos/create-seller-account.dto';

import type {
  SellerAccountFilters,
  PaginationOptions,
  SellerAccountIncludeOptions,
} from '../interfaces/settlement-repository.interface';

// Mock guards - replace with actual guards
const JwtAuthGuard = () => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
const RolesGuard = () => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
const Roles = (...roles: string[]) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {};
const CurrentUser = () => (target: any, propertyName: string, parameterIndex: number) => {};

@ApiTags('Seller Accounts')
@ApiBearerAuth()
@Controller('seller-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellerAccountController {
  constructor(
    private readonly sellerAccountRepository: SellerAccountRepository,
    private readonly settlementValidationService: SettlementValidationService,
    private readonly razorpayPayoutService: RazorpayPayoutService,
  ) {}

  // ============================================================================
  // SELLER ACCOUNT CRUD OPERATIONS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get all seller accounts' })
  @ApiResponse({ status: 200, description: 'Seller accounts retrieved successfully' })
  @Roles('ADMIN', 'FINANCE')
  async findAll(
    @Query() filters: SellerAccountFilters,
    @Query() pagination: PaginationOptions,
    @Query() includes: SellerAccountIncludeOptions,
  ) {
    return this.sellerAccountRepository.findAll(filters, pagination, undefined, includes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller account by ID' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  async findById(
    @Param('id') id: string,
    @Query() includes: SellerAccountIncludeOptions,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id, includes);
    
    // Sellers can only view their own account
    if (user.role === 'SELLER' && account?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return account;
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get seller account by seller ID' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  async findBySellerId(
    @Param('sellerId') sellerId: string,
    @Query() includes: SellerAccountIncludeOptions,
    @CurrentUser() user: any,
  ) {
    // Sellers can only view their own account
    if (user.role === 'SELLER' && sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.sellerAccountRepository.findBySellerId(sellerId, includes);
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create a new seller account',
    description: 'Create a new seller account with bank details and business information'
  })
  @ApiBody({ 
    type: CreateSellerAccountDto,
    description: 'Seller account creation data',
    examples: {
      individual: {
        summary: 'Individual seller account',
        value: {
          sellerId: 'seller_123',
          accountHolderName: 'John Doe',
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          branchName: 'Mumbai Main Branch',
          accountType: 'SAVINGS',
          businessType: 'INDIVIDUAL',
          panNumber: 'ABCDE1234F'
        }
      },
      business: {
        summary: 'Business seller account',
        value: {
          sellerId: 'seller_456',
          accountHolderName: 'ABC Private Limited',
          accountNumber: '9876543210',
          ifscCode: 'ICIC0001234',
          bankName: 'ICICI Bank',
          branchName: 'Delhi Branch',
          accountType: 'CURRENT',
          businessName: 'ABC Private Limited',
          businessType: 'PRIVATE_LIMITED',
          gstNumber: '29ABCDE1234F1Z5',
          panNumber: 'ABCDE1234F'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Seller account created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        sellerId: { type: 'string' },
        accountHolderName: { type: 'string' },
        bankName: { type: 'string' },
        kycStatus: { type: 'string', example: 'PENDING' },
        status: { type: 'string', example: 'ACTIVE' },
        isVerified: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid seller account data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @Roles('ADMIN', 'SELLER')
  async createSellerAccount(
    @Body() dto: CreateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    // Sellers can only create their own account
    if (user.role === 'SELLER') {
      dto.sellerId = user.id;
    }

    return this.sellerAccountRepository.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update seller account' })
  @ApiResponse({ status: 200, description: 'Seller account updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  async updateSellerAccount(
    @Param('id') id: string,
    @Body() dto: UpdateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id);
    
    // Sellers can only update their own account
    if (user.role === 'SELLER' && account?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    return this.sellerAccountRepository.update(id, dto);
  }

  // ============================================================================
  // KYC OPERATIONS
  // ============================================================================

  @Post(':id/kyc/submit')
  @ApiOperation({ 
    summary: 'Submit KYC documents',
    description: 'Submit KYC documents for verification. Required for account activation.'
  })
  @ApiParam({ name: 'id', description: 'Seller account ID' })
  @ApiBody({
    description: 'KYC documents submission',
    schema: {
      type: 'object',
      required: ['documents'],
      properties: {
        documents: {
          type: 'object',
          properties: {
            panCard: {
              type: 'object',
              properties: {
                number: { type: 'string', example: 'ABCDE1234F' },
                imageUrl: { type: 'string', example: 'https://example.com/pan.jpg' }
              }
            },
            aadharCard: {
              type: 'object',
              properties: {
                number: { type: 'string', example: '1234-5678-9012' },
                imageUrl: { type: 'string', example: 'https://example.com/aadhar.jpg' }
              }
            },
            bankStatement: {
              type: 'object',
              properties: {
                imageUrl: { type: 'string', example: 'https://example.com/statement.pdf' }
              }
            },
            gstCertificate: {
              type: 'object',
              properties: {
                number: { type: 'string', example: '29ABCDE1234F1Z5' },
                imageUrl: { type: 'string', example: 'https://example.com/gst.pdf' }
              }
            }
          }
        },
        metadata: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'KYC documents submitted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        kycStatus: { type: 'string', example: 'SUBMITTED' },
        message: { type: 'string', example: 'KYC documents submitted for verification' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid KYC data or account not eligible for KYC submission' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  async submitKyc(
    @Param('id') id: string,
    @Body() dto: Omit<SubmitKycDto, 'accountId'>,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id);
    
    // Sellers can only submit KYC for their own account
    if (user.role === 'SELLER' && account?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    const submitDto: SubmitKycDto = {
      ...dto,
      accountId: id,
    };

    // Get current account and submit KYC
    const currentAccount = await this.sellerAccountRepository.findById(id);
    if (!currentAccount) {
      throw new Error('Account not found');
    }

    currentAccount.submitKyc(submitDto.documents);
    
    return this.sellerAccountRepository.update(id, {
      kycStatus: currentAccount.kycStatus,
      kycDocuments: currentAccount.kycDocuments,
      updatedAt: new Date(),
    });
  }

  @Put(':id/kyc/verify')
  @ApiOperation({ summary: 'Verify KYC documents' })
  @ApiResponse({ status: 200, description: 'KYC verified successfully' })
  @ApiResponse({ status: 400, description: 'Cannot verify KYC' })
  @Roles('ADMIN', 'FINANCE')
  async verifyKyc(
    @Param('id') id: string,
    @Body() dto: Omit<VerifyKycDto, 'accountId'>,
    @CurrentUser() user: any,
  ) {
    const verifyDto: VerifyKycDto = {
      ...dto,
      accountId: id,
      verifiedBy: user.id,
    };

    // Get current account and verify KYC
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    account.verifyKyc(verifyDto.verifiedBy, verifyDto.notes);
    
    return this.sellerAccountRepository.update(id, {
      kycStatus: account.kycStatus,
      isVerified: account.isVerified,
      verifiedAt: account.verifiedAt,
      verificationDetails: account.verificationDetails,
      updatedAt: new Date(),
    });
  }

  @Put(':id/kyc/reject')
  @ApiOperation({ summary: 'Reject KYC documents' })
  @ApiResponse({ status: 200, description: 'KYC rejected successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reject KYC' })
  @Roles('ADMIN', 'FINANCE')
  async rejectKyc(
    @Param('id') id: string,
    @Body() dto: Omit<RejectKycDto, 'accountId'>,
    @CurrentUser() user: any,
  ) {
    const rejectDto: RejectKycDto = {
      ...dto,
      accountId: id,
      rejectedBy: user.id,
    };

    // Get current account and reject KYC
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    account.rejectKyc(rejectDto.rejectedBy, rejectDto.reason, rejectDto.notes);
    
    return this.sellerAccountRepository.update(id, {
      kycStatus: account.kycStatus,
      isVerified: account.isVerified,
      verificationDetails: account.verificationDetails,
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // ACCOUNT STATUS MANAGEMENT
  // ============================================================================

  @Put(':id/status')
  @ApiOperation({ summary: 'Update account status' })
  @ApiResponse({ status: 200, description: 'Account status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status update' })
  @Roles('ADMIN', 'FINANCE')
  async updateAccountStatus(
    @Param('id') id: string,
    @Body() dto: Omit<UpdateAccountStatusDto, 'accountId'>,
    @CurrentUser() user: any,
  ) {
    const statusDto: UpdateAccountStatusDto = {
      ...dto,
      accountId: id,
      updatedBy: user.id,
    };

    // Get current account and update status
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Update status based on the new status
    switch (statusDto.status) {
      case 'ACTIVE':
        if (account.canActivate()) {
          account.activate();
        } else {
          throw new Error('Cannot activate account');
        }
        break;
      case 'SUSPENDED':
        if (account.canSuspend()) {
          account.suspend();
        } else {
          throw new Error('Cannot suspend account');
        }
        break;
      case 'CLOSED':
        if (account.canClose()) {
          account.close();
        } else {
          throw new Error('Cannot close account');
        }
        break;
      default:
        throw new Error('Invalid status');
    }
    
    return this.sellerAccountRepository.update(id, {
      status: account.status,
      metadata: { 
        ...account.metadata, 
        statusChangeReason: statusDto.reason,
        statusChangedBy: statusDto.updatedBy,
        statusChangedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // RAZORPAY INTEGRATION
  // ============================================================================

  @Post(':id/razorpay/setup')
  @ApiOperation({ summary: 'Setup Razorpay integration' })
  @ApiResponse({ status: 200, description: 'Razorpay integration setup successfully' })
  @ApiResponse({ status: 400, description: 'Failed to setup Razorpay integration' })
  @Roles('ADMIN', 'FINANCE')
  async setupRazorpayIntegration(
    @Param('id') id: string,
    @Body() dto: Omit<SetupRazorpayAccountDto, 'accountId'>,
  ) {
    const setupDto: SetupRazorpayAccountDto = {
      ...dto,
      accountId: id,
    };

    // Get current account
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Create Razorpay fund account
    const fundAccountResult = await this.razorpayPayoutService.createFundAccount(account);
    
    // Update account with Razorpay data
    account.setRazorpayData({
      accountId: setupDto.razorpayAccountId,
      contactId: fundAccountResult.contactId,
      fundAccountId: fundAccountResult.fundAccountId,
    });
    
    return this.sellerAccountRepository.update(id, {
      razorpayAccountId: account.razorpayAccountId,
      razorpayContactId: account.razorpayContactId,
      razorpayFundAccountId: account.razorpayFundAccountId,
      updatedAt: new Date(),
    });
  }

  @Post(':id/razorpay/create-fund-account')
  @ApiOperation({ summary: 'Create Razorpay fund account' })
  @ApiResponse({ status: 200, description: 'Fund account created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create fund account' })
  @Roles('ADMIN', 'FINANCE')
  async createRazorpayFundAccount(@Param('id') id: string) {
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    const result = await this.razorpayPayoutService.createFundAccount(account);
    
    // Update account with fund account details
    return this.sellerAccountRepository.update(id, {
      razorpayContactId: result.contactId,
      razorpayFundAccountId: result.fundAccountId,
      updatedAt: new Date(),
    });
  }

  // ============================================================================
  // VALIDATION & REPORTING
  // ============================================================================

  @Get(':id/validation')
  @ApiOperation({ summary: 'Validate seller account setup' })
  @ApiResponse({ status: 200, description: 'Account validation completed' })
  async validateAccountSetup(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id);
    
    // Sellers can only validate their own account
    if (user.role === 'SELLER' && account?.sellerId !== user.id) {
      throw new Error('Access denied');
    }

    if (!account) {
      throw new Error('Account not found');
    }

    return this.settlementValidationService.validateSellerAccountSetup(account.sellerId);
  }

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Get accounts with pending KYC' })
  @ApiResponse({ status: 200, description: 'Pending KYC accounts retrieved' })
  @Roles('ADMIN', 'FINANCE')
  async getPendingKycAccounts(@Query() pagination: PaginationOptions) {
    return this.sellerAccountRepository.findAccountsRequiringKyc(pagination);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get verified accounts' })
  @ApiResponse({ status: 200, description: 'Verified accounts retrieved' })
  @Roles('ADMIN', 'FINANCE')
  async getVerifiedAccounts(@Query() pagination: PaginationOptions) {
    return this.sellerAccountRepository.findVerifiedAccounts(pagination);
  }

  // ============================================================================
  // SELLER ACCESS ENDPOINTS
  // ============================================================================

  @Get('my-account')
  @ApiOperation({ summary: 'Get current seller account' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved' })
  @Roles('SELLER')
  async getMyAccount(
    @Query() includes: SellerAccountIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.sellerAccountRepository.findBySellerId(user.id, includes);
  }

  @Post('my-account')
  @ApiOperation({ summary: 'Create seller account for current user' })
  @ApiResponse({ status: 201, description: 'Seller account created successfully' })
  @Roles('SELLER')
  async createMyAccount(
    @Body() dto: Omit<CreateSellerAccountDto, 'sellerId'>,
    @CurrentUser() user: any,
  ) {
    const createDto: CreateSellerAccountDto = {
      ...dto,
      sellerId: user.id,
    };

    return this.sellerAccountRepository.create(createDto);
  }

  @Put('my-account')
  @ApiOperation({ summary: 'Update current seller account' })
  @ApiResponse({ status: 200, description: 'Seller account updated successfully' })
  @Roles('SELLER')
  async updateMyAccount(
    @Body() dto: UpdateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findBySellerId(user.id);
    if (!account) {
      throw new Error('Account not found');
    }

    return this.sellerAccountRepository.update(account.id, dto);
  }
}