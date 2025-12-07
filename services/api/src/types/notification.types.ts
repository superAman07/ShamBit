/**
 * Notification types and interfaces
 */

export type NotificationType =
  // Order Status Notifications
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready_for_pickup'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_canceled'
  | 'order_on_hold'
  
  // Payment Notifications
  | 'payment_success'
  | 'payment_failed'
  
  // Delivery Notifications
  | 'delivery_assigned'
  | 'delivery_eta_update'
  | 'delivery_failed'
  | 'delivery_rescheduled'
  
  // Return & Refund Notifications
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'return_pickup_scheduled'
  | 'refund_initiated'
  | 'refund_completed'
  
  // General Notifications
  | 'promotional'
  | 'low_stock_alert';

export type NotificationChannel = 'push' | 'sms' | 'email';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  promotionalEnabled: boolean;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

export interface SendBulkNotificationRequest {
  userIds: string[];
  type: NotificationType;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}
