import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ProjectionHandler } from '../../../infrastructure/projections/projection.service';
import type { DomainEvent } from '../../../common/types/domain.types';

@Injectable()
export class ProductReadModelHandler implements ProjectionHandler {
  eventType = 'product.*';
  private readonly logger = new Logger(ProductReadModelHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('product.created')
  async handleProductCreated(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('product.updated')
  async handleProductUpdated(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('product.deleted')
  async handleProductDeleted(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  async handle(event: DomainEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'product.created':
          await this.createProductReadModel(event);
          break;
        case 'product.updated':
          await this.updateProductReadModel(event);
          break;
        case 'product.deleted':
          await this.deleteProductReadModel(event);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle event ${event.eventType}:`, error);
      throw error;
    }
  }

  private async createProductReadModel(event: DomainEvent): Promise<void> {
    const product = event.data.product;
    
    await this.prisma.productReadModel.create({
      data: {
        id: product.id,
        tenantId: event.metadata.tenantId,
        sellerId: product.sellerId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        status: product.status,
        categoryId: product.categoryId,
        brandId: product.brandId,
        images: product.images || [],
        variants: [], // Will be populated by variant events
        pricing: {},
        inventory: {},
        ratings: {
          average: 0,
          count: 0,
        },
        version: event.version,
        lastUpdated: event.metadata.timestamp,
      },
    });

    this.logger.debug(`Created product read model: ${product.id}`);
  }

  private async updateProductReadModel(event: DomainEvent): Promise<void> {
    const product = event.data.product;
    const changes = event.data.changes || {};

    const updateData: any = {
      version: event.version,
      lastUpdated: event.metadata.timestamp,
    };

    // Only update changed fields
    if (changes.name) updateData.name = product.name;
    if (changes.description) updateData.description = product.description;
    if (changes.status) updateData.status = product.status;
    if (changes.categoryId) updateData.categoryId = product.categoryId;
    if (changes.brandId) updateData.brandId = product.brandId;
    if (changes.images) updateData.images = product.images;

    await this.prisma.productReadModel.update({
      where: {
        id: product.id,
      },
      data: updateData,
    });

    this.logger.debug(`Updated product read model: ${product.id}`);
  }

  private async deleteProductReadModel(event: DomainEvent): Promise<void> {
    const productId = event.aggregateId;

    await this.prisma.productReadModel.delete({
      where: {
        id: productId,
      },
    });

    this.logger.debug(`Deleted product read model: ${productId}`);
  }
}

@Injectable()
export class ProductVariantReadModelHandler implements ProjectionHandler {
  eventType = 'product.variant.*';
  private readonly logger = new Logger(ProductVariantReadModelHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('product.variant.created')
  async handleVariantCreated(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('product.variant.updated')
  async handleVariantUpdated(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('product.variant.deleted')
  async handleVariantDeleted(event: DomainEvent): Promise<void> {
    await this.handle(event);
  }

  async handle(event: DomainEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'product.variant.created':
          await this.addVariantToReadModel(event);
          break;
        case 'product.variant.updated':
          await this.updateVariantInReadModel(event);
          break;
        case 'product.variant.deleted':
          await this.removeVariantFromReadModel(event);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle event ${event.eventType}:`, error);
      throw error;
    }
  }

  private async addVariantToReadModel(event: DomainEvent): Promise<void> {
    const variant = event.data.variant;
    const productId = variant.productId;

    const productReadModel = await this.prisma.productReadModel.findUnique({
      where: {
        id: productId,
      },
    });

    if (productReadModel) {
      const variants = Array.isArray(productReadModel.variants) 
        ? productReadModel.variants as any[]
        : [];
      
      variants.push({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        attributes: variant.attributes,
        isActive: variant.isActive,
      });

      await this.prisma.productReadModel.update({
        where: {
          id: productId,
        },
        data: {
          variants,
          version: event.version,
          lastUpdated: event.metadata.timestamp,
        },
      });
    }

    this.logger.debug(`Added variant to product read model: ${variant.id}`);
  }

  private async updateVariantInReadModel(event: DomainEvent): Promise<void> {
    const variant = event.data.variant;
    const productId = variant.productId;

    const productReadModel = await this.prisma.productReadModel.findUnique({
      where: {
        id: productId,
      },
    });

    if (productReadModel) {
      const variants = Array.isArray(productReadModel.variants) 
        ? productReadModel.variants as any[]
        : [];
      
      const variantIndex = variants.findIndex(v => v.id === variant.id);
      if (variantIndex !== -1) {
        variants[variantIndex] = {
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          attributes: variant.attributes,
          isActive: variant.isActive,
        };

        await this.prisma.productReadModel.update({
          where: {
            id: productId,
          },
          data: {
            variants,
            version: event.version,
            lastUpdated: event.metadata.timestamp,
          },
        });
      }
    }

    this.logger.debug(`Updated variant in product read model: ${variant.id}`);
  }

  private async removeVariantFromReadModel(event: DomainEvent): Promise<void> {
    const variantId = event.aggregateId;
    const productId = event.data.productId;

    const productReadModel = await this.prisma.productReadModel.findUnique({
      where: {
        id: productId,
      },
    });

    if (productReadModel) {
      const variants = Array.isArray(productReadModel.variants) 
        ? productReadModel.variants as any[]
        : [];
      
      const filteredVariants = variants.filter(v => v.id !== variantId);

      await this.prisma.productReadModel.update({
        where: {
          id: productId,
        },
        data: {
          variants: filteredVariants,
          version: event.version,
          lastUpdated: event.metadata.timestamp,
        },
      });
    }

    this.logger.debug(`Removed variant from product read model: ${variantId}`);
  }
}