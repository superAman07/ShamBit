import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { EventHandlerService } from './event-handler.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [EventService, EventRepository, EventHandlerService],
  exports: [EventService, EventHandlerService],
})
export class EventsModule {}