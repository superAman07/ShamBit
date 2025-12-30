export class RefundWebhook {
  id: string;
  
  // Refund Association (Optional - some webhooks are global)
  refundId?: string;
  
  // Webhook Details
  webhookId: string; // External webhook ID
  eventType: string; // refund.processed, refund.failed, etc.
  
  // Gateway Information
  gatewayProvider: string;
  
  // Processing Status
  status: string; // RECEIVED, PROCESSING, PROCESSED, FAILED, IGNORED
  
  // Signature Verification
  signature?: string;
  verified: boolean;
  
  // Payload & Response
  payload: any; // Raw webhook payload
  headers: any;
  
  // Processing Details
  processedAt?: Date;
  errorMessage?: string;
  
  // Idempotency
  processed: boolean;
  
  // System Fields
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (populated when needed)
  refund?: any;
  
  constructor(data: Partial<RefundWebhook>) {
    Object.assign(this, data);
  }
  
  // ============================================================================
  // BUSINESS METHODS
  // ============================================================================
  
  isReceived(): boolean {
    return this.status === 'RECEIVED';
  }
  
  isProcessing(): boolean {
    return this.status === 'PROCESSING';
  }
  
  isProcessed(): boolean {
    return this.status === 'PROCESSED';
  }
  
  isFailed(): boolean {
    return this.status === 'FAILED';
  }
  
  isIgnored(): boolean {
    return this.status === 'IGNORED';
  }
  
  isVerified(): boolean {
    return this.verified;
  }
  
  canBeProcessed(): boolean {
    return this.isReceived() && this.isVerified() && !this.processed;
  }
  
  canBeRetried(): boolean {
    return this.isFailed() && this.isVerified();
  }
  
  getProcessingTimeInSeconds(): number | null {
    if (!this.processedAt) {
      return null;
    }
    return Math.floor((this.processedAt.getTime() - this.receivedAt.getTime()) / 1000);
  }
  
  getAgeInMinutes(): number {
    return Math.floor((new Date().getTime() - this.receivedAt.getTime()) / (1000 * 60));
  }
  
  // ============================================================================
  // PAYLOAD EXTRACTION METHODS
  // ============================================================================
  
  getRefundData(): any {
    return this.payload?.refund || this.payload?.entity;
  }
  
  getGatewayRefundId(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.id;
  }
  
  getRefundAmount(): number | undefined {
    const refundData = this.getRefundData();
    return refundData?.amount;
  }
  
  getRefundStatus(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.status;
  }
  
  getFailureReason(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.failure_reason || refundData?.error_description;
  }
  
  getErrorCode(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.error_code;
  }
  
  getArn(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.acquirer_data?.arn;
  }
  
  getSpeed(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.speed;
  }
  
  getNotes(): any {
    const refundData = this.getRefundData();
    return refundData?.notes;
  }
  
  getReceipt(): string | undefined {
    const refundData = this.getRefundData();
    return refundData?.receipt;
  }
  
  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validatePayload(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.payload) {
      errors.push('Webhook payload is required');
      return { isValid: false, errors };
    }
    
    // Validate based on event type
    switch (this.eventType) {
      case 'refund.processed':
      case 'refund.failed':
        if (!this.getGatewayRefundId()) {
          errors.push('Refund ID is required in payload');
        }
        if (this.getRefundAmount() === undefined) {
          errors.push('Refund amount is required in payload');
        }
        break;
        
      case 'refund.speed_changed':
        if (!this.getGatewayRefundId()) {
          errors.push('Refund ID is required in payload');
        }
        if (!this.getSpeed()) {
          errors.push('Speed information is required in payload');
        }
        break;
        
      case 'refund.arn_updated':
        if (!this.getGatewayRefundId()) {
          errors.push('Refund ID is required in payload');
        }
        if (!this.getArn()) {
          errors.push('ARN is required in payload');
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  validateHeaders(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.headers) {
      errors.push('Webhook headers are required');
      return { isValid: false, errors };
    }
    
    // Check for required headers based on gateway
    if (this.gatewayProvider === 'RAZORPAY') {
      const hasSignature = this.headers['x-razorpay-signature'] || 
                          this.headers['X-Razorpay-Signature'];
      
      if (!hasSignature) {
        errors.push('Razorpay signature header is required');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================
  
  updateStatus(newStatus: string, errorMessage?: string): void {
    this.status = newStatus;
    this.updatedAt = new Date();
    
    if (newStatus === 'PROCESSED') {
      this.processed = true;
      this.processedAt = new Date();
    } else if (newStatus === 'FAILED') {
      this.errorMessage = errorMessage;
    }
  }
  
  markAsProcessed(result?: any): void {
    this.status = 'PROCESSED';
    this.processed = true;
    this.processedAt = new Date();
    this.updatedAt = new Date();
  }
  
  markAsFailed(errorMessage: string): void {
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }
  
  markAsIgnored(reason?: string): void {
    this.status = 'IGNORED';
    this.errorMessage = reason;
    this.updatedAt = new Date();
  }
  
  // ============================================================================
  // SECURITY & VERIFICATION
  // ============================================================================
  
  getSanitizedPayload(): any {
    // Return payload with sensitive information removed
    const sanitized = { ...this.payload };
    
    // Remove sensitive fields if they exist
    const sensitiveFields = ['api_key', 'secret', 'password', 'token'];
    
    const removeSensitiveFields = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      const cleaned = { ...obj };
      
      for (const field of sensitiveFields) {
        if (field in cleaned) {
          cleaned[field] = '[REDACTED]';
        }
      }
      
      // Recursively clean nested objects
      for (const key in cleaned) {
        if (typeof cleaned[key] === 'object') {
          cleaned[key] = removeSensitiveFields(cleaned[key]);
        }
      }
      
      return cleaned;
    };
    
    return removeSensitiveFields(sanitized);
  }
  
  getSanitizedHeaders(): any {
    // Return headers with sensitive information removed
    const sanitized = { ...this.headers };
    
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getEventCategory(): string {
    // Categorize webhook events
    if (this.eventType.includes('processed') || this.eventType.includes('completed')) {
      return 'SUCCESS';
    }
    
    if (this.eventType.includes('failed') || this.eventType.includes('error')) {
      return 'FAILURE';
    }
    
    if (this.eventType.includes('updated') || this.eventType.includes('changed')) {
      return 'UPDATE';
    }
    
    return 'OTHER';
  }
  
  isHighPriority(): boolean {
    const highPriorityEvents = [
      'refund.processed',
      'refund.failed',
    ];
    
    return highPriorityEvents.includes(this.eventType);
  }
  
  requiresImmediateProcessing(): boolean {
    return this.isHighPriority() && this.isVerified();
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  toJSON(): any {
    return {
      id: this.id,
      refundId: this.refundId,
      webhookId: this.webhookId,
      eventType: this.eventType,
      gatewayProvider: this.gatewayProvider,
      status: this.status,
      signature: this.signature,
      verified: this.verified,
      payload: this.getSanitizedPayload(),
      headers: this.getSanitizedHeaders(),
      processedAt: this.processedAt,
      errorMessage: this.errorMessage,
      processed: this.processed,
      receivedAt: this.receivedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isReceived: this.isReceived(),
      isProcessing: this.isProcessing(),
      isProcessed: this.isProcessed(),
      isFailed: this.isFailed(),
      isIgnored: this.isIgnored(),
      canBeProcessed: this.canBeProcessed(),
      canBeRetried: this.canBeRetried(),
      processingTimeSeconds: this.getProcessingTimeInSeconds(),
      ageMinutes: this.getAgeInMinutes(),
      eventCategory: this.getEventCategory(),
      isHighPriority: this.isHighPriority(),
      requiresImmediateProcessing: this.requiresImmediateProcessing(),
      // Extracted data
      gatewayRefundId: this.getGatewayRefundId(),
      refundAmount: this.getRefundAmount(),
      refundStatus: this.getRefundStatus(),
      failureReason: this.getFailureReason(),
      errorCode: this.getErrorCode(),
      arn: this.getArn(),
      speed: this.getSpeed(),
      // Include relations if populated
      ...(this.refund && { refund: this.refund }),
    };
  }
  
  toAuditLog(): any {
    return {
      webhookId: this.webhookId,
      eventType: this.eventType,
      gatewayProvider: this.gatewayProvider,
      status: this.status,
      verified: this.verified,
      processed: this.processed,
      receivedAt: this.receivedAt,
      processedAt: this.processedAt,
      errorMessage: this.errorMessage,
      gatewayRefundId: this.getGatewayRefundId(),
      refundAmount: this.getRefundAmount(),
      eventCategory: this.getEventCategory(),
    };
  }
  
  // ============================================================================
  // FACTORY METHODS
  // ============================================================================
  
  static createFromRazorpayWebhook(data: {
    webhookId: string;
    eventType: string;
    payload: any;
    headers: Record<string, string>;
    signature?: string;
    verified?: boolean;
  }): RefundWebhook {
    return new RefundWebhook({
      webhookId: data.webhookId,
      eventType: data.eventType,
      gatewayProvider: 'RAZORPAY',
      status: 'RECEIVED',
      signature: data.signature,
      verified: data.verified || false,
      payload: data.payload,
      headers: data.headers,
      processed: false,
      receivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}