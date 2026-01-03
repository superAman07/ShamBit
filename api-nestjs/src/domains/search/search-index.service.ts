import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CONFIG, INDEX_ALIASES, SEARCH_CONSTANTS } from './config/elasticsearch.config';
import { SearchDocument, IndexUpdateEvent } from './types/search.types';

@Injectable()
export class SearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexService.name);
  private elasticsearchClient: Client;
  private readonly indexPrefix: string;
  private isElasticsearchAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.indexPrefix = this.configService.get('ELASTICSEARCH_INDEX_PREFIX', 'marketplace');
    this.elasticsearchClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
      auth: {
        username: this.configService.get<string>('ELASTICSEARCH_USERNAME') || '',
        password: this.configService.get<string>('ELASTICSEARCH_PASSWORD') || '',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.initializeIndices();
      this.isElasticsearchAvailable = true;
    } catch (error) {
      this.logger.warn('Elasticsearch not available - search functionality will be disabled', error.message);
      this.isElasticsearchAvailable = false;
      // Don't throw error to prevent app startup failure
    }
  }

  private async checkElasticsearchAvailability(): Promise<boolean> {
    if (!this.isElasticsearchAvailable) {
      this.logger.warn('Elasticsearch is not available - skipping operation');
      return false;
    }
    return true;
  }

  private getIndexName(type: string): string {
    return `${this.indexPrefix}_${type}`;
  }

  async initializeIndices() {
    try {
      // Test connection first
      await this.elasticsearchClient.ping();
      
      const indexName = this.getIndexName('products');

      // Check if index exists
      const exists = await this.elasticsearchClient.indices.exists({
        index: indexName,
      });

      if (!exists) {
        // Create index with mappings and settings
        await this.elasticsearchClient.indices.create({
          index: indexName,
          body: ELASTICSEARCH_CONFIG as any,
        });

        // Create aliases
        await this.elasticsearchClient.indices.putAlias({
          index: indexName,
          name: `${this.indexPrefix}_${INDEX_ALIASES.PRODUCTS}`,
        });

        this.logger.log(`Created Elasticsearch index: ${indexName}`);
      } else {
        this.logger.log(`Elasticsearch index already exists: ${indexName}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch indices', error);
      throw error;
    }
  }

  async indexEntity(entityType: string, entityId: string, data?: any) {
    if (!(await this.checkElasticsearchAvailability())) {
      return;
    }

    try {
      let document: SearchDocument | undefined;

      switch (entityType) {
        case 'product':
          const productDoc = await this.buildProductDocument(entityId);
          if (productDoc) {
            document = productDoc;
          }
          break;
        case 'category':
          // Reindex all products in this category
          await this.reindexProductsByCategory(entityId);
          return;
        case 'brand':
          // Reindex all products of this brand
          await this.reindexProductsByBrand(entityId);
          return;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      if (!document) {
        this.logger.warn(`No document built for ${entityType}:${entityId}`);
        return;
      }

      const indexName = this.getIndexName('products');
      await this.elasticsearchClient.index({
        index: indexName,
        id: document.id,
        body: document,
        refresh: 'wait_for',
      });

      this.logger.debug(`Indexed ${entityType}:${entityId}`);

      // Emit indexing event
      this.eventEmitter.emit('search.indexed', {
        type: 'create',
        entityType,
        entityId,
        timestamp: new Date(),
      } as IndexUpdateEvent);

    } catch (error) {
      this.logger.error(`Failed to index ${entityType}:${entityId}`, error);
      // Don't throw error to prevent app failure
    }
  }

  async removeEntity(entityType: string, entityId: string) {
    if (!(await this.checkElasticsearchAvailability())) {
      return;
    }

    try {
      const indexName = this.getIndexName('products');

      await this.elasticsearchClient.delete({
        index: indexName,
        id: entityId,
        refresh: 'wait_for',
      });

      this.logger.debug(`Removed ${entityType}:${entityId} from index`);

      // Emit removal event
      this.eventEmitter.emit('search.removed', {
        type: 'delete',
        entityType,
        entityId,
        timestamp: new Date(),
      } as IndexUpdateEvent);

    } catch (error) {
      if (error.meta?.statusCode === 404) {
        this.logger.warn(`Document ${entityType}:${entityId} not found in index`);
        return;
      }
      this.logger.error(`Failed to remove ${entityType}:${entityId}`, error);
      // Don't throw error to prevent app failure
    }
  }

  async bulkIndex(documents: SearchDocument[]) {
    if (documents.length === 0) return;

    try {
      const indexName = this.getIndexName('products');
      const body = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc
      ]);

      const response = await this.elasticsearchClient.bulk({
        body,
        refresh: 'wait_for',
      });

      if (response.errors) {
        const errors = response.items
          .filter(item => item.index?.error)
          .map(item => item.index?.error);
        this.logger.error('Bulk indexing errors:', errors);
      }

      this.logger.log(`Bulk indexed ${documents.length} documents`);
    } catch (error) {
      this.logger.error('Bulk indexing failed', error);
      throw error;
    }
  }

  async reindexAll() {
    if (!(await this.checkElasticsearchAvailability())) {
      throw new Error('Elasticsearch is not available');
    }

    try {
      this.logger.log('Starting full reindex...');

      const batchSize = SEARCH_CONSTANTS.BULK_SIZE;
      let skip = 0;
      let totalIndexed = 0;

      while (true) {
        const products = await this.prisma.product.findMany({
          skip,
          take: batchSize,
          where: { isActive: true },
          include: {
            category: true,
            brand: true,
            seller: true,
            variants: {
              include: {
                pricing: true,
                inventory: true,
                attributeValues: {
                  include: { attribute: true }
                }
              }
            },
            attributeValues: {
              include: { attribute: true }
            },
            images: true,
          },
        });

        if (products.length === 0) break;

        const documents = await Promise.all(
          products.map(product => this.buildProductDocumentFromData(product))
        );

        await this.bulkIndex(documents.filter(Boolean));

        totalIndexed += documents.length;
        skip += batchSize;

        this.logger.log(`Indexed ${totalIndexed} products...`);
      }

      this.logger.log(`Full reindex completed. Total indexed: ${totalIndexed}`);
      return { success: true, totalIndexed };

    } catch (error) {
      this.logger.error('Full reindex failed', error);
      throw error;
    }
  }

  private async buildProductDocument(productId: string): Promise<SearchDocument | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        brand: true,
        seller: true,
        variants: {
          include: {
            pricing: true,
            inventory: true,
            attributeValues: {
              include: { attribute: true }
            }
          }
        },
        attributeValues: {
          include: { attribute: true }
        },
        images: true,
      },
    });

    if (!product || !product.isActive) return null;

    return this.buildProductDocumentFromData(product);
  }

  private async buildProductDocumentFromData(product: any): Promise<SearchDocument> {
    // Calculate aggregated pricing
    const prices = product.variants
      ?.map(v => v.pricing?.sellingPrice)
      .filter(Boolean)
      .map(Number) || [0];

    const minPrice = Math.min(...prices) || 0;
    const maxPrice = Math.max(...prices) || 0;

    // Calculate aggregated inventory
    const totalQuantity = product.variants
      ?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) || 0;

    // Build attributes map
    const attributes = {};
    product.attributeValues?.forEach(av => {
      if (av.attribute) {
        attributes[av.attribute.slug] = av.stringValue || av.numberValue || av.booleanValue;
      }
    });

    // Build search text
    const searchText = [
      product.name,
      product.description,
      product.category?.name,
      product.brand?.name,
      product.seller?.businessName,
      ...Object.values(attributes).map(String),
    ].filter(Boolean).join(' ');

    // Get popularity metrics (mock for now - implement with real analytics)
    const popularity = {
      viewCount: 0,
      orderCount: 0,
      rating: 0,
      reviewCount: 0,
      wishlistCount: 0,
      score: 0,
    };

    return {
      id: product.id,
      type: 'product',
      name: product.name,
      description: product.description || '',
      slug: product.slug,

      category: {
        id: product.category.id,
        name: product.category.name,
        path: product.category.path.split('/').filter(Boolean),
        pathIds: product.category.pathIds,
        level: product.category.level,
      },

      brand: product.brand ? {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
      } : undefined,

      seller: {
        id: product.seller.id,
        businessName: product.seller.businessName,
        rating: 0, // TODO: Calculate from reviews
        isVerified: product.seller.status === 'APPROVED',
      },

      pricing: {
        minPrice,
        maxPrice,
        currency: 'INR',
        hasDiscount: false, // TODO: Calculate from promotions
        discountPercentage: undefined,
      },

      inventory: {
        totalQuantity,
        isInStock: totalQuantity > 0,
        lowStock: totalQuantity > 0 && totalQuantity <= 10,
      },

      attributes,

      variants: product.variants?.map(v => ({
        id: v.id,
        sku: v.sku,
        price: Number(v.pricing?.sellingPrice || 0),
        inventory: v.inventory?.quantity || 0,
        attributes: v.attributeValues?.reduce((acc, av) => {
          if (av.attribute) {
            acc[av.attribute.slug] = av.value;
          }
          return acc;
        }, {}),
      })),

      images: product.images?.map(img => img.url) || [],
      primaryImage: product.images?.[0]?.url || '',

      searchText,
      keywords: [], // TODO: Extract from ML analysis
      tags: [], // TODO: Extract from categories/attributes

      popularity,

      status: product.status,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isPromoted: false, // TODO: Check active promotions

      locale: 'en-IN',
      translations: undefined,

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      indexedAt: new Date(),
    };
  }

  private async reindexProductsByCategory(categoryId: string) {
    const products = await this.prisma.product.findMany({
      where: { categoryId, isActive: true },
      select: { id: true },
    });

    for (const product of products) {
      await this.indexEntity('product', product.id);
    }
  }

  private async reindexProductsByBrand(brandId: string) {
    const products = await this.prisma.product.findMany({
      where: { brandId, isActive: true },
      select: { id: true },
    });

    for (const product of products) {
      await this.indexEntity('product', product.id);
    }
  }

  // Backwards-compatible alias used by controller
  async triggerFullReindex() {
    return this.reindexAll();
  }
}
