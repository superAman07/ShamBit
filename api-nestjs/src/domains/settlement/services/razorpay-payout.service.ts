import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { SellerAccount } from '../entities/seller-account.entity';

export interface CreatePayoutRequest {
  settlementId: string;
  amount: number;
  currency: string;
  sellerAccount: SellerAccount;
  description?: string;
  metadata?: any;
}

export interface PayoutResult {
  payoutId: string;
  status: string;
  response: any;
  fees?: number;
  tax?: number;
}

export interface PayoutStatusUpdate {
  payoutId: string;
  status: string;
  failureReason?: string;
  processedAt?: Date;
  utr?: string;
  response: any;
}

@Injectable()
export class RazorpayPayoutService {
  private readonly logger = new Logger(RazorpayPayoutService.name);
  private razorpay: any; // Use any to avoid type conflicts

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.initializeRazorpay();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeRazorpay(): void {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (!keyId || !keySecret) {
      if (nodeEnv === 'production') {
        throw new Error('Razorpay credentials not configured');
      } else {
        this.logger.warn('Razorpay credentials not configured - running in development mode without Razorpay');
        return;
      }
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    this.logger.log('Razorpay payout service initialized');
  }

  // ============================================================================
  // PAYOUT OPERATIONS
  // ============================================================================

  async createPayout(request: CreatePayoutRequest): Promise<PayoutResult> {
    this.loggerService.log('RazorpayPayoutService.createPayout', {
      settlementId: request.settlementId,
      amount: request.amount,
      currency: request.currency,
      sellerAccountId: request.sellerAccount.id,
    });

    try {
      // Validate seller account
      this.validateSellerAccount(request.sellerAccount);

      // Convert amount to paise (Razorpay expects amount in smallest currency unit)
      const amountInPaise = Math.round(request.amount * 100);

      // Prepare payout data
      const payoutData = {
        account_number: this.configService.get<string>('RAZORPAY_ACCOUNT_NUMBER'),
        fund_account_id: request.sellerAccount.razorpayFundAccountId!,
        amount: amountInPaise,
        currency: request.currency.toUpperCase(),
        mode: this.getPayoutMode(request.sellerAccount),
        purpose: 'settlement',
        queue_if_low_balance: true,
        reference_id: request.settlementId,
        narration: request.description || `Settlement payout - ${request.settlementId}`,
        notes: {
          settlement_id: request.settlementId,
          seller_id: request.sellerAccount.sellerId,
          seller_account_id: request.sellerAccount.id,
          ...request.metadata,
        },
      };

      this.logger.log('Creating Razorpay payout', { payoutData });

      // Check if Razorpay is initialized
      if (!this.razorpay) {
        throw new Error('Razorpay service not initialized - please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
      }

      // Create payout
      const payout = await this.razorpay.payouts.create(payoutData);

      this.logger.log('Razorpay payout created successfully', {
        payoutId: payout.id,
        status: payout.status,
        amount: payout.amount,
      });

      return {
        payoutId: payout.id,
        status: this.mapRazorpayStatus(payout.status),
        response: payout,
        fees: payout.fees ? payout.fees / 100 : undefined,
        tax: payout.tax ? payout.tax / 100 : undefined,
      };

    } catch (error) {
      this.logger.error('Failed to create Razorpay payout', {
        settlementId: request.settlementId,
        error: error.message,
        stack: error.stack,
      });

      throw new Error(`Payout creation failed: ${error.message}`);
    }
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutResult> {
    this.loggerService.log('RazorpayPayoutService.getPayoutStatus', { payoutId });

    if (!this.razorpay) {
      throw new Error('Razorpay service not initialized - please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    }

    try {
      const payout = await this.razorpay.payouts.fetch(payoutId);

      return {
        payoutId: payout.id,
        status: this.mapRazorpayStatus(payout.status),
        response: payout,
        fees: payout.fees ? payout.fees / 100 : undefined,
        tax: payout.tax ? payout.tax / 100 : undefined,
      };

    } catch (error) {
      this.logger.error('Failed to fetch Razorpay payout status', {
        payoutId,
        error: error.message,
      });

      throw new Error(`Failed to fetch payout status: ${error.message}`);
    }
  }

  async cancelPayout(payoutId: string): Promise<PayoutResult> {
    this.loggerService.log('RazorpayPayoutService.cancelPayout', { payoutId });

    try {
      const payout = await this.razorpay.payouts.cancel(payoutId);

      return {
        payoutId: payout.id,
        status: this.mapRazorpayStatus(payout.status),
        response: payout,
      };

    } catch (error) {
      this.logger.error('Failed to cancel Razorpay payout', {
        payoutId,
        error: error.message,
      });

      throw new Error(`Failed to cancel payout: ${error.message}`);
    }
  }

  // ============================================================================
  // FUND ACCOUNT MANAGEMENT
  // ============================================================================

  async createFundAccount(sellerAccount: SellerAccount): Promise<{
    fundAccountId: string;
    contactId: string;
    response: any;
  }> {
    this.loggerService.log('RazorpayPayoutService.createFundAccount', {
      sellerAccountId: sellerAccount.id,
      sellerId: sellerAccount.sellerId,
    });

    try {
      // Create contact first (if not exists)
      let contactId = sellerAccount.razorpayContactId;
      
      if (!contactId) {
        const contact = await this.createContact(sellerAccount);
        contactId = contact.id;
      }

      // Create fund account
      const fundAccountData = {
        customer_id: contactId,
        account_type: 'bank_account',
        bank_account: {
          name: sellerAccount.accountHolderName,
          ifsc: sellerAccount.ifscCode,
          account_number: sellerAccount.accountNumber,
        },
      };

      const fundAccount = await this.razorpay.fundAccount.create(fundAccountData);

      this.logger.log('Razorpay fund account created successfully', {
        fundAccountId: fundAccount.id,
        contactId,
        sellerAccountId: sellerAccount.id,
      });

      return {
        fundAccountId: fundAccount.id,
        contactId: contactId!,
        response: fundAccount,
      };

    } catch (error) {
      this.logger.error('Failed to create Razorpay fund account', {
        sellerAccountId: sellerAccount.id,
        error: error.message,
      });

      throw new Error(`Fund account creation failed: ${error.message}`);
    }
  }

  async createContact(sellerAccount: SellerAccount): Promise<any> {
    const contactData = {
      name: sellerAccount.accountHolderName,
      email: `seller-${sellerAccount.sellerId}@example.com`, // This should come from seller profile
      contact: '9999999999', // This should come from seller profile
      type: sellerAccount.businessType === 'INDIVIDUAL' ? 'customer' : 'vendor',
      reference_id: sellerAccount.sellerId,
      notes: {
        seller_id: sellerAccount.sellerId,
        seller_account_id: sellerAccount.id,
      },
    };

    return this.razorpay.contacts.create(contactData);
  }

  // ============================================================================
  // WEBHOOK HANDLING
  // ============================================================================

  async handlePayoutWebhook(payload: any, signature: string): Promise<PayoutStatusUpdate | null> {
    this.loggerService.log('RazorpayPayoutService.handlePayoutWebhook', {
      event: payload.event,
      payoutId: payload.payload?.payout?.entity?.id,
    });

    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const event = payload.event;
      const payout = payload.payload?.payout?.entity;

      if (!payout) {
        this.logger.warn('No payout data in webhook payload');
        return null;
      }

      // Process different payout events
      switch (event) {
        case 'payout.processed':
          return {
            payoutId: payout.id,
            status: 'processed',
            processedAt: new Date(payout.processed_at * 1000),
            utr: payout.utr,
            response: payout,
          };

        case 'payout.failed':
          return {
            payoutId: payout.id,
            status: 'failed',
            failureReason: payout.failure_reason,
            response: payout,
          };

        case 'payout.reversed':
          return {
            payoutId: payout.id,
            status: 'reversed',
            failureReason: payout.failure_reason,
            response: payout,
          };

        case 'payout.cancelled':
          return {
            payoutId: payout.id,
            status: 'cancelled',
            response: payout,
          };

        default:
          this.logger.log(`Unhandled payout webhook event: ${event}`);
          return null;
      }

    } catch (error) {
      this.logger.error('Failed to process payout webhook', {
        error: error.message,
        payload,
      });

      throw error;
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.warn('Razorpay webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================================================
  // BALANCE AND LIMITS
  // ============================================================================

  async getAccountBalance(): Promise<{
    balance: number;
    currency: string;
    lastUpdated: Date;
  }> {
    try {
      // Get the account ID from config or use default
      const accountId = this.configService.get<string>('RAZORPAY_ACCOUNT_ID');
      
      if (!accountId) {
        throw new Error('Razorpay account ID not configured');
      }

      const account = await this.razorpay.accounts.fetch(accountId);

      // Extract balance from account response
      const balanceInPaise = account.balance || account.balance_available || 0;
      
      return {
        balance: balanceInPaise / 100, // Convert from paise to rupees
        currency: 'INR',
        lastUpdated: new Date(),
      };

    } catch (error) {
      this.logger.error('Failed to fetch account balance', { error: error.message });
      throw new Error(`Failed to fetch account balance: ${error.message}`);
    }
  }

  async getPayoutLimits(): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    remainingDaily: number;
    remainingMonthly: number;
  }> {
    try {
      // This would typically come from Razorpay's account settings API
      // For now, return default limits
      return {
        dailyLimit: 1000000, // 10 lakh per day
        monthlyLimit: 10000000, // 1 crore per month
        remainingDaily: 1000000,
        remainingMonthly: 10000000,
      };

    } catch (error) {
      this.logger.error('Failed to fetch payout limits', { error: error.message });
      throw new Error(`Failed to fetch payout limits: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private validateSellerAccount(sellerAccount: SellerAccount): void {
    if (!sellerAccount.canReceivePayouts()) {
      throw new Error('Seller account is not eligible for payouts');
    }

    if (!sellerAccount.razorpayFundAccountId) {
      throw new Error('Seller account does not have Razorpay fund account configured');
    }
  }

  private getPayoutMode(sellerAccount: SellerAccount): string {
    // Determine payout mode based on account type and preferences
    if (sellerAccount.upiId) {
      return 'UPI';
    }

    return 'IMPS'; // Default to IMPS for bank transfers
  }

  private mapRazorpayStatus(razorpayStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'pending': 'pending',
      'processing': 'processing',
      'processed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'reversed': 'failed',
    };

    return statusMap[razorpayStatus] || razorpayStatus;
  }

  // ============================================================================
  // REPORTING METHODS
  // ============================================================================

  async getPayoutHistory(
    fromDate?: Date,
    toDate?: Date,
    count: number = 100,
    skip: number = 0
  ): Promise<{
    payouts: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const options: any = {
        count,
        skip,
      };

      if (fromDate) {
        options.from = Math.floor(fromDate.getTime() / 1000);
      }

      if (toDate) {
        options.to = Math.floor(toDate.getTime() / 1000);
      }

      const response = await this.razorpay.payouts.all(options);

      return {
        payouts: response.items || [],
        total: response.count || 0,
        hasMore: (response.items?.length || 0) === count,
      };

    } catch (error) {
      this.logger.error('Failed to fetch payout history', { error: error.message });
      throw new Error(`Failed to fetch payout history: ${error.message}`);
    }
  }

  async getPayoutSummary(
    fromDate: Date,
    toDate: Date
  ): Promise<{
    totalPayouts: number;
    totalAmount: number;
    successfulPayouts: number;
    successfulAmount: number;
    failedPayouts: number;
    failedAmount: number;
    pendingPayouts: number;
    pendingAmount: number;
  }> {
    try {
      const payouts = await this.getPayoutHistory(fromDate, toDate, 1000);

      let totalPayouts = 0;
      let totalAmount = 0;
      let successfulPayouts = 0;
      let successfulAmount = 0;
      let failedPayouts = 0;
      let failedAmount = 0;
      let pendingPayouts = 0;
      let pendingAmount = 0;

      for (const payout of payouts.payouts) {
        totalPayouts++;
        totalAmount += payout.amount / 100;

        switch (payout.status) {
          case 'processed':
            successfulPayouts++;
            successfulAmount += payout.amount / 100;
            break;
          case 'failed':
          case 'reversed':
            failedPayouts++;
            failedAmount += payout.amount / 100;
            break;
          case 'queued':
          case 'pending':
          case 'processing':
            pendingPayouts++;
            pendingAmount += payout.amount / 100;
            break;
        }
      }

      return {
        totalPayouts,
        totalAmount,
        successfulPayouts,
        successfulAmount,
        failedPayouts,
        failedAmount,
        pendingPayouts,
        pendingAmount,
      };

    } catch (error) {
      this.logger.error('Failed to generate payout summary', { error: error.message });
      throw new Error(`Failed to generate payout summary: ${error.message}`);
    }
  }
}
