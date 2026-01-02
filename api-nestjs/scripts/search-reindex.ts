#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { SearchIndexService } from '../src/domains/search/search-index.service';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

const logger = new Logger('SearchReindex');

interface ReindexOptions {
  entityType?: string;
  entityId?: string;
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
  category?: string;
  brand?: string;
  seller?: string;
}

class SearchReindexService {
  private app: any;
  private searchIndexService: SearchIndexService;
  private prismaService: PrismaService;

  async initialize() {
    logger.log('Initializing NestJS application...');
    this.app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    this.searchIndexService = this.app.get(SearchIndexService);
    this.prismaService = this.app.get(PrismaService);

    logger.log('Application initialized successfully');
  }

  async reindexAll(options: ReindexOptions = {}): Promise<void> {
    const { batchSize = 1000, dryRun = false } = options;

    try {
      logger.log('Starting full reindex...');

      if (dryRun) {
        logger.log('DRY RUN: Would reindex all products but skipping actual indexing');
        const count = await this.prismaService.product.count({
          where: { isActive: true },
        });
        logger.log(`Would reindex ${count} products`);
        return;
      }

      const result = await this.searchIndexService.reindexAll();
      logger.log(`Full reindex completed. Indexed ${result.totalIndexed} products.`);

    } catch (error) {
      logger.error('Full reindex failed:', error);
      throw error;
    }
  }

  async reindexEntity(entityType: string, entityId: string, options: ReindexOptions = {}): Promise<void> {
    const { dryRun = false } = options;

    try {
      logger.log(`Reindexing ${entityType}:${entityId}...`);

      if (dryRun) {
        logger.log(`DRY RUN: Would reindex ${entityType}:${entityId}`);
        return;
      }

      await this.searchIndexService.indexEntity(entityType, entityId);
      logger.log(`Successfully reindexed ${entityType}:${entityId}`);

    } catch (error) {
      logger.error(`Failed to reindex ${entityType}:${entityId}:`, error);
      throw error;
    }
  }

  async reindexByCategory(categoryId: string, options: ReindexOptions = {}): Promise<void> {
    const { batchSize = 1000, dryRun = false } = options;

    try {
      logger.log(`Reindexing products in category: ${categoryId}`);

      const products = await this.prismaService.product.findMany({
        where: {
          categoryId,
          isActive: true,
        },
        select: { id: true },
      });

      logger.log(`Found ${products.length} products in category ${categoryId}`);

      if (dryRun) {
        logger.log(`DRY RUN: Would reindex ${products.length} products`);
        return;
      }

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const indexPromises = batch.map(product =>
          this.searchIndexService.indexEntity('product', product.id)
            .catch(error => {
              logger.error(`Failed to index product ${product.id}:`, error.message);
              return null;
            })
        );

        await Promise.all(indexPromises);

        const progress = Math.min(i + batchSize, products.length);
        logger.log(`Progress: ${progress}/${products.length}`);
      }

      logger.log(`Category reindex completed for ${categoryId}`);

    } catch (error) {
      logger.error(`Failed to reindex category ${categoryId}:`, error);
      throw error;
    }
  }

  async reindexByBrand(brandId: string, options: ReindexOptions = {}): Promise<void> {
    const { batchSize = 1000, dryRun = false } = options;

    try {
      logger.log(`Reindexing products for brand: ${brandId}`);

      const products = await this.prismaService.product.findMany({
        where: {
          brandId,
          isActive: true,
        },
        select: { id: true },
      });

      logger.log(`Found ${products.length} products for brand ${brandId}`);

      if (dryRun) {
        logger.log(`DRY RUN: Would reindex ${products.length} products`);
        return;
      }

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const indexPromises = batch.map(product =>
          this.searchIndexService.indexEntity('product', product.id)
            .catch(error => {
              logger.error(`Failed to index product ${product.id}:`, error.message);
              return null;
            })
        );

        await Promise.all(indexPromises);

        const progress = Math.min(i + batchSize, products.length);
        logger.log(`Progress: ${progress}/${products.length}`);
      }

      logger.log(`Brand reindex completed for ${brandId}`);

    } catch (error) {
      logger.error(`Failed to reindex brand ${brandId}:`, error);
      throw error;
    }
  }

  async reindexBySeller(sellerId: string, options: ReindexOptions = {}): Promise<void> {
    const { batchSize = 1000, dryRun = false } = options;

    try {
      logger.log(`Reindexing products for seller: ${sellerId}`);

      const products = await this.prismaService.product.findMany({
        where: {
          sellerId,
          isActive: true,
        },
        select: { id: true },
      });

      logger.log(`Found ${products.length} products for seller ${sellerId}`);

      if (dryRun) {
        logger.log(`DRY RUN: Would reindex ${products.length} products`);
        return;
      }

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const indexPromises = batch.map(product =>
          this.searchIndexService.indexEntity('product', product.id)
            .catch(error => {
              logger.error(`Failed to index product ${product.id}:`, error.message);
              return null;
            })
        );

        await Promise.all(indexPromises);

        const progress = Math.min(i + batchSize, products.length);
        logger.log(`Progress: ${progress}/${products.length}`);
      }

      logger.log(`Seller reindex completed for ${sellerId}`);

    } catch (error) {
      logger.error(`Failed to reindex seller ${sellerId}:`, error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
      logger.log('Application closed');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options: ReindexOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--entity-type':
        options.entityType = args[++i];
        break;
      case '--entity-id':
        options.entityId = args[++i];
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--brand':
        options.brand = args[++i];
        break;
      case '--seller':
        options.seller = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 1000;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
        console.log(`
Usage: npm run search:reindex [options]

Options:
  --entity-type <type>    Entity type to reindex (product, category, brand)
  --entity-id <id>        Specific entity ID to reindex
  --category <id>         Reindex all products in category
  --brand <id>            Reindex all products for brand
  --seller <id>           Reindex all products for seller
  --batch-size <number>   Batch size for processing (default: 1000)
  --dry-run              Run without making actual changes
  --force                Force reindex even if not needed
  --help                 Show this help message

Examples:
  npm run search:reindex                                    # Full reindex
  npm run search:reindex -- --entity-type product --entity-id prod_123
  npm run search:reindex -- --category cat_123
  npm run search:reindex -- --brand brand_456
  npm run search:reindex -- --seller seller_789
  npm run search:reindex -- --dry-run
        `);
        process.exit(0);
    }
  }

  const reindexService = new SearchReindexService();

  try {
    await reindexService.initialize();

    // Determine reindex strategy
    if (options.entityType && options.entityId) {
      await reindexService.reindexEntity(options.entityType, options.entityId, options);
    } else if (options.category) {
      await reindexService.reindexByCategory(options.category, options);
    } else if (options.brand) {
      await reindexService.reindexByBrand(options.brand, options);
    } else if (options.seller) {
      await reindexService.reindexBySeller(options.seller, options);
    } else {
      // Full reindex
      if (!options.force && !options.dryRun) {
        logger.warn('Full reindex will process all products. Use --force to confirm or --dry-run to test.');
        process.exit(1);
      }
      await reindexService.reindexAll(options);
    }

    logger.log('🎉 Reindex operation completed successfully!');

  } catch (error) {
    logger.error('Reindex failed:', error);
    process.exit(1);
  } finally {
    await reindexService.cleanup();
  }
}

// Run the reindex if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { SearchReindexService };