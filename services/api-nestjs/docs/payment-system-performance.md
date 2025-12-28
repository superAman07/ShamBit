# Payment System - Performance & Scaling Considerations

## Database Indexes & Query Optimization

### Payment Intent Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (intentId)
UNIQUE (gatewayIntentId)

-- Performance indexes
INDEX idx_payment_intents_order_id (orderId)
INDEX idx_payment_intents_status (status)
INDEX idx_payment_intents_gateway_provider (gatewayProvider)
INDEX idx_payment_intents_created_at (createdAt)
INDEX idx_payment_intents_expires_at (expiresAt)

-- Composite indexes for common queries
INDEX idx_payment_intents_order_status (orderId, status)
INDEX idx_payment_intents_gateway_status (gatewayProvider, status)
INDEX idx_payment_intents_status_created (status, createdAt DESC)

-- Partial indexes for performance
INDEX idx_payment_intents_active (orderId, status) WHERE status IN ('CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING')
INDEX idx_payment_intents_expired (expiresAt) WHERE status NOT IN ('SUCCEEDED', 'CANCELED') AND expiresAt < NOW()
```

### Payment Transaction Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (transactionId)

-- Performance indexes
INDEX idx_payment_transactions_payment_intent_id (paymentIntentId)
INDEX idx_payment_transactions_status (status)
INDEX idx_payment_transactions_type (type)
INDEX idx_payment_transactions_gateway_transaction_id (gatewayTransactionId)
INDEX idx_payment_transactions_processed_at (processedAt)
INDEX idx_payment_transactions_reconciled (reconciled)
INDEX idx_payment_transactions_created_at (createdAt)

-- Composite indexes
INDEX idx_payment_transactions_intent_status (paymentIntentId, status)
INDEX idx_payment_transactions_type_status (type, status)
INDEX idx_payment_transactions_reconciliation (reconciled, processedAt)
```

### Payment Webhook Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (webhookId)

-- Performance indexes
INDEX idx_payment_webhooks_payment_intent_id (paymentIntentId)
INDEX idx_payment_webhooks_event_type (eventType)
INDEX idx_payment_webhooks_status (status)
INDEX idx_payment_webhooks_processed (processed)
INDEX idx_payment_webhooks_received_at (receivedAt)

-- Composite indexes
INDEX idx_payment_webhooks_provider_type (gatewayProvider, eventType)
INDEX idx_payment_webhooks_unprocessed (status, processed) WHERE processed = false
```

## Concurrency & Locking Strategy

### Payment Intent Creation (Idempotency)
```typescript
// Use unique constraint + upsert for idempotency
await this.prisma.$transaction(async (tx) => {
  // Check for existing payment intent
  const existing = await tx.paymentIntent.findUnique({
    where: { orderId_gatewayProvider: { orderId, gatewayProvider } }
  });
  
  if (existing) {
    return existing; // Idempotent response
  }
  
  // Create new payment intent
  return tx.paymentIntent.create({ data: paymentData });
}, {
  isolationLevel: 'Serializable'
});
```

### Payment Confirmation (Optimistic Locking)
```typescript
// Version-based optimistic locking
await tx.paymentIntent.update({
  where: { 
    id: paymentIntentId,
    version: currentVersion // Prevents concurrent updates
  },
  data: {
    status: newStatus,
    version: { increment: 1 }
  }
});
```

### Webhook Processing (Deduplication)
```typescript
// Idempotent webhook processing
await this.prisma.$transaction(async (tx) => {
  // Check if webhook already processed
  const existing = await tx.paymentWebhook.findUnique({
    where: { webhookId }
  });
  
  if (existing && existing.processed) {
    return { processed: true, message: 'Already processed' };
  }
  
  // Process webhook
  await this.processWebhookEvent(webhookEvent);
  
  // Mark as processed
  await tx.paymentWebhook.upsert({
    where: { webhookId },
    create: { ...webhookData, processed: true },
    update: { processed: true, processedAt: new Date() }
  });
});
```

## Gateway Integration Patterns

### Circuit Breaker Pattern
```typescript
class PaymentGatewayCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Retry Strategy with Exponential Backoff
```typescript
class PaymentRetryStrategy {
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !this.isRetryable(error)) {
          throw error;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  private isRetryable(error: any): boolean {
    return error.type === 'RATE_LIMIT_ERROR' || 
           error.type === 'API_CONNECTION_ERROR' ||
           error.type === 'API_ERROR';
  }
}
```

## Caching Strategy

### Payment Intent Caching
```typescript
// Cache payment intents for quick retrieval
const cacheKey = `payment_intent:${paymentIntentId}`;
const cached = await redis.get(cacheKey);

if (!cached) {
  const paymentIntent = await this.paymentRepository.findById(paymentIntentId);
  await redis.setex(cacheKey, 300, JSON.stringify(paymentIntent)); // 5-minute cache
  return paymentIntent;
}

return JSON.parse(cached);
```

### Gateway Configuration Caching
```typescript
// Cache gateway configurations
const configCacheKey = `gateway_config:${provider}`;
const config = await redis.get(configCacheKey);

if (!config) {
  const gatewayConfig = await this.getGatewayConfig(provider);
  await redis.setex(configCacheKey, 3600, JSON.stringify(gatewayConfig)); // 1-hour cache
  return gatewayConfig;
}

return JSON.parse(config);
```

### Cache Invalidation
```typescript
// Invalidate related caches on payment updates
await Promise.all([
  redis.del(`payment_intent:${paymentIntentId}`),
  redis.del(`order_payments:${orderId}`),
  redis.del(`customer_payments:${customerId}`),
]);
```

## Webhook Processing Optimization

### Async Webhook Processing
```typescript
// Process webhooks asynchronously
@EventPattern('payment.webhook.received')
async handleWebhook(data: WebhookData) {
  try {
    // Verify signature first
    const isValid = await this.verifyWebhookSignature(data);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }
    
    // Process webhook event
    await this.processWebhookEvent(data.event);
    
    // Update webhook status
    await this.markWebhookProcessed(data.webhookId);
    
  } catch (error) {
    await this.markWebhookFailed(data.webhookId, error.message);
    throw error;
  }
}
```

### Webhook Deduplication
```typescript
// Deduplicate webhooks using Redis
const dedupeKey = `webhook_processed:${webhookId}`;
const alreadyProcessed = await redis.get(dedupeKey);

if (alreadyProcessed) {
  return { processed: true, message: 'Already processed' };
}

// Process webhook
await this.processWebhook(webhookData);

// Mark as processed (with TTL for cleanup)
await redis.setex(dedupeKey, 86400, 'true'); // 24-hour TTL
```

## Performance Monitoring

### Key Metrics to Track
- Payment intent creation latency (target: <200ms)
- Payment confirmation latency (target: <500ms)
- Gateway response time (target: <2s)
- Webhook processing latency (target: <100ms)
- Payment success rate (target: >99%)
- Retry success rate
- Gateway error rates by type

### Database Performance Monitoring
```sql
-- Monitor payment-related query performance
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query LIKE '%payment%'
ORDER BY mean_time DESC;

-- Monitor webhook processing performance
SELECT 
  event_type,
  COUNT(*) as total_webhooks,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_time,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
FROM payment_webhooks
WHERE received_at > NOW() - INTERVAL '1 day'
GROUP BY event_type;
```

### Application Performance Monitoring
```typescript
// Track payment operation performance
const startTime = Date.now();
const paymentIntent = await this.createPaymentIntent(dto, userId);
const duration = Date.now() - startTime;

this.metricsService.recordHistogram('payment.creation.duration', duration);
this.metricsService.incrementCounter('payment.creation.success');

// Track gateway performance
const gatewayStartTime = Date.now();
const gatewayResponse = await gateway.createPaymentIntent(request);
const gatewayDuration = Date.now() - gatewayStartTime;

this.metricsService.recordHistogram(`gateway.${provider}.duration`, gatewayDuration);
this.metricsService.incrementCounter(`gateway.${provider}.${gatewayResponse.success ? 'success' : 'failure'}`);
```

## Scaling Considerations

### Database Partitioning
```sql
-- Partition payment tables by date for better performance
CREATE TABLE payment_intents_2024_01 PARTITION OF payment_intents
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE payment_transactions_2024_01 PARTITION OF payment_transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Read Replicas for Reporting
```typescript
// Route read-heavy operations to replicas
const paymentHistory = await this.readOnlyPrisma.paymentIntent.findMany({
  where: { customerId },
  orderBy: { createdAt: 'desc' },
  include: { transactions: true }
});
```

### Microservice Decomposition
```
Payment Service (Core)
├── Payment Intent Service
├── Payment Processing Service
├── Payment Gateway Service
└── Payment Webhook Service

Gateway Services (Separate)
├── Stripe Service
├── Razorpay Service
└── PayPal Service
```

## Security Considerations

### PCI DSS Compliance
- Never store card details in application database
- Use tokenization for payment methods
- Encrypt sensitive data at rest and in transit
- Implement proper access controls
- Regular security audits

### API Security
```typescript
// Rate limiting for payment endpoints
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
async createPaymentIntent() {
  // Implementation
}

// Input validation and sanitization
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
async confirmPayment(@Body() dto: ConfirmPaymentDto) {
  // Implementation
}
```

### Webhook Security
```typescript
// Verify webhook signatures
const isValid = await this.verifyWebhookSignature(
  payload,
  signature,
  webhookSecret
);

if (!isValid) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

## Disaster Recovery

### Payment Data Backup
- Real-time replication to secondary database
- Encrypted backups with point-in-time recovery
- Cross-region backup replication
- Regular backup testing and validation

### Gateway Failover
```typescript
// Automatic failover to backup gateway
class PaymentGatewayFailover {
  async processPayment(request: PaymentRequest) {
    const primaryGateway = this.getPrimaryGateway();
    
    try {
      return await primaryGateway.processPayment(request);
    } catch (error) {
      if (this.isGatewayDown(error)) {
        const backupGateway = this.getBackupGateway();
        return await backupGateway.processPayment(request);
      }
      throw error;
    }
  }
}
```

### Data Consistency Checks
```sql
-- Verify payment intent totals match transaction totals
SELECT 
  pi.id,
  pi.amount as intent_amount,
  COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'PAYMENT' AND pt.status = 'SUCCEEDED'), 0) as paid_amount
FROM payment_intents pi
LEFT JOIN payment_transactions pt ON pi.id = pt.payment_intent_id
WHERE pi.status = 'SUCCEEDED'
GROUP BY pi.id, pi.amount
HAVING pi.amount != COALESCE(SUM(pt.amount) FILTER (WHERE pt.type = 'PAYMENT' AND pt.status = 'SUCCEEDED'), 0);

-- Verify webhook processing consistency
SELECT 
  pw.webhook_id,
  pw.event_type,
  pw.processed,
  pi.status as payment_status
FROM payment_webhooks pw
LEFT JOIN payment_intents pi ON pw.payment_intent_id = pi.id
WHERE pw.event_type = 'payment_intent.succeeded'
  AND pw.processed = true
  AND pi.status != 'SUCCEEDED';
```