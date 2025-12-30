import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}