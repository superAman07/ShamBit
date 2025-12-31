import { Injectable, Logger } from '@nestjs/common';
import {
  SagaStep,
  SagaContext,
  SagaStepResult,
} from '../../../infrastructure/saga/saga.types';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DomainEventService } from '../../../infrastructure/domain/domain-event.service';
import { InventoryReservation, Payment } from '@prisma/client';

@Injectable()
export class ReserveInventoryStep implements SagaStep {
  stepId = 'reserve-inventory';
  stepName = 'Reserve Inventory';

  private readonly logger = new Logger(ReserveInventoryStep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { orderId, items } = context.data;
      const reservations: InventoryReservation[] = [];

      for (const item of items) {
        const reservation = await this.prisma.inventoryReservation.create({
          data: {
            variant: { connect: { id: item.variantId } },
            quantity: item.quantity,
            referenceType: 'ORDER',
            referenceId: orderId,
            priority: 'ORDER',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            createdBy: context.userId,
          },
        });
        reservations.push(reservation);
      }

      await this.domainEventService.publishEvent({
        eventType: 'inventory.reserved',
        aggregateId: orderId,
        aggregateType: 'Order',
        version: 1,
        data: { reservations },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });

      return {
        success: true,
        data: { reservations },
        compensationData: { reservationIds: reservations.map((r) => r.id) },
      };
    } catch (error) {
      this.logger.error('Failed to reserve inventory', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async compensate(context: SagaContext): Promise<void> {
    try {
      const stepResult = context.stepResults[this.stepId];
      if (stepResult?.compensationData?.reservationIds) {
        await this.prisma.inventoryReservation.deleteMany({
          where: {
            id: { in: stepResult.compensationData.reservationIds },
          },
        });

        await this.domainEventService.publishEvent({
          eventType: 'inventory.reservation.cancelled',
          aggregateId: context.data.orderId,
          aggregateType: 'Order',
          version: 1,
          data: { reservationIds: stepResult.compensationData.reservationIds },
          metadata: {
            tenantId: context.tenantId,
            userId: context.userId,
            timestamp: new Date(),
            correlationId: context.correlationId,
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to compensate inventory reservation', error);
    }
  }
}

@Injectable()
export class ProcessPaymentStep implements SagaStep {
  stepId = 'process-payment';
  stepName = 'Process Payment';

  private readonly logger = new Logger(ProcessPaymentStep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { orderId, paymentDetails } = context.data;

      // Simulate payment processing
      const payment = await this.prisma.payment.create({
        data: {
          orderId,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          paymentMethod: paymentDetails.method,
          status: 'COMPLETED',
          paymentIntentId: `txn_${Date.now()}`,
        },
      });

      await this.domainEventService.publishEvent({
        eventType: 'payment.processed',
        aggregateId: orderId,
        aggregateType: 'Order',
        version: 1,
        data: { payment },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });

      return {
        success: true,
        data: { payment },
        compensationData: { paymentId: payment.id },
      };
    } catch (error) {
      this.logger.error('Failed to process payment', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async compensate(context: SagaContext): Promise<void> {
    try {
      const stepResult = context.stepResults[this.stepId];
      if (stepResult?.compensationData?.paymentId) {
        await this.prisma.payment.update({
          where: { id: stepResult.compensationData.paymentId },
          data: { status: 'REFUNDED' },
        });

        await this.domainEventService.publishEvent({
          eventType: 'payment.refunded',
          aggregateId: context.data.orderId,
          aggregateType: 'Order',
          version: 1,
          data: { paymentId: stepResult.compensationData.paymentId },
          metadata: {
            tenantId: context.tenantId,
            userId: context.userId,
            timestamp: new Date(),
            correlationId: context.correlationId,
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to compensate payment', error);
    }
  }
}

@Injectable()
export class ConfirmOrderStep implements SagaStep {
  stepId = 'confirm-order';
  stepName = 'Confirm Order';

  private readonly logger = new Logger(ConfirmOrderStep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { orderId } = context.data;

      const order = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
      });

      await this.domainEventService.publishEvent({
        eventType: 'order.confirmed',
        aggregateId: orderId,
        aggregateType: 'Order',
        version: 1,
        data: { order },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });

      return {
        success: true,
        data: { order },
      };
    } catch (error) {
      this.logger.error('Failed to confirm order', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async compensate(context: SagaContext): Promise<void> {
    try {
      const { orderId } = context.data;

      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      await this.domainEventService.publishEvent({
        eventType: 'order.cancelled',
        aggregateId: orderId,
        aggregateType: 'Order',
        version: 1,
        data: { reason: 'Saga compensation' },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to compensate order confirmation', error);
    }
  }
}
