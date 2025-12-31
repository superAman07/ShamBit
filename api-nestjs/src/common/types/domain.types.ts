export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: any;
  metadata: {
    tenantId: string;
    userId: string;
    timestamp: Date;
    correlationId?: string;
    causationId?: string;
  };
}

export interface DomainAggregate {
  id: string;
  version: number;
  tenantId: string;
  uncommittedEvents: DomainEvent[];
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface ReadModel {
  id: string;
  tenantId: string;
  version: number;
  lastUpdated: Date;
}

export enum DomainModule {
  AUTH = 'auth',
  PRODUCT = 'product',
  ORDER = 'order',
  INVENTORY = 'inventory',
  PRICING = 'pricing',
  CART = 'cart',
  NOTIFICATION = 'notification',
  REVIEW = 'review',
  MEDIA = 'media',
}

export interface CrossModuleQuery {
  sourceModule: DomainModule;
  targetModule: DomainModule;
  queryType: 'read-only' | 'projection';
  data: any;
}
