import { Module } from '@nestjs/common';
import { DomainEventService } from './domain-event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [DomainEventService],
  exports: [DomainEventService],
})
export class DomainModule {}