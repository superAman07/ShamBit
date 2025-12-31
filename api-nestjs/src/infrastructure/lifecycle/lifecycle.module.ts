import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataLifecycleService } from './data-lifecycle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DynamicConfigModule } from '../config/config.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, DynamicConfigModule],
  providers: [DataLifecycleService],
  exports: [DataLifecycleService],
})
export class LifecycleModule {}
