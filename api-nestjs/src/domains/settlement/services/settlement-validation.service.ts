import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { SettlementValidators } from '../settlement.validators';
import { Settlement } from '../entities/settlement.entity';
import { SellerAccount } from '../entities/seller-account.entity';
import { SellerWallet } from '../entities/seller-wallet.entity';
import { KycStatus, SellerAccountStatus } from '../enums/settlement-status.enum';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SettlementEligibilityCheck {
  isEligible: boolean;
  reasons: string[];
  requirements: string[];
  accountStatus: {
    isActive: boolean;
    isVerified: boolean;
    hasRazorpayIntegration: boolean;
    kycStatus: string;
  };
  walletStatus: {
    availableBalance: number;
    minimumRequired: number;
    canSettle: boolean;
  };
}

@Injectable()
export class SettlementValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  // ============================================================================
  // SETTLEMENT VALIDATION
  // ============================================================================

  async validateSettlementCreation(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date,
    netAmount: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic date validation
      SettlementValidators.validateDateRange(periodStart, periodEnd);

      // Check for overlapping settlements
      const overlappingSettlements = await this.findOverlappingSettlements(
        sellerId,
        periodStart,
        periodEnd
      );

      if (overlappingSettlements.length > 0) {
        warnings.push(`Found ${overlappingSettlements.length} overlapping settlements`);
      }

      // Check for concurrent active settlements
      const activeSettlements = await this.findActiveSettlements(sellerId);
      if (activeSettlements.length > 0) {
        errors.push('Seller has active settlements that must be completed first');
      }

      // Validate hold period
      const holdPeriodValidation = await this.validateHoldPeriod(sellerId, periodEnd);
      if (!holdPeriodValidation.isValid) {
        warnings.push(...holdPeriodValidation.warnings);
      }

      // Validate minimum amount
      if (netAmount < 1) {
        errors.push('Net settlement amount must be at least ₹1');
      }

      // Check seller eligibility
      const eligibilityCheck = await this.checkSettlementEligibility(sellerId, netAmount);
      if (!eligibilityCheck.isEligible) {
        errors.push(...eligibilityCheck.reasons);
      }

    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateSettlementProcessing(settlement: Settlement): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Use existing validators
      SettlementValidators.validateSettlementProcessing(settlement);

      // Additional business validations
      const sellerAccount = await this.prisma.sellerAccount.findUnique({
        where: { id: settlement.sellerAccountId },
      });

      if (!sellerAccount) {
        errors.push('Seller account not found');
      } else {
        const account = new SellerAccount({
          ...sellerAccount,
          branchName: sellerAccount.branchName || undefined,
          upiId: sellerAccount.upiId || undefined,
          businessName: sellerAccount.businessName || undefined,
          businessType: sellerAccount.businessType || undefined,
          gstNumber: sellerAccount.gstNumber || undefined,
          panNumber: sellerAccount.panNumber || undefined,
          kycStatus: sellerAccount.kycStatus as KycStatus,
          status: sellerAccount.status as SellerAccountStatus,
          razorpayAccountId: sellerAccount.razorpayAccountId || undefined,
          razorpayContactId: sellerAccount.razorpayContactId || undefined,
          razorpayFundAccountId: sellerAccount.razorpayFundAccountId || undefined,
          kycDocuments: (sellerAccount.kycDocuments as any) || undefined,
          verificationDetails: (sellerAccount.verificationDetails as any) || undefined,
          verifiedAt: sellerAccount.verifiedAt || undefined,
          metadata: (sellerAccount.metadata as any) || {},
        });
        if (!account.canReceivePayouts()) {
          errors.push('Seller account is not eligible for payouts');
        }
      }

      // Check wallet balance
      const wallet = await this.prisma.sellerWallet.findUnique({
        where: { sellerId: settlement.sellerId },
      });

      if (!wallet) {
        errors.push('Seller wallet not found');
      } else {
        const walletEntity = new SellerWallet({
          ...wallet,
          availableBalance: parseFloat(wallet.availableBalance.toString()),
          pendingBalance: parseFloat(wallet.pendingBalance.toString()),
          reservedBalance: parseFloat(wallet.reservedBalance.toString()),
          totalBalance: parseFloat(wallet.totalBalance.toString()),
          lastSettlementAmount: wallet.lastSettlementAmount ? parseFloat(wallet.lastSettlementAmount.toString()) : undefined,
          lastSettlementAt: wallet.lastSettlementAt || undefined,
          metadata: (wallet.metadata as any) || {},
        });
        if (!walletEntity.canSettle(settlement.netAmount)) {
          errors.push('Insufficient wallet balance for settlement');
        }
      }

      // Check for recent failed settlements
      const recentFailures = await this.getRecentFailedSettlements(settlement.sellerId);
      if (recentFailures.length >= 3) {
        warnings.push('Seller has multiple recent failed settlements');
      }

    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // SELLER ELIGIBILITY CHECKS
  // ============================================================================

  async checkSettlementEligibility(
    sellerId: string,
    amount: number
  ): Promise<SettlementEligibilityCheck> {
    const reasons: string[] = [];
    const requirements: string[] = [];

    // Get seller account
    const sellerAccount = await this.prisma.sellerAccount.findUnique({
      where: { sellerId },
    });

    const accountStatus = {
      isActive: false,
      isVerified: false,
      hasRazorpayIntegration: false,
      kycStatus: 'PENDING',
    };

    if (!sellerAccount) {
      reasons.push('Seller account not found');
      requirements.push('Complete seller account setup');
    } else {
      const account = new SellerAccount({
        ...sellerAccount,
        branchName: sellerAccount.branchName || undefined,
        upiId: sellerAccount.upiId || undefined,
        businessName: sellerAccount.businessName || undefined,
        businessType: sellerAccount.businessType || undefined,
        gstNumber: sellerAccount.gstNumber || undefined,
        panNumber: sellerAccount.panNumber || undefined,
        kycStatus: sellerAccount.kycStatus as KycStatus,
        status: sellerAccount.status as SellerAccountStatus,
        razorpayAccountId: sellerAccount.razorpayAccountId || undefined,
        razorpayContactId: sellerAccount.razorpayContactId || undefined,
        razorpayFundAccountId: sellerAccount.razorpayFundAccountId || undefined,
        kycDocuments: (sellerAccount.kycDocuments as any) || undefined,
        verificationDetails: (sellerAccount.verificationDetails as any) || undefined,
        verifiedAt: sellerAccount.verifiedAt || undefined,
        metadata: (sellerAccount.metadata as any) || {},
      });
      
      accountStatus.isActive = account.isActive();
      accountStatus.isVerified = account.isVerified;
      accountStatus.hasRazorpayIntegration = account.hasRazorpayIntegration();
      accountStatus.kycStatus = account.kycStatus;

      if (!account.isActive()) {
        reasons.push('Seller account is not active');
        requirements.push('Activate seller account');
      }

      if (!account.isVerified) {
        reasons.push('Seller account is not verified');
        requirements.push('Complete KYC verification');
      }

      if (!account.hasRazorpayIntegration()) {
        reasons.push('Razorpay integration not configured');
        requirements.push('Setup Razorpay fund account');
      }
    }

    // Get wallet status
    const wallet = await this.prisma.sellerWallet.findUnique({
      where: { sellerId },
    });

    const walletStatus = {
      availableBalance: 0,
      minimumRequired: 100, // Default minimum
      canSettle: false,
    };

    if (!wallet) {
      reasons.push('Seller wallet not found');
      requirements.push('Initialize seller wallet');
    } else {
      const walletEntity = new SellerWallet({
        ...wallet,
        availableBalance: parseFloat(wallet.availableBalance.toString()),
        pendingBalance: parseFloat(wallet.pendingBalance.toString()),
        reservedBalance: parseFloat(wallet.reservedBalance.toString()),
        totalBalance: parseFloat(wallet.totalBalance.toString()),
        lastSettlementAmount: wallet.lastSettlementAmount ? parseFloat(wallet.lastSettlementAmount.toString()) : undefined,
        lastSettlementAt: wallet.lastSettlementAt || undefined,
        metadata: (wallet.metadata as any) || {},
      });
      
      walletStatus.availableBalance = walletEntity.getSettlableAmount();
      walletStatus.canSettle = walletEntity.canSettle(amount);

      if (!walletStatus.canSettle) {
        reasons.push(`Insufficient balance. Required: ₹${amount}, Available: ₹${walletStatus.availableBalance}`);
        requirements.push('Ensure sufficient wallet balance');
      }

      if (amount < walletStatus.minimumRequired) {
        reasons.push(`Amount below minimum settlement threshold of ₹${walletStatus.minimumRequired}`);
        requirements.push(`Minimum settlement amount is ₹${walletStatus.minimumRequired}`);
      }
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      requirements,
      accountStatus,
      walletStatus,
    };
  }

  async validateSellerAccountSetup(sellerId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const sellerAccount = await this.prisma.sellerAccount.findUnique({
        where: { sellerId },
      });

      if (!sellerAccount) {
        errors.push('Seller account not found');
        return { isValid: false, errors, warnings };
      }

      const account = new SellerAccount({
        ...sellerAccount,
        branchName: sellerAccount.branchName || undefined,
        upiId: sellerAccount.upiId || undefined,
        businessName: sellerAccount.businessName || undefined,
        businessType: sellerAccount.businessType || undefined,
        gstNumber: sellerAccount.gstNumber || undefined,
        panNumber: sellerAccount.panNumber || undefined,
        kycStatus: sellerAccount.kycStatus as KycStatus,
        status: sellerAccount.status as SellerAccountStatus,
        razorpayAccountId: sellerAccount.razorpayAccountId || undefined,
        razorpayContactId: sellerAccount.razorpayContactId || undefined,
        razorpayFundAccountId: sellerAccount.razorpayFundAccountId || undefined,
        kycDocuments: (sellerAccount.kycDocuments as any) || undefined,
        verificationDetails: (sellerAccount.verificationDetails as any) || undefined,
        verifiedAt: sellerAccount.verifiedAt || undefined,
        metadata: (sellerAccount.metadata as any) || {},
      });

      // Validate bank details
      try {
        account.validateBankDetails();
      } catch (error) {
        errors.push(error.message);
      }

      // Validate business details
      try {
        account.validateBusinessDetails();
      } catch (error) {
        errors.push(error.message);
      }

      // Check KYC status
      if (account.kycStatus === 'PENDING') {
        warnings.push('KYC verification is pending');
      } else if (account.kycStatus === 'REJECTED') {
        errors.push('KYC verification was rejected');
      }

      // Check Razorpay integration
      if (!account.hasRazorpayIntegration()) {
        warnings.push('Razorpay integration not configured');
      }

      // Check completion percentage
      const completionPercentage = account.getCompletionPercentage();
      if (completionPercentage < 100) {
        warnings.push(`Account setup is ${completionPercentage}% complete`);
      }

    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // BUSINESS RULE VALIDATIONS
  // ============================================================================

  async validateHoldPeriod(
    sellerId: string,
    periodEnd: Date,
    holdPeriodDays: number = 7
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      SettlementValidators.validateSettlementTiming(periodEnd, holdPeriodDays);
    } catch (error) {
      warnings.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateSettlementLimits(
    sellerId: string,
    amount: number,
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY'
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get settlement limits (these could be configured per seller tier)
    const limits = await this.getSettlementLimits(sellerId);

    // Check daily limit
    if (period === 'DAILY') {
      const todaySettlements = await this.getTodaySettlements(sellerId);
      const todayTotal = todaySettlements.reduce((sum, s) => sum + s.netAmount, 0);
      
      if (todayTotal + amount > limits.dailyLimit) {
        errors.push(`Daily settlement limit exceeded. Limit: ₹${limits.dailyLimit}, Current: ₹${todayTotal}`);
      }
    }

    // Check monthly limit
    const monthlySettlements = await this.getMonthlySettlements(sellerId);
    const monthlyTotal = monthlySettlements.reduce((sum, s) => sum + s.netAmount, 0);
    
    if (monthlyTotal + amount > limits.monthlyLimit) {
      errors.push(`Monthly settlement limit exceeded. Limit: ₹${limits.monthlyLimit}, Current: ₹${monthlyTotal}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async findOverlappingSettlements(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any[]> {
    return this.prisma.settlement.findMany({
      where: {
        sellerId,
        OR: [
          {
            periodStart: { lte: periodStart },
            periodEnd: { gte: periodStart },
          },
          {
            periodStart: { lte: periodEnd },
            periodEnd: { gte: periodEnd },
          },
          {
            periodStart: { gte: periodStart },
            periodEnd: { lte: periodEnd },
          },
        ],
      },
    });
  }

  private async findActiveSettlements(sellerId: string): Promise<any[]> {
    return this.prisma.settlement.findMany({
      where: {
        sellerId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });
  }

  private async getRecentFailedSettlements(sellerId: string): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.settlement.findMany({
      where: {
        sellerId,
        status: 'FAILED',
        failedAt: {
          gte: sevenDaysAgo,
        },
      },
    });
  }

  private async getSettlementLimits(sellerId: string): Promise<{
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
  }> {
    // In a real implementation, this would be based on seller tier, KYC status, etc.
    return {
      dailyLimit: 100000, // ₹1 lakh per day
      weeklyLimit: 500000, // ₹5 lakh per week
      monthlyLimit: 2000000, // ₹20 lakh per month
    };
  }

  private async getTodaySettlements(sellerId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.settlement.findMany({
      where: {
        sellerId,
        status: 'COMPLETED',
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        netAmount: true,
      },
    });
  }

  private async getMonthlySettlements(sellerId: string): Promise<any[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.prisma.settlement.findMany({
      where: {
        sellerId,
        status: 'COMPLETED',
        completedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        netAmount: true,
      },
    });
  }

  // ============================================================================
  // COMPLIANCE VALIDATIONS
  // ============================================================================

  async validateComplianceRequirements(sellerId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if seller is on any watchlists or has compliance issues
      const complianceIssues = await this.checkComplianceIssues(sellerId);
      
      if (complianceIssues.length > 0) {
        errors.push(...complianceIssues);
      }

      // Check for suspicious activity patterns
      const suspiciousActivity = await this.checkSuspiciousActivity(sellerId);
      
      if (suspiciousActivity.length > 0) {
        warnings.push(...suspiciousActivity);
      }

    } catch (error) {
      errors.push(`Compliance check failed: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async checkComplianceIssues(sellerId: string): Promise<string[]> {
    const issues: string[] = [];

    // Check for blocked/suspended status
    const sellerAccount = await this.prisma.sellerAccount.findUnique({
      where: { sellerId },
    });

    if (sellerAccount?.status === 'SUSPENDED') {
      issues.push('Seller account is suspended');
    }

    if (sellerAccount?.status === 'CLOSED') {
      issues.push('Seller account is closed');
    }

    // Add more compliance checks as needed
    // - AML checks
    // - Sanctions screening
    // - Risk scoring
    // - Regulatory compliance

    return issues;
  }

  private async checkSuspiciousActivity(sellerId: string): Promise<string[]> {
    const warnings: string[] = [];

    // Check for unusual settlement patterns
    const recentSettlements = await this.prisma.settlement.findMany({
      where: {
        sellerId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check for frequent settlements
    if (recentSettlements.length > 10) {
      warnings.push('High frequency of settlements detected');
    }

    // Check for large amount variations
    const amounts = recentSettlements.map(s => parseFloat(s.netAmount.toString()));
    if (amounts.length > 1) {
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const hasLargeVariation = amounts.some(amt => amt > avgAmount * 5);
      
      if (hasLargeVariation) {
        warnings.push('Unusual settlement amount patterns detected');
      }
    }

    return warnings;
  }
}