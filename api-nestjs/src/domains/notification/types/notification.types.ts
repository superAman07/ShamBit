// ============================================================================
// NOTIFICATION DOMAIN TYPES
// ============================================================================

export enum NotificationType {
  // Order Events
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_RETURNED = 'ORDER_RETURNED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  ORDER_DELAYED = 'ORDER_DELAYED',
  ORDER_READY_FOR_PICKUP = 'ORDER_READY_FOR_PICKUP',

  // Payment Events
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_DISPUTED = 'PAYMENT_DISPUTED',
  PAYMENT_CHARGEBACK = 'PAYMENT_CHARGEBACK',

  // Product Events
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  PRODUCT_BACK_IN_STOCK = 'PRODUCT_BACK_IN_STOCK',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  PRICE_DROP_ALERT = 'PRICE_DROP_ALERT',
  WISHLIST_ITEM_AVAILABLE = 'WISHLIST_ITEM_AVAILABLE',

  // Seller Events
  SELLER_APPLICATION_APPROVED = 'SELLER_APPLICATION_APPROVED',
  SELLER_APPLICATION_REJECTED = 'SELLER_APPLICATION_REJECTED',
  SELLER_PAYOUT_PROCESSED = 'SELLER_PAYOUT_PROCESSED',
  SELLER_PAYOUT_FAILED = 'SELLER_PAYOUT_FAILED',
  SELLER_ACCOUNT_SUSPENDED = 'SELLER_ACCOUNT_SUSPENDED',
  SELLER_PERFORMANCE_ALERT = 'SELLER_PERFORMANCE_ALERT',

  // Promotion Events
  PROMOTION_ACTIVATED = 'PROMOTION_ACTIVATED',
  PROMOTION_EXPIRED = 'PROMOTION_EXPIRED',
  PROMOTION_APPLIED = 'PROMOTION_APPLIED',
  FLASH_SALE_STARTED = 'FLASH_SALE_STARTED',
  COUPON_EXPIRING_SOON = 'COUPON_EXPIRING_SOON',

  // Review Events
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  REVIEW_RESPONSE_RECEIVED = 'REVIEW_RESPONSE_RECEIVED',

  // System Events
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SECURITY_ALERT = 'SECURITY_ALERT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  LOGIN_FROM_NEW_DEVICE = 'LOGIN_FROM_NEW_DEVICE',

  // Marketing Events
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  NEWSLETTER = 'NEWSLETTER',
  PROMOTIONAL_OFFER = 'PROMOTIONAL_OFFER',
  ABANDONED_CART_REMINDER = 'ABANDONED_CART_REMINDER',
  WELCOME_SERIES = 'WELCOME_SERIES',

  // Settlement Events
  SETTLEMENT_PROCESSED = 'SETTLEMENT_PROCESSED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  SETTLEMENT_SCHEDULED = 'SETTLEMENT_SCHEDULED',
  SETTLEMENT_DELAYED = 'SETTLEMENT_DELAYED',

  // Inventory Events
  INVENTORY_ADJUSTMENT = 'INVENTORY_ADJUSTMENT',
  BULK_IMPORT_COMPLETED = 'BULK_IMPORT_COMPLETED',
  BULK_IMPORT_FAILED = 'BULK_IMPORT_FAILED',

  // Customer Service Events
  SUPPORT_TICKET_CREATED = 'SUPPORT_TICKET_CREATED',
  SUPPORT_TICKET_UPDATED = 'SUPPORT_TICKET_UPDATED',
  SUPPORT_TICKET_RESOLVED = 'SUPPORT_TICKET_RESOLVED',

  // Compliance Events
  KYC_VERIFICATION_REQUIRED = 'KYC_VERIFICATION_REQUIRED',
  KYC_VERIFICATION_APPROVED = 'KYC_VERIFICATION_APPROVED',
  KYC_VERIFICATION_REJECTED = 'KYC_VERIFICATION_REJECTED',
  TAX_DOCUMENT_READY = 'TAX_DOCUMENT_READY',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  WHATSAPP = 'WHATSAPP',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationCategory {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  OPERATIONAL = 'OPERATIONAL',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  TESTING = 'TESTING',
}

export enum PreferenceFrequency {
  IMMEDIATE = 'IMMEDIATE',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NEVER = 'NEVER',
}

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DISABLED = 'DISABLED',
  FAILED = 'FAILED',
}

export enum BatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  webhookUrl?: string;
  tenantId?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  locale: string;
  subject?: string;
  title: string;
  content: string;
  htmlContent?: string;
  variables: string[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id?: string;
  userId: string;
  tenantId?: string;
  type: NotificationType | 'ALL';
  category?: NotificationCategory | null;
  channels: NotificationChannel[];
  isEnabled: boolean;
  frequency: PreferenceFrequency;
  batchingEnabled: boolean;
  maxBatchSize: number;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone: string;
  priority?: NotificationPriority | null;
  keywords: string[];
  excludeKeywords: string[];
  quietHours?: {
    start: string | null; // HH:mm format
    end: string | null; // HH:mm format
    timezone: string;
  };
}

export interface NotificationContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  source: string;
  metadata: Record<string, any>;
}

export interface NotificationPayload {
  type: NotificationType;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
  templateVariables: Record<string, any>;
  context: NotificationContext;
  scheduledAt?: Date;
  expiresAt?: Date;
  idempotencyKey?: string;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  status: NotificationStatus;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
  attempts: number;
  nextRetryAt?: Date;
}

export interface NotificationMetrics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened?: number;
  clicked?: number;
  unsubscribed?: number;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  tenantId?: string;
  userId?: string;
  url: string;
  events: NotificationType[];
  isActive: boolean;
  secret: string;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  type: NotificationType;
  totalRecipients: number;
  processedRecipients: number;
  successfulDeliveries?: number;
  failedDeliveries?: number;
  status: BatchStatus;
  templateId?: string;
  templateVariables?: Record<string, any>;
  channels?: NotificationChannel[];
  scheduledAt?: Date;
  tenantId?: string;
  createdBy?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RateLimitConfig {
  channel: NotificationChannel;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  burstLimit: number;
}

export interface NotificationRule {
  id: string;
  name: string;
  eventType: string;
  conditions: Record<string, any>;
  actions: {
    type: NotificationType;
    channels: NotificationChannel[];
    priority: NotificationPriority;
    templateOverrides?: Record<string, any>;
  }[];
  isActive: boolean;
  tenantId?: string;
}
