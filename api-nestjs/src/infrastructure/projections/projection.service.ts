import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { DomainEvent, ReadModel } from '../../common/types/domain.types';

export interface ProjectionHandler {
  eventType: string;
  handle(event: DomainEvent): Promise<void>;
}

@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);
  private readonly projectionHandlers = new Map<string, ProjectionHandler[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  registerHandler(handler: ProjectionHandler): void {
    const handlers = this.projectionHandlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.projectionHandlers.set(handler.eventType, handlers);
    this.logger.log(
      `Registered projection handler for event: ${handler.eventType}`,
    );
  }

  @OnEvent('**')
  async handleEvent(event: DomainEvent): Promise<void> {
    const handlers = this.projectionHandlers.get(event.eventType) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(event);
        this.logger.debug(
          `Projection handled: ${handler.constructor.name} for ${event.eventType}`,
        );
      } catch (error) {
        this.logger.error(
          `Projection handler failed: ${handler.constructor.name}`,
          error,
        );
        // Store failed projection for retry
        await this.storeFailedProjection(event, handler, error);
      }
    }
  }

  async rebuildProjection(
    projectionName: string,
    tenantId: string,
    fromTimestamp?: Date,
  ): Promise<void> {
    this.logger.log(
      `Rebuilding projection: ${projectionName} for tenant: ${tenantId}`,
    );

    // Get events (filter by timestamp at the DB level, filter by tenant in-app)
    const where: any = {};
    if (fromTimestamp) where.occurredAt = { gte: fromTimestamp };

    const events = await this.prisma.domainEvent.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
    });

    // Clear existing projection data
    await this.clearProjection(projectionName, tenantId);

    // Replay events
    for (const eventRecord of events) {
      const payload = (eventRecord.eventData ?? {}) as any;
      const eventTenant = payload?.metadata?.tenantId ?? payload?.tenantId;
      if (eventTenant && eventTenant !== tenantId) continue;

      const event: DomainEvent = {
        eventId: eventRecord.id,
        eventType: eventRecord.eventType,
        aggregateId: eventRecord.aggregateId,
        aggregateType: eventRecord.aggregateType,
        version: eventRecord.version,
        data: payload?.data ?? payload,
        metadata: payload?.metadata ?? ({} as any),
      };

      await this.handleEvent(event);
    }

    this.logger.log(`Projection rebuild completed: ${projectionName}`);
  }

  async getReadModel<T extends ReadModel>(
    modelType: string,
    id: string,
    tenantId: string,
  ): Promise<T | null> {
    // Try cache first
    const cacheKey = `readmodel:${modelType}:${tenantId}:${id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database based on model type
    let model: any = null;

    switch (modelType) {
      case 'ProductReadModel':
        model = await this.prisma.productReadModel.findFirst({
          where: { id, tenantId },
        });
        break;
      case 'OrderReadModel':
        model = await this.prisma.orderReadModel.findFirst({
          where: { id, tenantId },
        });
        break;
      case 'InventoryReadModel':
        model = await this.prisma.inventoryReadModel.findFirst({
          where: { id, tenantId },
        });
        break;
      // Add more read models as needed
    }

    if (model) {
      // Cache for 5 minutes
      await this.redis.set(cacheKey, JSON.stringify(model), 300);
    }

    return model;
  }

  async invalidateReadModel(
    modelType: string,
    id: string,
    tenantId: string,
  ): Promise<void> {
    const cacheKey = `readmodel:${modelType}:${tenantId}:${id}`;
    await this.redis.del(cacheKey);
  }

  private async storeFailedProjection(
    event: DomainEvent,
    handler: ProjectionHandler,
    error: any,
  ): Promise<void> {
    await this.prisma.failedProjection.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        handlerName: handler.constructor.name,
        error: error.message,
        eventData: JSON.stringify(event),
        tenantId: event.metadata.tenantId,
        createdAt: new Date(),
      },
    });
  }

  private async clearProjection(
    projectionName: string,
    tenantId: string,
  ): Promise<void> {
    // Clear projection data based on projection name
    switch (projectionName) {
      case 'ProductReadModel':
        await this.prisma.productReadModel.deleteMany({
          where: { tenantId },
        });
        break;
      case 'OrderReadModel':
        await this.prisma.orderReadModel.deleteMany({
          where: { tenantId },
        });
        break;
      case 'InventoryReadModel':
        await this.prisma.inventoryReadModel.deleteMany({
          where: { tenantId },
        });
        break;
    }

    // Clear related cache
    const pattern = `readmodel:${projectionName}:${tenantId}:*`;
    // Note: Redis doesn't have a built-in way to delete by pattern
    // You might need to implement this based on your Redis setup
  }
}
