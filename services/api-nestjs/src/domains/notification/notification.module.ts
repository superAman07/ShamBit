import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService } from './notification-preference.service';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    EmailService,
    PushNotificationService,
    NotificationTemplateService,
    NotificationPreferenceService,
  ],
  exports: [
    NotificationService,
    EmailService,
    PushNotificationService,
  ],
})
export class NotificationModule {}