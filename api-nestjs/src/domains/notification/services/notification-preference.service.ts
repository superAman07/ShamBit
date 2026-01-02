import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPreference,
  PreferenceFrequency,
  NotificationCategory,
  NotificationPriority
} from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface CreatePreferenceDto {
  userId: string;
  tenantId?: string;
  type: NotificationType | 'ALL';
  category?: string;
  channels: NotificationChannel[];
  isEnabled: boolean;
  frequency?: PreferenceFrequency;
  batchingEnabled?: boolean;
  maxBatchSize?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  priority?: string;
  keywords?: string[];
  excludeKeywords?: string[];
}

export interface UpdatePreferenceDto extends Partial<CreatePreferenceDto> { }

export interface UserPreferences {
  userId: string;
  preferences: NotificationPreference[];
  globalSettings: {
    isEnabled: boolean;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  };
}

@Injectable()
export class NotificationPreferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) { }

  // ============================================================================
  // PREFERENCE MANAGEMENT
  // ============================================================================

  async createPreference(dto: CreatePreferenceDto): Promise<NotificationPreference> {
    this.logger.log('Creating notification preference', {
      userId: dto.userId,
      type: dto.type,
      channels: dto.channels,
    });

    const preference = await this.prisma.notificationPreference.create({
      data: {
        userId: dto.userId,
        tenantId: dto.tenantId,
        type: dto.type as any,
        category: dto.category as any,
        channels: dto.channels as any,
        isEnabled: dto.isEnabled,
        frequency: (dto.frequency || PreferenceFrequency.IMMEDIATE) as any,
        batchingEnabled: dto.batchingEnabled || false,
        maxBatchSize: dto.maxBatchSize || 10,
        quietHoursEnabled: dto.quietHoursEnabled || false,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: dto.timezone || 'UTC',
        priority: dto.priority as any,
        keywords: dto.keywords || [],
        excludeKeywords: dto.excludeKeywords || [],
      },
    });

    return this.mapToPreferenceType(preference);
  }

  async getUserPreferences(
    userId: string,
    type?: NotificationType,
    tenantId?: string
  ): Promise<NotificationPreference | null> {
    // Try to find specific type preference first
    if (type) {
      const specificPreference = await this.prisma.notificationPreference.findFirst({
        where: {
          userId,
          type,
          tenantId,
        },
      });

      if (specificPreference) {
        return this.mapToPreferenceType(specificPreference);
      }
    }

    // Fall back to 'ALL' preference
    const globalPreference = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        type: 'ALL',
        tenantId,
      },
    });

    if (globalPreference) {
      return this.mapToPreferenceType(globalPreference);
    }

    // Return default preferences if none found
    return this.getDefaultPreferences(userId, type);
  }

  async getAllUserPreferences(
    userId: string,
    tenantId?: string
  ): Promise<UserPreferences> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: { type: 'asc' },
    });

    const globalPreference = preferences.find(p => p.type === 'ALL');

    return {
      userId,
      preferences: preferences.map(p => this.mapToPreferenceType(p)),
      globalSettings: {
        isEnabled: globalPreference?.isEnabled ?? true,
        quietHours: globalPreference?.quietHoursEnabled ? {
          enabled: true,
          start: globalPreference.quietHoursStart || '22:00',
          end: globalPreference.quietHoursEnd || '08:00',
          timezone: globalPreference.timezone || 'UTC',
        } : undefined,
      },
    };
  }

  async updatePreference(
    userId: string,
    type: NotificationType | 'ALL',
    updates: UpdatePreferenceDto,
    tenantId?: string
  ): Promise<NotificationPreference> {
    const existing = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        type,
        tenantId,
      },
    });

    if (existing) {
      const { userId: _, type: __, tenantId: ___, ...data } = updates;
      const updated = await this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data: data as any,
      });
      return this.mapToPreferenceType(updated);
    } else {
      // Create new preference if it doesn't exist
      return this.createPreference({
        userId,
        tenantId,
        type,
        channels: updates.channels || [NotificationChannel.IN_APP],
        isEnabled: updates.isEnabled ?? true,
        ...updates,
      });
    }
  }

  async deletePreference(
    userId: string,
    type: NotificationType | 'ALL',
    tenantId?: string
  ): Promise<void> {
    await this.prisma.notificationPreference.deleteMany({
      where: {
        userId,
        type,
        tenantId,
      },
    });
  }

  // ============================================================================
  // PREFERENCE VALIDATION
  // ============================================================================

  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    priority?: string,
    tenantId?: string
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId, type, tenantId);

    if (!preferences || !preferences.isEnabled) {
      return false;
    }

    // Check if channel is allowed
    if (!preferences.channels.includes(channel)) {
      return false;
    }

    // Check priority filter
    if (preferences.priority && priority) {
      const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const minPriorityIndex = priorityOrder.indexOf(preferences.priority);
      const currentPriorityIndex = priorityOrder.indexOf(priority);

      if (currentPriorityIndex < minPriorityIndex) {
        return false;
      }
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled && preferences.quietHoursStart && preferences.quietHoursEnd) {
      const now = new Date();
      const timezone = preferences.timezone || 'UTC';

      if (this.isInQuietHours(now, preferences.quietHoursStart, preferences.quietHoursEnd, timezone)) {
        // Allow urgent notifications during quiet hours
        return priority === 'URGENT';
      }
    }

    return true;
  }

  async checkKeywordFilters(
    preferences: NotificationPreference,
    content: string
  ): Promise<boolean> {
    const lowerContent = content.toLowerCase();

    // Check exclude keywords first
    if (preferences.excludeKeywords && preferences.excludeKeywords.length > 0) {
      for (const keyword of preferences.excludeKeywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          return false;
        }
      }
    }

    // Check include keywords
    if (preferences.keywords && preferences.keywords.length > 0) {
      for (const keyword of preferences.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          return true;
        }
      }
      return false; // If keywords are specified but none match
    }

    return true; // No keyword filters or passed all filters
  }

  // ============================================================================
  // BATCH PREFERENCES
  // ============================================================================

  async getBatchPreferences(
    userId: string,
    tenantId?: string
  ): Promise<{
    batchingEnabled: boolean;
    maxBatchSize: number;
    frequency: PreferenceFrequency;
  }> {
    const preferences = await this.getUserPreferences(userId, undefined, tenantId);

    return {
      batchingEnabled: preferences?.batchingEnabled || false,
      maxBatchSize: preferences?.maxBatchSize || 10,
      frequency: (preferences?.frequency || PreferenceFrequency.IMMEDIATE) as any,
    };
  }

  async shouldBatchNotification(
    userId: string,
    type: NotificationType,
    tenantId?: string
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId, type, tenantId);
    return preferences?.batchingEnabled || false;
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  async subscribeToChannel(
    userId: string,
    channel: NotificationChannel,
    contactInfo: {
      email?: string;
      phone?: string;
      deviceToken?: string;
    },
    tenantId?: string
  ): Promise<void> {
    const subscriptionType = this.getSubscriptionType(channel);

    const existing = await this.prisma.notificationSubscription.findFirst({
      where: {
        userId,
        type: subscriptionType,
      },
    });

    if (existing) {
      await this.prisma.notificationSubscription.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          email: contactInfo.email,
          phone: contactInfo.phone,
          deviceToken: contactInfo.deviceToken,
          consentGiven: true,
          consentTimestamp: new Date(),
          consentMethod: 'EXPLICIT',
        },
      });
    } else {
      await this.prisma.notificationSubscription.create({
        data: {
          userId,
          type: subscriptionType,
          status: 'ACTIVE',
          email: contactInfo.email,
          phone: contactInfo.phone,
          deviceToken: contactInfo.deviceToken,
          consentGiven: true,
          consentTimestamp: new Date(),
          consentMethod: 'EXPLICIT',
          tenantId,
        },
      });
    }
  }

  async unsubscribeFromChannel(
    userId: string,
    channel: NotificationChannel,
    reason?: string
  ): Promise<void> {
    const subscriptionType = this.getSubscriptionType(channel);

    await this.prisma.notificationSubscription.updateMany({
      where: {
        userId,
        type: subscriptionType,
      },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        unsubscribeReason: reason,
        unsubscribeMethod: 'USER_REQUEST',
      },
    });
  }

  async getSubscriptionStatus(
    userId: string,
    channel: NotificationChannel
  ): Promise<'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED' | null> {
    const subscriptionType = this.getSubscriptionType(channel);

    const subscription = await this.prisma.notificationSubscription.findFirst({
      where: {
        userId,
        type: subscriptionType,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription?.status as any || null;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getDefaultPreferences(
    userId: string,
    type?: NotificationType
  ): NotificationPreference {
    return {
      userId,
      type: (type || 'ALL') as any,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      isEnabled: true,
      frequency: PreferenceFrequency.IMMEDIATE,
      batchingEnabled: false,
      maxBatchSize: 10,
      quietHoursEnabled: false,
      timezone: 'UTC',
      keywords: [],
      excludeKeywords: [],
      quietHours: undefined,
    };
  }

  private isInQuietHours(
    now: Date,
    startTime: string,
    endTime: string,
    timezone: string
  ): boolean {
    try {
      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTimeMinutes > endTimeMinutes) {
        return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
      } else {
        return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
      }
    } catch (error) {
      this.logger.error('Error checking quiet hours', error.stack);
      return false;
    }
  }

  private getSubscriptionType(channel: NotificationChannel): string {
    const typeMap = {
      [NotificationChannel.EMAIL]: 'EMAIL_LIST',
      [NotificationChannel.SMS]: 'SMS_LIST',
      [NotificationChannel.PUSH]: 'PUSH_DEVICE',
      [NotificationChannel.WHATSAPP]: 'WHATSAPP_LIST',
      [NotificationChannel.IN_APP]: 'IN_APP',
      [NotificationChannel.WEBHOOK]: 'WEBHOOK',
    };

    return typeMap[channel] || 'UNKNOWN';
  }

  private mapToPreferenceType(preference: any): NotificationPreference {
    return {
      id: preference.id,
      userId: preference.userId,
      tenantId: preference.tenantId,
      type: preference.type,
      category: preference.category,
      channels: preference.channels,
      isEnabled: preference.isEnabled,
      frequency: preference.frequency,
      batchingEnabled: preference.batchingEnabled,
      maxBatchSize: preference.maxBatchSize,
      quietHoursEnabled: preference.quietHoursEnabled,
      quietHoursStart: preference.quietHoursStart,
      quietHoursEnd: preference.quietHoursEnd,
      timezone: preference.timezone,
      priority: preference.priority,
      keywords: preference.keywords,
      excludeKeywords: preference.excludeKeywords,
      quietHours: preference.quietHoursEnabled ? {
        start: preference.quietHoursStart,
        end: preference.quietHoursEnd,
        timezone: preference.timezone,
      } : undefined,
    };
  }
}