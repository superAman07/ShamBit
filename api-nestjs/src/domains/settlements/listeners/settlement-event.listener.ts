import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  SettlementCreatedEvent,
  SettlementProcessingStartedEvent,
  SettlementCompletedEvent,
  SettlementFailedEvent,
  SettlementCancelledEvent,
  SettlementReconciledEvent,
  SettlementBatchStartedEvent,
  SettlementBatchCompletedEvent,
} from '../events/settlement.events';

import { SellerWalletRepository } from '../repositories/seller-wallet.repository';
import { WalletTransactionCategory } from '../enums/settlement-status.enum';

@Injectable()
export class SettlementEventListener {
  private readonly logger = new Logger(SettlementEventListener.name);

  constructor(
    private readonly sellerWalletRepository: SellerWalletRepository,
  ) {}

  // ============================================================================
  // SETTLEMENT LIFECYCLE EVENTS
  // ============================================================================

  @OnEvent('settlement.created')
  async handleSettlementCreated(event: SettlementCreatedEvent) {
    this.logger.log('Settlement created event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      netAmount: event.netAmount,
    });

    try {
      // Reserve the settlement amount in seller wallet
      const wallet = await this.sellerWalletRepository.findBySellerId(
        event.sellerId,
      );

      if (wallet && wallet.canSettle(event.netAmount)) {
        await this.sellerWalletRepository.reserveBalance(
          wallet.id,
          event.netAmount,
          {
            transactionId: this.generateTransactionId(),
            referenceType: 'SETTLEMENT',
            referenceId: event.settlementId,
            description: `Settlement reserve - ${event.settlementId}`,
            metadata: {
              settlementId: event.settlementId,
              periodStart: event.periodStart,
              periodEnd: event.periodEnd,
              ...event.metadata,
            },
          },
        );

        this.logger.log('Settlement amount reserved in wallet', {
          settlementId: event.settlementId,
          walletId: wallet.id,
          amount: event.netAmount,
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle settlement created event', {
        settlementId: event.settlementId,
        error: error.message,
      });
    }
  }

  @OnEvent('settlement.processing.started')
  async handleSettlementProcessingStarted(
    event: SettlementProcessingStartedEvent,
  ) {
    this.logger.log('Settlement processing started event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      processedBy: event.processedBy,
    });

    // Additional processing logic can be added here
    // For example:
    // - Send notification to seller
    // - Update analytics
    // - Trigger external integrations
  }

  @OnEvent('settlement.completed')
  async handleSettlementCompleted(event: SettlementCompletedEvent) {
    this.logger.log('Settlement completed event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      netAmount: event.netAmount,
      razorpayPayoutId: event.razorpayPayoutId,
    });

    try {
      // Debit the settlement amount from seller wallet
      const wallet = await this.sellerWalletRepository.findBySellerId(
        event.sellerId,
      );

      if (wallet) {
        await this.sellerWalletRepository.debitBalance(
          wallet.id,
          event.netAmount,
          WalletTransactionCategory.SETTLEMENT,
          {
            transactionId: this.generateTransactionId(),
            referenceType: 'SETTLEMENT',
            referenceId: event.settlementId,
            description: `Settlement payout - ${event.settlementId}`,
            metadata: {
              settlementId: event.settlementId,
              razorpayPayoutId: event.razorpayPayoutId,
              completedAt: event.completedAt,
              ...event.metadata,
            },
          },
        );

        // Update last settlement information
        await this.sellerWalletRepository.update(wallet.id, {
          lastSettlementAt: event.completedAt || new Date(),
          lastSettlementAmount: event.netAmount,
          updatedAt: new Date(),
        });

        this.logger.log('Settlement amount debited from wallet', {
          settlementId: event.settlementId,
          walletId: wallet.id,
          amount: event.netAmount,
        });
      }

      // Send settlement completion notification
      await this.sendSettlementNotification(
        event.sellerId,
        'SETTLEMENT_COMPLETED',
        {
          settlementId: event.settlementId,
          amount: event.netAmount,
          razorpayPayoutId: event.razorpayPayoutId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to handle settlement completed event', {
        settlementId: event.settlementId,
        error: error.message,
      });
    }
  }

  @OnEvent('settlement.failed')
  async handleSettlementFailed(event: SettlementFailedEvent) {
    this.logger.log('Settlement failed event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      failureReason: event.failureReason,
      retryCount: event.retryCount,
    });

    try {
      // Release reserved amount back to available balance
      const wallet = await this.sellerWalletRepository.findBySellerId(
        event.sellerId,
      );

      if (wallet) {
        await this.sellerWalletRepository.releaseReserve(
          wallet.id,
          event.netAmount,
          {
            transactionId: this.generateTransactionId(),
            referenceType: 'SETTLEMENT',
            referenceId: event.settlementId,
            description: `Settlement failed - reserve released - ${event.settlementId}`,
            metadata: {
              settlementId: event.settlementId,
              failureReason: event.failureReason,
              failureCode: event.failureCode,
              retryCount: event.retryCount,
              ...event.metadata,
            },
          },
        );

        this.logger.log('Reserved settlement amount released back to wallet', {
          settlementId: event.settlementId,
          walletId: wallet.id,
          amount: event.netAmount,
        });
      }

      // Send settlement failure notification
      await this.sendSettlementNotification(
        event.sellerId,
        'SETTLEMENT_FAILED',
        {
          settlementId: event.settlementId,
          amount: event.netAmount,
          failureReason: event.failureReason,
          retryCount: event.retryCount,
        },
      );
    } catch (error) {
      this.logger.error('Failed to handle settlement failed event', {
        settlementId: event.settlementId,
        error: error.message,
      });
    }
  }

  @OnEvent('settlement.cancelled')
  async handleSettlementCancelled(event: SettlementCancelledEvent) {
    this.logger.log('Settlement cancelled event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      cancelledBy: event.cancelledBy,
      reason: event.reason,
    });

    try {
      // Release reserved amount back to available balance
      const wallet = await this.sellerWalletRepository.findBySellerId(
        event.sellerId,
      );

      if (wallet) {
        await this.sellerWalletRepository.releaseReserve(
          wallet.id,
          event.netAmount,
          {
            transactionId: this.generateTransactionId(),
            referenceType: 'SETTLEMENT',
            referenceId: event.settlementId,
            description: `Settlement cancelled - reserve released - ${event.settlementId}`,
            metadata: {
              settlementId: event.settlementId,
              cancelledBy: event.cancelledBy,
              reason: event.reason,
              ...event.metadata,
            },
          },
        );

        this.logger.log(
          'Reserved settlement amount released due to cancellation',
          {
            settlementId: event.settlementId,
            walletId: wallet.id,
            amount: event.netAmount,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to handle settlement cancelled event', {
        settlementId: event.settlementId,
        error: error.message,
      });
    }
  }

  @OnEvent('settlement.reconciled')
  async handleSettlementReconciled(event: SettlementReconciledEvent) {
    this.logger.log('Settlement reconciled event received', {
      settlementId: event.settlementId,
      sellerId: event.sellerId,
      reconciledBy: event.reconciledBy,
    });

    // Additional reconciliation logic can be added here
    // For example:
    // - Update financial reports
    // - Trigger compliance checks
    // - Send reconciliation notifications
  }

  // ============================================================================
  // BATCH PROCESSING EVENTS
  // ============================================================================

  @OnEvent('settlement.batch.started')
  async handleSettlementBatchStarted(event: SettlementBatchStartedEvent) {
    this.logger.log('Settlement batch started event received', {
      batchId: event.batchId,
      totalItems: event.totalItems,
      periodStart: event.periodStart,
      periodEnd: event.periodEnd,
    });

    // Batch processing logic can be added here
    // For example:
    // - Send batch processing notifications
    // - Update batch processing metrics
    // - Initialize batch monitoring
  }

  @OnEvent('settlement.batch.completed')
  async handleSettlementBatchCompleted(event: SettlementBatchCompletedEvent) {
    this.logger.log('Settlement batch completed event received', {
      batchId: event.batchId,
      totalItems: event.totalItems,
      successfulItems: event.successfulItems,
      failedItems: event.failedItems,
      duration: event.duration,
    });

    // Batch completion logic can be added here
    // For example:
    // - Send batch completion notifications
    // - Generate batch reports
    // - Update batch processing statistics
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  private async sendSettlementNotification(
    sellerId: string,
    type: 'SETTLEMENT_COMPLETED' | 'SETTLEMENT_FAILED',
    data: any,
  ): Promise<void> {
    try {
      // This would integrate with your notification service
      // For now, we'll just log the notification
      this.logger.log('Settlement notification sent', {
        sellerId,
        type,
        data,
      });

      // Example notification integration:
      // await this.notificationService.send({
      //   userId: sellerId,
      //   type,
      //   title: type === 'SETTLEMENT_COMPLETED' ? 'Settlement Completed' : 'Settlement Failed',
      //   message: this.buildNotificationMessage(type, data),
      //   data,
      // });
    } catch (error) {
      this.logger.error('Failed to send settlement notification', {
        sellerId,
        type,
        error: error.message,
      });
    }
  }

  private buildNotificationMessage(
    type: 'SETTLEMENT_COMPLETED' | 'SETTLEMENT_FAILED',
    data: any,
  ): string {
    switch (type) {
      case 'SETTLEMENT_COMPLETED':
        return `Your settlement of ₹${data.amount} has been processed successfully. Settlement ID: ${data.settlementId}`;
      case 'SETTLEMENT_FAILED':
        return `Your settlement of ₹${data.amount} has failed. Reason: ${data.failureReason}. Settlement ID: ${data.settlementId}`;
      default:
        return 'Settlement status update';
    }
  }
}
