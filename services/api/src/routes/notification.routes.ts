import { Router, Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { authenticate } from '../middleware/auth.middleware';
import { createLogger, BadRequestError } from '@shambit/shared';

// Helper to get user ID from request
const getUserId = (req: Request): string => {
  if (!req.user?.id) {
    throw new BadRequestError('User not authenticated');
  }
  return req.user.id;
};

const router = Router();
const logger = createLogger('notification-routes');

/**
 * Register device token for push notifications
 * POST /api/v1/notifications/device-token
 */
router.post(
  '/device-token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const { token, platform } = req.body;

      if (!token || !platform) {
        throw new BadRequestError('Token and platform are required');
      }

      if (!['android', 'ios', 'web'].includes(platform)) {
        throw new BadRequestError('Invalid platform. Must be android, ios, or web');
      }

      const deviceToken = await notificationService.registerDeviceToken(userId, token, platform);

      res.status(201).json({
        success: true,
        data: deviceToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Unregister device token
 * DELETE /api/v1/notifications/device-token
 */
router.delete(
  '/device-token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const { token } = req.body;

      if (!token) {
        throw new BadRequestError('Token is required');
      }

      await notificationService.unregisterDeviceToken(userId, token);

      res.status(200).json({
        success: true,
        message: 'Device token unregistered successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
router.get(
  '/preferences',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const preferences = await notificationService.getNotificationPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update notification preferences
 * PUT /api/v1/notifications/preferences
 */
router.put(
  '/preferences',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const { pushEnabled, smsEnabled, emailEnabled, promotionalEnabled } = req.body;

      const preferences = await notificationService.updateNotificationPreferences(userId, {
        pushEnabled,
        smsEnabled,
        emailEnabled,
        promotionalEnabled,
      });

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get notification history
 * GET /api/v1/notifications/history
 */
router.get(
  '/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await notificationService.getNotificationHistory(userId, limit, offset);

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications: result.notifications,
          pagination: {
            total: result.total,
            page: Math.floor(offset / limit) + 1,
            limit,
            hasMore: offset + limit < result.total,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send test notification (for testing purposes)
 * POST /api/v1/notifications/test
 */
router.post(
  '/test',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      await notificationService.sendNotification({
        userId,
        type: 'promotional',
        data: {
          title: 'Test Notification',
          body: 'This is a test notification from ShamBit!',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

