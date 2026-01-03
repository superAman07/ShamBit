import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchIndexService } from '../search-index.service';

@Injectable()
export class SearchEventHandler {
  private readonly logger = new Logger(SearchEventHandler.name);

  constructor(private readonly searchIndexService: SearchIndexService) {}

  @OnEvent('product.created')
  async handleProductCreated(payload: { productId: string }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(`Indexed new product: ${payload.productId}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${payload.productId}`, error);
    }
  }

  @OnEvent('product.updated')
  async handleProductUpdated(payload: { productId: string }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(`Reindexed updated product: ${payload.productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to reindex product ${payload.productId}`,
        error,
      );
    }
  }

  @OnEvent('product.deleted')
  async handleProductDeleted(payload: { productId: string }) {
    try {
      await this.searchIndexService.removeEntity('product', payload.productId);
      this.logger.debug(`Removed product from index: ${payload.productId}`);
    } catch (error) {
      this.logger.error(`Failed to remove product ${payload.productId}`, error);
    }
  }

  @OnEvent('product.status.changed')
  async handleProductStatusChanged(payload: {
    productId: string;
    status: string;
  }) {
    try {
      if (payload.status === 'ACTIVE') {
        await this.searchIndexService.indexEntity('product', payload.productId);
      } else {
        await this.searchIndexService.removeEntity(
          'product',
          payload.productId,
        );
      }
      this.logger.debug(
        `Updated product index for status change: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle status change for product ${payload.productId}`,
        error,
      );
    }
  }

  @OnEvent('variant.created')
  async handleVariantCreated(payload: {
    variantId: string;
    productId: string;
  }) {
    try {
      // Reindex the parent product when variant is added
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(
        `Reindexed product for new variant: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex product for variant ${payload.variantId}`,
        error,
      );
    }
  }

  @OnEvent('variant.updated')
  async handleVariantUpdated(payload: {
    variantId: string;
    productId: string;
  }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(
        `Reindexed product for variant update: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex product for variant ${payload.variantId}`,
        error,
      );
    }
  }

  @OnEvent('variant.deleted')
  async handleVariantDeleted(payload: {
    variantId: string;
    productId: string;
  }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(
        `Reindexed product for variant deletion: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex product for deleted variant ${payload.variantId}`,
        error,
      );
    }
  }

  @OnEvent('pricing.updated')
  async handlePricingUpdated(payload: {
    variantId: string;
    productId: string;
  }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(
        `Reindexed product for pricing update: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex product for pricing update ${payload.variantId}`,
        error,
      );
    }
  }

  @OnEvent('inventory.updated')
  async handleInventoryUpdated(payload: {
    variantId: string;
    productId: string;
  }) {
    try {
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(
        `Reindexed product for inventory update: ${payload.productId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex product for inventory update ${payload.variantId}`,
        error,
      );
    }
  }

  @OnEvent('category.updated')
  async handleCategoryUpdated(payload: { categoryId: string }) {
    try {
      await this.searchIndexService.indexEntity('category', payload.categoryId);
      this.logger.debug(
        `Reindexed products for category update: ${payload.categoryId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reindex category ${payload.categoryId}`,
        error,
      );
    }
  }

  @OnEvent('brand.updated')
  async handleBrandUpdated(payload: { brandId: string }) {
    try {
      await this.searchIndexService.indexEntity('brand', payload.brandId);
      this.logger.debug(
        `Reindexed products for brand update: ${payload.brandId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to reindex brand ${payload.brandId}`, error);
    }
  }

  @OnEvent('seller.updated')
  async handleSellerUpdated(payload: { sellerId: string }) {
    try {
      // Reindex all products from this seller
      // This is a heavy operation, consider queuing it
      this.logger.debug(
        `Seller updated, should reindex products: ${payload.sellerId}`,
      );
      // TODO: Implement bulk reindex for seller products
    } catch (error) {
      this.logger.error(
        `Failed to handle seller update ${payload.sellerId}`,
        error,
      );
    }
  }

  @OnEvent('review.created')
  async handleReviewCreated(payload: { productId: string; rating: number }) {
    try {
      // Update product popularity metrics
      await this.searchIndexService.indexEntity('product', payload.productId);
      this.logger.debug(`Updated product for new review: ${payload.productId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update product for review ${payload.productId}`,
        error,
      );
    }
  }

  @OnEvent('order.completed')
  async handleOrderCompleted(payload: { productIds: string[] }) {
    try {
      // Update popularity metrics for ordered products
      for (const productId of payload.productIds) {
        await this.searchIndexService.indexEntity('product', productId);
      }
      this.logger.debug(
        `Updated products for completed order: ${payload.productIds.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update products for order completion`,
        error,
      );
    }
  }
}
