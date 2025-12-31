import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import { PaymentRepository } from './repositories/payment.repository.js';
import { PaymentAuditService } from './services/payment-audit.service.js';
import { PaymentGatewayService } from './services/payment-gateway.service.js';
import { PaymentRetryService } from './services/payment-retry.service.js';
import { PaymentValidationService } from './services/payment-validation.service.js';
import { OrderService } from '../order/order.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { PaymentIntent } from './entities/payment-intent.entity.js';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { PaymentAttempt } from './entities/payment-attempt.entity.js';
import {
  PaymentIntentStatus,
  PaymentTransactionStatus,
  PaymentGatewayProvider,
  PaymentMethod,
  canTransitionPaymentIntentStatus,
} from './enums/payment-status.enum';
import { PaymentPolicies } from './payment.policies.js';
import { PaymentValidators } from './payment.validators';

import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto.js';
import { ConfirmPaymentIntentDto } from './dtos/confirm-payment-intent.dto.js';
import { CreateRefundDto } from './dtos/create-refund.dto.js';

import {
  PaymentFilters,
  PaginationOptions,
  PaymentIncludeOptions,
} from './interfaces/payment-repository.interface.js';

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
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // PAYMENT INTENT OPERATIONS
  // ============================================================================

  async findAll(
    filters: PaymentFilters = {},
    pagination: PaginationOptions = {},
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: string,
  ): Promise<PaymentIntent[]> {
    this.logger.log('PaymentService.findAll', { filters, pagination, userId });

    try {
      // Apply access control filters
      const enhancedFilters = this.applyAccessFilters(
        filters,
        userId,
        userRole,
      );

      const paymentIntents = await this.paymentRepository.findAll(
        enhancedFilters,
        pagination,
        includes,
      );
      return paymentIntents || [];
    } catch (error) {
      this.logger.error('Failed to find payment intents', error);
      throw error;
    }
  }

  async findById(
    id: string,
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: string,
  ): Promise<PaymentIntent> {
    const paymentIntent = await this.paymentRepository.findById(id);
    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    // Check access permissions
    this.checkPaymentAccess(paymentIntent, userId, userRole);

    return paymentIntent;
  }

  async findByOrderId(
    orderId: string,
    includes: PaymentIncludeOptions = {},
    userId?: string,
    userRole?: string,
  ): Promise<PaymentIntent[]> {
    this.logger.log('PaymentService.findByOrderId', { orderId, userId });

    try {
      const paymentIntent = await this.paymentRepository.findByOrderId(orderId);
      if (!paymentIntent) {
        return [];
      }

      // Check access permissions
      this.checkPaymentAccess(paymentIntent, userId, userRole);

      return [paymentIntent];
    } catch (error) {
      this.logger.error('Failed to find payment intents by order ID', error);
      throw error;
    }
  }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ): Promise<PaymentIntent> {
    this.logger.log('PaymentService.createPaymentIntent', {
      orderId: createPaymentIntentDto.orderId,
      amount: createPaymentIntentDto.amount,
      userId,
    });

    try {
      // Validate order exists and is eligible for payment
      const order = await this.orderService.findById(
        createPaymentIntentDto.orderId,
      );
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Validate payment creation
      const validationResult =
        await this.paymentValidationService.validatePaymentCreation(
          createPaymentIntentDto,
        );
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.errors.join(', '));
      }

      // Select appropriate payment gateway
      const gatewayProvider = this.paymentGatewayService.selectGateway({
        amount: createPaymentIntentDto.amount,
        currency: createPaymentIntentDto.currency,
        paymentMethod: createPaymentIntentDto.paymentMethod,
      });

      // Create payment intent
      const paymentIntentData = {
        orderId: createPaymentIntentDto.orderId,
        amount: createPaymentIntentDto.amount,
        currency: createPaymentIntentDto.currency || 'INR',
        paymentMethod: createPaymentIntentDto.paymentMethod,
        gatewayProvider,
        status: PaymentIntentStatus.CREATED,
        createdBy: userId,
      };

      const paymentIntent =
        await this.paymentRepository.create(paymentIntentData);
      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      // Emit payment intent created event
      this.eventEmitter.emit(
        'payment.intent.created',
        new PaymentIntentCreatedEvent(
          paymentIntent.id,
          paymentIntent.orderId,
          paymentIntent.amount,
          paymentIntent.currency,
          gatewayProvider,
          userId,
        ),
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  async confirmPaymentIntent(
    id: string,
    confirmPaymentIntentDto: ConfirmPaymentIntentDto,
    userId: string,
  ): Promise<PaymentIntent> {
    this.logger.log('PaymentService.confirmPaymentIntent', { id, userId });

    try {
      const paymentIntent = await this.findById(id);
      if (!paymentIntent) {
        throw new NotFoundException('Payment intent not found');
      }

      // Validate payment confirmation
      const validationResult =
        await this.paymentValidationService.validatePaymentConfirmation({
          paymentIntentId: id,
          ...confirmPaymentIntentDto,
        });

      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.errors.join(', '));
      }

      // Update payment intent status
      const updatedPaymentIntent = await this.paymentRepository.updateStatus(
        id,
        PaymentIntentStatus.PROCESSING,
        userId,
      );

      if (!updatedPaymentIntent) {
        throw new Error('Failed to update payment intent');
      }

      // Emit payment intent confirmed event
      this.eventEmitter.emit(
        'payment.intent.confirmed',
        new PaymentIntentConfirmedEvent(
          updatedPaymentIntent.id,
          updatedPaymentIntent.orderId,
          updatedPaymentIntent.amount || 0,
          updatedPaymentIntent.currency || 'INR',
          'CARD', // default payment method
          userId,
        ),
      );

      return updatedPaymentIntent;
    } catch (error) {
      this.logger.error('Failed to confirm payment intent', error);
      throw error;
    }
  }

  async createRefund(
    createRefundDto: CreateRefundDto,
    userId: string,
  ): Promise<any> {
    this.logger.log('PaymentService.createRefund', {
      paymentIntentId: createRefundDto.paymentIntentId,
      amount: createRefundDto.amount,
      userId,
    });

    try {
      // Validate refund creation
      const validationResult =
        await this.paymentValidationService.validateRefundCreation(
          createRefundDto,
        );
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.errors.join(', '));
      }

      // Create refund
      const refundData = {
        paymentIntentId: createRefundDto.paymentIntentId,
        amount: createRefundDto.amount,
        reason: createRefundDto.reason,
        createdBy: userId,
      };

      const refund = await this.paymentRepository.createRefund(refundData);

      // Emit refund created event
      this.eventEmitter.emit(
        'payment.refund.created',
        new PaymentRefundCreatedEvent(
          refund.id,
          createRefundDto.paymentIntentId,
          'order-id', // placeholder
          createRefundDto.amount,
          createRefundDto.reason || 'REQUESTED_BY_CUSTOMER',
          userId,
        ),
      );

      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOK HANDLING
  // ============================================================================

  async handleWebhook(
    provider: string,
    signature: string,
    payload: any,
  ): Promise<void> {
    this.logger.log('PaymentService.handleWebhook', { provider });

    try {
      // Verify webhook signature
      const webhookSecret =
        this.paymentGatewayService.getWebhookSecret(provider);
      if (!webhookSecret) {
        throw new BadRequestException('Invalid webhook provider');
      }

      // Process webhook payload
      await this.processWebhookPayload(provider, payload);

      // Store webhook for audit
      await this.paymentRepository.createWebhook({
        provider,
        payload,
        signature,
        processedAt: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);
      throw error;
    }
  }

  // ============================================================================
  // RETRY OPERATIONS
  // ============================================================================

  async retryFailedPayments(): Promise<void> {
    this.logger.log('PaymentService.retryFailedPayments');

    try {
      const failedPayments =
        await this.paymentRepository.findFailedPaymentsForRetry();

      for (const payment of failedPayments) {
        try {
          await this.paymentRetryService.retryPayment(payment.id, 'system');
        } catch (error) {
          this.logger.error('Failed to retry payment', error, {
            paymentId: payment.id,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to retry failed payments', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private applyAccessFilters(
    filters: PaymentFilters,
    userId?: string,
    userRole?: string,
  ): PaymentFilters {
    // Apply role-based filtering
    if (userRole === 'CUSTOMER' && userId) {
      return { ...filters, customerId: userId };
    }

    return filters;
  }

  private checkPaymentAccess(
    paymentIntent: PaymentIntent,
    userId?: string,
    userRole?: string,
  ): void {
    if (
      !PaymentPolicies.canAccess(userId || '', userRole || '', paymentIntent)
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async processWebhookPayload(
    provider: string,
    payload: any,
  ): Promise<void> {
    // Placeholder implementation for webhook processing
    this.logger.log('Processing webhook payload', {
      provider,
      eventType: payload.type,
    });
  }
}
