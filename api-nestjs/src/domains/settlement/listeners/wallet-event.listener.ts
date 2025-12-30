import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  WalletCreditedEvent,
  WalletDebitedEvent,
  WalletBalanceUpdatedEvent,
} from '../events/settlement.events';

@Injectable()
export class WalletEventListener {
  private readonly logger = new Logger(WalletEventListener.name);

  // ============================================================================
  // WALLET TRANSACTION EVENTS
  // ============================================================================

  @OnEvent('wallet.credited')
  async handleWalletCredited(event: WalletCreditedEvent) {
    this.logger.log('Wallet credited event received', {
      walletId: event.walletId,
      sellerId: event.sellerId,
      transactionId: event.transactionId,
      amount: event.amount,
      category: event.category,
      balanceAfter: event.balanceAfter,
    });

    try {
      // Send wallet credit notification
      await this.sendWalletNotification(event.sellerId, 'WALLET_CREDITED', {
        amount: event.amount,
        category: event.category,
        balanceAfter: event.balanceAfter,
        transactionId: event.transactionId,
        referenceId: event.referenceId,
      });

      // Update wallet analytics
      await this.updateWalletAnalytics(event.sellerId, 'CREDIT', event.amount, event.category);

    } catch (error) {
      this.logger.error('Failed to handle wallet credited event', {
        walletId: event.walletId,
        transactionId: event.transactionId,
        error: error.message,
      });
    }
  }

  @OnEvent('wallet.debited')
  async handleWalletDebited(event: WalletDebitedEvent) {
    this.logger.log('Wallet debited event received', {
      walletId: event.walletId,
      sellerId: event.sellerId,
      transactionId: event.transactionId,
      amount: event.amount,
      category: event.category,
      balanceAfter: event.balanceAfter,
    });

    try {
      // Send wallet debit notification (for significant amounts)
      if (event.amount > 1000) { // Only notify for amounts > ₹1000
        await this.sendWalletNotification(event.sellerId, 'WALLET_DEBITED', {
          amount: event.amount,
          category: event.category,
          balanceAfter: event.balanceAfter,
          transactionId: event.transactionId,
          referenceId: event.referenceId,
        });
      }

      // Update wallet analytics
      await this.updateWalletAnalytics(event.sellerId, 'DEBIT', event.amount, event.category);

      // Check for low balance warning
      if (event.balanceAfter < 100) { // Warn if balance < ₹100
        await this.sendWalletNotification(event.sellerId, 'LOW_BALANCE', {
          balance: event.balanceAfter,
          transactionId: event.transactionId,
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle wallet debited event', {
        walletId: event.walletId,
        transactionId: event.transactionId,
        error: error.message,
      });
    }
  }

  @OnEvent('wallet.balance.updated')
  async handleWalletBalanceUpdated(event: WalletBalanceUpdatedEvent) {
    this.logger.log('Wallet balance updated event received', {
      walletId: event.walletId,
      sellerId: event.sellerId,
      previousBalance: event.previousBalance,
      newBalance: event.newBalance,
      changeAmount: event.changeAmount,
    });

    try {
      // Update real-time balance tracking
      await this.updateBalanceTracking(event.sellerId, {
        previousBalance: event.previousBalance,
        newBalance: event.newBalance,
        changeAmount: event.changeAmount,
        timestamp: new Date(),
      });

      // Trigger balance-based business rules
      await this.processBalanceRules(event.sellerId, event.newBalance);

    } catch (error) {
      this.logger.error('Failed to handle wallet balance updated event', {
        walletId: event.walletId,
        error: error.message,
      });
    }
  }

  // ============================================================================
  // ORDER EVENTS (for wallet credits)
  // ============================================================================

  @OnEvent('order.delivered')
  async handleOrderDelivered(event: any) {
    this.logger.log('Order delivered event received for wallet processing', {
      orderId: event.orderId,
      sellerId: event.sellerId,
    });

    try {
      // This would typically be handled by the order service
      // but we can listen for it to trigger wallet credits
      
      // Calculate seller earnings from the delivered order
      const earnings = await this.calculateSellerEarnings(event.orderId);
      
      if (earnings.netAmount > 0) {
        // Credit seller wallet with earnings
        // This would be done through the wallet service
        this.logger.log('Order earnings calculated for wallet credit', {
          orderId: event.orderId,
          sellerId: event.sellerId,
          netAmount: earnings.netAmount,
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle order delivered event for wallet', {
        orderId: event.orderId,
        error: error.message,
      });
    }
  }

  @OnEvent('order.refunded')
  async handleOrderRefunded(event: any) {
    this.logger.log('Order refunded event received for wallet processing', {
      orderId: event.orderId,
      sellerId: event.sellerId,
      refundAmount: event.refundAmount,
    });

    try {
      // Handle refund impact on seller wallet
      // This might involve debiting the seller wallet or adjusting pending amounts
      
      this.logger.log('Processing refund impact on seller wallet', {
        orderId: event.orderId,
        sellerId: event.sellerId,
        refundAmount: event.refundAmount,
      });

    } catch (error) {
      this.logger.error('Failed to handle order refunded event for wallet', {
        orderId: event.orderId,
        error: error.message,
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async sendWalletNotification(
    sellerId: string,
    type: 'WALLET_CREDITED' | 'WALLET_DEBITED' | 'LOW_BALANCE',
    data: any
  ): Promise<void> {
    try {
      // This would integrate with your notification service
      this.logger.log('Wallet notification sent', {
        sellerId,
        type,
        data,
      });

      // Example notification integration:
      // await this.notificationService.send({
      //   userId: sellerId,
      //   type,
      //   title: this.getNotificationTitle(type),
      //   message: this.buildWalletNotificationMessage(type, data),
      //   data,
      // });

    } catch (error) {
      this.logger.error('Failed to send wallet notification', {
        sellerId,
        type,
        error: error.message,
      });
    }
  }

  private async updateWalletAnalytics(
    sellerId: string,
    type: 'CREDIT' | 'DEBIT',
    amount: number,
    category: string
  ): Promise<void> {
    try {
      // This would update wallet analytics/metrics
      this.logger.log('Wallet analytics updated', {
        sellerId,
        type,
        amount,
        category,
        timestamp: new Date(),
      });

      // Example analytics update:
      // await this.analyticsService.recordWalletTransaction({
      //   sellerId,
      //   type,
      //   amount,
      //   category,
      //   timestamp: new Date(),
      // });

    } catch (error) {
      this.logger.error('Failed to update wallet analytics', {
        sellerId,
        type,
        amount,
        category,
        error: error.message,
      });
    }
  }

  private async updateBalanceTracking(
    sellerId: string,
    balanceData: {
      previousBalance: number;
      newBalance: number;
      changeAmount: number;
      timestamp: Date;
    }
  ): Promise<void> {
    try {
      // This would update real-time balance tracking
      this.logger.log('Balance tracking updated', {
        sellerId,
        ...balanceData,
      });

      // Example balance tracking:
      // await this.balanceTrackingService.record({
      //   sellerId,
      //   ...balanceData,
      // });

    } catch (error) {
      this.logger.error('Failed to update balance tracking', {
        sellerId,
        error: error.message,
      });
    }
  }

  private async processBalanceRules(sellerId: string, newBalance: number): Promise<void> {
    try {
      // Process business rules based on balance
      
      // Example rules:
      // 1. Auto-settlement trigger for high balances
      if (newBalance > 10000) { // Auto-settle if balance > ₹10,000
        this.logger.log('High balance detected - considering auto-settlement', {
          sellerId,
          balance: newBalance,
        });
        
        // Trigger auto-settlement logic
        // await this.settlementService.triggerAutoSettlement(sellerId);
      }

      // 2. Balance milestone notifications
      const milestones = [1000, 5000, 10000, 50000, 100000];
      const milestone = milestones.find(m => 
        newBalance >= m && (newBalance - 1000) < m // Crossed milestone recently
      );
      
      if (milestone) {
        await this.sendWalletNotification(sellerId, 'WALLET_CREDITED', {
          milestone: true,
          milestoneAmount: milestone,
          currentBalance: newBalance,
        });
      }

    } catch (error) {
      this.logger.error('Failed to process balance rules', {
        sellerId,
        newBalance,
        error: error.message,
      });
    }
  }

  private async calculateSellerEarnings(orderId: string): Promise<{
    grossAmount: number;
    commissionAmount: number;
    netAmount: number;
  }> {
    try {
      // This would calculate seller earnings from an order
      // For now, return mock data
      return {
        grossAmount: 1000,
        commissionAmount: 50,
        netAmount: 950,
      };

    } catch (error) {
      this.logger.error('Failed to calculate seller earnings', {
        orderId,
        error: error.message,
      });
      
      return {
        grossAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
      };
    }
  }

  private getNotificationTitle(type: 'WALLET_CREDITED' | 'WALLET_DEBITED' | 'LOW_BALANCE'): string {
    switch (type) {
      case 'WALLET_CREDITED':
        return 'Wallet Credited';
      case 'WALLET_DEBITED':
        return 'Wallet Debited';
      case 'LOW_BALANCE':
        return 'Low Wallet Balance';
      default:
        return 'Wallet Update';
    }
  }

  private buildWalletNotificationMessage(
    type: 'WALLET_CREDITED' | 'WALLET_DEBITED' | 'LOW_BALANCE',
    data: any
  ): string {
    switch (type) {
      case 'WALLET_CREDITED':
        if (data.milestone) {
          return `Congratulations! Your wallet balance has reached ₹${data.milestoneAmount}. Current balance: ₹${data.currentBalance}`;
        }
        return `Your wallet has been credited with ₹${data.amount}. New balance: ₹${data.balanceAfter}`;
      
      case 'WALLET_DEBITED':
        return `₹${data.amount} has been debited from your wallet for ${data.category}. Remaining balance: ₹${data.balanceAfter}`;
      
      case 'LOW_BALANCE':
        return `Your wallet balance is low (₹${data.balance}). Please add funds or complete more orders to increase your balance.`;
      
      default:
        return 'Your wallet has been updated';
    }
  }
}