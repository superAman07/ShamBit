import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventRepository } from './event.repository';
import { LoggerService } from '../observability/logger.service';

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: Record<string, any>;
  metadata: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    timestamp: Date;
  };
}

export interface EventFilter {
  aggregateId?: string;
  aggregateType?: string;
  eventType?: string;
  fromVersion?: number;
  toVersion?: number;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class EventService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventRepository: EventRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Publish and persist a domain event
   */
  async publishEvent(event: Omit<DomainEvent, 'id'>): Promise<DomainEvent> {
    this.logger.log('EventService.publishEvent', { 
      type: event.type, 
      aggregateId: event.aggregateId 
    });

    // Persist event to event store
    const persistedEvent = await this.eventRepository.save({
      ...event,
      id: this.generateEventId(),
    });

    // Emit event for real-time processing
    this.eventEmitter.emit(event.type, persistedEvent);

    // Emit generic event for cross-cutting concerns
    this.eventEmitter.emit('domain.event', persistedEvent);

    this.logger.log('Domain event published', {
      eventId: persistedEvent.id,
      type: event.type,
      aggregateId: event.aggregateId,
    });

    return persistedEvent;
  }

  /**
   * Publish multiple events atomically
   */
  async publishEvents(events: Omit<DomainEvent, 'id'>[]): Promise<DomainEvent[]> {
    this.logger.log('EventService.publishEvents', { count: events.length });

    const eventsWithIds = events.map(event => ({
      ...event,
      id: this.generateEventId(),
    }));

    // Persist all events atomically
    const persistedEvents = await this.eventRepository.saveMany(eventsWithIds);

    // Emit all events
    for (const event of persistedEvents) {
      this.eventEmitter.emit(event.type, event);
      this.eventEmitter.emit('domain.event', event);
    }

    this.logger.log('Domain events published', {
      count: persistedEvents.length,
      eventIds: persistedEvents.map(e => e.id),
    });

    return persistedEvents;
  }

  /**
   * Get events for an aggregate
   */
  async getAggregateEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<DomainEvent[]> {
    return this.eventRepository.findByAggregate(
      aggregateId,
      aggregateType,
      fromVersion,
    );
  }

  /**
   * Get events by filter
   */
  async getEvents(filter: EventFilter): Promise<DomainEvent[]> {
    return this.eventRepository.findByFilter(filter);
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string, limit = 100): Promise<DomainEvent[]> {
    return this.eventRepository.findByType(eventType, limit);
  }

  /**
   * Replay events for an aggregate
   */
  async replayAggregateEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<void> {
    this.logger.log('EventService.replayAggregateEvents', {
      aggregateId,
      aggregateType,
      fromVersion,
    });

    const events = await this.getAggregateEvents(
      aggregateId,
      aggregateType,
      fromVersion,
    );

    for (const event of events) {
      this.eventEmitter.emit(`replay.${event.type}`, event);
    }

    this.logger.log('Aggregate events replayed', {
      aggregateId,
      eventCount: events.length,
    });
  }

  /**
   * Subscribe to events with a handler
   */
  onEvent(eventType: string, handler: (event: DomainEvent) => void | Promise<void>): void {
    this.eventEmitter.on(eventType, handler);
  }

  /**
   * Subscribe to all domain events
   */
  onAnyEvent(handler: (event: DomainEvent) => void | Promise<void>): void {
    this.eventEmitter.on('domain.event', handler);
  }

  /**
   * Create event metadata with correlation tracking
   */
  createEventMetadata(
    userId?: string,
    correlationId?: string,
    causationId?: string,
  ): DomainEvent['metadata'] {
    return {
      userId,
      correlationId: correlationId || this.generateCorrelationId(),
      causationId,
      timestamp: new Date(),
    };
  }

  /**
   * Create a product-related event
   */
  async publishProductEvent(
    eventType: string,
    productId: string,
    data: Record<string, any>,
    metadata: DomainEvent['metadata'],
    version = 1,
  ): Promise<DomainEvent> {
    return this.publishEvent({
      type: `product.${eventType}`,
      aggregateId: productId,
      aggregateType: 'Product',
      version,
      data,
      metadata,
    });
  }

  /**
   * Create an order-related event
   */
  async publishOrderEvent(
    eventType: string,
    orderId: string,
    data: Record<string, any>,
    metadata: DomainEvent['metadata'],
    version = 1,
  ): Promise<DomainEvent> {
    return this.publishEvent({
      type: `order.${eventType}`,
      aggregateId: orderId,
      aggregateType: 'Order',
      version,
      data,
      metadata,
    });
  }

  /**
   * Create an inventory-related event
   */
  async publishInventoryEvent(
    eventType: string,
    variantId: string,
    data: Record<string, any>,
    metadata: DomainEvent['metadata'],
    version = 1,
  ): Promise<DomainEvent> {
    return this.publishEvent({
      type: `inventory.${eventType}`,
      aggregateId: variantId,
      aggregateType: 'Inventory',
      version,
      data,
      metadata,
    });
  }

  /**
   * Create a user-related event
   */
  async publishUserEvent(
    eventType: string,
    userId: string,
    data: Record<string, any>,
    metadata: DomainEvent['metadata'],
    version = 1,
  ): Promise<DomainEvent> {
    return this.publishEvent({
      type: `user.${eventType}`,
      aggregateId: userId,
      aggregateType: 'User',
      version,
      data,
      metadata,
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}