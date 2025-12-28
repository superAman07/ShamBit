import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent, EventFilter } from './event.service';

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: DomainEvent): Promise<DomainEvent> {
    const savedEvent = await this.prisma.domainEvent.create({
      data: {
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        version: event.version,
        data: event.data,
        metadata: event.metadata,
      },
    });

    return {
      id: savedEvent.id,
      type: savedEvent.type,
      aggregateId: savedEvent.aggregateId,
      aggregateType: savedEvent.aggregateType,
      version: savedEvent.version,
      data: savedEvent.data as Record<string, any>,
      metadata: savedEvent.metadata as DomainEvent['metadata'],
    };
  }

  async saveMany(events: DomainEvent[]): Promise<DomainEvent[]> {
    const savedEvents = await this.prisma.domainEvent.createMany({
      data: events.map(event => ({
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        version: event.version,
        data: event.data,
        metadata: event.metadata,
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

    return events.map(event => ({
      id: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: event.data as Record<string, any>,
      metadata: event.metadata as DomainEvent['metadata'],
    }));
  }

  async findByFilter(filter: EventFilter): Promise<DomainEvent[]> {
    const where: any = {};

    if (filter.aggregateId) where.aggregateId = filter.aggregateId;
    if (filter.aggregateType) where.aggregateType = filter.aggregateType;
    if (filter.eventType) where.type = filter.eventType;
    if (filter.fromVersion) where.version = { gte: filter.fromVersion };
    if (filter.toVersion) where.version = { ...where.version, lte: filter.toVersion };
    if (filter.fromDate) where.createdAt = { gte: filter.fromDate };
    if (filter.toDate) where.createdAt = { ...where.createdAt, lte: filter.toDate };

    const events = await this.prisma.domainEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return events.map(event => ({
      id: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: event.data as Record<string, any>,
      metadata: event.metadata as DomainEvent['metadata'],
    }));
  }

  async findByType(eventType: string, limit: number): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: { type: eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map(event => ({
      id: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      data: event.data as Record<string, any>,
      metadata: event.metadata as DomainEvent['metadata'],
    }));
  }
}