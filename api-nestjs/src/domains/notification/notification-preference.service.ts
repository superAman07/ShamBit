import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import {
  NotificationType,
  NotificationChannel,
} from './notification.service.js';

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

    return preferences.map((pref) => {
      const channels: NotificationChannel[] = [];

      if (pref.email) channels.push(NotificationChannel.EMAIL);
      if (pref.inApp) channels.push(NotificationChannel.IN_APP);
      if (pref.sms) channels.push(NotificationChannel.SMS);
      if (pref.push) channels.push(NotificationChannel.PUSH);

      return {
        userId: pref.userId,
        type: pref.type as NotificationType,
        channels,
        isEnabled: true, // Assuming enabled if preference exists
      };
    });
  }

  async updatePreference(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
    isEnabled: boolean = true,
  ): Promise<void> {
    const channelPreferences = {
      email: channels.includes(NotificationChannel.EMAIL),
      inApp: channels.includes(NotificationChannel.IN_APP),
      sms: channels.includes(NotificationChannel.SMS),
      push: channels.includes(NotificationChannel.PUSH),
    };

    await this.prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        ...channelPreferences,
      },
      create: {
        userId,
        type,
        ...channelPreferences,
      },
    });
  }

  async getDefaultPreferences(): Promise<
    Record<NotificationType, NotificationChannel[]>
  > {
    return {
      [NotificationType.ORDER_CONFIRMATION]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.ORDER_SHIPPED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
      ],
      [NotificationType.ORDER_DELIVERED]: [
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
      ],
      [NotificationType.ORDER_CANCELLED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.PAYMENT_SUCCESS]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.PAYMENT_FAILED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
      ],
      [NotificationType.PRODUCT_APPROVED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.PRODUCT_REJECTED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.LOW_STOCK_ALERT]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.SELLER_APPLICATION_APPROVED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.PROMOTION_ACTIVATED]: [
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
      ],
      [NotificationType.REVIEW_RECEIVED]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      [NotificationType.SYSTEM_MAINTENANCE]: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
      ],
    };
  }
}
