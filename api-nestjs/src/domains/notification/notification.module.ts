import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationRepository } from './notification.repository.js';
import { EmailService } from './email.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { NotificationTemplateService } from './notification-template.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';

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
  exports: [NotificationService, EmailService, PushNotificationService],
})
export class NotificationModule {}
