import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { RefundRepository } from '../repositories/refund.repository';
import { RefundService } from '../refund.service';
import { RefundAuditService } from './refund-audit.service';
import { PaymentGatewayService } from '../../payment/services/payment-gateway.service';

import { RefundWebhook } from '../entities/refund-webhook.entity';
import { ProcessWebhookDto } from '../dtos/process-webhook.dto';

import {
  RefundStatus,
  RefundAuditAction,
  WebhookProcessingStatus,
} from '../enums/refund-status.enum';

import {
  RefundWebhookReceivedEvent,
  RefundWebhookProcessedEvent,
  RefundStatusChangedEvent,
} from '../events/refund.events';

export interface WebhookProcessingResult {
  success: boolean;
  processed: boolean;
  refundId?: string;
  action?: string;
  error?: string;
  shouldRetry?: boolean;
}

@Injectable()
export class RefundWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundRepository: RefundRepository,
    private readonly refundService: RefundService,
    private readonly refundAuditService: RefundAuditService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // WEBHOOK PROCESSING
  // ============================================================================

  async processWebhook(
    processWebhookDto: ProcessWebhookDto,
    headers: Record<string, string>,
  ): Promise<WebhookProcessingResult> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log('RefundWebhookService.processWebhook', {
        eventType: processWebhookDto.eventType,
        gatewayProvider: processWebhookDto.gatewayProvider,
        webhookId: processWebhookDto.webhookId,
      });

      try {
        // Step 1: Verify webhook signature
        const isVerified = await this.verifyWebhookSignature(
          processWebhookDto,
          headers,
        );

        // Step 2: Create webhook record
        const webhook = await this.createWebhookRecord(
          processWebhookDto,
          headers,
          isVerified,
        );

        // Step 3: Emit webhook received event
        this.eventEmitter.emit(
          'refund.webhook.received',
          new RefundWebhookReceivedEvent(
            webhook.id,
            webhook.eventType,
            webhook.gatewayProvider,
            webhook.refundId,
            webhook.verified,
          ),
        );

        // Step 4: Check for duplicate processing
        if (await this.isDuplicateWebhook(webhook)) {
          this.logger.warn('Duplicate webhook detected', {
            webhookId: webhook.webhookId,
            eventType: webhook.eventType,
          });

          await this.updateWebhookStatus(webhook.id, 'IGNORED');

          return {
            success: true,
            processed: false,
            error: 'Duplicate webhook ignored',
          };
        }

        // Step 5: Process webhook if verified
        if (!isVerified) {
          await this.updateWebhookStatus(webhook.id, 'FAILED');

          return {
            success: false,
            processed: false,
            error: 'Webhook signature verification failed',
          };
        }

        // Step 6: Process webhook based on event type
        const processingResult = await this.processWebhookByEventType(webhook);

        // Step 7: Update webhook status
        const finalStatus = processingResult.success ? 'PROCESSED' : 'FAILED';
        await this.updateWebhookStatus(webhook.id, finalStatus);

        // Step 8: Emit webhook processed event
        let eventStatus: WebhookProcessingStatus;
        if (processingResult.success) {
          eventStatus = WebhookProcessingStatus.SUCCESS;
        } else {
          eventStatus = WebhookProcessingStatus.FAILURE;
        }

        const webhookEvent = new RefundWebhookProcessedEvent(
          webhook.id,
          webhook.eventType,
          webhook.gatewayProvider,
          eventStatus,
          webhook.refundId || '',
          processingResult.error,
        );
        this.eventEmitter.emit('refund.webhook.processed', webhookEvent);

        this.logger.log('Webhook processed successfully', {
          webhookId: webhook.webhookId,
          eventType: webhook.eventType,
          success: processingResult.success,
          refundId: processingResult.refundId,
        });

        return {
          success: processingResult.success,
          processed: true,
          refundId: processingResult.refundId,
          action: processingResult.action,
          error: processingResult.error,
        };
      } catch (error) {
        this.logger.error('Webhook processing failed', error, {
          eventType: processWebhookDto.eventType,
          webhookId: processWebhookDto.webhookId,
        });

        return {
          success: false,
          processed: false,
          error: error.message,
          shouldRetry: this.isRetryableError(error),
        };
      }
    });
  }

  // ============================================================================
  // WEBHOOK EVENT TYPE PROCESSING
  // ============================================================================

  private async processWebhookByEventType(webhook: RefundWebhook): Promise<{
    success: boolean;
    refundId?: string;
    action?: string;
    error?: string;
  }> {
    switch (webhook.eventType) {
      case 'refund.processed':
        return this.processRefundProcessedWebhook(webhook);

      case 'refund.failed':
        return this.processRefundFailedWebhook(webhook);

      case 'refund.speed_changed':
        return this.processRefundSpeedChangedWebhook(webhook);

      case 'refund.arn_updated':
        return this.processRefundArnUpdatedWebhook(webhook);

      default:
        this.logger.warn('Unknown webhook event type', {
          eventType: webhook.eventType,
          webhookId: webhook.webhookId,
        });

        return {
          success: true, // Don't fail for unknown events
          action: 'IGNORED',
        };
    }
  }

  private async processRefundProcessedWebhook(webhook: RefundWebhook): Promise<{
    success: boolean;
    refundId?: string;
    action?: string;
    error?: string;
  }> {
    try {
      const payload = webhook.payload;
      const gatewayRefundId = payload.refund?.id;

      if (!gatewayRefundId) {
        throw new Error('Gateway refund ID not found in webhook payload');
      }

      // Find refund by gateway ID
      const refund =
        await this.refundRepository.findByGatewayRefundId(gatewayRefundId);
      if (!refund) {
        throw new Error(`Refund not found for gateway ID: ${gatewayRefundId}`);
      }

      // Update refund status if not already completed
      if (refund.status !== RefundStatus.COMPLETED) {
        await this.refundService.updateStatus(
          refund.id,
          RefundStatus.COMPLETED,
          'SYSTEM',
          'Refund completed via gateway webhook',
        );

        // Update gateway response data
        await this.refundService.update(refund.id, {
          processedAt: new Date(),
          completedAt: new Date(),
          gatewayResponse: payload.refund,
          processedAmount: payload.refund.amount,
        });

        // Create audit log
        await this.refundAuditService.logSystemAction(
          refund.id,
          RefundAuditAction.COMPLETE,
          'WEBHOOK_PROCESSOR',
          {
            webhookId: webhook.id,
            gatewayRefundId,
            webhookEventType: webhook.eventType,
          },
        );

        // Emit status change event
        this.eventEmitter.emit(
          'refund.status.changed',
          new RefundStatusChangedEvent(
            refund.id,
            refund.orderId,
            refund.status,
            RefundStatus.COMPLETED,
            'SYSTEM',
          ),
        );
      }

      return {
        success: true,
        refundId: refund.id,
        action: 'COMPLETED',
      };
    } catch (error) {
      this.logger.error('Failed to process refund.processed webhook', error, {
        webhookId: webhook.id,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processRefundFailedWebhook(webhook: RefundWebhook): Promise<{
    success: boolean;
    refundId?: string;
    action?: string;
    error?: string;
  }> {
    try {
      const payload = webhook.payload;
      const gatewayRefundId = payload.refund?.id;
      const failureReason =
        payload.refund?.failure_reason || 'Gateway refund failed';

      if (!gatewayRefundId) {
        throw new Error('Gateway refund ID not found in webhook payload');
      }

      // Find refund by gateway ID
      const refund =
        await this.refundRepository.findByGatewayRefundId(gatewayRefundId);
      if (!refund) {
        throw new Error(`Refund not found for gateway ID: ${gatewayRefundId}`);
      }

      // Update refund status to failed
      await this.refundService.update(refund.id, {
        status: RefundStatus.FAILED,
        failedAt: new Date(),
        failureReason,
        failureCode: payload.refund?.error_code || 'GATEWAY_ERROR',
        gatewayResponse: payload.refund,
      });

      // Create audit log
      await this.refundAuditService.logSystemAction(
        refund.id,
        RefundAuditAction.FAIL,
        'WEBHOOK_PROCESSOR',
        {
          webhookId: webhook.id,
          gatewayRefundId,
          failureReason,
          webhookEventType: webhook.eventType,
        },
      );

      // Emit status change event
      this.eventEmitter.emit(
        'refund.status.changed',
        new RefundStatusChangedEvent(
          refund.id,
          refund.orderId,
          refund.status,
          RefundStatus.FAILED,
          'SYSTEM',
        ),
      );

      return {
        success: true,
        refundId: refund.id,
        action: 'FAILED',
      };
    } catch (error) {
      this.logger.error('Failed to process refund.failed webhook', error, {
        webhookId: webhook.id,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processRefundSpeedChangedWebhook(
    webhook: RefundWebhook,
  ): Promise<{
    success: boolean;
    refundId?: string;
    action?: string;
    error?: string;
  }> {
    try {
      const payload = webhook.payload;
      const gatewayRefundId = payload.refund?.id;
      const speed = payload.refund?.speed;

      if (!gatewayRefundId) {
        throw new Error('Gateway refund ID not found in webhook payload');
      }

      // Find refund by gateway ID
      const refund =
        await this.refundRepository.findByGatewayRefundId(gatewayRefundId);
      if (!refund) {
        throw new Error(`Refund not found for gateway ID: ${gatewayRefundId}`);
      }

      // Update refund metadata with speed information
      await this.refundService.update(refund.id, {
        metadata: {
          ...refund.metadata,
          refundSpeed: speed,
          speedChangedAt: new Date(),
        },
        gatewayResponse: payload.refund,
      });

      // Create audit log
      await this.refundAuditService.logSystemAction(
        refund.id,
        RefundAuditAction.UPDATE,
        'WEBHOOK_PROCESSOR',
        {
          webhookId: webhook.id,
          gatewayRefundId,
          speedChange: speed,
          webhookEventType: webhook.eventType,
        },
      );

      return {
        success: true,
        refundId: refund.id,
        action: 'SPEED_UPDATED',
      };
    } catch (error) {
      this.logger.error(
        'Failed to process refund.speed_changed webhook',
        error,
        {
          webhookId: webhook.id,
        },
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processRefundArnUpdatedWebhook(
    webhook: RefundWebhook,
  ): Promise<{
    success: boolean;
    refundId?: string;
    action?: string;
    error?: string;
  }> {
    try {
      const payload = webhook.payload;
      const gatewayRefundId = payload.refund?.id;
      const arn = payload.refund?.acquirer_data?.arn;

      if (!gatewayRefundId) {
        throw new Error('Gateway refund ID not found in webhook payload');
      }

      // Find refund by gateway ID
      const refund =
        await this.refundRepository.findByGatewayRefundId(gatewayRefundId);
      if (!refund) {
        throw new Error(`Refund not found for gateway ID: ${gatewayRefundId}`);
      }

      // Update refund metadata with ARN information
      await this.refundService.update(refund.id, {
        metadata: {
          ...refund.metadata,
          arn,
          arnUpdatedAt: new Date(),
        },
        gatewayResponse: payload.refund,
      });

      // Create audit log
      await this.refundAuditService.logSystemAction(
        refund.id,
        RefundAuditAction.UPDATE,
        'WEBHOOK_PROCESSOR',
        {
          webhookId: webhook.id,
          gatewayRefundId,
          arn,
          webhookEventType: webhook.eventType,
        },
      );

      return {
        success: true,
        refundId: refund.id,
        action: 'ARN_UPDATED',
      };
    } catch (error) {
      this.logger.error('Failed to process refund.arn_updated webhook', error, {
        webhookId: webhook.id,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // WEBHOOK VERIFICATION
  // ============================================================================

  private async verifyWebhookSignature(
    webhookDto: ProcessWebhookDto,
    headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      const gateway = await this.paymentGatewayService.getGateway(
        webhookDto.gatewayProvider,
      );

      if (!gateway) {
        this.logger.warn('Payment gateway not found', {
          provider: webhookDto.gatewayProvider,
          webhookId: webhookDto.webhookId,
        });
        return false;
      }

      // Get signature from headers
      const signature =
        headers['x-razorpay-signature'] || headers['X-Razorpay-Signature'];

      if (!signature) {
        this.logger.warn('Webhook signature not found in headers', {
          webhookId: webhookDto.webhookId,
          headers: Object.keys(headers),
        });
        return false;
      }

      // Verify signature using gateway-specific logic
      const isValid = await gateway.verifyWebhook({
        payload: JSON.stringify(webhookDto.payload),
        signature,
        secret: '', // This should come from gateway config
      });

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed', {
          webhookId: webhookDto.webhookId,
          signature: signature.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Webhook signature verification error', error, {
        webhookId: webhookDto.webhookId,
      });
      return false;
    }
  }

  // ============================================================================
  // WEBHOOK RECORD MANAGEMENT
  // ============================================================================

  private async createWebhookRecord(
    webhookDto: ProcessWebhookDto,
    headers: Record<string, string>,
    verified: boolean,
  ): Promise<RefundWebhook> {
    // Extract refund ID from payload if available
    const refundId = this.extractRefundIdFromPayload(webhookDto.payload);

    const webhookData = {
      webhookId: webhookDto.webhookId,
      eventType: webhookDto.eventType,
      gatewayProvider: webhookDto.gatewayProvider,
      refundId,
      status: 'RECEIVED',
      signature:
        headers['x-razorpay-signature'] || headers['X-Razorpay-Signature'],
      verified,
      payload: webhookDto.payload,
      headers: this.sanitizeHeaders(headers),
      receivedAt: new Date(),
      processed: false,
    };

    return this.refundRepository.createWebhook(webhookData);
  }

  private async updateWebhookStatus(
    webhookId: string,
    status: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'PROCESSED') {
      updateData.processedAt = new Date();
      updateData.processed = true;
    }

    await this.refundRepository.updateWebhook(webhookId, updateData);
  }

  private async isDuplicateWebhook(webhook: RefundWebhook): Promise<boolean> {
    // Check for existing processed webhook with same ID and event type
    const existingWebhook =
      await this.refundRepository.findWebhookByIdAndEventType(
        webhook.webhookId,
        webhook.eventType,
      );

    return existingWebhook && existingWebhook.processed;
  }

  // ============================================================================
  // WEBHOOK QUERIES & MANAGEMENT
  // ============================================================================

  async getWebhookById(webhookId: string): Promise<RefundWebhook | null> {
    return this.refundRepository.findWebhookById(webhookId);
  }

  async getWebhooksByRefund(refundId: string): Promise<RefundWebhook[]> {
    return this.refundRepository.findWebhooksByRefundId(refundId);
  }

  async getFailedWebhooks(
    limit: number = 100,
    olderThan?: Date,
  ): Promise<RefundWebhook[]> {
    return this.refundRepository.findFailedWebhooks(
      limit,
      olderThan || new Date(),
    );
  }

  async retryFailedWebhook(
    webhookId: string,
  ): Promise<WebhookProcessingResult> {
    this.logger.log('RefundWebhookService.retryFailedWebhook', { webhookId });

    const webhook = await this.refundRepository.findWebhookById(webhookId);
    if (!webhook) {
      throw new BadRequestException('Webhook not found');
    }

    if (webhook.status !== 'FAILED') {
      throw new BadRequestException('Only failed webhooks can be retried');
    }

    // Reset webhook status and retry processing
    await this.refundRepository.updateWebhook(webhookId, {
      status: 'RECEIVED',
      processedAt: null,
      errorMessage: null,
    });

    // Reprocess the webhook
    const processDto: ProcessWebhookDto = {
      webhookId: webhook.webhookId,
      eventType: webhook.eventType,
      gatewayProvider: webhook.gatewayProvider,
      payload: webhook.payload,
    };

    return this.processWebhook(
      processDto,
      webhook.headers as Record<string, string>,
    );
  }

  // ============================================================================
  // WEBHOOK CLEANUP & MAINTENANCE
  // ============================================================================

  async cleanupOldWebhooks(
    retentionDays: number = 90,
  ): Promise<{ deletedCount: number }> {
    this.logger.log('RefundWebhookService.cleanupOldWebhooks', {
      retentionDays,
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount =
      await this.refundRepository.deleteOldWebhooks(cutoffDate);

    this.logger.log('Old webhooks cleaned up', {
      deletedCount,
      cutoffDate,
    });

    return { deletedCount };
  }

  async getWebhookStatistics(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalWebhooks: number;
    processedWebhooks: number;
    failedWebhooks: number;
    verifiedWebhooks: number;
    eventTypeBreakdown: Record<string, number>;
    processingRate: number;
  }> {
    const webhooks = await this.refundRepository.findWebhooksByDateRange(
      dateFrom,
      dateTo,
    );

    const totalWebhooks = webhooks.length;
    const processedWebhooks = webhooks.filter((w) => w.processed).length;
    const failedWebhooks = webhooks.filter((w) => w.status === 'FAILED').length;
    const verifiedWebhooks = webhooks.filter((w) => w.verified).length;

    const eventTypeBreakdown: Record<string, number> = {};
    for (const webhook of webhooks) {
      eventTypeBreakdown[webhook.eventType] =
        (eventTypeBreakdown[webhook.eventType] || 0) + 1;
    }

    const processingRate =
      totalWebhooks > 0 ? (processedWebhooks / totalWebhooks) * 100 : 0;

    return {
      totalWebhooks,
      processedWebhooks,
      failedWebhooks,
      verifiedWebhooks,
      eventTypeBreakdown,
      processingRate,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private extractRefundIdFromPayload(payload: any): string | undefined {
    // Try to extract refund ID from various possible locations in payload
    if (payload.refund?.notes?.refundId) {
      return payload.refund.notes.refundId;
    }

    if (payload.refund?.receipt?.includes('refund_')) {
      // Extract from receipt format like "refund_REF-2024-001"
      const match = payload.refund.receipt.match(/refund_(.+)/);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'temporary',
      'rate limit',
      'service unavailable',
    ];

    return retryableErrors.some((keyword) =>
      error.message?.toLowerCase().includes(keyword),
    );
  }
}
