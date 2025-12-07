import { getDatabase } from '@shambit/database';
import { createLogger, InternalServerError, BadRequestError } from '@shambit/shared';
import { getConfig } from '@shambit/config';
import * as admin from 'firebase-admin';
import {
  NotificationType,
  NotificationChannel,
  PushNotificationPayload,
  NotificationTemplate,
  DeviceToken,
  NotificationHistory,
  SendNotificationRequest,
  SendBulkNotificationRequest,
  NotificationPreferences,
} from '../types/notification.types';
import { smsService } from './sms.service';

// Lazy database getter to avoid initialization issues
const getDb = () => getDatabase();
const logger = createLogger('notification-service');

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const config = getConfig();
  
  // Check if Firebase credentials are provided
  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_PRIVATE_KEY || !config.FIREBASE_CLIENT_EMAIL) {
    logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
    return null;
  }

  try {
    // Parse the private key (handle escaped newlines)
    const privateKey = config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

/**
 * Notification templates for different event types
 */
const notificationTemplates: Record<NotificationType, (data?: any) => NotificationTemplate> = {
  order_confirmed: (data) => ({
    type: 'order_confirmed',
    title: 'Order Confirmed! 🎉',
    body: `Your order #${data?.orderNumber || 'N/A'} has been confirmed. We're preparing it for delivery.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber },
  }),
  order_preparing: (data) => ({
    type: 'order_preparing',
    title: 'Order Being Prepared 📦',
    body: `Your order #${data?.orderNumber || 'N/A'} is being prepared and will be out for delivery soon.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber },
  }),
  order_out_for_delivery: (data) => ({
    type: 'order_out_for_delivery',
    title: 'Order Out for Delivery 🚚',
    body: `Your order #${data?.orderNumber || 'N/A'} is on its way! Expected delivery: ${data?.eta || 'soon'}.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber, eta: data?.eta },
  }),
  order_delivered: (data) => ({
    type: 'order_delivered',
    title: 'Order Delivered ✅',
    body: `Your order #${data?.orderNumber || 'N/A'} has been delivered. Enjoy your purchase!`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber },
  }),
  order_canceled: (data) => ({
    type: 'order_canceled',
    title: 'Order Canceled',
    body: `Your order #${data?.orderNumber || 'N/A'} has been canceled. ${data?.reason || ''}`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber, reason: data?.reason },
  }),
  payment_success: (data) => ({
    type: 'payment_success',
    title: 'Payment Successful 💳',
    body: `Payment of ₹${(data?.amount / 100).toFixed(2)} received for order #${data?.orderNumber || 'N/A'}.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber, amount: data?.amount },
  }),
  payment_failed: (data) => ({
    type: 'payment_failed',
    title: 'Payment Failed ❌',
    body: `Payment for order #${data?.orderNumber || 'N/A'} failed. Please try again.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber },
  }),
  delivery_assigned: (data) => ({
    type: 'delivery_assigned',
    title: 'Delivery Partner Assigned 🛵',
    body: `${data?.deliveryPersonName || 'A delivery partner'} has been assigned to deliver your order #${data?.orderNumber || 'N/A'}.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber, deliveryPersonName: data?.deliveryPersonName },
  }),
  delivery_eta_update: (data) => ({
    type: 'delivery_eta_update',
    title: 'Delivery Update ⏰',
    body: `Your order #${data?.orderNumber || 'N/A'} will arrive by ${data?.eta || 'soon'}.`,
    data: { orderId: data?.orderId, orderNumber: data?.orderNumber, eta: data?.eta },
  }),
  promotional: (data) => ({
    type: 'promotional',
    title: data?.title || 'Special Offer! 🎁',
    body: data?.body || 'Check out our latest offers and discounts.',
    data: data?.data || {},
  }),
  low_stock_alert: (data) => ({
    type: 'low_stock_alert',
    title: 'Low Stock Alert ⚠️',
    body: `Product "${data?.productName || 'N/A'}" is running low. Current stock: ${data?.stock || 0} units.`,
    data: { productId: data?.productId, productName: data?.productName, stock: data?.stock },
  }),
};

/**
 * Map database row to DeviceToken object
 */
function mapDeviceTokenFromDb(row: any): DeviceToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    platform: row.platform,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to NotificationHistory object
 */
function mapNotificationHistoryFromDb(row: any): NotificationHistory {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    channel: row.channel,
    title: row.title,
    body: row.body,
    data: row.data,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

/**
 * Map database row to NotificationPreferences object
 */
function mapNotificationPreferencesFromDb(row: any): NotificationPreferences {
  return {
    userId: row.user_id,
    pushEnabled: row.push_enabled,
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    promotionalEnabled: row.promotional_enabled,
  };
}

class NotificationService {
  constructor() {
    // Initialize Firebase on service creation
    initializeFirebase();
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'android' | 'ios' | 'web'
  ): Promise<DeviceToken> {
    try {
      logger.info('Registering device token', { userId, platform });

      // Check if token already exists
      const existingToken = await getDb()('device_tokens')
        .where({ user_id: userId, token })
        .first();

      if (existingToken) {
        // Update existing token
        await getDb()('device_tokens')
          .where({ id: existingToken.id })
          .update({
            is_active: true,
            updated_at: getDb().fn.now(),
          });

        const updated = await getDb()('device_tokens')
          .where({ id: existingToken.id })
          .first();

        return mapDeviceTokenFromDb(updated);
      }

      // Insert new token
      const [inserted] = await getDb()('device_tokens')
        .insert({
          user_id: userId,
          token,
          platform,
          is_active: true,
        })
        .returning('*');

      logger.info('Device token registered successfully', { userId, platform });
      return mapDeviceTokenFromDb(inserted);
    } catch (error) {
      logger.error('Failed to register device token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to register device token');
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    try {
      logger.info('Unregistering device token', { userId });

      await getDb()('device_tokens')
        .where({ user_id: userId, token })
        .update({
          is_active: false,
          updated_at: getDb().fn.now(),
        });

      logger.info('Device token unregistered successfully', { userId });
    } catch (error) {
      logger.error('Failed to unregister device token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to unregister device token');
    }
  }

  /**
   * Get active device tokens for a user
   */
  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      const tokens = await getDb()('device_tokens')
        .where({ user_id: userId, is_active: true })
        .select('*');

      return tokens.map(mapDeviceTokenFromDb);
    } catch (error) {
      logger.error('Failed to get user device tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const prefs = await getDb()('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (!prefs) {
        // Create default preferences
        const [created] = await getDb()('notification_preferences')
          .insert({
            user_id: userId,
            push_enabled: true,
            sms_enabled: true,
            email_enabled: true,
            promotional_enabled: true,
          })
          .returning('*');

        return mapNotificationPreferencesFromDb(created);
      }

      return mapNotificationPreferencesFromDb(prefs);
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return default preferences on error
      return {
        userId,
        pushEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        promotionalEnabled: true,
      };
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'userId'>>
  ): Promise<NotificationPreferences> {
    try {
      logger.info('Updating notification preferences', { userId });

      const updateData: any = {};
      if (preferences.pushEnabled !== undefined) updateData.push_enabled = preferences.pushEnabled;
      if (preferences.smsEnabled !== undefined) updateData.sms_enabled = preferences.smsEnabled;
      if (preferences.emailEnabled !== undefined) updateData.email_enabled = preferences.emailEnabled;
      if (preferences.promotionalEnabled !== undefined) updateData.promotional_enabled = preferences.promotionalEnabled;
      updateData.updated_at = getDb().fn.now();

      // Check if preferences exist
      const existing = await getDb()('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (existing) {
        await getDb()('notification_preferences')
          .where({ user_id: userId })
          .update(updateData);
      } else {
        await getDb()('notification_preferences')
          .insert({
            user_id: userId,
            ...updateData,
          });
      }

      const updated = await getDb()('notification_preferences')
        .where({ user_id: userId })
        .first();

      logger.info('Notification preferences updated successfully', { userId });
      return mapNotificationPreferencesFromDb(updated);
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to update notification preferences');
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  private async sendPushNotification(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Skipping push notification.');
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([key, value]) => [key, String(value)])
        ) : undefined,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      logger.info('Push notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // Collect failed tokens
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          logger.warn('Failed to send push notification to token', {
            token: tokens[idx].substring(0, 20) + '...',
            error: resp.error?.message,
          });
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }
  }

  /**
   * Save notification to history
   */
  private async saveNotificationHistory(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    title: string,
    body: string,
    data: any,
    status: 'sent' | 'failed' | 'pending',
    errorMessage?: string
  ): Promise<void> {
    try {
      await getDb()('notification_history').insert({
        user_id: userId,
        type,
        channel,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? getDb().fn.now() : null,
      });
    } catch (error) {
      logger.error('Failed to save notification history', {
        userId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw error, just log it
    }
  }

  /**
   * Send notification to a single user
   */
  async sendNotification(request: SendNotificationRequest): Promise<void> {
    try {
      const { userId, type, data, channels = ['push'] } = request;

      logger.info('Sending notification', { userId, type, channels });

      // Get notification template
      const templateFn = notificationTemplates[type];
      if (!templateFn) {
        throw new BadRequestError(`Invalid notification type: ${type}`);
      }

      const template = templateFn(data);

      // Get user preferences
      const preferences = await this.getNotificationPreferences(userId);

      // Check if promotional notifications are disabled
      if (type === 'promotional' && !preferences.promotionalEnabled) {
        logger.info('Promotional notifications disabled for user', { userId });
        return;
      }

      // Send via requested channels
      for (const channel of channels) {
        if (channel === 'push' && preferences.pushEnabled) {
          // Get user device tokens
          const deviceTokens = await this.getUserDeviceTokens(userId);
          
          if (deviceTokens.length === 0) {
            logger.warn('No device tokens found for user', { userId });
            await this.saveNotificationHistory(
              userId,
              type,
              'push',
              template.title,
              template.body,
              template.data,
              'failed',
              'No device tokens found'
            );
            continue;
          }

          const tokens = deviceTokens.map(dt => dt.token);
          const result = await this.sendPushNotification(tokens, {
            title: template.title,
            body: template.body,
            data: template.data,
          });

          // Deactivate failed tokens
          if (result.failedTokens.length > 0) {
            await getDb()('device_tokens')
              .whereIn('token', result.failedTokens)
              .update({ is_active: false, updated_at: getDb().fn.now() });
          }

          // Save to history
          await this.saveNotificationHistory(
            userId,
            type,
            'push',
            template.title,
            template.body,
            template.data,
            result.successCount > 0 ? 'sent' : 'failed',
            result.failureCount > 0 ? `${result.failureCount} tokens failed` : undefined
          );
        } else if (channel === 'sms' && preferences.smsEnabled) {
          // Get user mobile number
          const user = await getDb()('users')
            .where({ id: userId })
            .first();

          if (!user || !user.mobile_number) {
            logger.warn('No mobile number found for user', { userId });
            await this.saveNotificationHistory(
              userId,
              type,
              'sms',
              template.title,
              template.body,
              template.data,
              'failed',
              'No mobile number found'
            );
            continue;
          }

          try {
            // Send SMS notification
            await smsService.sendNotificationSMS(user.mobile_number, type, template.data);

            // Save to history
            await this.saveNotificationHistory(
              userId,
              type,
              'sms',
              template.title,
              template.body,
              template.data,
              'sent'
            );
          } catch (error) {
            logger.error('Failed to send SMS notification', {
              userId,
              type,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            // Save to history
            await this.saveNotificationHistory(
              userId,
              type,
              'sms',
              template.title,
              template.body,
              template.data,
              'failed',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
        // TODO: Implement email channel
      }

      logger.info('Notification sent successfully', { userId, type });
    } catch (error) {
      logger.error('Failed to send notification', {
        userId: request.userId,
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(request: SendBulkNotificationRequest): Promise<void> {
    try {
      const { userIds, type, data, channels = ['push'] } = request;

      logger.info('Sending bulk notification', { userCount: userIds.length, type, channels });

      // Send to each user (could be optimized with batch processing)
      const promises = userIds.map(userId =>
        this.sendNotification({ userId, type, data, channels }).catch(error => {
          logger.error('Failed to send notification to user', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        })
      );

      await Promise.all(promises);

      logger.info('Bulk notification sent successfully', { userCount: userIds.length, type });
    } catch (error) {
      logger.error('Failed to send bulk notification', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: NotificationHistory[]; total: number }> {
    try {
      const [notifications, countResult] = await Promise.all([
        getDb()('notification_history')
          .where({ user_id: userId })
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset)
          .select('*'),
        getDb()('notification_history')
          .where({ user_id: userId })
          .count('* as count')
          .first(),
      ]);

      return {
        notifications: notifications.map(mapNotificationHistoryFromDb),
        total: parseInt(countResult?.count as string || '0'),
      };
    } catch (error) {
      logger.error('Failed to get notification history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to get notification history');
    }
  }

  /**
   * Send order status update notification (push + SMS)
   */
  async sendOrderStatusNotification(
    userId: string,
    orderId: string,
    orderNumber: string,
    status: string,
    additionalData?: any
  ): Promise<void> {
    const notificationTypeMap: Record<string, NotificationType> = {
      confirmed: 'order_confirmed',
      preparing: 'order_preparing',
      out_for_delivery: 'order_out_for_delivery',
      delivered: 'order_delivered',
      canceled: 'order_canceled',
    };

    const type = notificationTypeMap[status];
    if (!type) {
      logger.warn('Unknown order status for notification', { status });
      return;
    }

    await this.sendNotification({
      userId,
      type,
      data: {
        orderId,
        orderNumber,
        ...additionalData,
      },
      channels: ['push', 'sms'],
    });
  }
}

export const notificationService = new NotificationService();


