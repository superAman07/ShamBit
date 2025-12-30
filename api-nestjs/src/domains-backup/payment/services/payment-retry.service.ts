import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export interface RetryAttempt {
  paymentIntentId: string;
  attemptNumber: number;
  reason: string;
  scheduledAt: Date;
  userId: string;
}

@Injectable()
export class PaymentRetryService {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelayMs: 5000, // 5 seconds
    backoffMultiplier: 2,
    maxDelayMs: 300000, // 5 minutes
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async scheduleRetry(attempt: RetryAttempt, config?: Partial<RetryConfig>): Promise<boolean> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };

    try {
      // Check if we've exceeded max retries
      if (attempt.attemptNumber > retryConfig.maxRetries) {
        this.logger.warn('Max retry attempts exceeded', {
          paymentIntentId: attempt.paymentIntentId,
          attemptNumber: attempt.attemptNumber,
          maxRetries: retryConfig.maxRetries,
        });
        return false;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.retryDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt.attemptNumber - 1),
        retryConfig.maxDelayMs
      );

      const scheduledAt = new Date(Date.now() + delay);

      // TODO: Store retry attempt in database once PaymentJob model is available
      // For now, just emit an event
      this.eventEmitter.emit('payment.retry_scheduled', {
        paymentIntentId: attempt.paymentIntentId,
        attemptNumber: attempt.attemptNumber,
        scheduledAt,
        reason: attempt.reason,
      });

      this.logger.log('Payment retry scheduled', {
        paymentIntentId: attempt.paymentIntentId,
        attemptNumber: attempt.attemptNumber,
        scheduledAt,
        delayMs: delay,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to schedule payment retry', error, { attempt });
      return false;
    }
  }

  async processRetry(paymentIntentId: string): Promise<boolean> {
    try {
      // TODO: Implement retry processing logic
      // 1. Get payment intent
      // 2. Check if retry is still valid
      // 3. Attempt payment processing
      // 4. Update attempt status

      this.eventEmitter.emit('payment.retry_processed', {
        paymentIntentId,
        processedAt: new Date(),
      });

      this.logger.log('Payment retry processed', { paymentIntentId });
      return true;
    } catch (error) {
      this.logger.error('Failed to process payment retry', error, { paymentIntentId });
      return false;
    }
  }

  async cancelRetries(paymentIntentId: string, reason: string): Promise<boolean> {
    try {
      // TODO: Cancel all pending retries for the payment intent
      
      this.eventEmitter.emit('payment.retries_cancelled', {
        paymentIntentId,
        reason,
        cancelledAt: new Date(),
      });

      this.logger.log('Payment retries cancelled', { paymentIntentId, reason });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel payment retries', error, { paymentIntentId, reason });
      return false;
    }
  }

  async getRetryStatus(paymentIntentId: string): Promise<{
    hasRetries: boolean;
    attemptCount: number;
    nextRetryAt?: Date;
    lastAttemptAt?: Date;
  }> {
    try {
      // TODO: Get retry status from database
      return {
        hasRetries: false,
        attemptCount: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get retry status', error, { paymentIntentId });
      return {
        hasRetries: false,
        attemptCount: 0,
      };
    }
  }

  calculateNextRetryDelay(attemptNumber: number, config?: Partial<RetryConfig>): number {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    
    return Math.min(
      retryConfig.retryDelayMs * Math.pow(retryConfig.backoffMultiplier, attemptNumber - 1),
      retryConfig.maxDelayMs
    );
  }

  async retryPayment(paymentIntentId: string, userId: string): Promise<any> {
    try {
      this.logger.log('Retrying payment', { paymentIntentId, userId });
      
      // Placeholder implementation
      return {
        success: true,
        paymentIntentId,
        retryAttempt: 1,
      };
    } catch (error) {
      this.logger.error('Failed to retry payment', error, { paymentIntentId, userId });
      throw error;
    }
  }
}