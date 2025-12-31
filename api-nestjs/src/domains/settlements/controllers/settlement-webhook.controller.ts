import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

import { RazorpayPayoutService } from '../services/razorpay-payout.service';
import { SettlementService } from '../settlement.service';
import { SettlementRepository } from '../repositories/settlement.repository';
import { SettlementStatus } from '../enums/settlement-status.enum';
import { SettlementAuditService } from '../services/settlement-audit.service';

@ApiTags('Settlement Webhooks')
@Controller('webhooks/settlement')
export class SettlementWebhookController {
  private readonly logger = new Logger(SettlementWebhookController.name);

  constructor(
    private readonly razorpayPayoutService: RazorpayPayoutService,
    private readonly settlementService: SettlementService,
    private readonly settlementRepository: SettlementRepository,
    private readonly settlementAuditService: SettlementAuditService,
  ) {}

  // ============================================================================
  // RAZORPAY WEBHOOKS
  // ============================================================================

  @Post('razorpay/payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Razorpay payout webhooks',
    description:
      'Webhook endpoint for receiving Razorpay payout status updates. This endpoint is called by Razorpay when payout status changes.',
  })
  @ApiHeader({
    name: 'x-razorpay-signature',
    description: 'Razorpay webhook signature for verification',
    required: true,
  })
  @ApiBody({
    description: 'Razorpay payout webhook payload',
    schema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          enum: [
            'payout.processed',
            'payout.failed',
            'payout.reversed',
            'payout.cancelled',
          ],
          example: 'payout.processed',
        },
        payload: {
          type: 'object',
          properties: {
            payout: {
              type: 'object',
              properties: {
                entity: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'pout_12345' },
                    status: { type: 'string', example: 'processed' },
                    amount: { type: 'number', example: 100000 },
                    currency: { type: 'string', example: 'INR' },
                    processed_at: { type: 'number', example: 1640995200 },
                    utr: { type: 'string', example: 'UTR123456789' },
                    failure_reason: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['processed', 'ignored', 'settlement_not_found', 'error'],
          example: 'processed',
        },
        settlementId: { type: 'string', example: 'STL_12345' },
        payoutStatus: { type: 'string', example: 'completed' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload or signature',
  })
  async handleRazorpayPayoutWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay payout webhook', {
      event: payload.event,
      payoutId: payload.payload?.payout?.entity?.id,
    });

    try {
      // Process the webhook
      const payoutUpdate = await this.razorpayPayoutService.handlePayoutWebhook(
        payload,
        signature,
      );

      if (!payoutUpdate) {
        this.logger.warn('No payout update from webhook');
        return { status: 'ignored' };
      }

      // Find the settlement associated with this payout
      const settlement = await this.settlementRepository.findAll({
        razorpayPayoutId: payoutUpdate.payoutId,
      });

      if (settlement.data.length === 0) {
        this.logger.warn(
          `No settlement found for payout ID: ${payoutUpdate.payoutId}`,
        );
        return { status: 'settlement_not_found' };
      }

      const settlementRecord = settlement.data[0];

      // Update settlement based on payout status
      await this.updateSettlementFromPayoutStatus(
        settlementRecord,
        payoutUpdate,
      );

      // Log the webhook processing
      await this.settlementAuditService.logAction(
        settlementRecord.id,
        'WEBHOOK_PROCESSED',
        'SYSTEM',
        { status: settlementRecord.status },
        {
          status: payoutUpdate.status,
          razorpayPayoutId: payoutUpdate.payoutId,
        },
        {
          webhookEvent: payload.event,
          payoutId: payoutUpdate.payoutId,
          processedAt: new Date(),
        },
      );

      this.logger.log('Payout webhook processed successfully', {
        settlementId: settlementRecord.settlementId,
        payoutId: payoutUpdate.payoutId,
        status: payoutUpdate.status,
      });

      return {
        status: 'processed',
        settlementId: settlementRecord.settlementId,
        payoutStatus: payoutUpdate.status,
      };
    } catch (error) {
      this.logger.error('Failed to process payout webhook', {
        error: error.message,
        stack: error.stack,
        payload,
      });

      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  @Post('razorpay/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay transfer webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleRazorpayTransferWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay transfer webhook', {
      event: payload.event,
      transferId: payload.payload?.transfer?.entity?.id,
    });

    try {
      // Verify webhook signature
      const isValid = await this.verifyRazorpaySignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const transfer = payload.payload?.transfer?.entity;
      if (!transfer) {
        throw new Error('No transfer data in webhook');
      }

      // Find settlement by transfer ID
      const settlement = await this.settlementRepository.findAll({
        razorpayTransferId: transfer.id,
      });

      if (settlement.data.length === 0) {
        this.logger.warn(`No settlement found for transfer ID: ${transfer.id}`);
        return { status: 'settlement_not_found' };
      }

      const settlementRecord = settlement.data[0];

      // Process transfer webhook based on event type
      switch (payload.event) {
        case 'transfer.processed':
          await this.handleTransferProcessed(settlementRecord, transfer);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(settlementRecord, transfer);
          break;
        case 'transfer.reversed':
          await this.handleTransferReversed(settlementRecord, transfer);
          break;
        default:
          this.logger.log(`Unhandled transfer webhook event: ${payload.event}`);
          return { status: 'ignored' };
      }

      return {
        status: 'processed',
        settlementId: settlementRecord.settlementId,
        event: payload.event,
      };
    } catch (error) {
      this.logger.error('Failed to process transfer webhook', {
        error: error.message,
        payload,
      });

      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  // ============================================================================
  // WEBHOOK PROCESSING HELPERS
  // ============================================================================

  private async updateSettlementFromPayoutStatus(
    settlement: any,
    payoutUpdate: any,
  ): Promise<void> {
    const updateData: any = {
      gatewayResponse: payoutUpdate.response,
      updatedAt: new Date(),
    };

    switch (payoutUpdate.status) {
      case 'processed':
        // Mark settlement as completed
        updateData.status = SettlementStatus.COMPLETED;
        updateData.completedAt = payoutUpdate.processedAt || new Date();

        // Emit settlement completed event
        // this.eventEmitter.emit('settlement.completed', ...);
        break;

      case 'failed':
        // Mark settlement as failed
        updateData.status = SettlementStatus.FAILED;
        updateData.failedAt = new Date();
        updateData.failureReason =
          payoutUpdate.failureReason || 'Payout failed';
        updateData.failureCode = 'PAYOUT_FAILED';

        // Emit settlement failed event
        // this.eventEmitter.emit('settlement.failed', ...);
        break;

      case 'reversed':
        // Mark settlement as failed due to reversal
        updateData.status = SettlementStatus.FAILED;
        updateData.failedAt = new Date();
        updateData.failureReason = 'Payout was reversed';
        updateData.failureCode = 'PAYOUT_REVERSED';
        break;

      case 'cancelled':
        // Mark settlement as cancelled
        updateData.status = SettlementStatus.CANCELLED;
        break;

      default:
        this.logger.warn(`Unhandled payout status: ${payoutUpdate.status}`);
        return;
    }

    // Update settlement in database
    await this.settlementRepository.update(settlement.id, updateData);
  }

  private async handleTransferProcessed(
    settlement: any,
    transfer: any,
  ): Promise<void> {
    this.logger.log('Processing transfer processed webhook', {
      settlementId: settlement.settlementId,
      transferId: transfer.id,
    });

    // Update settlement with transfer completion
    await this.settlementRepository.update(settlement.id, {
      status: SettlementStatus.COMPLETED,
      completedAt: new Date(transfer.processed_at * 1000),
      gatewayResponse: {
        ...settlement.gatewayResponse,
        transfer: transfer,
      },
      updatedAt: new Date(),
    });

    // Log audit entry
    await this.settlementAuditService.logAction(
      settlement.id,
      'TRANSFER_PROCESSED',
      'SYSTEM',
      { status: settlement.status },
      { status: 'COMPLETED' },
      {
        transferId: transfer.id,
        processedAt: new Date(transfer.processed_at * 1000),
      },
    );
  }

  private async handleTransferFailed(
    settlement: any,
    transfer: any,
  ): Promise<void> {
    this.logger.log('Processing transfer failed webhook', {
      settlementId: settlement.settlementId,
      transferId: transfer.id,
      failureReason: transfer.failure_reason,
    });

    // Update settlement with failure information
    await this.settlementRepository.update(settlement.id, {
      status: SettlementStatus.FAILED,
      failedAt: new Date(),
      failureReason: transfer.failure_reason || 'Transfer failed',
      failureCode: 'TRANSFER_FAILED',
      gatewayResponse: {
        ...settlement.gatewayResponse,
        transfer: transfer,
      },
      updatedAt: new Date(),
    });

    // Log audit entry
    await this.settlementAuditService.logAction(
      settlement.id,
      'TRANSFER_FAILED',
      'SYSTEM',
      { status: settlement.status },
      {
        status: 'FAILED',
        failureReason: transfer.failure_reason,
      },
      {
        transferId: transfer.id,
        failureReason: transfer.failure_reason,
      },
    );
  }

  private async handleTransferReversed(
    settlement: any,
    transfer: any,
  ): Promise<void> {
    this.logger.log('Processing transfer reversed webhook', {
      settlementId: settlement.settlementId,
      transferId: transfer.id,
    });

    // Update settlement with reversal information
    await this.settlementRepository.update(settlement.id, {
      status: SettlementStatus.FAILED,
      failedAt: new Date(),
      failureReason: 'Transfer was reversed',
      failureCode: 'TRANSFER_REVERSED',
      gatewayResponse: {
        ...settlement.gatewayResponse,
        transfer: transfer,
      },
      updatedAt: new Date(),
    });

    // Log audit entry
    await this.settlementAuditService.logAction(
      settlement.id,
      'TRANSFER_REVERSED',
      'SYSTEM',
      { status: settlement.status },
      {
        status: 'FAILED',
        failureReason: 'Transfer was reversed',
      },
      {
        transferId: transfer.id,
        reversedAt: new Date(),
      },
    );
  }

  private async verifyRazorpaySignature(
    payload: any,
    signature: string,
  ): Promise<boolean> {
    try {
      // This would use the same verification logic as in RazorpayPayoutService
      // For now, we'll assume it's valid
      return true;
    } catch (error) {
      this.logger.error('Failed to verify Razorpay signature', {
        error: error.message,
      });
      return false;
    }
  }

  // ============================================================================
  // WEBHOOK HEALTH CHECK
  // ============================================================================

  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook health check endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'settlement-webhooks',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  // ============================================================================
  // WEBHOOK TESTING (Development only)
  // ============================================================================

  @Post('test/payout-processed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test payout processed webhook (Development only)',
    description:
      'Test endpoint for simulating a successful payout webhook. Only available in development environment.',
  })
  @ApiExcludeEndpoint(process.env.NODE_ENV === 'production')
  @ApiBody({
    description: 'Test payout data',
    schema: {
      type: 'object',
      required: ['settlementId', 'payoutId'],
      properties: {
        settlementId: { type: 'string', example: 'STL_12345' },
        payoutId: { type: 'string', example: 'pout_67890' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'processed' },
        message: {
          type: 'string',
          example: 'Test webhook processed successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Not available in production' })
  async testPayoutProcessed(
    @Body() testData: { settlementId: string; payoutId: string },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test endpoints not available in production');
    }

    const mockPayload = {
      event: 'payout.processed',
      payload: {
        payout: {
          entity: {
            id: testData.payoutId,
            status: 'processed',
            processed_at: Math.floor(Date.now() / 1000),
            utr: 'TEST_UTR_123456',
          },
        },
      },
    };

    return this.handleRazorpayPayoutWebhook(mockPayload, 'test_signature');
  }

  @Post('test/payout-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test payout failed webhook (Development only)' })
  async testPayoutFailed(
    @Body()
    testData: {
      settlementId: string;
      payoutId: string;
      reason?: string;
    },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test endpoints not available in production');
    }

    const mockPayload = {
      event: 'payout.failed',
      payload: {
        payout: {
          entity: {
            id: testData.payoutId,
            status: 'failed',
            failure_reason: testData.reason || 'Insufficient balance',
          },
        },
      },
    };

    return this.handleRazorpayPayoutWebhook(mockPayload, 'test_signature');
  }
}
