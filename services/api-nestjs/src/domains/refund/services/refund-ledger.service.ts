import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { RefundRepository } from '../repositories/refund.repository';
import { RefundLedgerEntry } from '../entities/refund.entity';
import { CreateRefundLedgerEntryDto } from '../dtos/create-refund-ledger-entry.dto';

import { 
  RefundLedgerEntryType, 
  RefundAccountType 
} from '../enums/refund-status.enum';

export interface LedgerBalance {
  accountType: RefundAccountType;
  accountId?: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

export interface LedgerSummary {
  refundId: string;
  totalDebits: number;
  totalCredits: number;
  netAmount: number;
  currency: string;
  entryCount: number;
  balancesByAccount: LedgerBalance[];
}

@Injectable()
export class RefundLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundRepository: RefundRepository,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // LEDGER ENTRY MANAGEMENT
  // ============================================================================

  async createEntry(
    createEntryDto: CreateRefundLedgerEntryDto,
    tx?: any
  ): Promise<RefundLedgerEntry> {
    this.logger.log('RefundLedgerService.createEntry', {
      refundId: createEntryDto.refundId,
      entryType: createEntryDto.entryType,
      amount: createEntryDto.amount,
      accountType: createEntryDto.accountType,
    });

    // Validate entry data
    this.validateLedgerEntry(createEntryDto);

    // Calculate running balance
    const runningBalance = await this.calculateRunningBalance(
      createEntryDto.refundId,
      createEntryDto.accountType,
      createEntryDto.accountId,
      createEntryDto.amount,
      tx
    );

    const entryData = {
      ...createEntryDto,
      runningBalance,
      createdAt: new Date(),
    };

    const entry = await this.refundRepository.createLedgerEntry(entryData, tx);

    this.logger.log('Ledger entry created successfully', {
      entryId: entry.id,
      refundId: entry.refundId,
      amount: entry.amount,
      runningBalance: entry.runningBalance,
    });

    return entry;
  }

  async createMultipleEntries(
    entries: CreateRefundLedgerEntryDto[],
    tx?: any
  ): Promise<RefundLedgerEntry[]> {
    this.logger.log('RefundLedgerService.createMultipleEntries', {
      count: entries.length,
    });

    const createdEntries: RefundLedgerEntry[] = [];

    // Process entries in order to maintain correct running balances
    for (const entryDto of entries) {
      const entry = await this.createEntry(entryDto, tx);
      createdEntries.push(entry);
    }

    return createdEntries;
  }

  // ============================================================================
  // STANDARD REFUND LEDGER ENTRIES
  // ============================================================================

  async createRefundInitiatedEntries(
    refundId: string,
    amount: number,
    currency: string,
    customerId: string,
    createdBy: string,
    tx?: any
  ): Promise<RefundLedgerEntry[]> {
    const entries: CreateRefundLedgerEntryDto[] = [
      {
        refundId,
        entryType: RefundLedgerEntryType.REFUND_INITIATED,
        amount: -amount, // Debit from customer (liability created)
        currency,
        accountType: RefundAccountType.CUSTOMER,
        accountId: customerId,
        description: `Refund liability created for customer`,
        createdBy,
      },
      {
        refundId,
        entryType: RefundLedgerEntryType.REFUND_INITIATED,
        amount: amount, // Credit to platform (liability to process)
        currency,
        accountType: RefundAccountType.PLATFORM,
        description: `Refund processing liability`,
        createdBy,
      },
    ];

    return this.createMultipleEntries(entries, tx);
  }

  async createRefundProcessedEntries(
    refundId: string,
    processedAmount: number,
    gatewayFees: number,
    currency: string,
    customerId: string,
    gatewayRefundId: string,
    processedBy: string,
    tx?: any
  ): Promise<RefundLedgerEntry[]> {
    const entries: CreateRefundLedgerEntryDto[] = [
      {
        refundId,
        entryType: RefundLedgerEntryType.REFUND_PROCESSED,
        amount: processedAmount, // Credit to customer (actual refund)
        currency,
        accountType: RefundAccountType.CUSTOMER,
        accountId: customerId,
        description: `Refund processed via gateway`,
        reference: gatewayRefundId,
        createdBy: processedBy,
      },
      {
        refundId,
        entryType: RefundLedgerEntryType.REFUND_PROCESSED,
        amount: -processedAmount, // Debit from platform
        currency,
        accountType: RefundAccountType.PLATFORM,
        description: `Refund amount debited from platform`,
        reference: gatewayRefundId,
        createdBy: processedBy,
      },
    ];

    // Add gateway fee entry if applicable
    if (gatewayFees > 0) {
      entries.push({
        refundId,
        entryType: RefundLedgerEntryType.GATEWAY_FEE,
        amount: -gatewayFees, // Debit from platform
        currency,
        accountType: RefundAccountType.PLATFORM,
        description: `Gateway refund processing fees`,
        reference: gatewayRefundId,
        createdBy: processedBy,
      });

      entries.push({
        refundId,
        entryType: RefundLedgerEntryType.GATEWAY_FEE,
        amount: gatewayFees, // Credit to gateway
        currency,
        accountType: RefundAccountType.GATEWAY,
        description: `Gateway refund fees collected`,
        reference: gatewayRefundId,
        createdBy: processedBy,
      });
    }

    return this.createMultipleEntries(entries, tx);
  }

  async createMerchantImpactEntries(
    refundId: string,
    merchantShare: number,
    platformFee: number,
    currency: string,
    merchantId: string,
    createdBy: string,
    tx?: any
  ): Promise<RefundLedgerEntry[]> {
    const entries: CreateRefundLedgerEntryDto[] = [
      {
        refundId,
        entryType: RefundLedgerEntryType.REFUND_PROCESSED,
        amount: -merchantShare, // Debit from merchant
        currency,
        accountType: RefundAccountType.MERCHANT,
        accountId: merchantId,
        description: `Merchant share of refund`,
        createdBy,
      },
    ];

    // Platform fee adjustment if applicable
    if (platformFee > 0) {
      entries.push({
        refundId,
        entryType: RefundLedgerEntryType.FEE_DEDUCTED,
        amount: platformFee, // Credit platform fee back
        currency,
        accountType: RefundAccountType.PLATFORM,
        description: `Platform fee adjustment for refund`,
        createdBy,
      });
    }

    return this.createMultipleEntries(entries, tx);
  }

  async createAdjustmentEntry(
    refundId: string,
    adjustmentAmount: number,
    adjustmentReason: string,
    currency: string,
    accountType: RefundAccountType,
    accountId: string | undefined,
    createdBy: string,
    tx?: any
  ): Promise<RefundLedgerEntry> {
    return this.createEntry({
      refundId,
      entryType: RefundLedgerEntryType.ADJUSTMENT_APPLIED,
      amount: adjustmentAmount,
      currency,
      accountType,
      accountId,
      description: `Adjustment: ${adjustmentReason}`,
      createdBy,
    }, tx);
  }

  // ============================================================================
  // LEDGER QUERIES & REPORTING
  // ============================================================================

  async getLedgerSummary(refundId: string): Promise<LedgerSummary> {
    this.logger.log('RefundLedgerService.getLedgerSummary', { refundId });

    const entries = await this.refundRepository.findLedgerEntriesByRefundId(refundId);

    if (entries.length === 0) {
      throw new Error('No ledger entries found for refund');
    }

    const currency = entries[0].currency;
    let totalDebits = 0;
    let totalCredits = 0;

    // Calculate totals
    for (const entry of entries) {
      if (entry.amount > 0) {
        totalCredits += entry.amount;
      } else {
        totalDebits += Math.abs(entry.amount);
      }
    }

    // Calculate balances by account
    const balancesByAccount = this.calculateBalancesByAccount(entries);

    return {
      refundId,
      totalDebits,
      totalCredits,
      netAmount: totalCredits - totalDebits,
      currency,
      entryCount: entries.length,
      balancesByAccount,
    };
  }

  async getAccountBalance(
    accountType: RefundAccountType,
    accountId?: string,
    currency: string = 'INR'
  ): Promise<LedgerBalance> {
    this.logger.log('RefundLedgerService.getAccountBalance', {
      accountType,
      accountId,
      currency,
    });

    const entries = await this.refundRepository.findLedgerEntriesByAccount(
      accountType,
      accountId,
      currency
    );

    const balance = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const lastUpdated = entries.length > 0 
      ? new Date(Math.max(...entries.map(e => e.createdAt.getTime())))
      : new Date();

    return {
      accountType,
      accountId,
      balance,
      currency,
      lastUpdated,
    };
  }

  async getRefundLedgerEntries(
    refundId: string,
    options: {
      entryType?: RefundLedgerEntryType;
      accountType?: RefundAccountType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<RefundLedgerEntry[]> {
    return this.refundRepository.findLedgerEntriesByRefundId(refundId, options);
  }

  async validateLedgerBalance(refundId: string): Promise<{
    isBalanced: boolean;
    discrepancy?: number;
    details: LedgerSummary;
  }> {
    this.logger.log('RefundLedgerService.validateLedgerBalance', { refundId });

    const summary = await this.getLedgerSummary(refundId);

    // For a balanced ledger, total debits should equal total credits
    const discrepancy = Math.abs(summary.totalCredits - summary.totalDebits);
    const isBalanced = discrepancy < 0.01; // Allow for minor rounding differences

    if (!isBalanced) {
      this.logger.warn('Ledger imbalance detected', {
        refundId,
        discrepancy,
        totalCredits: summary.totalCredits,
        totalDebits: summary.totalDebits,
      });
    }

    return {
      isBalanced,
      discrepancy: isBalanced ? undefined : discrepancy,
      details: summary,
    };
  }

  // ============================================================================
  // RECONCILIATION & AUDIT
  // ============================================================================

  async reconcileLedgerWithRefund(refundId: string): Promise<{
    isReconciled: boolean;
    discrepancies: Array<{
      field: string;
      ledgerValue: number;
      refundValue: number;
      difference: number;
    }>;
  }> {
    this.logger.log('RefundLedgerService.reconcileLedgerWithRefund', { refundId });

    // Get refund details
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    // Get ledger summary
    const ledgerSummary = await this.getLedgerSummary(refundId);

    const discrepancies: Array<{
      field: string;
      ledgerValue: number;
      refundValue: number;
      difference: number;
    }> = [];

    // Check processed amount
    const processedAmount = refund.processedAmount || refund.approvedAmount;
    const ledgerProcessedAmount = this.calculateProcessedAmountFromLedger(ledgerSummary);
    
    if (Math.abs(processedAmount - ledgerProcessedAmount) > 0.01) {
      discrepancies.push({
        field: 'processedAmount',
        ledgerValue: ledgerProcessedAmount,
        refundValue: processedAmount,
        difference: processedAmount - ledgerProcessedAmount,
      });
    }

    // Check fees
    const ledgerFees = this.calculateFeesFromLedger(ledgerSummary);
    
    if (Math.abs(refund.refundFees - ledgerFees) > 0.01) {
      discrepancies.push({
        field: 'refundFees',
        ledgerValue: ledgerFees,
        refundValue: refund.refundFees,
        difference: refund.refundFees - ledgerFees,
      });
    }

    return {
      isReconciled: discrepancies.length === 0,
      discrepancies,
    };
  }

  async generateLedgerReport(
    filters: {
      refundIds?: string[];
      accountType?: RefundAccountType;
      accountId?: string;
      entryType?: RefundLedgerEntryType;
      dateFrom?: Date;
      dateTo?: Date;
      currency?: string;
    } = {}
  ): Promise<{
    entries: RefundLedgerEntry[];
    summary: {
      totalEntries: number;
      totalDebits: number;
      totalCredits: number;
      netAmount: number;
      currency: string;
    };
  }> {
    this.logger.log('RefundLedgerService.generateLedgerReport', { filters });

    const entries = await this.refundRepository.findLedgerEntriesWithFilters(filters);

    let totalDebits = 0;
    let totalCredits = 0;
    const currency = filters.currency || 'INR';

    for (const entry of entries) {
      if (entry.amount > 0) {
        totalCredits += entry.amount;
      } else {
        totalDebits += Math.abs(entry.amount);
      }
    }

    return {
      entries,
      summary: {
        totalEntries: entries.length,
        totalDebits,
        totalCredits,
        netAmount: totalCredits - totalDebits,
        currency,
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validateLedgerEntry(entryDto: CreateRefundLedgerEntryDto): void {
    if (!entryDto.refundId) {
      throw new Error('Refund ID is required');
    }

    if (!entryDto.entryType) {
      throw new Error('Entry type is required');
    }

    if (entryDto.amount === 0) {
      throw new Error('Entry amount cannot be zero');
    }

    if (!entryDto.accountType) {
      throw new Error('Account type is required');
    }

    if (!entryDto.description) {
      throw new Error('Entry description is required');
    }

    if (!entryDto.createdBy) {
      throw new Error('Created by is required');
    }
  }

  private async calculateRunningBalance(
    refundId: string,
    accountType: RefundAccountType,
    accountId: string | undefined,
    newAmount: number,
    tx?: any
  ): Promise<number> {
    // Get the last entry for this account
    const lastEntry = await this.refundRepository.findLastLedgerEntry(
      refundId,
      accountType,
      accountId,
      tx
    );

    const previousBalance = lastEntry?.runningBalance || 0;
    return previousBalance + newAmount;
  }

  private calculateBalancesByAccount(entries: RefundLedgerEntry[]): LedgerBalance[] {
    const balanceMap = new Map<string, LedgerBalance>();

    for (const entry of entries) {
      const key = `${entry.accountType}:${entry.accountId || 'default'}`;
      
      if (!balanceMap.has(key)) {
        balanceMap.set(key, {
          accountType: entry.accountType,
          accountId: entry.accountId,
          balance: 0,
          currency: entry.currency,
          lastUpdated: entry.createdAt,
        });
      }

      const balance = balanceMap.get(key)!;
      balance.balance += entry.amount;
      
      if (entry.createdAt > balance.lastUpdated) {
        balance.lastUpdated = entry.createdAt;
      }
    }

    return Array.from(balanceMap.values());
  }

  private calculateProcessedAmountFromLedger(summary: LedgerSummary): number {
    // Find customer credit entries (positive amounts to customer account)
    const customerBalance = summary.balancesByAccount.find(
      b => b.accountType === RefundAccountType.CUSTOMER
    );

    return customerBalance?.balance || 0;
  }

  private calculateFeesFromLedger(summary: LedgerSummary): number {
    // This would calculate total fees from fee-related entries
    // Implementation depends on how fees are tracked in the ledger
    return 0; // Placeholder