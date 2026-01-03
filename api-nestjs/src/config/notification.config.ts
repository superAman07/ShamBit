import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Queue Configuration
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10),
  },

  // Rate Limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    defaultRules: [
      {
        channel: 'EMAIL',
        scope: 'USER',
        maxPerMinute: 5,
        maxPerHour: 50,
        maxPerDay: 200,
      },
      {
        channel: 'SMS',
        scope: 'USER',
        maxPerMinute: 2,
        maxPerHour: 10,
        maxPerDay: 50,
      },
      {
        channel: 'PUSH',
        scope: 'USER',
        maxPerMinute: 10,
        maxPerHour: 100,
        maxPerDay: 500,
      },
    ],
  },

  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    fromName: process.env.EMAIL_FROM_NAME || 'Marketplace',
    fromEmail: process.env.EMAIL_FROM_EMAIL || 'noreply@marketplace.com',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    ses: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
  },

  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    maxLength: parseInt(process.env.SMS_MAX_LENGTH || '160', 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    },
    sns: {
      region: process.env.AWS_SNS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY || '',
    },
  },

  // Push Configuration
  push: {
    provider: process.env.PUSH_PROVIDER || 'fcm',
    fcm: {
      projectId: process.env.FCM_PROJECT_ID || '',
      privateKey: process.env.FCM_PRIVATE_KEY || '',
      clientEmail: process.env.FCM_CLIENT_EMAIL || '',
    },
    apns: {
      keyId: process.env.APNS_KEY_ID || '',
      teamId: process.env.APNS_TEAM_ID || '',
      bundleId: process.env.APNS_BUNDLE_ID || '',
      privateKey: process.env.APNS_PRIVATE_KEY || '',
      production: process.env.APNS_PRODUCTION === 'true',
    },
  },

  // Webhook Configuration
  webhook: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.WEBHOOK_RETRIES || '3', 10),
    userAgent: process.env.WEBHOOK_USER_AGENT || 'NotificationService/1.0',
  },

  // Deduplication Configuration
  deduplication: {
    ttl: parseInt(process.env.DEDUPLICATION_TTL || '3600', 10),
    hashAlgorithm: process.env.DEDUPLICATION_HASH_ALGORITHM || 'sha256',
  },
}));
