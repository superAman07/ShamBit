import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { WebhookService } from './services/webhook.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationCategory,
  PreferenceFrequency
} from './types/notification.types';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly metricsService: NotificationMetricsService,
    private readonly webhookService: WebhookService,
  ) {}

  // ============================================================================
  // USER NOTIFICATIONS
  // ============================================================================

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQuery & { isRead?: boolean; type?: string },
  ) {
    // Validate and cast type parameter
    const validType = query.type && Object.values(NotificationType).includes(query.type as NotificationType) 
      ? query.type as NotificationType 
      : undefined;

    return this.notificationService.getUserNotifications(userId, {
      limit: query.limit,
      skip: query.page ? (query.page - 1) * (query.limit || 10) : 0,
      isRead: query.isRead,
      type: validType,
    });
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    await this.notificationService.markAsRead(id, userId);
    return { success: true };
  }

  @Put('read-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.markAllAsRead(userId);
    return { markedCount: count };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationService.deleteNotification(id, userId);
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.preferenceService.getAllUserPreferences(userId);
  }

  @Put('preferences/:type')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preference for specific type' })
  async updatePreference(
    @CurrentUser('id') userId: string,
    @Param('type') type: NotificationType | 'ALL',
    @Body() body: {
      channels: NotificationChannel[];
      isEnabled: boolean;
      frequency?: string;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      timezone?: string;
    },
  ) {
    // Validate frequency if provided
    const validatedBody = {
      ...body,
      frequency: body.frequency && Object.values(PreferenceFrequency).includes(body.frequency as PreferenceFrequency) 
        ? body.frequency as PreferenceFrequency 
        : undefined
    };
    
    return this.preferenceService.updatePreference(userId, type, validatedBody);
  }

  @Post('preferences/subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to notification channel' })
  async subscribeToChannel(
    @CurrentUser('id') userId: string,
    @Body() body: {
      channel: NotificationChannel;
      email?: string;
      phone?: string;
      deviceToken?: string;
    },
  ) {
    await this.preferenceService.subscribeToChannel(userId, body.channel, {
      email: body.email,
      phone: body.phone,
      deviceToken: body.deviceToken,
    });
    return { success: true };
  }

  @Post('preferences/unsubscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from notification channel' })
  async unsubscribeFromChannel(
    @CurrentUser('id') userId: string,
    @Body() body: {
      channel: NotificationChannel;
      reason?: string;
    },
  ) {
    await this.preferenceService.unsubscribeFromChannel(userId, body.channel, body.reason);
    return { success: true };
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  @Get('webhooks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook subscriptions' })
  async getWebhooks(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQuery & { isActive?: boolean },
  ) {
    return this.webhookService.getSubscriptions({
      userId,
      isActive: query.isActive,
      limit: query.limit,
      offset: query.page ? (query.page - 1) * (query.limit || 10) : 0,
    });
  }

  @Post('webhooks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create webhook subscription' })
  async createWebhook(
    @CurrentUser('id') userId: string,
    @Body() body: {
      name: string;
      url: string;
      events: NotificationType[];
      secret?: string;
      headers?: Record<string, string>;
      description?: string;
    },
  ) {
    return this.webhookService.createSubscription({
      ...body,
      userId,
    }, userId);
  }

  @Put('webhooks/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update webhook subscription' })
  async updateWebhook(
    @Param('id') webhookId: string,
    @Body() body: {
      name?: string;
      url?: string;
      events?: NotificationType[];
      isActive?: boolean;
      headers?: Record<string, string>;
      description?: string;
    },
  ) {
    return this.webhookService.updateSubscription(webhookId, body);
  }

  @Delete('webhooks/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook subscription' })
  async deleteWebhook(@Param('id') webhookId: string) {
    await this.webhookService.deleteSubscription(webhookId);
  }

  @Post('webhooks/:id/test')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test webhook subscription' })
  async testWebhook(@Param('id') webhookId: string) {
    return this.webhookService.testWebhook(webhookId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Post('send')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send notification (Admin only)' })
  async sendNotification(
    @Body() body: {
      type: NotificationType;
      recipients: Array<{
        userId?: string;
        email?: string;
        phone?: string;
        deviceToken?: string;
      }>;
      channels: NotificationChannel[];
      priority?: NotificationPriority;
      category?: NotificationCategory;
      templateVariables: Record<string, any>;
      scheduledAt?: string;
      expiresAt?: string;
    },
  ) {
    const notificationId = await this.notificationService.sendNotification({
      type: body.type,
      recipients: body.recipients,
      channels: body.channels,
      priority: body.priority || NotificationPriority.MEDIUM,
      category: body.category || NotificationCategory.TRANSACTIONAL,
      templateVariables: body.templateVariables,
      context: {
        source: 'admin-api',
        metadata: {},
      },
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    return { notificationId };
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification metrics (Admin only)' })
  async getMetrics(
    @Query() query: {
      dateFrom?: string;
      dateTo?: string;
      type?: NotificationType;
      channel?: NotificationChannel;
      tenantId?: string;
    },
  ) {
    const filters: any = {};
    if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filters.dateTo = new Date(query.dateTo);
    if (query.type) filters.type = query.type;
    if (query.channel) filters.channel = query.channel;
    if (query.tenantId) filters.tenantId = query.tenantId;

    const [metrics, channelPerformance, engagementRates] = await Promise.all([
      this.metricsService.getMetrics(filters),
      this.metricsService.getChannelPerformance(filters),
      this.metricsService.getEngagementRates(filters),
    ]);

    return {
      metrics,
      channelPerformance,
      engagementRates,
    };
  }

  @Get('metrics/time-series')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get time series metrics (Admin only)' })
  async getTimeSeriesMetrics(
    @Query() query: {
      dateFrom?: string;
      dateTo?: string;
      granularity?: 'hour' | 'day';
      type?: NotificationType;
      channel?: NotificationChannel;
    },
  ) {
    const filters: any = {};
    if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filters.dateTo = new Date(query.dateTo);
    if (query.type) filters.type = query.type;
    if (query.channel) filters.channel = query.channel;

    return this.metricsService.getTimeSeriesData(
      filters,
      query.granularity || 'day'
    );
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification system health (Admin only)' })
  async getSystemHealth() {
    // This would include queue status, channel health, etc.
    return {
      status: 'healthy',
      timestamp: new Date(),
      // Add more health checks here
    };
  }
}
