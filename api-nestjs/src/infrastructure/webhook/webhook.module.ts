import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookRepository } from './webhook.repository';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, WebhookRepository, WebhookDeliveryService],
  exports: [WebhookService, WebhookDeliveryService],
})
export class WebhookModule {}
