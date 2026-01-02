# Enterprise Notification & Communication System

A production-grade, multi-channel notification system designed for enterprise marketplace platforms. This system provides comprehensive notification delivery, user preference management, webhook support, and advanced analytics.

## 🚀 Features

### Core Capabilities
- **Multi-Channel Delivery**: Email, SMS, Push, In-App, Webhooks
- **Event-Driven Architecture**: React to domain events automatically
- **Multi-Tenant Support**: Isolated notifications per tenant
- **Template System**: Localized, versioned templates with variables
- **User Preferences**: Granular notification preferences per user
- **Rate Limiting**: Channel-specific rate limits and throttling
- **Retry & Dead Letter**: Exponential backoff with dead letter queues
- **Idempotency**: Duplicate prevention with idempotency keys
- **Analytics**: Comprehensive delivery and engagement metrics
- **Webhook Management**: External webhook subscriptions with retry logic

### Enterprise Features
- **Batch Processing**: Bulk notification handling
- **Scheduled Delivery**: Time-based notification scheduling
- **Content Deduplication**: Prevent duplicate content delivery
- **Audit Trail**: Complete notification lifecycle tracking
- **Health Monitoring**: System health checks and alerting
- **Cost Tracking**: Per-channel cost analytics
- **Compliance**: GDPR, CAN-SPAM, TCPA compliance features

## 📋 Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Layer     │    │   Core Services  │    │   Channels      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Controllers     │───▶│ NotificationSvc  │───▶│ Email Service   │
│ DTOs            │    │ TemplateService  │    │ SMS Service     │
│ Validation      │    │ PreferenceService│    │ Push Service    │
└─────────────────┘    │ MetricsService   │    │ Webhook Service │
                       └──────────────────┘    │ InApp Service   │
                                               └─────────────────┘
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Queue System  │    │   Data Layer     │    │   External      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Redis/Bull      │    │ Prisma ORM       │    │ AWS SES/SNS     │
│ Job Processing  │    │ PostgreSQL       │    │ Twilio          │
│ Retry Logic     │    │ Metrics Storage  │    │ Firebase FCM    │
└─────────────────┘    └──────────────────┘    │ SendGrid        │
                                               └─────────────────┘
```

### Data Models

#### Core Models
- **Notification**: Main notification entity with lifecycle tracking
- **NotificationDelivery**: Channel-specific delivery attempts
- **NotificationTemplate**: Multi-language templates with variables
- **NotificationPreference**: User/tenant notification preferences
- **WebhookSubscription**: External webhook configurations

#### Supporting Models
- **NotificationMetrics**: Aggregated delivery and engagement metrics
- **NotificationEvent**: Audit trail of notification events
- **NotificationBatch**: Bulk notification processing
- **NotificationRateLimit**: Rate limiting configurations

## 🛠 Setup & Configuration

### 1. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/marketplace"

# Redis (for queues and rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration (AWS SES)
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your_access_key
AWS_SES_SECRET_ACCESS_KEY=your_secret_key
EMAIL_FROM_NAME="Marketplace"
EMAIL_FROM_EMAIL="noreply@marketplace.com"

# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Push Notifications (Firebase)
PUSH_PROVIDER=fcm
FCM_PROJECT_ID=your_project_id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

### 2. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed default templates (optional)
npm run seed:notifications
```

### 3. Queue Setup

```bash
# Install Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Or use managed Redis (AWS ElastiCache, etc.)
```

## 📚 Usage Examples

### 1. Sending Notifications

```typescript
// Basic notification
await notificationService.sendNotification({
  type: NotificationType.ORDER_CONFIRMATION,
  recipients: [{ userId: 'user123' }],
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  priority: NotificationPriority.HIGH,
  category: NotificationCategory.TRANSACTIONAL,
  templateVariables: {
    orderNumber: 'ORD-12345',
    customerName: 'John Doe',
    totalAmount: '$99.99',
  },
  context: {
    source: 'order-service',
    metadata: { orderId: 'order123' },
  },
});

// Scheduled notification
await notificationService.sendNotification({
  type: NotificationType.PROMOTION_REMINDER,
  recipients: [{ email: 'user@example.com' }],
  channels: [NotificationChannel.EMAIL],
  priority: NotificationPriority.MEDIUM,
  category: NotificationCategory.MARKETING,
  templateVariables: {
    promotionName: 'Black Friday Sale',
    discountPercent: 50,
  },
  scheduledAt: new Date('2024-11-29T09:00:00Z'),
  context: {
    source: 'marketing-service',
    metadata: { campaignId: 'campaign123' },
  },
});
```

### 2. Event-Driven Notifications

```typescript
// Automatic notification on domain events
@OnEvent('order.created')
async handleOrderCreated(event: DomainEvent) {
  await this.notificationService.sendNotification({
    type: NotificationType.ORDER_CONFIRMATION,
    recipients: [{ userId: event.data.userId }],
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    category: NotificationCategory.TRANSACTIONAL,
    templateVariables: event.data,
    context: {
      correlationId: event.metadata.correlationId,
      source: 'order-service',
      metadata: { orderId: event.aggregateId },
    },
  });
}
```

### 3. Managing User Preferences

```typescript
// Update user preferences
await preferenceService.updatePreference(
  'user123',
  NotificationType.ORDER_CONFIRMATION,
  {
    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    isEnabled: true,
    frequency: PreferenceFrequency.IMMEDIATE,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'America/New_York',
  }
);

// Subscribe to SMS notifications
await preferenceService.subscribeToChannel(
  'user123',
  NotificationChannel.SMS,
  { phone: '+1234567890' }
);
```

### 4. Webhook Management

```typescript
// Create webhook subscription
const webhook = await webhookService.createSubscription({
  name: 'Order Notifications',
  url: 'https://api.partner.com/webhooks/orders',
  events: [
    NotificationType.ORDER_CONFIRMATION,
    NotificationType.ORDER_SHIPPED,
    NotificationType.ORDER_DELIVERED,
  ],
  secret: 'webhook_secret_key',
  headers: {
    'Authorization': 'Bearer token123',
  },
}, 'user123');

// Test webhook
const result = await webhookService.testWebhook(webhook.id);
console.log('Webhook test result:', result);
```

### 5. Template Management

```typescript
// Create notification template
const template = await templateService.createTemplate({
  name: 'Order Confirmation Email',
  type: NotificationType.ORDER_CONFIRMATION,
  channel: NotificationChannel.EMAIL,
  category: NotificationCategory.TRANSACTIONAL,
  locale: 'en',
  subject: 'Order Confirmation - {{orderNumber}}',
  content: `
    Hi {{customerName}},
    
    Thank you for your order! Your order {{orderNumber}} has been confirmed.
    
    Order Details:
    {{#each items}}
    - {{name}} x {{quantity}} = {{price}}
    {{/each}}
    
    Total: {{totalAmount}}
    
    We'll send you updates as your order progresses.
  `,
  htmlContent: `
    <h1>Order Confirmation</h1>
    <p>Hi {{customerName}},</p>
    <p>Thank you for your order! Your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
    <!-- HTML template content -->
  `,
  variables: ['customerName', 'orderNumber', 'items', 'totalAmount'],
}, 'admin123');

// Activate template
await templateService.activateTemplate(template.id);
```

## 📊 Monitoring & Analytics

### 1. Delivery Metrics

```typescript
// Get overall metrics
const metrics = await metricsService.getMetrics({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  channel: NotificationChannel.EMAIL,
});

console.log('Email metrics:', {
  sent: metrics.sent,
  delivered: metrics.delivered,
  opened: metrics.opened,
  clicked: metrics.clicked,
  deliveryRate: metrics.delivered / metrics.sent,
  openRate: metrics.opened / metrics.delivered,
});
```

### 2. Channel Performance

```typescript
// Get channel performance comparison
const performance = await metricsService.getChannelPerformance({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
});

performance.forEach(channel => {
  console.log(`${channel.channel}:`, {
    errorRate: channel.errorRate,
    avgDeliveryTime: channel.avgDeliveryTime,
    cost: channel.cost,
  });
});
```

### 3. Time Series Analysis

```typescript
// Get daily metrics for the last 30 days
const timeSeries = await metricsService.getTimeSeriesData({
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  dateTo: new Date(),
}, 'day');

// Plot delivery trends
timeSeries.forEach(point => {
  console.log(`${point.timestamp.toISOString()}: ${point.metrics.sent} sent`);
});
```

## 🔧 Advanced Configuration

### 1. Rate Limiting

```typescript
// Configure channel-specific rate limits
await rateLimitService.setRateLimitRule(
  NotificationChannel.SMS,
  'USER',
  {
    maxPerMinute: 2,
    maxPerHour: 10,
    maxPerDay: 50,
    burstLimit: 3,
  }
);
```

### 2. Custom Templates

```typescript
// Create localized templates
await templateService.createLocalization(
  templateId,
  'es',
  {
    subject: 'Confirmación de Pedido - {{orderNumber}}',
    content: 'Hola {{customerName}}, gracias por tu pedido...',
  }
);
```

### 3. Webhook Security

```typescript
// Verify webhook signatures
const isValid = await webhookService.verifyWebhookSignature(
  requestBody,
  request.headers['x-webhook-signature'],
  webhookSecret
);
```

## 🚨 Error Handling & Troubleshooting

### Common Issues

1. **High Bounce Rate**: Check email authentication (SPF, DKIM, DMARC)
2. **SMS Delivery Failures**: Verify phone number format and carrier restrictions
3. **Push Notification Issues**: Check FCM credentials and device token validity
4. **Webhook Timeouts**: Implement proper retry logic and monitoring

### Monitoring Checklist

- [ ] Queue processing rates
- [ ] Channel delivery rates
- [ ] Error rates by channel
- [ ] Rate limit violations
- [ ] Webhook endpoint health
- [ ] Template rendering errors
- [ ] Database performance

## 🔒 Security & Compliance

### Security Features
- HMAC signature verification for webhooks
- Encrypted credential storage
- Rate limiting and DDoS protection
- Audit logging for all operations
- PII data handling compliance

### Compliance Features
- GDPR: Right to be forgotten, data portability
- CAN-SPAM: Unsubscribe mechanisms, sender identification
- TCPA: SMS consent management
- SOC 2: Security and availability controls

## 📈 Performance & Scaling

### Optimization Strategies
- Horizontal queue scaling with multiple workers
- Database connection pooling
- Template caching with Redis
- Batch processing for bulk operations
- CDN for template assets

### Scaling Considerations
- Separate read/write databases for metrics
- Partition large tables by tenant or date
- Use message queues for cross-service communication
- Implement circuit breakers for external services

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility
5. Add proper error handling and logging

## 📄 License

This notification system is part of the enterprise marketplace platform and follows the project's licensing terms.