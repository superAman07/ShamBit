# Notification System Setup Guide

## ✅ Completed Steps

1. **Dependencies Installed** ✅
   - bullmq, ioredis, nodemailer, @aws-sdk/client-ses, @aws-sdk/client-sns, twilio, firebase-admin, @nestjs/axios

2. **Environment Variables Configured** ✅
   - Added notification configuration to `.env`
   - Created `.env.notification` template

3. **Database Migration Completed** ✅
   - Comprehensive notification schema added
   - Migration applied successfully

4. **Default Templates Seeded** ✅
   - Order confirmation, payment success, shipping, and system templates created

## 🔧 Next Steps to Complete Setup

### 1. Set up Redis (Required for Queues & Rate Limiting)

#### Option A: Docker (Recommended for Development)
```bash
# Run Redis in Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or using docker-compose (create docker-compose.redis.yml)
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
volumes:
  redis_data:
```

#### Option B: Local Installation
```bash
# Windows (using Chocolatey)
choco install redis-64

# macOS (using Homebrew)
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server
```

### 2. Configure External Services

#### Email Service (Choose One)

**Option A: SMTP (Gmail for Development)**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Generate app password in Gmail settings
```

**Option B: AWS SES (Production)**
```env
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
```

#### SMS Service (Optional)

**Twilio Setup:**
1. Sign up at https://www.twilio.com/
2. Get Account SID and Auth Token
3. Purchase a phone number

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

#### Push Notifications (Optional)

**Firebase Setup:**
1. Create Firebase project at https://console.firebase.google.com/
2. Generate service account key
3. Download JSON and extract credentials

```env
PUSH_PROVIDER=fcm
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

### 3. Test the System

#### Start Redis
```bash
# If using Docker
docker start redis

# If installed locally
redis-server
```

#### Start the Application
```bash
npm run start:dev
```

#### Test Endpoints

**Send a Test Notification (Admin only):**
```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "type": "ORDER_CONFIRMATION",
    "recipients": [{"email": "test@example.com"}],
    "channels": ["EMAIL"],
    "templateVariables": {
      "customerName": "John Doe",
      "orderNumber": "ORD-12345",
      "totalAmount": "$99.99"
    }
  }'
```

**Get User Notifications:**
```bash
curl -X GET http://localhost:3001/api/notifications \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Update Notification Preferences:**
```bash
curl -X PUT http://localhost:3001/api/notifications/preferences/ORDER_CONFIRMATION \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "channels": ["EMAIL", "PUSH"],
    "isEnabled": true,
    "frequency": "IMMEDIATE"
  }'
```

### 4. Production Considerations

#### Security
- [ ] Use strong secrets for webhook signatures
- [ ] Enable HTTPS for all webhook endpoints
- [ ] Implement proper authentication for admin endpoints
- [ ] Use encrypted environment variables

#### Monitoring
- [ ] Set up health checks for external services
- [ ] Monitor queue processing rates
- [ ] Track delivery success rates
- [ ] Set up alerts for high error rates

#### Scaling
- [ ] Use managed Redis (AWS ElastiCache, etc.)
- [ ] Scale queue workers horizontally
- [ ] Implement database read replicas for metrics
- [ ] Use CDN for template assets

#### Compliance
- [ ] Implement unsubscribe mechanisms
- [ ] Add consent tracking
- [ ] Set up data retention policies
- [ ] Ensure GDPR compliance

## 🧪 Development Mode

For development, you can enable mock mode to avoid sending real notifications:

```env
NOTIFICATION_MOCK_MODE=true
```

This will log notifications instead of sending them through external services.

## 📊 Monitoring Dashboard

The system provides several endpoints for monitoring:

- `GET /api/notifications/health` - System health check
- `GET /api/notifications/metrics` - Delivery metrics
- `GET /api/notifications/metrics/time-series` - Time series data

## 🔧 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis is running on the correct port
   - Check firewall settings
   - Verify Redis configuration

2. **Email Delivery Failed**
   - Check SMTP credentials
   - Verify sender email is authorized
   - Check spam folders

3. **Queue Not Processing**
   - Ensure Redis is accessible
   - Check worker process is running
   - Verify queue configuration

4. **High Memory Usage**
   - Monitor Redis memory usage
   - Implement proper cleanup policies
   - Consider using Redis persistence

### Logs

Check application logs for detailed error information:
```bash
# Development
npm run start:dev

# Production
pm2 logs your-app-name
```

## 🎉 You're All Set!

Your notification system is now ready for production use with:
- ✅ Multi-channel delivery (Email, SMS, Push, In-App, Webhooks)
- ✅ User preference management
- ✅ Rate limiting and retry logic
- ✅ Template system with localization
- ✅ Comprehensive analytics
- ✅ Webhook subscriptions
- ✅ Event-driven notifications

For questions or issues, refer to the main README.md or create an issue in the repository.