import { Module } from '@nestjs/common';
import { ProjectionService } from './projection.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ProjectionService],
  exports: [ProjectionService],
})
export class ProjectionModule {}