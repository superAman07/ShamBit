import { RefundJobType, RefundJobStatus } from '../enums/refund-status.enum';

export class RefundJob {
  id: string;
  type: RefundJobType;
  status: RefundJobStatus;
  
  // Associated Entities
  refundId?: string;
  orderId?: string;
  
  // Job Configuration
  payload: any;
  options: any;
  
  // Retry Logic
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Scheduling
  scheduledAt?: Date;
  
  // Results
  result?: any;
  errorMessage?: string;
  
  // System Fields
  createdBy: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (populated when needed)
  refund?: any;
  order?: any;
  creator?: any;
  
  constructor(data: Partial<RefundJob>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // BUSINESS METHODS
  // ============================================================================
  
  isPending(): boolean {
    return this.status === RefundJobStatus.PENDING;
  }
  
  isProcessing(): boolean {
    return this.status === RefundJobStatus.PROCESSING;
  }
  
  isCompleted(): boolean {
    return this.status === RefundJobStatus.COMPLETED;
  }
  
  isFailed(): boolean {
    return this.status === RefundJobStatus.FAILED;
  }
  
  isRetrying(): boolean {
    return this.status === RefundJobStatus.RETRYING;
  }
  
  canBeRetried(): boolean {
    return this.isFailed() && this.retryCount < this.maxRetries;
  }
  
  isScheduled(): boolean {
    return this.scheduledAt !== undefined && this.scheduledAt > new Date();
  }
  
  isOverdue(): boolean {
    if (!this.scheduledAt) return false;
    return this.scheduledAt < new Date() && this.isPending();
  }
  
  getProcessingTimeInMinutes(): number | null {
    if (!this.startedAt || !this.completedAt) {
      return null;
    }
    return Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }
  
  getWaitingTimeInMinutes(): number | null {
    if (!this.startedAt) {
      return Math.floor((new Date().getTime() - this.createdAt.getTime()) / (1000 * 60));
    }
    return Math.floor((this.startedAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }
  
  getRemainingRetries(): number {
    return Math.max(0, this.maxRetries - this.retryCount);
  }
  
  getNextRetryDelay(): number | null {
    if (!this.nextRetryAt) return null;
    return Math.max(0, this.nextRetryAt.getTime() - new Date().getTime());
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validateJobData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.type) {
      errors.push('Job type is required');
    }
    
    if (!this.createdBy) {
      errors.push('Created by is required');
    }
    
    if (this.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }
    
    if (this.retryCount < 0) {
      errors.push('Retry count cannot be negative');
    }
    
    if (this.retryCount > this.maxRetries) {
      errors.push('Retry count cannot exceed max retries');
    }
    
    // Validate payload based on job type
    const payloadValidation = this.validatePayloadForJobType();
    errors.push(...payloadValidation);
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  private validatePayloadForJobType(): string[] {
    const errors: string[] = [];
    
    switch (this.type) {
      case RefundJobType.PROCESS_REFUND:
        if (!this.payload?.refundId && !this.refundId) {
          errors.push('Refund ID is required for process refund job');
        }
        break;
        
      case RefundJobType.RESTOCK_INVENTORY:
        if (!this.payload?.variantId) {
          errors.push('Variant ID is required for restock inventory job');
        }
        if (!this.payload?.quantity || this.payload.quantity <= 0) {
          errors.push('Valid quantity is required for restock inventory job');
        }
        break;
        
      case RefundJobType.SEND_NOTIFICATION:
        if (!this.payload?.notificationType) {
          errors.push('Notification type is required for send notification job');
        }
        break;
        
      case RefundJobType.SYNC_GATEWAY:
        if (!this.payload?.gatewayRefundId) {
          errors.push('Gateway refund ID is required for sync gateway job');
        }
        break;
        
      case RefundJobType.UPDATE_ORDER_STATUS:
        if (!this.payload?.orderId && !this.orderId) {
          errors.push('Order ID is required for update order status job');
        }
        if (!this.payload?.newStatus) {
          errors.push('New status is required for update order status job');
        }
        break;
    }
    
    return errors;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  updateStatus(newStatus: RefundJobStatus, errorMessage?: string): void {
    this.status = newStatus;
    this.updatedAt = new Date();
    
    if (newStatus === RefundJobStatus.PROCESSING) {
      this.startedAt = new Date();
    } else if (newStatus === RefundJobStatus.COMPLETED) {
      this.completedAt = new Date();
    } else if (newStatus === RefundJobStatus.FAILED) {
      this.errorMessage = errorMessage;
    }
  }
  
  incrementRetryCount(): void {
    this.retryCount += 1;
    this.updatedAt = new Date();
  }
  
  setNextRetryTime(retryAt: Date): void {
    this.nextRetryAt = retryAt;
    this.status = RefundJobStatus.RETRYING;
    this.updatedAt = new Date();
  }
  
  setResult(result: any): void {
    this.result = result;
    this.updatedAt = new Date();
  }
  
  addMetadata(key: string, value: any): void {
    if (!this.options) {
      this.options = {};
    }
    if (!this.options.metadata) {
      this.options.metadata = {};
    }
    this.options.metadata[key] = value;
    this.updatedAt = new Date();
  }
  
  getMetadata(key: string): any {
    return this.options?.metadata?.[key];
  }
  
  // ============================================================================
  // PRIORITY & SCHEDULING
  // ============================================================================
  
  getPriority(): number {
    // Higher priority for processing jobs
    if (this.type === RefundJobType.PROCESS_REFUND) {
      return 10;
    }
    
    // Medium priority for notifications
    if (this.type === RefundJobType.SEND_NOTIFICATION) {
      return 5;
    }
    
    // Lower priority for sync jobs
    return 1;
  }
  
  shouldBeProcessedNow(): boolean {
    if (this.status !== RefundJobStatus.PENDING && this.status !== RefundJobStatus.RETRYING) {
      return false;
    }
    
    if (this.scheduledAt && this.scheduledAt > new Date()) {
      return false;
    }
    
    if (this.nextRetryAt && this.nextRetryAt > new Date()) {
      return false;
    }
    
    return true;
  }
  
  getEstimatedDuration(): number {
    // Return estimated duration in minutes based on job type
    const durations = {
      [RefundJobType.PROCESS_REFUND]: 5,
      [RefundJobType.RESTOCK_INVENTORY]: 2,
      [RefundJobType.SEND_NOTIFICATION]: 1,
      [RefundJobType.SYNC_GATEWAY]: 3,
      [RefundJobType.UPDATE_ORDER_STATUS]: 1,
      [RefundJobType.CALCULATE_FEES]: 1,
      [RefundJobType.GENERATE_CREDIT_NOTE]: 2,
    };
    
    return durations[this.type] || 5;
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      refundId: this.refundId,
      orderId: this.orderId,
      payload: this.payload,
      options: this.options,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      nextRetryAt: this.nextRetryAt,
      scheduledAt: this.scheduledAt,
      result: this.result,
      errorMessage: this.errorMessage,
      createdBy: this.createdBy,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isPending: this.isPending(),
      isProcessing: this.isProcessing(),
      isCompleted: this.isCompleted(),
      isFailed: this.isFailed(),
      canBeRetried: this.canBeRetried(),
      isScheduled: this.isScheduled(),
      isOverdue: this.isOverdue(),
      processingTimeMinutes: this.getProcessingTimeInMinutes(),
      waitingTimeMinutes: this.getWaitingTimeInMinutes(),
      remainingRetries: this.getRemainingRetries(),
      priority: this.getPriority(),
      estimatedDurationMinutes: this.getEstimatedDuration(),
      // Include relations if populated
      ...(this.refund && { refund: this.refund }),
      ...(this.order && { order: this.order }),
    };
  }
  
  // ============================================================================
  // FACTORY METHODS
  // ============================================================================
  
  static createProcessRefundJob(data: {
    refundId: string;
    createdBy: string;
    scheduledAt?: Date;
    metadata?: any;
  }): RefundJob {
    return new RefundJob({
      type: RefundJobType.PROCESS_REFUND,
      status: RefundJobStatus.PENDING,
      refundId: data.refundId,
      payload: {
        refundId: data.refundId,
        ...data.metadata,
      },
      options: {},
      retryCount: 0,
      maxRetries: 3,
      scheduledAt: data.scheduledAt,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  static createNotificationJob(data: {
    refundId: string;
    notificationType: string;
    recipientId?: string;
    createdBy: string;
    metadata?: any;
  }): RefundJob {
    return new RefundJob({
      type: RefundJobType.SEND_NOTIFICATION,
      status: RefundJobStatus.PENDING,
      refundId: data.refundId,
      payload: {
        refundId: data.refundId,
        notificationType: data.notificationType,
        recipientId: data.recipientId,
        ...data.metadata,
      },
      options: {},
      retryCount: 0,
      maxRetries: 2, // Fewer retries for notifications
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  static createRestockJob(data: {
    refundId: string;
    variantId: string;
    quantity: number;
    sellerId: string;
    createdBy: string;
    metadata?: any;
  }): RefundJob {
    return new RefundJob({
      type: RefundJobType.RESTOCK_INVENTORY,
      status: RefundJobStatus.PENDING,
      refundId: data.refundId,
      payload: {
        refundId: data.refundId,
        variantId: data.variantId,
        quantity: data.quantity,
        sellerId: data.sellerId,
        ...data.metadata,
      },
      options: {},
      retryCount: 0,
      maxRetries: 3,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}