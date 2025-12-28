# Order System - Performance & Scaling Considerations

## Database Indexes & Query Optimization

### Order Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (orderNumber)

-- Performance indexes
INDEX idx_orders_customer_id (customerId)
INDEX idx_orders_status (status)
INDEX idx_orders_created_at (createdAt)
INDEX idx_orders_expires_at (expiresAt)

-- Composite indexes for common queries
INDEX idx_orders_customer_status (customerId, status)
INDEX idx_orders_customer_created (customerId, createdAt DESC)
INDEX idx_orders_status_created (status, createdAt DESC)

-- Multi-seller support
INDEX idx_orders_parent_id (parentOrderId)
INDEX idx_orders_split (isSplit, parentOrderId)

-- Partial indexes for performance
INDEX idx_orders_active (customerId, status) WHERE status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED')
INDEX idx_orders_expired (expiresAt) WHERE status = 'PENDING' AND expiresAt < NOW()
```

### Order Items Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Performance indexes
INDEX idx_order_items_order_id (orderId)
INDEX idx_order_items_variant_id (variantId)
INDEX idx_order_items_seller_id (sellerId)
INDEX idx_order_items_status (status)
INDEX idx_order_items_reservation_key (reservationKey)

-- Composite indexes for multi-seller queries
INDEX idx_order_items_order_seller (orderId, sellerId)
INDEX idx_order_items_seller_status (sellerId, status)

-- Refund tracking
INDEX idx_order_items_refunded (refundedQuantity) WHERE refundedQuantity > 0
```

### Order Payments Table Indexes
```sql
-- Primary key
PRIMARY KEY (id)

-- Performance indexes
INDEX idx_order_payments_order_id (orderId)
INDEX idx_order_payments_status (status)
INDEX idx_order_payments_payment_intent_id (paymentIntentId)
INDEX idx_order_payments_created_at (createdAt)

-- Composite indexes
INDEX idx_order_payments_order_status (orderId, status)
INDEX idx_order_payments_status_created (status, createdAt DESC)
```

## Query Optimization Patterns

### Order Retrieval Queries

#### Customer Order History
```sql
-- Optimized by: idx_orders_customer_created
SELECT o.*, COUNT(oi.id) as itemCount, SUM(oi.totalPrice) as calculatedTotal
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.orderId
WHERE o.customerId = ? AND o.deletedAt IS NULL
GROUP BY o.id
ORDER BY o.createdAt DESC
LIMIT 20 OFFSET ?;
```

#### Active Orders Dashboard
```sql
-- Optimized by: idx_orders_status_created
SELECT o.*, c.name as customerName, COUNT(oi.id) as itemCount
FROM orders o
JOIN users c ON o.customerId = c.id
LEFT JOIN order_items oi ON o.id = oi.orderId
WHERE o.status IN ('PENDING', 'CONFIRMED', 'PROCESSING')
GROUP BY o.id, c.name
ORDER BY o.createdAt DESC;
```

#### Seller Order Management
```sql
-- Optimized by: idx_order_items_seller_status
SELECT DISTINCT o.*, oi.sellerId
FROM orders o
JOIN order_items oi ON o.id = oi.orderId
WHERE oi.sellerId = ? AND oi.status = 'CONFIRMED'
ORDER BY o.createdAt DESC;
```

### Inventory Integration Queries

#### Order Creation Inventory Check
```sql
-- Check inventory availability for all items in order
SELECT oi.variantId, oi.quantity, i.availableQuantity,
       (i.availableQuantity >= oi.quantity) as hasStock
FROM (VALUES (?, ?), (?, ?)) AS oi(variantId, quantity)
LEFT JOIN inventory i ON oi.variantId = i.variantId AND i.sellerId = ?
WHERE i.deletedAt IS NULL;
```

#### Reservation Cleanup
```sql
-- Find expired reservations for cleanup
-- Optimized by: idx_inventory_reservations_active_expired
SELECT ir.*, o.orderNumber
FROM inventory_reservations ir
LEFT JOIN order_items oi ON ir.reservationKey = oi.reservationKey
LEFT JOIN orders o ON oi.orderId = o.id
WHERE ir.status = 'ACTIVE' 
  AND ir.expiresAt < NOW()
  AND (o.status IS NULL OR o.status = 'CANCELLED')
LIMIT 100;
```

## Concurrency & Locking Strategy

### Order Creation Concurrency
```typescript
// Use serializable isolation for order creation
await this.prisma.$transaction(async (tx) => {
  // All order creation logic here
}, {
  isolationLevel: 'Serializable'
});
```

### Inventory Reservation Locking
```typescript
// Row-level locking for inventory updates
const inventory = await tx.inventory.findUnique({
  where: { id: inventoryId },
  // PostgreSQL: SELECT ... FOR UPDATE
});
```

### Optimistic Locking for Order Updates
```typescript
// Version-based optimistic locking
await tx.order.update({
  where: { 
    id: orderId,
    version: currentVersion // Prevents concurrent updates
  },
  data: {
    ...updateData,
    version: { increment: 1 }
  }
});
```

## Caching Strategy

### Order Data Caching
```typescript
// Cache frequently accessed order data
const cacheKey = `order:${orderId}`;
const cachedOrder = await redis.get(cacheKey);

if (!cachedOrder) {
  const order = await this.orderRepository.findById(orderId);
  await redis.setex(cacheKey, 300, JSON.stringify(order)); // 5-minute cache
  return order;
}

return JSON.parse(cachedOrder);
```

### Inventory Availability Caching
```typescript
// Cache inventory levels for quick order validation
const inventoryCacheKey = `inventory:${variantId}:${sellerId}`;
const availableQuantity = await redis.get(inventoryCacheKey);

// Cache with short TTL due to frequent changes
await redis.setex(inventoryCacheKey, 60, availableQuantity.toString());
```

### Cache Invalidation Strategy
```typescript
// Invalidate related caches on order updates
await Promise.all([
  redis.del(`order:${orderId}`),
  redis.del(`customer:orders:${customerId}`),
  redis.del(`seller:orders:${sellerId}`),
]);
```

## Event Processing Optimization

### Async Event Processing
```typescript
// Process non-critical events asynchronously
this.eventEmitter.emit('order.created', orderCreatedEvent);

// Use job queues for heavy processing
await this.jobQueue.add('send-order-confirmation', {
  orderId: order.id,
  customerId: order.customerId,
});
```

### Event Batching
```typescript
// Batch similar events for efficiency
const orderEvents = [];
for (const order of orders) {
  orderEvents.push(new OrderStatusChangedEvent(/* ... */));
}

// Process in batches
await this.eventProcessor.processBatch(orderEvents);
```

## Scaling Considerations

### Database Partitioning
```sql
-- Partition orders by date for better performance
CREATE TABLE orders_2024_01 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Read Replicas
```typescript
// Route read queries to replicas
const orderHistory = await this.readOnlyPrisma.order.findMany({
  where: { customerId },
  orderBy: { createdAt: 'desc' },
});
```

### Microservice Decomposition
```
Order Service (Core)
├── Order Creation Service
├── Order Fulfillment Service
├── Order Payment Service
└── Order Notification Service

Inventory Service (Separate)
├── Inventory Management
├── Reservation Service
└── Stock Movement Service
```

## Performance Monitoring

### Key Metrics to Track
- Order creation latency (target: <500ms)
- Inventory reservation success rate (target: >99.9%)
- Payment processing time (target: <2s)
- Order status transition latency
- Database query performance
- Cache hit rates
- Event processing lag

### Database Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query LIKE '%orders%'
ORDER BY mean_time DESC;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('orders', 'order_items', 'order_payments')
ORDER BY idx_scan DESC;
```

### Application Performance Monitoring
```typescript
// Track order creation performance
const startTime = Date.now();
const order = await this.createOrder(createOrderDto, createdBy);
const duration = Date.now() - startTime;

this.metricsService.recordHistogram('order.creation.duration', duration);
this.metricsService.incrementCounter('order.creation.success');
```

## Load Testing Scenarios

### Order Creation Load Test
```javascript
// Simulate concurrent order creation
const scenarios = [
  {
    name: 'order_creation',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 0 },
    ],
  },
];
```

### Inventory Contention Test
```javascript
// Test inventory reservation under high contention
export default function() {
  const orderData = {
    customerId: 'customer-123',
    items: [
      {
        variantId: 'popular-variant-1', // Same variant for all users
        quantity: 1,
      }
    ],
    // ... other order data
  };
  
  http.post('/api/orders', JSON.stringify(orderData));
}
```

## Disaster Recovery

### Order Data Backup Strategy
- Real-time replication to secondary database
- Daily encrypted backups to cloud storage
- Point-in-time recovery capability
- Cross-region backup replication

### Failover Procedures
1. Automatic failover to read replica
2. Inventory reservation state recovery
3. In-flight order processing recovery
4. Payment state reconciliation

### Data Consistency Checks
```sql
-- Verify order totals match item totals
SELECT o.id, o.totalAmount, SUM(oi.totalPrice) as itemsTotal
FROM orders o
JOIN order_items oi ON o.id = oi.orderId
GROUP BY o.id, o.totalAmount
HAVING ABS(o.totalAmount - SUM(oi.totalPrice)) > 0.01;

-- Verify inventory reservations match order items
SELECT oi.reservationKey, oi.quantity, ir.quantity
FROM order_items oi
LEFT JOIN inventory_reservations ir ON oi.reservationKey = ir.reservationKey
WHERE oi.reservationKey IS NOT NULL
  AND (ir.id IS NULL OR oi.quantity != ir.quantity);
```