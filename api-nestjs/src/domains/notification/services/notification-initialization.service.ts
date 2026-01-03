import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationRateLimitService } from './notification-rate-limit.service';
import { NotificationChannel } from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

@Injectable()
export class NotificationInitializationService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: NotificationRateLimitService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultRateLimits();
  }

  private async initializeDefaultRateLimits(): Promise<void> {
    try {
      const defaultRules = this.configService.get(
        'notification.rateLimit.defaultRules',
        [],
      );

      for (const rule of defaultRules) {
        const exists = this.rateLimitService.hasRateLimitRule(
          rule.channel as NotificationChannel,
          rule.scope,
        );

        if (!exists) {
          await this.rateLimitService.setRateLimitRule(
            rule.channel as NotificationChannel,
            rule.scope,
            {
              maxPerMinute: rule.maxPerMinute,
              maxPerHour: rule.maxPerHour,
              maxPerDay: rule.maxPerDay,
              burstLimit: rule.burstLimit,
            },
          );

          this.logger.log('Default rate limit rule created', {
            channel: rule.channel,
            scope: rule.scope,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize default rate limits',
        error.stack,
      );
    }
  }
}
