import { Module } from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, RedisModule, EventsModule],
  providers: [DynamicConfigService],
  exports: [DynamicConfigService],
})
export class DynamicConfigModule {}