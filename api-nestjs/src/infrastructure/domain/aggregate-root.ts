import { DomainEvent, DomainAggregate } from '../../common/types/domain.types';

export abstract class AggregateRoot implements DomainAggregate {
  public readonly id: string;
  public version: number = 0;
  public readonly tenantId: string;
  public uncommittedEvents: DomainEvent[] = [];

  constructor(id: string, tenantId: string) {
    this.id = id;
    this.tenantId = tenantId;
  }

  protected addEvent(eventType: string, data: any, metadata?: any): void {
    const event: DomainEvent = {
      eventId: '', // Will be set by DomainEventService
      eventType,
      aggregateId: this.id,
      aggregateType: this.constructor.name,
      version: this.version + 1,
      data,
      metadata: {
        tenantId: this.tenantId,
        timestamp: new Date(),
        ...metadata,
      },
    };

    this.uncommittedEvents.push(event);
    this.version++;
  }

  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  public loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this.version = event.version;
    }
  }

  protected abstract applyEvent(event: DomainEvent): void;
}