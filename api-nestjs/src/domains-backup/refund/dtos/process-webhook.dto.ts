import { IsString, IsObject } from 'class-validator';

export class ProcessWebhookDto {
  @IsString()
  webhookId: string;

  @IsString()
  eventType: string;

  @IsString()
  gatewayProvider: string;

  @IsObject()
  payload: any;
}