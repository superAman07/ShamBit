import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationType, NotificationChannel } from './notification.service';

export interface NotificationPreference {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  isEnabled: boolean;
}

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    return preferences.map(pref => ({
      userId: pref.userId,
      type: pref.type as NotificationType,
      channels: pref.channels as NotificationChannel[],
      isEnabled: pref.isEnabled,
    }));
  }

  async updatePreference(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
    isEnabled: boolean = true
  ): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        channels,
        isEnabled,
        updatedAt: new Date(),
      },
      create: {
        userId,
        type,
        channels,
        isEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getDefaultPreferences(): Promise<Record<NotificationType, NotificationChannel[]>> {
    return {
      [NotificationType.ORDER_CONFIRMATION]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.ORDER_SHIPPED]: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      [NotificationType.ORDER_DELIVERED]: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      [NotificationType.ORDER_CANCELLED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.PAYMENT_SUCCESS]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.PAYMENT_FAILED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
      [NotificationType.PRODUCT_APPROVED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.PRODUCT_REJECTED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.LOW_STOCK_ALERT]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.SELLER_APPLICATION_APPROVED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.PROMOTION_ACTIVATED]: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      [NotificationType.REVIEW_RECEIVED]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [NotificationType.SYSTEM_MAINTENANCE]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    };
  }
}