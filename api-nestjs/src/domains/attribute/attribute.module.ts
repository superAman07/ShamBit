import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { AttributeService } from './attribute.service';

// Repositories
import { AttributeRepository } from './repositories/attribute.repository';

// External Dependencies
import { ObservabilityModule } from '../../infrastructure/observability/observability.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [EventEmitterModule, ObservabilityModule, PrismaModule],
  providers: [AttributeService, AttributeRepository],
  exports: [AttributeService, AttributeRepository],
})
export class AttributeModule {}
