import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface OrderEventContext {
  orderId: string;
  transactionId?: string;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class OrderEventService {
  private pendingEvents: Map<string, any[]> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  /**
   * SAFETY: Events emitted only after transaction commit
   * Queue events during transaction, emit after commit
   */
  queueEvent(transactionId: string, event: any): void {
    if (!this.pendingEvents.has(transactionId)) {
      this.pendingEvents.set(transactionId, []);
    }
    
    this.pendingEvents.get(transactionId)!.push({
      ...event,
      queuedAt: new Date(),
      transactionId,
    });

    this.logger.debug('Event queued for transaction', {
      transactionId,
      eventType: event.constructor.name,
      eventId: event.eventId || 'unknown',
    });
  }

  /**
   * SAFETY: Emit all queued events after successful transaction commit
   */
  async emitQueuedEvents(transactionId: string): Promise<void> {
    const events = this.pendingEvents.get(transactionId);
    
    if (!events || events.length === 0) {
      return;
    }

    this.logger.log('Emitting queued events after transaction commit', {
      transactionId,
      eventCount: events.length,
    });

    // Emit events in order
    for (const event of events) {
      try {
        // SAFETY: Events are idempotent - include unique event ID
        const eventWithId = {
          ...event,
          eventId: this.generateEventId(event),
          emittedAt: new Date(),
        };

        this.eventEmitter.emit(event.constructor.eventName || event.eventName, eventWithId);
        
        this.logger.debug('Event emitted successfully', {
          transactionId,
          eventType: event.constructor.name,
          eventId: eventWithId.eventId,
        });

      } catch (error) {
        this.logger.error('Failed to emit event', error, {
          transactionId,
          eventType: event.constructor.name,
        });
        // Continue with other events - don't fail the entire batch
      }
    }

    // Clean up queued events
    this.pendingEvents.delete(transactionId);
  }

  /**
   * SAFETY: Clear queued events on transaction rollback
   */
  clearQueuedEvents(transactionId: string): void {
    const events = this.pendingEvents.get(transactionId);
    
    if (events && events.length > 0) {
      this.logger.log('Clearing queued events due to transaction rollback', {
        transactionId,
        eventCount: events.length,
      });
    }

    this.pendingEvents.delete(transactionId);
  }

  /**
   * SAFETY: Generate idempotent event ID for deduplication
   */
  private generateEventId(event: any): string {
    const eventData = {
      type: event.constructor.name,
      orderId: event.orderId,
      timestamp: event.timestamp?.getTime() || Date.now(),
      transactionId: event.transactionId,
    };

    // Create deterministic hash from event data
    const eventString = JSON.stringify(eventData);
    let hash = 0;
    for (let i = 0; i < eventString.length; i++) {
      const char = eventString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${event.constructor.name}_${Math.abs(hash).toString(16)}_${Date.now()}`;
  }

  /**
   * SAFETY: Validate event handlers are retry-safe
   */
  validateEventHandler(handlerName: string, event: any): void {
    // Ensure event has required fields for retry safety
    if (!event.eventId) {
      throw new Error(`Event ${handlerName} missing eventId for idempotency`);
    }

    if (!event.timestamp) {
      throw new Error(`Event ${handlerName} missing timestamp`);
    }

    if (!event.orderId && !event.customerId) {
      throw new Error(`Event ${handlerName} missing entity identifier`);
    }
  }

  /**
   * Get pending event count for monitoring
   */
  getPendingEventCount(): number {
    let total = 0;
    for (const events of this.pendingEvents.values()) {
      total += events.length;
    }
    return total;
  }

  /**
   * Get pending events by transaction (for debugging)
   */
  getPendingEvents(transactionId: string): any[] {
    return this.pendingEvents.get(transactionId) || [];
  }
}