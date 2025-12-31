import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent, EventFilter } from './event.service';

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: DomainEvent): Promise<DomainEvent> {
    const savedEvent = await this.prisma.domainEvent.create({
      data: {
        id: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        version: event.version,
        eventData: {
          data: event.data,
          metadata: event.metadata,
        },
      },
    });

    return {
      eventId: savedEvent.id,
      eventType: savedEvent.eventType,
      aggregateId: savedEvent.aggregateId,
      aggregateType: savedEvent.aggregateType,
      version: savedEvent.version,
      data: (savedEvent.eventData as any)?.data || savedEvent.eventData,
      metadata: (savedEvent.eventData as any)?.metadata || {},
    };
  }

  async saveMany(events: DomainEvent[]): Promise<DomainEvent[]> {
    const savedEvents = await this.prisma.domainEvent.createMany({
      data: events.map((event) => ({
        id: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        version: event.version,
        eventData: {
          data: event.data,
          metadata: event.metadata,
        },
      })),
    });

    return events; // Return original events as createMany doesn't return created records
  }

  async findByAggregate(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: {
        aggregateId,
        aggregateType,
        ...(fromVersion && { version: { gte: fromVersion } }),
      },
      orderBy: { version: 'asc' },
    });

    return events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: (event.eventData as any)?.data || event.eventData,
      metadata: (event.eventData as any)?.metadata || {},
    }));
  }

  async findByFilter(filter: EventFilter): Promise<DomainEvent[]> {
    const where: any = {};

    if (filter.aggregateId) where.aggregateId = filter.aggregateId;
    if (filter.aggregateType) where.aggregateType = filter.aggregateType;
    if (filter.eventType) where.eventType = filter.eventType;
    if (filter.fromVersion) where.version = { gte: filter.fromVersion };
    if (filter.toVersion)
      where.version = { ...where.version, lte: filter.toVersion };
    if (filter.fromDate) where.occurredAt = { gte: filter.fromDate };
    if (filter.toDate)
      where.occurredAt = { ...where.occurredAt, lte: filter.toDate };

    const events = await this.prisma.domainEvent.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
    });

    return events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: (event.eventData as any)?.data || event.eventData,
      metadata: (event.eventData as any)?.metadata || {},
    }));
  }

  async findByType(eventType: string, limit: number): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: { eventType: eventType },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: (event.eventData as any)?.data || event.eventData,
      metadata: (event.eventData as any)?.metadata || {},
    }));
  }
}
