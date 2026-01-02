import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import { NotificationController } from './notification.controller';
import { NotificationHealthController } from './notification-health.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';

// Configuration
import notificationConfig from '../../config/notification.config';

// Template & Preference Services
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';

// Channel Services
import { NotificationChannelService } from './services/notification-channel.service';
import { EmailChannelService } from './services/channels/email-channel.service';
import { SMSChannelService } from './services/channels/sms-channel.service';
import { PushChannelService } from './services/channels/push-channel.service';
import { InAppChannelService } from './services/channels/in-app-channel.service';
import { WebhookChannelService } from './services/channels/webhook-channel.service';

// Supporting Services
import { NotificationQueueService } from './services/notification-queue.service';
import { NotificationRateLimitService } from './services/notification-rate-limit.service';
import { NotificationDeduplicationService } from './services/notification-deduplication.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { WebhookService } from './services/webhook.service';
import { NotificationInitializationService } from './services/notification-initialization.service';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    ConfigModule.forFeature(notificationConfig),
    BullModule.registerQueue({
      name: 'notification-processing',
    }),
    BullModule.registerQueue({
      name: 'bulk-notification-processing',
    }),
  ],
  controllers: [NotificationController, NotificationHealthController],
  providers: [
    // Core Services
    NotificationService,
    NotificationRepository,
    
    // Template & Preference Services
    NotificationTemplateService,
    NotificationPreferenceService,
    
    // Channel Services
    NotificationChannelService,
    EmailChannelService,
    SMSChannelService,
    PushChannelService,
    InAppChannelService,
    WebhookChannelService,
    
    // Supporting Services
    NotificationQueueService,
    NotificationRateLimitService,
    NotificationDeduplicationService,
    NotificationMetricsService,
    WebhookService,
    NotificationInitializationService,
  ],
  exports: [
    NotificationService,
    NotificationTemplateService,
    NotificationPreferenceService,
    NotificationChannelService,
    WebhookService,
  ],
})
export class NotificationModule {}
