import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEventService } from '../domain/domain-event.service';
import {
  SagaDefinition,
  SagaContext,
  SagaStatus,
  SagaStep,
  SagaStepResult,
} from './saga.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly sagaDefinitions = new Map<string, SagaDefinition>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEventService: DomainEventService,
  ) {}

  registerSaga(definition: SagaDefinition): void {
    this.sagaDefinitions.set(definition.sagaType, definition);
    this.logger.log(`Registered saga: ${definition.sagaType}`);
  }

  async startSaga(
    sagaType: string,
    tenantId: string,
    userId: string,
    data: Record<string, any>,
    correlationId?: string,
  ): Promise<string> {
    const sagaId = uuidv4();
    const definition = this.sagaDefinitions.get(sagaType);

    if (!definition) {
      throw new Error(`Saga definition not found: ${sagaType}`);
    }

    // Create saga instance
    await this.prisma.sagaInstance.create({
      data: {
        id: sagaId,
        sagaType,
        tenantId,
        userId,
        status: SagaStatus.PENDING,
        data,
        correlationId,
        currentStep: 0,
        createdAt: new Date(),
      },
    });

    // Publish saga started event
    await this.domainEventService.publishEvent({
      eventType: 'saga.started',
      aggregateId: sagaId,
      aggregateType: 'Saga',
      version: 1,
      data: { sagaType, data },
      metadata: {
        tenantId,
        userId,
        timestamp: new Date(),
        correlationId,
      },
    });

    // Start execution
    this.executeSaga(sagaId).catch(error => {
      this.logger.error(`Failed to execute saga ${sagaId}:`, error);
    });

    return sagaId;
  }

  private async executeSaga(sagaId: string): Promise<void> {
    const sagaInstance = await this.prisma.sagaInstance.findUnique({
      where: { id: sagaId },
    });

    if (!sagaInstance) {
      throw new Error(`Saga instance not found: ${sagaId}`);
    }

    const definition = this.sagaDefinitions.get(sagaInstance.sagaType);
    if (!definition) {
      throw new Error(`Saga definition not found: ${sagaInstance.sagaType}`);
    }

    const context: SagaContext = {
      sagaId,
      tenantId: sagaInstance.tenantId,
      userId: sagaInstance.userId,
      data: sagaInstance.data as Record<string, any>,
      stepResults: sagaInstance.stepResults as Record<string, any> || {},
      correlationId: sagaInstance.correlationId,
    };

    try {
      await this.updateSagaStatus(sagaId, SagaStatus.RUNNING);

      // Execute steps sequentially
      for (let i = sagaInstance.currentStep; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        
        await this.updateCurrentStep(sagaId, i);
        
        const result = await this.executeStep(step, context);
        
        if (!result.success) {
          // Step failed, start compensation
          await this.compensateSaga(sagaId, i, context);
          return;
        }

        // Store step result
        context.stepResults[step.stepId] = result.data;
        await this.updateStepResults(sagaId, context.stepResults);
      }

      // All steps completed successfully
      await this.updateSagaStatus(sagaId, SagaStatus.COMPLETED);
      
      await this.domainEventService.publishEvent({
        eventType: 'saga.completed',
        aggregateId: sagaId,
        aggregateType: 'Saga',
        version: 1,
        data: { stepResults: context.stepResults },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });

    } catch (error) {
      this.logger.error(`Saga execution failed: ${sagaId}`, error);
      await this.updateSagaStatus(sagaId, SagaStatus.FAILED);
      
      await this.domainEventService.publishEvent({
        eventType: 'saga.failed',
        aggregateId: sagaId,
        aggregateType: 'Saga',
        version: 1,
        data: { error: error.message },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });
    }
  }

  private async executeStep(step: SagaStep, context: SagaContext): Promise<SagaStepResult> {
    this.logger.log(`Executing step: ${step.stepName} for saga: ${context.sagaId}`);
    
    try {
      const result = await step.execute(context);
      
      await this.domainEventService.publishEvent({
        eventType: 'saga.step.completed',
        aggregateId: context.sagaId,
        aggregateType: 'Saga',
        version: 1,
        data: { stepId: step.stepId, stepName: step.stepName, result },
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Step execution failed: ${step.stepName}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async compensateSaga(
    sagaId: string,
    failedStepIndex: number,
    context: SagaContext,
  ): Promise<void> {
    this.logger.log(`Starting compensation for saga: ${sagaId}`);
    
    await this.updateSagaStatus(sagaId, SagaStatus.COMPENSATING);

    const definition = this.sagaDefinitions.get(
      (await this.prisma.sagaInstance.findUnique({ where: { id: sagaId } }))!.sagaType
    );

    if (!definition) return;

    // Compensate steps in reverse order
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const step = definition.steps[i];
      
      try {
        await step.compensate(context);
        
        await this.domainEventService.publishEvent({
          eventType: 'saga.step.compensated',
          aggregateId: sagaId,
          aggregateType: 'Saga',
          version: 1,
          data: { stepId: step.stepId, stepName: step.stepName },
          metadata: {
            tenantId: context.tenantId,
            userId: context.userId,
            timestamp: new Date(),
            correlationId: context.correlationId,
          },
        });

      } catch (error) {
        this.logger.error(`Compensation failed for step: ${step.stepName}`, error);
        // Continue with other compensations
      }
    }

    await this.updateSagaStatus(sagaId, SagaStatus.COMPENSATED);
    
    await this.domainEventService.publishEvent({
      eventType: 'saga.compensated',
      aggregateId: sagaId,
      aggregateType: 'Saga',
      version: 1,
      data: {},
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        timestamp: new Date(),
        correlationId: context.correlationId,
      },
    });
  }

  private async updateSagaStatus(sagaId: string, status: SagaStatus): Promise<void> {
    await this.prisma.sagaInstance.update({
      where: { id: sagaId },
      data: { status, updatedAt: new Date() },
    });
  }

  private async updateCurrentStep(sagaId: string, step: number): Promise<void> {
    await this.prisma.sagaInstance.update({
      where: { id: sagaId },
      data: { currentStep: step, updatedAt: new Date() },
    });
  }

  private async updateStepResults(sagaId: string, stepResults: Record<string, any>): Promise<void> {
    await this.prisma.sagaInstance.update({
      where: { id: sagaId },
      data: { stepResults, updatedAt: new Date() },
    });
  }
}