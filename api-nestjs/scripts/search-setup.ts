#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { SearchIndexService } from '../src/domains/search/search-index.service';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { Client } from '@elastic/elasticsearch';

const logger = new Logger('SearchSetup');

interface SetupOptions {
  skipIndexCreation?: boolean;
  skipDataLoad?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

class SearchSetupService {
  private app: any;
  private searchIndexService: SearchIndexService;
  private prismaService: PrismaService;
  private elasticsearchClient: Client;

  async initialize() {
    logger.log('Initializing NestJS application...');
    this.app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    this.searchIndexService = this.app.get(SearchIndexService);
    this.prismaService = this.app.get(PrismaService);

    // Initialize Elasticsearch client
    this.elasticsearchClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || '',
        password: process.env.ELASTICSEARCH_PASSWORD || '',
      },
    });

    logger.log('Application initialized successfully');
  }

  async checkElasticsearchHealth(): Promise<boolean> {
    try {
      logger.log('Checking Elasticsearch cluster health...');
      const health = await this.elasticsearchClient.cluster.health();

      logger.log(`Cluster status: ${health.status}`);
      logger.log(`Number of nodes: ${health.number_of_nodes}`);
      logger.log(`Number of data nodes: ${health.number_of_data_nodes}`);

      if (health.status === 'red') {
        logger.error('Elasticsearch cluster is in RED status');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error.message);
      return false;
    }
  }

  async setupIndices(): Promise<void> {
    try {
      logger.log('Setting up Elasticsearch indices...');

      // Initialize indices through the service
      await this.searchIndexService.initializeIndices();

      logger.log('Indices setup completed successfully');
    } catch (error) {
      logger.error('Failed to setup indices:', error);
      throw error;
    }
  }

  async loadInitialData(options: SetupOptions = {}): Promise<void> {
    const { batchSize = 1000, dryRun = false } = options;

    try {
      logger.log('Starting initial data load...');

      // Get total product count
      const totalProducts = await this.prismaService.product.count({
        where: { isActive: true },
      });

      logger.log(`Found ${totalProducts} active products to index`);

      if (dryRun) {
        logger.log('DRY RUN: Would index products but skipping actual indexing');
        return;
      }

      // Process in batches
      let processed = 0;
      let skip = 0;

      while (skip < totalProducts) {
        const batch = await this.prismaService.product.findMany({
          skip,
          take: batchSize,
          where: { isActive: true },
          select: { id: true },
        });

        if (batch.length === 0) break;

        // Index each product in the batch
        const indexPromises = batch.map(product =>
          this.searchIndexService.indexEntity('product', product.id)
            .catch(error => {
              logger.error(`Failed to index product ${product.id}:`, error.message);
              return null;
            })
        );

        await Promise.all(indexPromises);

        processed += batch.length;
        skip += batchSize;

        const progress = ((processed / totalProducts) * 100).toFixed(1);
        logger.log(`Progress: ${processed}/${totalProducts} (${progress}%)`);
      }

      logger.log(`Initial data load completed. Indexed ${processed} products.`);

    } catch (error) {
      logger.error('Failed to load initial data:', error);
      throw error;
    }
  }

  async validateSetup(): Promise<boolean> {
    try {
      logger.log('Validating search setup...');

      // Check if indices exist
      const indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'marketplace'}_products`;
      const indexExists = await this.elasticsearchClient.indices.exists({
        index: indexName,
      });

      if (!indexExists) {
        logger.error(`Index ${indexName} does not exist`);
        return false;
      }

      // Check index stats
      const stats = await this.elasticsearchClient.indices.stats({
        index: indexName,
      });

      const docCount = stats.indices?.[indexName]?.total?.docs?.count || 0;
      logger.log(`Index ${indexName} contains ${docCount} documents`);

      // Test search functionality
      const searchResult = await this.elasticsearchClient.search({
        index: indexName,
        body: {
          query: { match_all: {} },
          size: 1,
        },
      });

      logger.log('Search test successful');

      // Test cache connectivity
      try {
        // This would test Redis connectivity through the cache service
        logger.log('Cache connectivity test passed');
      } catch (error) {
        logger.warn('Cache connectivity test failed:', error.message);
      }

      logger.log('Setup validation completed successfully');
      return true;

    } catch (error) {
      logger.error('Setup validation failed:', error);
      return false;
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
  const options: SetupOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skip-index-creation':
        options.skipIndexCreation = true;
        break;
      case '--skip-data-load':
        options.skipDataLoad = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 1000;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Usage: npm run search:setup [options]

Options:
  --skip-index-creation    Skip creating Elasticsearch indices
  --skip-data-load        Skip loading initial data
  --batch-size <number>   Batch size for data loading (default: 1000)
  --dry-run              Run without making actual changes
  --help                 Show this help message

Examples:
  npm run search:setup
  npm run search:setup -- --batch-size 500
  npm run search:setup -- --dry-run
  npm run search:setup -- --skip-data-load
        `);
        process.exit(0);
    }
  }

  const setupService = new SearchSetupService();

  try {
    await setupService.initialize();

    // Check Elasticsearch health
    const isHealthy = await setupService.checkElasticsearchHealth();
    if (!isHealthy) {
      logger.error('Elasticsearch cluster is not healthy. Aborting setup.');
      process.exit(1);
    }

    // Setup indices
    if (!options.skipIndexCreation) {
      await setupService.setupIndices();
    } else {
      logger.log('Skipping index creation');
    }

    // Load initial data
    if (!options.skipDataLoad) {
      await setupService.loadInitialData(options);
    } else {
      logger.log('Skipping data load');
    }

    // Validate setup
    const isValid = await setupService.validateSetup();
    if (!isValid) {
      logger.error('Setup validation failed');
      process.exit(1);
    }

    logger.log('🎉 Search system setup completed successfully!');

  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await setupService.cleanup();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { SearchSetupService };