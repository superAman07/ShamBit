import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiBody
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

import { PublicSellerListResponse } from '../dtos/public-seller.dto';

// Import the real auth guards and decorators
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser, Public } from '../../../common/decorators';
import { UserRole } from '../../../common/types';

@ApiTags('Seller Accounts')
@ApiBearerAuth()
@Controller('seller-accounts')
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
  @Public()
  @ApiOperation({ 
    summary: 'Get public seller listings',
    description: 'Get public seller information for ecommerce listings. Returns only seller name, store name, and verification status.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Public seller listings retrieved successfully',
    type: PublicSellerListResponse
  })
  async findAllPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PublicSellerListResponse> {
    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    
    // For testing: show all sellers regardless of verification status
    // In production: uncomment the filters below to only show verified sellers
    const filters: SellerAccountFilters = {
      // isVerified: true,
      status: 'ACTIVE'
    };
    
    return this.sellerAccountRepository.findAllPublic(filters, pagination);
  }

  @Get('admin')
  @ApiOperation({ 
    summary: 'Get all seller accounts (Admin only)',
    description: 'Get complete seller account information including sensitive data. Admin access required.'
  })
  @ApiResponse({ status: 200, description: 'Seller accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async findAllAdmin(
    @Query() filters: SellerAccountFilters,
    @Query() includes: SellerAccountIncludeOptions,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    
    return this.sellerAccountRepository.findAll(filters, pagination, undefined, includes);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get seller account by ID' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async findById(
    @Param('id') id: string,
    @Query() includes: SellerAccountIncludeOptions,
    @Req() request?: any,
  ) {
    // Validate ID format (basic validation)
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Invalid ID format');
    }

    try {
      const user = request?.user;
      const account = await this.sellerAccountRepository.findById(id, includes);
      
      // Check if account exists
      if (!account) {
        throw new NotFoundException('Seller account not found');
      }

      // If user is authenticated and is a seller, check access
      if (user?.roles?.includes(UserRole.SELLER) && account.sellerId !== user.id) {
        throw new UnauthorizedException('Access denied');
      }

      // For public access (no user), return limited information
      if (!user) {
        return {
          id: account.id,
          sellerName: account.accountHolderName,
          storeName: account.businessName,
          isVerified: account.isVerified,
          createdAt: account.createdAt
        };
      }

      return account;
    } catch (error) {
      // Handle database errors (like invalid ID format for database)
      if (error.message?.includes('Invalid ID') || error.message?.includes('invalid input syntax')) {
        throw new BadRequestException('Invalid ID format');
      }
      
      // Re-throw known HTTP exceptions
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Handle unexpected errors
      console.error('Error in findById:', error);
      throw new NotFoundException('Seller account not found');
    }
  }

  @Get('seller/:sellerId')
  @Public()
  @ApiOperation({ summary: 'Get seller account by seller ID' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  @ApiResponse({ status: 400, description: 'Invalid seller ID format' })
  async findBySellerId(
    @Param('sellerId') sellerId: string,
    @Query() includes: SellerAccountIncludeOptions,
    @Req() request?: any,
  ) {
    // Validate seller ID format
    if (!sellerId || sellerId.trim().length === 0) {
      throw new BadRequestException('Invalid seller ID format');
    }

    try {
      const user = request?.user;
      
      // If user is authenticated and is a seller, check access
      if (user?.roles?.includes(UserRole.SELLER) && sellerId !== user.id) {
        throw new UnauthorizedException('Access denied');
      }

      const account = await this.sellerAccountRepository.findBySellerId(sellerId, includes);
      
      if (!account) {
        throw new NotFoundException('Seller account not found');
      }

      // For public access (no user), return limited information
      if (!user) {
        return {
          id: account.id,
          sellerName: account.accountHolderName,
          storeName: account.businessName,
          isVerified: account.isVerified,
          createdAt: account.createdAt
        };
      }

      return account;
    } catch (error) {
      // Handle database errors
      if (error.message?.includes('Invalid ID') || error.message?.includes('invalid input syntax')) {
        throw new BadRequestException('Invalid seller ID format');
      }
      
      // Re-throw known HTTP exceptions
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Handle unexpected errors
      console.error('Error in findBySellerId:', error);
      throw new NotFoundException('Seller account not found');
    }
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create a new seller account',
    description: 'Create a new seller account with bank details and business information. Allows BUYER users to upgrade to SELLER role.'
  })
  @ApiBody({ 
    type: CreateSellerAccountDto,
    description: 'Seller account creation data'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Seller account created successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid seller account data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.BUYER)
  async createSellerAccount(
    @Body() dto: CreateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    // Non-admin users can only create their own account
    if (user.roles?.includes(UserRole.SELLER) || user.roles?.includes(UserRole.BUYER)) {
      dto.sellerId = user.id;
    }

    console.log('🔍 Creating seller account with:', JSON.stringify(dto, null, 2));
    console.log('👤 User context:', JSON.stringify(user, null, 2));

    try {
      const result = await this.sellerAccountRepository.create(dto);
      console.log('✅ Seller account created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('❌ Failed to create seller account:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update seller account' })
  @ApiResponse({ status: 200, description: 'Seller account updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.BUYER)
  async updateSellerAccount(
    @Param('id') id: string,
    @Body() dto: UpdateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    const account = await this.sellerAccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundException('Seller account not found');
    }
    
    // Non-admin users can only update their own account
    if ((user.roles?.includes(UserRole.SELLER) || user.roles?.includes(UserRole.BUYER)) && account.sellerId !== user.id) {
      throw new UnauthorizedException('Access denied');
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
  @ApiResponse({ 
    status: 200, 
    description: 'KYC documents submitted successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid KYC data or account not eligible for KYC submission' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Seller account not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.BUYER)
  async submitKyc(
    @Param('id') id: string,
    @Body() dto: Omit<SubmitKycDto, 'accountId'>,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundException('Seller account not found');
    }
    
    // Non-admin users can only submit KYC for their own account
    if ((user.roles?.includes(UserRole.SELLER) || user.roles?.includes(UserRole.BUYER)) && account.sellerId !== user.id) {
      throw new UnauthorizedException('Access denied');
    }

    const submitDto: SubmitKycDto = {
      ...dto,
      accountId: id,
    };

    // Get current account and submit KYC
    const currentAccount = await this.sellerAccountRepository.findById(id);
    if (!currentAccount) {
      throw new NotFoundException('Account not found');
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
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
      throw new NotFoundException('Account not found');
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
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
      throw new NotFoundException('Account not found');
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
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
      throw new NotFoundException('Account not found');
    }

    // Update status based on the new status
    switch (statusDto.status) {
      case 'ACTIVE':
        if (account.canActivate()) {
          account.activate();
        } else {
          throw new BadRequestException('Cannot activate account');
        }
        break;
      case 'SUSPENDED':
        if (account.canSuspend()) {
          account.suspend();
        } else {
          throw new BadRequestException('Cannot suspend account');
        }
        break;
      case 'CLOSED':
        if (account.canClose()) {
          account.close();
        } else {
          throw new BadRequestException('Cannot close account');
        }
        break;
      default:
        throw new BadRequestException('Invalid status');
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
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
      throw new NotFoundException('Account not found');
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async createRazorpayFundAccount(@Param('id') id: string) {
    const account = await this.sellerAccountRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
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
  @Public()
  @ApiOperation({ summary: 'Validate seller account setup' })
  @ApiResponse({ status: 200, description: 'Account validation completed' })
  async validateAccountSetup(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const account = await this.sellerAccountRepository.findById(id);
    
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    
    // If user is authenticated and is a seller, check access
    if (user?.roles?.includes(UserRole.SELLER) && account.sellerId !== user.id) {
      throw new UnauthorizedException('Access denied');
    }

    return this.settlementValidationService.validateSellerAccountSetup(account.sellerId);
  }

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Get accounts with pending KYC' })
  @ApiResponse({ status: 200, description: 'Pending KYC accounts retrieved' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async getPendingKycAccounts(@Query() pagination: PaginationOptions) {
    return this.sellerAccountRepository.findAccountsRequiringKyc(pagination);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get verified accounts' })
  @ApiResponse({ status: 200, description: 'Verified accounts retrieved' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async getVerifiedAccounts(@Query() pagination: PaginationOptions) {
    return this.sellerAccountRepository.findVerifiedAccounts(pagination);
  }

  // ============================================================================
  // SELLER ACCESS ENDPOINTS
  // ============================================================================

  @Get('my-account')
  @ApiOperation({ summary: 'Get current seller account' })
  @ApiResponse({ status: 200, description: 'Seller account retrieved' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async getMyAccount(
    @Query() includes: SellerAccountIncludeOptions,
    @CurrentUser() user: any,
  ) {
    return this.sellerAccountRepository.findBySellerId(user.id, includes);
  }

  @Post('my-account')
  @ApiOperation({ summary: 'Create seller account for current user' })
  @ApiResponse({ status: 201, description: 'Seller account created successfully' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async updateMyAccount(
    @Body() dto: UpdateSellerAccountDto,
    @CurrentUser() user: any,
  ) {
    const account = await this.sellerAccountRepository.findBySellerId(user.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.sellerAccountRepository.update(account.id, dto);
  }
}