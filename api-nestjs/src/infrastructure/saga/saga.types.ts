export interface SagaStep {
  stepId: string;
  stepName: string;
  execute(context: SagaContext): Promise<SagaStepResult>;
  compensate(context: SagaContext): Promise<void>;
}

export interface SagaContext {
  sagaId: string;
  tenantId: string;
  userId: string;
  data: Record<string, any>;
  stepResults: Record<string, any>;
  correlationId?: string;
}

export interface SagaStepResult {
  success: boolean;
  data?: any;
  error?: string;
  compensationData?: any;
}

export enum SagaStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

export interface SagaDefinition {
  sagaType: string;
  steps: SagaStep[];
  timeout?: number; // in milliseconds
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential';
  baseDelay: number; // in milliseconds
}