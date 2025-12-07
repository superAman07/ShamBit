import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';
import {
  ProductOffer,
  CreateProductOfferDto,
  UpdateProductOfferDto,
  ProductOfferListQuery,
  ProductOfferValidationResult,
  ProductOfferStats,
  BulkProductOfferOperation,
  ProductOfferPerformance,
} from '../types/product-offer.types';

const logger = createLogger('product-offer-service');

export class ProductOfferService {
  private get db() {
    return getDatabase();
  }

  /**
   * Map database row to ProductOffer object
   */
  private mapToProductOffer(row: any): ProductOffer {
    const offer: ProductOffer = {
      id: row.id,
      productId: row.product_id,
      offerTitle: row.offer_title,
      offerDescription: row.offer_description,
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      bannerUrl: row.banner_url,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      
      // Banner-specific fields
      actionType: row.action_type,
      actionValue: row.action_value,
      mobileImageUrl: row.mobile_image_url,
      displayOrder: row.display_order,
      bannerType: row.banner_type,
      backgroundColor: row.background_color,
      textColor: row.text_color,
    };

    // Add product info if available
    if (row.product_name) {
      offer.product = {
        id: row.product_id,
        name: row.product_name,
        sku: row.product_sku,
        sellingPrice: parseFloat(row.product_selling_price),
      };
    }

    // Add computed fields
    const now = new Date();
    offer.isCurrentlyActive = offer.isActive && 
      offer.startDate <= now && 
      offer.endDate >= now;

    if (offer.endDate > now) {
      offer.daysRemaining = Math.ceil((offer.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      offer.daysRemaining = 0;
    }

    // Calculate final price if product info is available
    if (offer.product) {
      offer.finalPrice = this.calculateFinalPrice(offer.product.sellingPrice, offer);
    }

    return offer;
  }

  /**
   * Calculate final price after applying offer
   */
  private calculateFinalPrice(originalPrice: number, offer: ProductOffer): number {
    if (!offer.isCurrentlyActive) {
      return originalPrice;
    }

    let discountAmount = 0;
    if (offer.discountType === 'Percentage') {
      discountAmount = (originalPrice * offer.discountValue) / 100;
    } else {
      discountAmount = offer.discountValue;
    }

    const finalPrice = originalPrice - discountAmount;
    return Math.max(0, finalPrice); // Ensure price doesn't go negative
  }

  /**
   * Validate offer data
   */
  private validateOfferData(data: CreateProductOfferDto | UpdateProductOfferDto, existingDiscountType?: string): void {
    // Validate discount value
    if (data.discountValue !== undefined) {
      const discountType = 'discountType' in data ? data.discountType : existingDiscountType;
      
      if (discountType === 'Percentage') {
        if (data.discountValue < 0 || data.discountValue > 100) {
          throw new AppError(
            'Percentage discount must be between 0 and 100',
            400,
            'INVALID_DISCOUNT_VALUE'
          );
        }
      } else if (data.discountValue < 0) {
        throw new AppError(
          'Fixed discount amount must be positive',
          400,
          'INVALID_DISCOUNT_VALUE'
        );
      }
    }

    // Validate dates
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new AppError(
          'End date must be after start date',
          400,
          'INVALID_DATE_RANGE'
        );
      }
    }
  }

  /**
   * Create a new product offer or banner
   */
  async createProductOffer(data: CreateProductOfferDto): Promise<ProductOffer> {
    this.validateOfferData(data);

    // Check if product exists (only if productId is provided)
    if (data.productId) {
      const product = await this.db('products')
        .where('id', data.productId)
        .first();

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Check for overlapping active offers (only for product-specific offers)
      const overlappingOffers = await this.db('product_offers')
        .where('product_id', data.productId)
        .where('is_active', true)
        .where(function() {
          this.where(function() {
            this.where('start_date', '<=', data.startDate)
              .andWhere('end_date', '>=', data.startDate);
          }).orWhere(function() {
            this.where('start_date', '<=', data.endDate)
              .andWhere('end_date', '>=', data.endDate);
          }).orWhere(function() {
            this.where('start_date', '>=', data.startDate)
              .andWhere('end_date', '<=', data.endDate);
          });
        });

      if (overlappingOffers.length > 0) {
        throw new AppError(
          'Product already has an active offer during this time period',
          409,
          'OVERLAPPING_OFFER'
        );
      }
    }

    const [offer] = await this.db('product_offers')
      .insert({
        product_id: data.productId || null,
        offer_title: data.offerTitle,
        offer_description: data.offerDescription,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        start_date: data.startDate,
        end_date: data.endDate,
        banner_url: data.bannerUrl,
        is_active: data.isActive ?? true,
        // Banner-specific fields
        action_type: data.actionType || 'product',
        action_value: data.actionValue,
        mobile_image_url: data.mobileImageUrl,
        display_order: data.displayOrder ?? 0,
        banner_type: data.bannerType || 'promotional',
        background_color: data.backgroundColor,
        text_color: data.textColor,
      })
      .returning('*');

    logger.info('Product offer/banner created', { 
      offerId: offer.id, 
      productId: data.productId,
      offerTitle: data.offerTitle,
      bannerType: data.bannerType 
    });

    return this.mapToProductOffer(offer);
  }

  /**
   * Get all product offers with optional filtering
   */
  async getProductOffers(query: ProductOfferListQuery = {}): Promise<{
    offers: ProductOffer[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalItems: number;
    };
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let queryBuilder = this.db('product_offers as po')
      .leftJoin('products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        'p.selling_price as product_selling_price'
      );

    // Apply filters
    if (query.productId) {
      queryBuilder = queryBuilder.where('po.product_id', query.productId);
    }

    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.where('po.is_active', query.isActive);
    }

    if (query.discountType) {
      queryBuilder = queryBuilder.where('po.discount_type', query.discountType);
    }

    // Filter out expired offers unless explicitly requested
    if (!query.includeExpired) {
      queryBuilder = queryBuilder.where('po.end_date', '>=', new Date());
    }

    // Get total count
    const [{ count }] = await queryBuilder.clone()
      .clearSelect()
      .count('po.id as count');
    const totalItems = parseInt(count as string, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated results
    const offers = await queryBuilder
      .orderBy('po.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      offers: offers.map(this.mapToProductOffer.bind(this)),
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };
  }

  /**
   * Get a single product offer by ID
   */
  async getProductOfferById(id: string): Promise<ProductOffer> {
    const offer = await this.db('product_offers as po')
      .leftJoin('products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        'p.selling_price as product_selling_price'
      )
      .where('po.id', id)
      .first();

    if (!offer) {
      throw new AppError('Product offer not found', 404, 'OFFER_NOT_FOUND');
    }

    return this.mapToProductOffer(offer);
  }

  /**
   * Get active offers for a specific product
   */
  async getActiveOffersForProduct(productId: string): Promise<ProductOffer[]> {
    const now = new Date();
    const offers = await this.db('product_offers as po')
      .leftJoin('products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        'p.selling_price as product_selling_price'
      )
      .where('po.product_id', productId)
      .where('po.is_active', true)
      .where('po.start_date', '<=', now)
      .where('po.end_date', '>=', now)
      .orderBy('po.discount_value', 'desc'); // Best offers first

    return offers.map(this.mapToProductOffer.bind(this));
  }

  /**
   * Update a product offer
   */
  async updateProductOffer(id: string, data: UpdateProductOfferDto): Promise<ProductOffer> {
    const existingOffer = await this.db('product_offers').where('id', id).first();

    if (!existingOffer) {
      throw new AppError('Product offer not found', 404, 'OFFER_NOT_FOUND');
    }

    this.validateOfferData(data, existingOffer.discount_type);

    // Check for overlapping offers if dates are being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || existingOffer.start_date;
      const endDate = data.endDate || existingOffer.end_date;

      const overlappingOffers = await this.db('product_offers')
        .where('product_id', existingOffer.product_id)
        .where('is_active', true)
        .where('id', '!=', id)
        .where(function() {
          this.where(function() {
            this.where('start_date', '<=', startDate)
              .andWhere('end_date', '>=', startDate);
          }).orWhere(function() {
            this.where('start_date', '<=', endDate)
              .andWhere('end_date', '>=', endDate);
          }).orWhere(function() {
            this.where('start_date', '>=', startDate)
              .andWhere('end_date', '<=', endDate);
          });
        });

      if (overlappingOffers.length > 0) {
        throw new AppError(
          'Product already has an active offer during this time period',
          409,
          'OVERLAPPING_OFFER'
        );
      }
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.offerTitle !== undefined) updateData.offer_title = data.offerTitle;
    if (data.offerDescription !== undefined) updateData.offer_description = data.offerDescription;
    if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.bannerUrl !== undefined) updateData.banner_url = data.bannerUrl;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    
    // Banner-specific fields
    if (data.actionType !== undefined) updateData.action_type = data.actionType;
    if (data.actionValue !== undefined) updateData.action_value = data.actionValue;
    if (data.mobileImageUrl !== undefined) updateData.mobile_image_url = data.mobileImageUrl;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.bannerType !== undefined) updateData.banner_type = data.bannerType;
    if (data.backgroundColor !== undefined) updateData.background_color = data.backgroundColor;
    if (data.textColor !== undefined) updateData.text_color = data.textColor;

    const [updatedOffer] = await this.db('product_offers')
      .where('id', id)
      .update(updateData)
      .returning('*');

    logger.info('Product offer/banner updated', { 
      offerId: id,
      bannerType: data.bannerType 
    });

    return this.mapToProductOffer(updatedOffer);
  }

  /**
   * Delete a product offer
   */
  async deleteProductOffer(id: string): Promise<void> {
    const offer = await this.db('product_offers').where('id', id).first();

    if (!offer) {
      throw new AppError('Product offer not found', 404, 'OFFER_NOT_FOUND');
    }

    await this.db('product_offers').where('id', id).delete();

    logger.info('Product offer deleted', { offerId: id });
  }

  /**
   * Activate/Deactivate a product offer
   */
  async toggleOfferStatus(id: string, isActive: boolean): Promise<ProductOffer> {
    const offer = await this.db('product_offers').where('id', id).first();

    if (!offer) {
      throw new AppError('Product offer not found', 404, 'OFFER_NOT_FOUND');
    }

    const [updatedOffer] = await this.db('product_offers')
      .where('id', id)
      .update({
        is_active: isActive,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    logger.info('Product offer status toggled', { 
      offerId: id, 
      isActive,
      action: isActive ? 'activated' : 'deactivated'
    });

    return this.mapToProductOffer(updatedOffer);
  }

  /**
   * Validate a product offer for a specific product
   */
  async validateProductOffer(productId: string, offerId?: string): Promise<ProductOfferValidationResult> {
    try {
      let offer: any;

      if (offerId) {
        // Validate specific offer
        offer = await this.db('product_offers as po')
          .leftJoin('products as p', 'po.product_id', 'p.id')
          .select(
            'po.*',
            'p.name as product_name',
            'p.sku as product_sku',
            'p.selling_price as product_selling_price'
          )
          .where('po.id', offerId)
          .where('po.product_id', productId)
          .first();
      } else {
        // Get best active offer for product
        const now = new Date();
        offer = await this.db('product_offers as po')
          .leftJoin('products as p', 'po.product_id', 'p.id')
          .select(
            'po.*',
            'p.name as product_name',
            'p.sku as product_sku',
            'p.selling_price as product_selling_price'
          )
          .where('po.product_id', productId)
          .where('po.is_active', true)
          .where('po.start_date', '<=', now)
          .where('po.end_date', '>=', now)
          .orderBy('po.discount_value', 'desc')
          .first();
      }

      if (!offer) {
        return {
          isValid: false,
          error: 'No valid offer found for this product',
          errorCode: 'NO_VALID_OFFER',
        };
      }

      const mappedOffer = this.mapToProductOffer(offer);

      if (!mappedOffer.isCurrentlyActive) {
        return {
          isValid: false,
          error: 'Offer is not currently active',
          errorCode: 'OFFER_NOT_ACTIVE',
        };
      }

      const originalPrice = offer.product_selling_price;
      const finalPrice = this.calculateFinalPrice(originalPrice, mappedOffer);
      const discountAmount = originalPrice - finalPrice;

      return {
        isValid: true,
        offer: mappedOffer,
        discountAmount,
        finalPrice,
      };
    } catch (error) {
      logger.error('Error validating product offer', { error, productId, offerId });
      throw new AppError(
        'Error validating product offer',
        500,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Create bulk product offers
   */
  async createBulkProductOffers(operation: BulkProductOfferOperation): Promise<ProductOffer[]> {
    this.validateOfferData(operation.offerData);

    // Validate all products exist
    const products = await this.db('products')
      .whereIn('id', operation.productIds)
      .select('id', 'name');

    if (products.length !== operation.productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = operation.productIds.filter(id => !foundIds.includes(id));
      throw new AppError(
        `Products not found: ${missingIds.join(', ')}`,
        404,
        'PRODUCTS_NOT_FOUND'
      );
    }

    const createdOffers: ProductOffer[] = [];

    // Create offers for each product
    for (const productId of operation.productIds) {
      try {
        const offer = await this.createProductOffer({
          ...operation.offerData,
          productId,
        });
        createdOffers.push(offer);
      } catch (error) {
        logger.warn('Failed to create offer for product', { 
          productId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        // Continue with other products
      }
    }

    logger.info('Bulk product offers created', { 
      totalRequested: operation.productIds.length,
      totalCreated: createdOffers.length 
    });

    return createdOffers;
  }

  /**
   * Get expiring offers (ending within specified days)
   */
  async getExpiringOffers(daysAhead: number = 7): Promise<ProductOffer[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const offers = await this.db('product_offers as po')
      .leftJoin('products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        'p.selling_price as product_selling_price'
      )
      .where('po.is_active', true)
      .where('po.end_date', '>=', now)
      .where('po.end_date', '<=', futureDate)
      .orderBy('po.end_date', 'asc');

    return offers.map(this.mapToProductOffer.bind(this));
  }

  /**
   * Get active banners for customer app
   * @param bannerType Optional filter by banner type
   */
  async getActiveBanners(bannerType?: string): Promise<ProductOffer[]> {
    const now = new Date();
    
    let query = this.db('product_offers as po')
      .leftJoin('products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        'p.selling_price as product_selling_price'
      )
      .where('po.is_active', true)
      .where('po.start_date', '<=', now)
      .where('po.end_date', '>=', now);
    
    if (bannerType) {
      query = query.where('po.banner_type', bannerType);
    }
    
    const banners = await query
      .orderBy('po.display_order', 'asc')
      .orderBy('po.created_at', 'desc');
    
    logger.info('Fetched active banners', { 
      count: banners.length, 
      bannerType 
    });
    
    return banners.map(this.mapToProductOffer.bind(this));
  }

  /**
   * Get hero banners for home screen carousel
   */
  async getHeroBanners(): Promise<ProductOffer[]> {
    return this.getActiveBanners('hero');
  }

  /**
   * Get promotional banners
   */
  async getPromotionalBanners(): Promise<ProductOffer[]> {
    return this.getActiveBanners('promotional');
  }

  /**
   * Get category banners
   */
  async getCategoryBanners(): Promise<ProductOffer[]> {
    return this.getActiveBanners('category');
  }
}

export const productOfferService = new ProductOfferService();