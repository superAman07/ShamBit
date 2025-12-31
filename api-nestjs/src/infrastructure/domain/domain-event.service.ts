import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent } from '../../common/types/domain.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DomainEventService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async publishEvent(event: Omit<DomainEvent, 'eventId'>): Promise<void> {
    const domainEvent: DomainEvent = {
      ...event,
      eventId: uuidv4(),
    };

    // Store event in database for audit and replay
    await this.prisma.domainEvent.create({
      data: {
        id: domainEvent.eventId,
        eventType: domainEvent.eventType,
        aggregateId: domainEvent.aggregateId,
        aggregateType: domainEvent.aggregateType,
        version: domainEvent.version,
        // Persist both payload and metadata inside `eventData` JSON column
        eventData: {
          payload: domainEvent.data,
          metadata: domainEvent.metadata,
        },
      },
    });

    // Emit event for immediate processing
    this.eventEmitter.emit(domainEvent.eventType, domainEvent);
  }

  async getEvents(
    aggregateId: string,
    fromVersion?: number,
    tenantId?: string,
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: {
        aggregateId,
        ...(fromVersion && { version: { gte: fromVersion } }),
      },
      orderBy: { version: 'asc' },
    });

    // If tenantId was provided, filter by metadata.tenantId after fetch
    const filtered = tenantId
      ? events.filter(
          (e) => ((e.eventData as any)?.metadata?.tenantId ?? '') === tenantId,
        )
      : events;

    return filtered.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      // `eventData` stores both payload and metadata
      data: (event.eventData as any)?.payload ?? (event.eventData as any),
      metadata:
        (event.eventData as any)?.metadata ??
        ({ tenantId: '', userId: '', timestamp: event.occurredAt } as any),
    }));
  }

  async replayEvents(
    aggregateId: string,
    fromVersion: number,
    tenantId: string,
  ): Promise<void> {
    const events = await this.getEvents(aggregateId, fromVersion, tenantId);

    for (const event of events) {
      this.eventEmitter.emit(`replay.${event.eventType}`, event);
    }
  }
}
