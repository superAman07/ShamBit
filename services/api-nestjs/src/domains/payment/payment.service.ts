import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PaymentRepository } from './repositories/payment.repository';
import { PaymentAuditService } from './services/payment-audit.service';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { PaymentRetryService } from './services/payment-retry.service';
import { PaymentValidationService } from './services/payment-validation.service';
import { OrderService } from '../order/order.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { 
  PaymentIntentStatus, 
  PaymentTransactionStatus,
  PaymentGatewayProvider,
  PaymentMethod,
  canTransitionPaymentIntentStatus 
} from './enums/payment-status.enum';
import { PaymentPolicies } from './payment.policies';
import { PaymentValidators } from './payment.validators';

import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';
import { ConfirmPaymentIntentDto } from './dtos/confirm-payment-intent.dto';
import { CreateRefundDto } from './dtos/create-refund.dto';

import {
  PaymentFilters,
  PaginationOptions,
  PaymentIncludeOptions,
} from './interfaces/payment-repository.interface';

import {
  PaymentIntentCreatedEvent,
  PaymentIntentUpdatedEvent,
  PaymentIntentConfirmedEvent,
  PaymentIntentSucceededEvent,
  PaymentIntentFailedEvent,
  PaymentIntentCanceledEvent,
  PaymentTransactionCreatedEvent,
  PaymentRefundCreatedEvent,
} from './events/payment.events';

import { UserRole } from '../../common/types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentAuditService: PaymentAuditService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly paymentRetryService: PaymentRetryService,
    private readonly paymentValidationService: PaymentValidationService,
    private readonly orderService: OrderService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: PaymentFilters = {},
    pagination: PaginationOptions = {},
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('PaymentService.findAll', { filters, pagination, userId });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(filters, userId, userRole);

    return this.paymentRepository.findAll(enhancedFilters, pagination, includes);
  }

  async findById(
    id: string,
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<PaymentIntent> {
    const paymentIntent = await this.paymentRepository.findById(id, includes);
    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    // Check access permissions
    await this.checkPaymentAccess(paymentIntent, userId, userRole);

    return paymentIntent;
  }

  async findByOrderId(
    orderId: string,
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<PaymentIntent[]> {
    const paymentIntents = await this.paymentRepository.findByOrderId(orderId, includes);

    // Check access permissions for each payment intent
    for (const paymentIntent of paymentIntents) {
      await this.checkPaymentAccess(paymentIntent, userId, userRole);
    }

    return paymentIntents;
  }

  // ============================================================================
  // PAYMENT INTENT CREATION (IDEMPOTENT)
  // ============================================================================

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    createdBy: string
  ): Promise<PaymentIntent> {
    this.logger.log('PaymentService.createPaymentIntent', {
      orderId: createPaymentIntentDto.orderId,
      amount: createPaymentIntentDto.amount,
      createdBy,
    });

    // SAFETY: Idempotency check - prevent duplicate payment intents for same order
    const existingIntent = await this.paymentRepository.findActiveByOrderId(
      createPaymentIntentDto.orderId
    );

    if (existingIntent) {
      this.logger.log('Returning existing payment intent (idempotent)', {
        existingIntentId: existingIntent.id,
        orderId: createPaymentIntentDto.orderId,
      });
      return existingIntent;
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate order exists and is in correct state
      const order = await this.orderService.findById(createPaymentIntentDto.orderId);
      await this.paymentValidationService.validateOrderForPayment(order);

      // Validate payment request
      await this.paymentValidationService.validatePaymentCreation(createPaymentIntentDto);

      // Select appropriate gateway
      const gateway = await this.paymentGatewayService.selectGateway(
        createPaymentIntentDto.gatewayProvider,
        createPaymentIntentDto.currency,
        createPaymentIntentDto.amount
      );

      // Create payment intent in gateway
      const gatewayResponse = await gateway.createPaymentIntent({
        amount: createPaymentIntentDto.amount,
        currency: createPaymentIntentDto.currency,
        orderId: createPaymentIntentDto.orderId,
        customerId: order.customerId,
        paymentMethods: createPaymentIntentDto.allowedPaymentMethods,
        confirmationMethod: createPaymentIntentDto.confirmationMethod,
        captureMethod: createPaymentIntentDto.captureMethod,
        description: `Payment for order ${order.orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          ...createPaymentIntentDto.metadata,
        },
        applicationFee: createPaymentIntentDto.applicationFee,
        transferGroup: createPaymentIntentDto.transferGroup,
      });

      if (!gatewayResponse.success) {
        throw new BadRequestException(
          `Gateway error: ${gatewayResponse.error?.message || 'Unknown error'}`
        );
      }

      // Create payment intent in database
      const paymentIntentData = {
        orderId: createPaymentIntentDto.orderId,
        intentId: this.generateIntentId(),
        gatewayIntentId: gatewayResponse.data!.intentId,
        clientSecret: gatewayResponse.data!.clientSecret,
        amount: createPaymentIntentDto.amount,
        currency: createPaymentIntentDto.currency,
        gatewayProvider: createPaymentIntentDto.gatewayProvider,
        status: PaymentIntentStatus.CREATED,
        allowedPaymentMethods: createPaymentIntentDto.allowedPaymentMethods,
        confirmationMethod: createPaymentIntentDto.confirmationMethod || 'AUTOMATIC',
        captureMethod: createPaymentIntentDto.captureMethod || 'AUTOMATIC',
        transferGroup: createPaymentIntentDto.transferGroup,
        applicationFee: createPaymentIntentDto.applicationFee,
        description: createPaymentIntentDto.description,
        metadata: createPaymentIntentDto.metadata,
        expiresAt: this.calculateExpiry(),
        createdBy,
      };

      const paymentIntent = await this.paymentRepository.create(paymentIntentData, tx);

      // Create initial attempt record
      await this.createPaymentAttempt(paymentIntent, 1, createdBy, tx);

      // Create audit log
      await this.paymentAuditService.logAction(
        paymentIntent.id,
        'CREATE',
        createdBy,
        null,
        paymentIntent,
        'Payment intent created',
        tx
      );

      // Emit event
      this.eventEmitter.emit('payment.intent.created', new PaymentIntentCreatedEvent(
        paymentIntent.id,
        paymentIntent.orderId,
        paymentIntent.amount,
        paymentIntent.currency,
        paymentIntent.gatewayProvider,
        createdBy
      ));

      this.logger.log('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        gatewayIntentId: paymentIntent.gatewayIntentId,
        orderId: paymentIntent.orderId,
      });

      return paymentIntent;
    }, {
      isolationLevel: 'Serializable', // Prevent race conditions
    });
  }

  // ============================================================================
  // PAYMENT CONFIRMATION
  // ============================================================================

  async confirmPaymentIntent(
    id: string,
    confirmPaymentIntentDto: ConfirmPaymentIntentDto,
    confirmedBy: string
  ): Promise<PaymentIntent> {
    this.logger.log('PaymentService.confirmPaymentIntent', {
      paymentIntentId: id,
      confirmedBy,
    });

    return this.prisma.$transaction(async (tx) => {
      const paymentIntent = await this.findById(id);

      // Check permissions
      await this.checkPaymentAccess(paymentIntent, confirmedBy);

      // Validate confirmation
      await this.paymentValidationService.validatePaymentConfirmation(
        paymentIntent,
        confirmPaymentIntentDto
      );

      // Get gateway
      const gateway = await this.paymentGatewayService.getGateway(paymentIntent.gatewayProvider);

      // Confirm payment with gateway
      const gatewayResponse = await gateway.confirmPaymentIntent({
        intentId: paymentIntent.gatewayIntentId,
        paymentMethod: confirmPaymentIntentDto.paymentMethod,
        returnUrl: confirmPaymentIntentDto.returnUrl,
      });

      if (!gatewayResponse.success) {
        // Handle confirmation failure
        await this.handlePaymentFailure(
          paymentIntent,
          gatewayResponse.error?.message || 'Confirmation failed',
          gatewayResponse.error?.code || 'confirmation_failed',
          confirmedBy,
          tx
        );

        throw new BadRequestException(
          `Payment confirmation failed: ${gatewayResponse.error?.message || 'Unknown error'}`
        );
      }

      // Update payment intent status
      const newStatus = this.mapGatewayStatus(gatewayResponse.data!.status);
      const updatedPaymentIntent = await this.updatePaymentIntentStatus(
        paymentIntent,
        newStatus,
        confirmedBy,
        tx
      );

      // Handle success or additional actions required
      if (gatewayResponse.data!.requiresAction) {
        // Payment requires additional action (3DS, etc.)
        await this.handlePaymentAction(
          updatedPaymentIntent,
          gatewayResponse.data!.nextAction,
          confirmedBy,
          tx
        );
      } else if (newStatus === PaymentIntentStatus.SUCCEEDED) {
        // Payment succeeded
        await this.handlePaymentSuccess(updatedPaymentIntent, confirmedBy, tx);
      }

      this.logger.log('Payment intent confirmed successfully', {
        paymentIntentId: id,
        status: newStatus,
        requiresAction: gatewayResponse.data!.requiresAction,
      });

      return updatedPaymentIntent;
    });
  }

  // ============================================================================
  // PAYMENT CANCELLATION
  // ============================================================================

  async cancelPaymentIntent(
    id: string,
    reason: string,
    canceledBy: string
  ): Promise<PaymentIntent> {
    this.logger.log('PaymentService.cancelPaymentIntent', {
      paymentIntentId: id,
      reason,
      canceledBy,
    });

    return this.prisma.$transaction(async (tx) => {
      const paymentIntent = await this.findById(id);

      // Check permissions
      await this.checkPaymentAccess(paymentIntent, canceledBy);

      // Validate cancellation
      PaymentValidators.validatePaymentCancellation(paymentIntent);

      // Cancel with gateway
      const gateway = await this.paymentGatewayService.getGateway(paymentIntent.gatewayProvider);
      const gatewayResponse = await gateway.cancelPaymentIntent(paymentIntent.gatewayIntentId);

      if (!gatewayResponse.success) {
        throw new BadRequestException(
          `Gateway cancellation failed: ${gatewayResponse.error?.message || 'Unknown error'}`
        );
      }

      // Update status
      const updatedPaymentIntent = await this.updatePaymentIntentStatus(
        paymentIntent,
        PaymentIntentStatus.CANCELED,
        canceledBy,
        tx
      );

      // Create audit log
      await this.paymentAuditService.logAction(
        id,
        'CANCEL',
        canceledBy,
        paymentIntent,
        updatedPaymentIntent,
        reason,
        tx
      );

      // Emit event
      this.eventEmitter.emit('payment.intent.canceled', new PaymentIntentCanceledEvent(
        id,
        paymentIntent.orderId,
        reason,
        canceledBy
      ));

      this.logger.log('Payment intent canceled successfully', { paymentIntentId: id });
      return updatedPaymentIntent;
    });
  }

  // ============================================================================
  // REFUND OPERATIONS
  // ============================================================================

  async createRefund(
    paymentIntentId: string,
    createRefundDto: CreateRefundDto,
    createdBy: string
  ) {
    this.logger.log('PaymentService.createRefund', {
      paymentIntentId,
      amount: createRefundDto.amount,
      createdBy,
    });

    return this.prisma.$transaction(async (tx) => {
      const paymentIntent = await this.findById(paymentIntentId);

      // Check permissions
      await this.checkPaymentAccess(paymentIntent, createdBy);

      // Validate refund
      await this.paymentValidationService.validateRefundCreation(paymentIntent, createRefundDto);

      // Get successful transaction
      const transaction = paymentIntent.getSuccessfulTransaction();
      if (!transaction) {
        throw new BadRequestException('No successful transaction found for refund');
      }

      // Create refund with gateway
      const gateway = await this.paymentGatewayService.getGateway(paymentIntent.gatewayProvider);
      const gatewayResponse = await gateway.createRefund({
        transactionId: transaction.gatewayTransactionId!,
        amount: createRefundDto.amount,
        reason: createRefundDto.reason,
        metadata: createRefundDto.metadata,
      });

      if (!gatewayResponse.success) {
        throw new BadRequestException(
          `Refund creation failed: ${gatewayResponse.error?.message || 'Unknown error'}`
        );
      }

      // Create refund record
      const refund = await this.paymentRepository.createRefund({
        transactionId: transaction.id,
        refundId: this.generateRefundId(),
        gatewayRefundId: gatewayResponse.data!.refundId,
        amount: createRefundDto.amount || transaction.amount,
        currency: paymentIntent.currency,
        reason: createRefundDto.reason || 'REQUESTED_BY_CUSTOMER',
        description: createRefundDto.description,
        status: gatewayResponse.data!.status,
        metadata: createRefundDto.metadata,
        createdBy,
      }, tx);

      // Create audit log
      await this.paymentAuditService.logAction(
        paymentIntentId,
        'REFUND',
        createdBy,
        null,
        refund,
        `Refund created: ${createRefundDto.reason || 'Customer request'}`,
        tx
      );

      // Emit event
      this.eventEmitter.emit('payment.refund.created', new PaymentRefundCreatedEvent(
        refund.id,
        paymentIntentId,
        paymentIntent.orderId,
        refund.amount,
        refund.reason,
        createdBy
      ));

      this.logger.log('Refund created successfully', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      });

      return refund;
    });
  }

  // ============================================================================
  // WEBHOOK PROCESSING
  // ============================================================================

  async processWebhook(
    provider: PaymentGatewayProvider,
    payload: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<{ processed: boolean; message: string }> {
    this.logger.log('PaymentService.processWebhook', {
      provider,
      payloadLength: payload.length,
    });

    try {
      // Get gateway
      const gateway = await this.paymentGatewayService.getGateway(provider);

      // Verify webhook signature
      const isValid = await gateway.verifyWebhook({
        payload,
        signature,
        secret: await this.paymentGatewayService.getWebhookSecret(provider),
      });

      if (!isValid) {
        this.logger.warn('Invalid webhook signature', { provider });
        return { processed: false, message: 'Invalid signature' };
      }

      // Parse webhook event
      const webhookEvent = await gateway.parseWebhook(payload);

      // Store webhook for audit
      await this.paymentRepository.createWebhook({
        webhookId: webhookEvent.id,
        eventType: webhookEvent.type,
        gatewayProvider: provider,
        payload: webhookEvent.data,
        headers,
        signature,
        verified: true,
      });

      // Process webhook event
      await this.processWebhookEvent(webhookEvent, provider);

      return { processed: true, message: 'Webhook processed successfully' };

    } catch (error) {
      this.logger.error('Webhook processing failed', error, { provider });

      // Store failed webhook for debugging
      await this.paymentRepository.createWebhook({
        webhookId: `failed_${Date.now()}`,
        eventType: 'unknown',
        gatewayProvider: provider,
        payload: { error: error.message },
        headers,
        signature,
        verified: false,
        status: 'FAILED',
        errorMessage: error.message,
      });

      return { processed: false, message: error.message };
    }
  }

  // ============================================================================
  // RETRY OPERATIONS
  // ============================================================================

  async retryFailedPayments(): Promise<{ processed: number; errors: string[] }> {
    this.logger.log('PaymentService.retryFailedPayments');

    const results = { processed: 0, errors: [] as string[] };

    try {
      // Find failed payments eligible for retry
      const failedPayments = await this.paymentRepository.findFailedPaymentsForRetry();

      this.logger.log('Found failed payments for retry', { count: failedPayments.length });

      // Process each failed payment
      for (const paymentIntent of failedPayments) {
        try {
          await this.paymentRetryService.retryPayment(paymentIntent);
          results.processed++;
        } catch (error) {
          results.errors.push(`Payment ${paymentIntent.id}: ${error.message}`);
        }
      }

      this.logger.log('Payment retry processing completed', results);
      return results;

    } catch (error) {
      this.logger.error('Failed to process payment retries', error);
      results.errors.push(error.message);
      return results;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyAccessFilters(
    filters: PaymentFilters,
    userId?: string,
    userRole?: UserRole
  ): Promise<PaymentFilters> {
    // Apply role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      return { ...filters, customerId: userId };
    }

    return filters;
  }

  private async checkPaymentAccess(
    paymentIntent: PaymentIntent,
    userId?: string,
    userRole?: UserRole
  ): Promise<void> {
    if (!PaymentPolicies.canAccess(paymentIntent, userId, userRole)) {
      throw new ForbiddenException('Access denied to this payment');
    }
  }

  private generateIntentId(): string {
    return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRefundId(): string {
    return `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24-hour expiry
    return expiry;
  }

  private mapGatewayStatus(gatewayStatus: string): PaymentIntentStatus {
    // Map gateway-specific status to our internal status
    const mapping: Record<string, PaymentIntentStatus> = {
      'REQUIRES_PAYMENT_METHOD': PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
      'REQUIRES_CONFIRMATION': PaymentIntentStatus.REQUIRES_CONFIRMATION,
      'REQUIRES_ACTION': PaymentIntentStatus.REQUIRES_ACTION,
      'PROCESSING': PaymentIntentStatus.PROCESSING,
      'SUCCEEDED': PaymentIntentStatus.SUCCEEDED,
      'CANCELED': PaymentIntentStatus.CANCELED,
    };

    return mapping[gatewayStatus] || PaymentIntentStatus.CREATED;
  }

  private async updatePaymentIntentStatus(
    paymentIntent: PaymentIntent,
    newStatus: PaymentIntentStatus,
    updatedBy: string,
    tx: any
  ): Promise<PaymentIntent> {
    // Validate status transition
    PaymentValidators.validateStatusTransition(paymentIntent.status, newStatus);

    // Update status
    const updatedPaymentIntent = await this.paymentRepository.updateStatus(
      paymentIntent.id,
      newStatus,
      updatedBy,
      tx
    );

    // Emit status change event
    this.eventEmitter.emit('payment.intent.updated', new PaymentIntentUpdatedEvent(
      paymentIntent.id,
      paymentIntent.orderId,
      paymentIntent.status,
      newStatus,
      updatedBy
    ));

    return updatedPaymentIntent;
  }

  private async createPaymentAttempt(
    paymentIntent: PaymentIntent,
    attemptNumber: number,
    createdBy: string,
    tx: any
  ): Promise<PaymentAttempt> {
    const idempotencyKey = `${paymentIntent.id}_attempt_${attemptNumber}_${Date.now()}`;

    return this.paymentRepository.createAttempt({
      paymentIntentId: paymentIntent.id,
      attemptNumber,
      idempotencyKey,
      gatewayProvider: paymentIntent.gatewayProvider,
      status: 'INITIATED',
      isRetry: attemptNumber > 1,
      createdBy,
    }, tx);
  }

  private async handlePaymentSuccess(
    paymentIntent: PaymentIntent,
    updatedBy: string,
    tx: any
  ): Promise<void> {
    // Create successful transaction record
    await this.paymentRepository.createTransaction({
      paymentIntentId: paymentIntent.id,
      transactionId: this.generateTransactionId(),
      gatewayTransactionId: paymentIntent.gatewayIntentId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      type: 'PAYMENT',
      status: PaymentTransactionStatus.SUCCEEDED,
      paymentMethod: {}, // Would be populated from gateway response
      gatewayResponse: {},
      processedAt: new Date(),
      createdBy: updatedBy,
    }, tx);

    // Update order status to confirmed
    await this.orderService.confirm(paymentIntent.orderId, 'SYSTEM');

    // Emit success event
    this.eventEmitter.emit('payment.intent.succeeded', new PaymentIntentSucceededEvent(
      paymentIntent.id,
      paymentIntent.orderId,
      paymentIntent.amount,
      paymentIntent.currency,
      updatedBy
    ));
  }

  private async handlePaymentFailure(
    paymentIntent: PaymentIntent,
    errorMessage: string,
    errorCode: string,
    updatedBy: string,
    tx: any
  ): Promise<void> {
    // Create failed transaction record
    await this.paymentRepository.createTransaction({
      paymentIntentId: paymentIntent.id,
      transactionId: this.generateTransactionId(),
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      type: 'PAYMENT',
      status: PaymentTransactionStatus.FAILED,
      paymentMethod: {},
      gatewayResponse: { error: errorMessage, code: errorCode },
      failureCode: errorCode,
      failureMessage: errorMessage,
      createdBy: updatedBy,
    }, tx);

    // Emit failure event
    this.eventEmitter.emit('payment.intent.failed', new PaymentIntentFailedEvent(
      paymentIntent.id,
      paymentIntent.orderId,
      errorCode,
      errorMessage,
      updatedBy
    ));
  }

  private async handlePaymentAction(
    paymentIntent: PaymentIntent,
    nextAction: any,
    updatedBy: string,
    tx: any
  ): Promise<void> {
    // Handle additional actions required (3DS, etc.)
    // Implementation would depend on specific gateway requirements
  }

  private async processWebhookEvent(
    webhookEvent: any,
    provider: PaymentGatewayProvider
  ): Promise<void> {
    // Process different webhook event types
    switch (webhookEvent.type) {
      case 'payment_intent.succeeded':
        await this.handleWebhookPaymentSuccess(webhookEvent.data);
        break;
      case 'payment_intent.payment_failed':
        await this.handleWebhookPaymentFailure(webhookEvent.data);
        break;
      case 'charge.dispute.created':
        await this.handleWebhookDispute(webhookEvent.data);
        break;
      // Add more webhook event handlers as needed
    }
  }

  private async handleWebhookPaymentSuccess(data: any): Promise<void> {
    // Handle successful payment webhook
  }

  private async handleWebhookPaymentFailure(data: any): Promise<void> {
    // Handle failed payment webhook
  }

  private async handleWebhookDispute(data: any): Promise<void> {
    // Handle dispute webhook
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}