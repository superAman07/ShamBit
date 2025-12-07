import { getDatabase } from '@shambit/database';
import { AppError, createLogger, NotFoundError, ConflictError } from '@shambit/shared';
import {
  Product,
  ProductImage,
  ProductAttribute,
  CreateProductDto,
  UpdateProductDto,
  CreateProductImageDto,
  UpdateProductImageDto,
  CreateProductAttributeDto,
  UpdateProductAttributeDto,
  ProductListQuery,
  ProductListResponse,
} from '../types/product.types';
import { 
  createNotFoundError, 
  createConflictError, 
  validateRequiredFields,
  validateStringLength,
  validateNumericRange,
  asyncErrorHandler,
  logErrorWithContext
} from '../utils/errorHelpers';
import { ErrorCodes } from '../utils/errorCodes';

const logger = createLogger('product-service');

export class ProductService {
  private get db() {
    return getDatabase();
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    try {
      // Validate required fields (categoryId is optional)
      validateRequiredFields(data, ['name']);
      
      // Validate field lengths
      validateStringLength('name', data.name, 1, 255);
      if (data.description) {
        validateStringLength('description', data.description, 0, 1000);
      }
      
      // Validate numeric fields - these are required
      if (!data.mrp || data.mrp <= 0) {
        throw new AppError('MRP is required and must be greater than 0', 400, 'VALIDATION_ERROR');
      }
      if (!data.sellingPrice || data.sellingPrice <= 0) {
        throw new AppError('Selling price is required and must be greater than 0', 400, 'VALIDATION_ERROR');
      }
      
      validateNumericRange('mrp', data.mrp, 0);
      validateNumericRange('sellingPrice', data.sellingPrice, 0);

      // Validate category exists if provided
      if (data.categoryId) {
        const category = await this.db('categories')
          .where('id', data.categoryId)
          .where('is_active', true)
          .first();

        if (!category) {
          throw createNotFoundError('Category', data.categoryId, ErrorCodes.CATEGORY_NOT_FOUND);
        }
      }

      // Validate brand exists if provided
      if (data.brandId) {
        const brand = await this.db('brands')
          .where('id', data.brandId)
          .where('is_active', true)
          .first();

        if (!brand) {
          throw createNotFoundError('Brand', data.brandId, ErrorCodes.BRAND_NOT_FOUND);
        }
      }

      // Generate slug from name if not provided
      const slug = this.generateSlug(data.name);
      
      // Generate SKU if not provided
      const sku = data.sku || this.generateSKU(data.name);
      
      // Validate SKU uniqueness
      if (sku) {
        const existingProduct = await this.db('products')
          .where('sku', sku)
          .first();
        
        if (existingProduct) {
          throw createConflictError('Product', 'SKU', sku, ErrorCodes.DUPLICATE_SKU);
        }
      }
      
      // Validate barcode uniqueness if provided
      if (data.barcode) {
        const existingProduct = await this.db('products')
          .where('barcode', data.barcode)
          .first();
        
        if (existingProduct) {
          throw createConflictError('Product', 'barcode', data.barcode, ErrorCodes.DUPLICATE_BARCODE);
        }
      }

      // Calculate price in paise for legacy compatibility
      const priceInPaise = data.price || Math.round(data.sellingPrice * 100);
      if (isNaN(priceInPaise) || priceInPaise <= 0) {
        throw new AppError('Invalid price calculation', 400, 'VALIDATION_ERROR');
      }

      logger.info('Creating product in database', { 
        name: data.name, 
        categoryId: data.categoryId, 
        sellingPrice: data.sellingPrice, 
        mrp: data.mrp 
      });

      const [product] = await this.db('products')
      .insert({
        category_id: data.categoryId,
        brand_id: data.brandId,
        name: data.name,
        slug: slug,
        sku: sku,
        barcode: data.barcode,
        description: data.description,
        detailed_description: data.detailedDescription,
        brand: data.brand, // Keep legacy field for backward compatibility
        unit_size: data.unitSize,
        unit_type: data.unitType,
        price: priceInPaise,
        mrp: data.mrp,
        selling_price: data.sellingPrice,
        tax_percent: data.taxPercent ?? 0,
        discount_percent: data.discountPercent ?? 0,
        weight: data.weight,
        dimensions: data.dimensions,
        storage_info: data.storageInfo,
        ingredients: data.ingredients,
        nutrition_info: data.nutritionInfo,
        shelf_life_days: data.shelfLifeDays,
        search_keywords: data.searchKeywords,
        tags: data.tags,
        is_featured: data.isFeatured ?? false,
        is_returnable: data.isReturnable ?? true,
        is_sellable: data.isSellable ?? true,
        image_urls: data.imageUrls ?? [],
        is_active: data.isActive ?? true,
      })
      .returning('*');

      logger.info('Product created successfully in database', { 
        productId: product.id, 
        name: product.name,
        isActive: product.is_active,
        isSellable: product.is_sellable
      });

      // Log product creation event
      logger.info('Product created', {
        event: 'product_created',
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categoryId: data.categoryId,
        brandId: data.brandId,
        sellingPrice: data.sellingPrice,
        mrp: data.mrp,
        isActive: product.is_active,
      });

      return this.mapToProduct(product);
    } catch (error) {
      logErrorWithContext(error as Error, { operation: 'createProduct', data });
      throw error;
    }
  }

  /**
   * Get all products with filtering and pagination
   */
  async getProducts(query: ProductListQuery = {}): Promise<ProductListResponse> {
    logger.info('Getting products with query', { query });

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100); // Limit max page size to 100
    const offset = (page - 1) * pageSize;

    let queryBuilder = this.db('products');
    let hasAttributeFilter = false;

    // Filter by active status
    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.where('products.is_active', query.isActive);
    }

    // Filter by featured status
    if (query.isFeatured !== undefined) {
      queryBuilder = queryBuilder.where('products.is_featured', query.isFeatured);
    }

    // Filter by sellable status
    if (query.isSellable !== undefined) {
      queryBuilder = queryBuilder.where('products.is_sellable', query.isSellable);
    }

    // Filter by category
    if (query.categoryId) {
      queryBuilder = queryBuilder.where('products.category_id', query.categoryId);
    }

    // Filter by brand ID
    if (query.brandId) {
      queryBuilder = queryBuilder.where('products.brand_id', query.brandId);
    }

    // Filter by brand name (legacy support - case-insensitive)
    if (query.brand) {
      queryBuilder = queryBuilder.whereRaw('LOWER(products.brand) = LOWER(?)', [query.brand]);
    }

    // Filter by SKU
    if (query.sku) {
      queryBuilder = queryBuilder.where('products.sku', query.sku);
    }

    // Filter by barcode
    if (query.barcode) {
      queryBuilder = queryBuilder.where('products.barcode', query.barcode);
    }

    // Filter by tags
    if (query.tags) {
      queryBuilder = queryBuilder.whereRaw('products.tags ILIKE ?', [`%${query.tags}%`]);
    }

    // Filter by price range (using selling_price)
    if (query.minPrice !== undefined) {
      queryBuilder = queryBuilder.where('products.selling_price', '>=', query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      queryBuilder = queryBuilder.where('products.selling_price', '<=', query.maxPrice);
    }

    // Filter by attributes
    if (query.attributes && Object.keys(query.attributes).length > 0) {
      hasAttributeFilter = true;
      queryBuilder = queryBuilder
        .join('product_attributes', 'products.id', 'product_attributes.product_id');
      
      // Add WHERE conditions for each attribute
      Object.entries(query.attributes).forEach(([name, value]) => {
        queryBuilder = queryBuilder.where(function() {
          this.where('product_attributes.attribute_name', name)
              .where('product_attributes.attribute_value', value);
        });
      });
    }

    // Enhanced full-text search using PostgreSQL with better performance
    if (query.search) {
      const searchTerm = query.search.trim();
      
      if (searchTerm.length >= 2) {
        // Use simpler ILIKE search for better performance on smaller datasets
        // and fallback to full-text search for complex queries
        if (searchTerm.length <= 10 && !/\s/.test(searchTerm)) {
          // Simple search for short single words
          queryBuilder = queryBuilder.where(function() {
            this.whereILike('products.name', `%${searchTerm}%`)
                .orWhereILike('products.sku', `%${searchTerm}%`)
                .orWhereILike('products.barcode', `%${searchTerm}%`)
                .orWhereILike('products.brand', `%${searchTerm}%`)
          });
        } else {
          // Full-text search for complex queries
          queryBuilder = queryBuilder.whereRaw(`
            to_tsvector('english', 
              products.name || ' ' || 
              COALESCE(products.description, '') || ' ' || 
              COALESCE(products.brand, '') || ' ' ||
              COALESCE(products.search_keywords, '') || ' ' ||
              COALESCE(products.sku, '') || ' ' ||
              COALESCE(products.barcode, '')
            ) @@ plainto_tsquery('english', ?)
          `, [searchTerm]);
        }
      }
    }

    // Get total count (before adding order by and pagination)
    const [{ count }] = await queryBuilder.clone().count('* as count');
    const totalItems = parseInt(count as string, 10);
    const totalPages = Math.ceil(totalItems / pageSize);
    
    logger.info('Product query count result', { totalItems, totalPages, page, pageSize });

    // Always join categories, brands, and inventory for list view - users need to see this info
    let selectQuery = queryBuilder
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .leftJoin('categories as parent_categories', 'categories.parent_id', 'parent_categories.id')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('inventory', 'products.id', 'inventory.product_id');
    
    // Select essential fields for list view including category hierarchy and inventory
    const baseFields = [
      'products.id',
      'products.name',
      'products.sku',
      'products.barcode',
      'products.brand',
      'products.selling_price',
      'products.mrp',
      'products.is_featured',
      'products.is_active',
      'products.is_sellable',
      'products.image_urls',
      'products.category_id',
      'products.brand_id'
    ];
    
    const brandFields = [
      'brands.name as brand_name'
    ];
    
    const categoryFields = [
      'categories.name as category_name',
      'categories.slug as category_slug',
      'categories.parent_id as category_parent_id',
      'parent_categories.name as parent_category_name'
    ];
    
    const inventoryFields = [
      'inventory.available_stock'
    ];
    
    if (hasAttributeFilter) {
      selectQuery = selectQuery.distinct(...baseFields, ...brandFields, ...categoryFields, ...inventoryFields);
    } else {
      selectQuery = selectQuery.select(...baseFields, ...brandFields, ...categoryFields, ...inventoryFields);
    }
    
    const products = await selectQuery
      .orderBy('products.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    logger.info('Product query result', { 
      foundProducts: products.length, 
      totalItems, 
      page, 
      pageSize,
      firstProduct: products[0] ? { id: products[0].id, name: products[0].name, isActive: products[0].is_active } : null
    });

    const result: ProductListResponse = {
      products: products.map(this.mapToProduct),
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };

    return result;
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const product = await this.db('products')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .leftJoin('inventory', 'products.id', 'inventory.product_id')
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo_url',
        'brands.country as brand_country',
        'categories.name as category_name',
        'categories.slug as category_slug',
        'categories.description as category_description',
        'inventory.available_stock'
      )
      .where('products.id', id)
      .first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const mappedProduct = this.mapToProduct(product);

    // Load product images
    const images = await this.db('product_images')
      .where('product_id', id)
      .orderBy('display_order', 'asc')
      .select('*');

    mappedProduct.images = images.map(this.mapToProductImage);

    // Load product attributes
    const attributes = await this.db('product_attributes')
      .where('product_id', id)
      .orderBy('attribute_name', 'asc')
      .select('*');

    mappedProduct.attributes = attributes.map(this.mapToProductAttribute);

    // Load active product offers
    const now = new Date();
    const offers = await this.db('product_offers')
      .where('product_id', id)
      .where('is_active', true)
      .where('start_date', '<=', now)
      .where('end_date', '>=', now)
      .orderBy('discount_value', 'desc')
      .select('*');

    if (offers.length > 0) {
      mappedProduct.activeOffers = offers.map(offer => ({
        id: offer.id,
        offerTitle: offer.offer_title,
        offerDescription: offer.offer_description,
        discountType: offer.discount_type,
        discountValue: parseFloat(offer.discount_value),
        startDate: new Date(offer.start_date),
        endDate: new Date(offer.end_date),
        bannerUrl: offer.banner_url,
      }));

      // Calculate final price with best offer
      const bestOffer = offers[0];
      if (bestOffer.discount_type === 'Percentage') {
        const discountAmount = (mappedProduct.sellingPrice * parseFloat(bestOffer.discount_value)) / 100;
        mappedProduct.finalPrice = mappedProduct.sellingPrice - discountAmount;
      } else {
        mappedProduct.finalPrice = mappedProduct.sellingPrice - parseFloat(bestOffer.discount_value);
      }
      mappedProduct.finalPrice = Math.max(0, mappedProduct.finalPrice);
    } else {
      mappedProduct.activeOffers = [];
      mappedProduct.finalPrice = mappedProduct.sellingPrice;
    }

    return mappedProduct;
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const product = await this.db('products').where('id', id).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validate category exists if provided
    if (data.categoryId) {
      const category = await this.db('categories')
        .where('id', data.categoryId)
        .first();

      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }
    }

    // Validate brand exists if provided
    if (data.brandId) {
      const brand = await this.db('brands')
        .where('id', data.brandId)
        .first();

      if (!brand) {
        throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
      }
    }

    // Validate SKU uniqueness if being updated
    if (data.sku && data.sku !== product.sku) {
      const existingProduct = await this.db('products')
        .where('sku', data.sku)
        .whereNot('id', id)
        .first();
      
      if (existingProduct) {
        throw new AppError('SKU already exists', 400, 'DUPLICATE_SKU');
      }
    }
    
    // Validate barcode uniqueness if being updated
    if (data.barcode && data.barcode !== product.barcode) {
      const existingProduct = await this.db('products')
        .where('barcode', data.barcode)
        .whereNot('id', id)
        .first();
      
      if (existingProduct) {
        throw new AppError('Barcode already exists', 400, 'DUPLICATE_BARCODE');
      }
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.brandId !== undefined) updateData.brand_id = data.brandId;
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = this.generateSlug(data.name);
    }
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.detailedDescription !== undefined) updateData.detailed_description = data.detailedDescription;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.unitSize !== undefined) updateData.unit_size = data.unitSize;
    if (data.unitType !== undefined) updateData.unit_type = data.unitType;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.mrp !== undefined) updateData.mrp = data.mrp;
    if (data.sellingPrice !== undefined) {
      updateData.selling_price = data.sellingPrice;
      // Update legacy price field for backward compatibility
      updateData.price = Math.round(data.sellingPrice * 100);
    }
    if (data.taxPercent !== undefined) updateData.tax_percent = data.taxPercent;
    if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    if (data.storageInfo !== undefined) updateData.storage_info = data.storageInfo;
    if (data.ingredients !== undefined) updateData.ingredients = data.ingredients;
    if (data.nutritionInfo !== undefined) updateData.nutrition_info = data.nutritionInfo;
    if (data.shelfLifeDays !== undefined) updateData.shelf_life_days = data.shelfLifeDays;
    if (data.searchKeywords !== undefined) updateData.search_keywords = data.searchKeywords;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.isReturnable !== undefined) updateData.is_returnable = data.isReturnable;
    if (data.isSellable !== undefined) updateData.is_sellable = data.isSellable;
    if (data.imageUrls !== undefined) updateData.image_urls = data.imageUrls;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [updatedProduct] = await this.db('products')
      .where('id', id)
      .update(updateData)
      .returning('*');

    // Log product update event
    logger.info('Product updated', {
      event: 'product_updated',
      productId: id,
      productName: updatedProduct.name,
      changes: Object.keys(updateData).filter(key => key !== 'updated_at'),
      isActive: updatedProduct.is_active,
    });

    return this.mapToProduct(updatedProduct);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await this.db('products').where('id', id).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    await this.db('products').where('id', id).delete();

    // Log product deletion event
    logger.info('Product deleted', {
      event: 'product_deleted',
      productId: id,
      productName: product.name,
      sku: product.sku,
    });
  }

  /**
   * Add images to a product (legacy method - adds to image_urls array)
   */
  async addProductImages(id: string, imageUrls: string[]): Promise<Product> {
    const product = await this.db('products').where('id', id).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const currentImages = product.image_urls || [];
    const updatedImages = [...currentImages, ...imageUrls];

    const [updatedProduct] = await this.db('products')
      .where('id', id)
      .update({
        image_urls: updatedImages,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return this.mapToProduct(updatedProduct);
  }

  /**
   * Create a new product image
   */
  async createProductImage(productId: string, data: CreateProductImageDto): Promise<ProductImage> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // If this is set as primary, unset other primary images
    if (data.isPrimary) {
      await this.db('product_images')
        .where('product_id', productId)
        .update({ is_primary: false });
    }

    // Get the next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.db('product_images')
        .where('product_id', productId)
        .max('display_order as max_order')
        .first();
      
      displayOrder = (maxOrder?.max_order || -1) + 1;
    }

    const [image] = await this.db('product_images')
      .insert({
        product_id: productId,
        image_url: data.imageUrl,
        alt_text: data.altText,
        display_order: displayOrder,
        is_primary: data.isPrimary || false,
      })
      .returning('*');

    // Update legacy image_urls array
    await this.updateLegacyImageUrls(productId);

    return this.mapToProductImage(image);
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const images = await this.db('product_images')
      .where('product_id', productId)
      .orderBy('display_order', 'asc')
      .select('*');

    return images.map(this.mapToProductImage);
  }

  /**
   * Update a product image
   */
  async updateProductImage(productId: string, imageId: string, data: UpdateProductImageDto): Promise<ProductImage> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const image = await this.db('product_images')
      .where('id', imageId)
      .where('product_id', productId)
      .first();

    if (!image) {
      throw new AppError('Product image not found', 404, 'IMAGE_NOT_FOUND');
    }

    // If this is set as primary, unset other primary images
    if (data.isPrimary) {
      await this.db('product_images')
        .where('product_id', productId)
        .whereNot('id', imageId)
        .update({ is_primary: false });
    }

    const updateData: any = {};
    if (data.altText !== undefined) updateData.alt_text = data.altText;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.isPrimary !== undefined) updateData.is_primary = data.isPrimary;

    const [updatedImage] = await this.db('product_images')
      .where('id', imageId)
      .update(updateData)
      .returning('*');

    // Update legacy image_urls array
    await this.updateLegacyImageUrls(productId);

    return this.mapToProductImage(updatedImage);
  }

  /**
   * Delete a product image
   */
  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const image = await this.db('product_images')
      .where('id', imageId)
      .where('product_id', productId)
      .first();

    if (!image) {
      throw new AppError('Product image not found', 404, 'IMAGE_NOT_FOUND');
    }

    await this.db('product_images').where('id', imageId).delete();

    // Update legacy image_urls array
    await this.updateLegacyImageUrls(productId);
  }

  /**
   * Reorder product images
   */
  async reorderProductImages(productId: string, imageOrders: { id: string; displayOrder: number }[]): Promise<ProductImage[]> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Update display orders in a transaction
    await this.db.transaction(async (trx) => {
      for (const { id, displayOrder } of imageOrders) {
        await trx('product_images')
          .where('id', id)
          .where('product_id', productId)
          .update({ display_order: displayOrder });
      }
    });

    // Update legacy image_urls array
    await this.updateLegacyImageUrls(productId);

    return this.getProductImages(productId);
  }

  /**
   * Update legacy image_urls array from product_images table
   */
  private async updateLegacyImageUrls(productId: string): Promise<void> {
    const images = await this.db('product_images')
      .where('product_id', productId)
      .orderBy('display_order', 'asc')
      .select('image_url');

    const imageUrls = images.map(img => img.image_url);

    await this.db('products')
      .where('id', productId)
      .update({
        image_urls: imageUrls,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Create a new product attribute
   */
  async createProductAttribute(productId: string, data: CreateProductAttributeDto): Promise<ProductAttribute> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check if attribute already exists for this product
    const existingAttribute = await this.db('product_attributes')
      .where('product_id', productId)
      .where('attribute_name', data.attributeName)
      .first();

    if (existingAttribute) {
      throw new AppError(
        'Attribute with this name already exists for this product',
        400,
        'DUPLICATE_ATTRIBUTE'
      );
    }

    const [attribute] = await this.db('product_attributes')
      .insert({
        product_id: productId,
        attribute_name: data.attributeName,
        attribute_value: data.attributeValue,
      })
      .returning('*');

    return this.mapToProductAttribute(attribute);
  }

  /**
   * Get all attributes for a product
   */
  async getProductAttributes(productId: string): Promise<ProductAttribute[]> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const attributes = await this.db('product_attributes')
      .where('product_id', productId)
      .orderBy('attribute_name', 'asc')
      .select('*');

    return attributes.map(this.mapToProductAttribute);
  }

  /**
   * Update a product attribute
   */
  async updateProductAttribute(
    productId: string,
    attributeId: string,
    data: UpdateProductAttributeDto
  ): Promise<ProductAttribute> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const attribute = await this.db('product_attributes')
      .where('id', attributeId)
      .where('product_id', productId)
      .first();

    if (!attribute) {
      throw new AppError('Product attribute not found', 404, 'ATTRIBUTE_NOT_FOUND');
    }

    // Check for duplicate attribute name if updating name
    if (data.attributeName && data.attributeName !== attribute.attribute_name) {
      const existingAttribute = await this.db('product_attributes')
        .where('product_id', productId)
        .where('attribute_name', data.attributeName)
        .whereNot('id', attributeId)
        .first();

      if (existingAttribute) {
        throw new AppError(
          'Attribute with this name already exists for this product',
          400,
          'DUPLICATE_ATTRIBUTE'
        );
      }
    }

    const updateData: any = {};
    if (data.attributeName !== undefined) updateData.attribute_name = data.attributeName;
    if (data.attributeValue !== undefined) updateData.attribute_value = data.attributeValue;

    const [updatedAttribute] = await this.db('product_attributes')
      .where('id', attributeId)
      .update(updateData)
      .returning('*');

    return this.mapToProductAttribute(updatedAttribute);
  }

  /**
   * Delete a product attribute
   */
  async deleteProductAttribute(productId: string, attributeId: string): Promise<void> {
    const product = await this.db('products').where('id', productId).first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const attribute = await this.db('product_attributes')
      .where('id', attributeId)
      .where('product_id', productId)
      .first();

    if (!attribute) {
      throw new AppError('Product attribute not found', 404, 'ATTRIBUTE_NOT_FOUND');
    }

    await this.db('product_attributes').where('id', attributeId).delete();
  }

  /**
   * Get products by attribute
   */
  async getProductsByAttribute(attributeName: string, attributeValue?: string): Promise<Product[]> {
    let query = this.db('products')
      .join('product_attributes', 'products.id', 'product_attributes.product_id')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where('product_attributes.attribute_name', attributeName)
      .where('products.is_active', true)
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo_url',
        'brands.country as brand_country',
        'categories.name as category_name',
        'categories.slug as category_slug',
        'categories.description as category_description'
      );

    if (attributeValue) {
      query = query.where('product_attributes.attribute_value', attributeValue);
    }

    const products = await query.distinct('products.id');

    return products.map(this.mapToProduct);
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(productIds: string[], updateData: Partial<UpdateProductDto>): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    const dbUpdateData: any = {};
    
    if (updateData.isActive !== undefined) dbUpdateData.is_active = updateData.isActive;
    if (updateData.isFeatured !== undefined) dbUpdateData.is_featured = updateData.isFeatured;
    if (updateData.isSellable !== undefined) dbUpdateData.is_sellable = updateData.isSellable;
    if (updateData.isReturnable !== undefined) dbUpdateData.is_returnable = updateData.isReturnable;
    if (updateData.categoryId !== undefined) dbUpdateData.category_id = updateData.categoryId;
    if (updateData.brandId !== undefined) dbUpdateData.brand_id = updateData.brandId;
    if (updateData.taxPercent !== undefined) dbUpdateData.tax_percent = updateData.taxPercent;
    if (updateData.discountPercent !== undefined) dbUpdateData.discount_percent = updateData.discountPercent;

    if (Object.keys(dbUpdateData).length > 0) {
      dbUpdateData.updated_at = this.db.fn.now();
      
      await this.db('products')
        .whereIn('id', productIds)
        .update(dbUpdateData);
      for (const productId of productIds) {
      }
      
      logger.info('Bulk product update completed', { 
        productCount: productIds.length,
        updateFields: Object.keys(dbUpdateData)
      });
    }
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateProductStatus(productIds: string[], isActive: boolean): Promise<{ success: number; failed: number }> {
    if (productIds.length === 0) {
      return { success: 0, failed: 0 };
    }

    try {
      const result = await this.db('products')
        .whereIn('id', productIds)
        .update({
          is_active: isActive,
          updated_at: this.db.fn.now(),
        });
      for (const productId of productIds) {
      }
      
      logger.info('Bulk product status update completed', { 
        productCount: productIds.length,
        isActive,
        affectedRows: result
      });

      return { success: result, failed: productIds.length - result };
    } catch (error) {
      logger.error('Error in bulk product status update:', { error });
      return { success: 0, failed: productIds.length };
    }
  }

  /**
   * Bulk update product prices
   */
  async bulkUpdateProductPrices(updates: Array<{ productId: string; sellingPrice: number; mrp?: number }>): Promise<{ success: number; failed: number }> {
    if (updates.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const update of updates) {
      try {
        const updateData: any = {
          selling_price: update.sellingPrice,
          updated_at: this.db.fn.now(),
        };

        if (update.mrp !== undefined) {
          updateData.mrp = update.mrp;
        }

        await this.db('products')
          .where('id', update.productId)
          .update(updateData);
        successCount++;
      } catch (error) {
        logger.error(`Error updating price for product ${update.productId}:`, { error });
        failedCount++;
      }
    }
    
    logger.info('Bulk product price update completed', { 
      totalUpdates: updates.length,
      successCount,
      failedCount
    });

    return { success: successCount, failed: failedCount };
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<any> {
    const [
      totalProducts,
      activeProducts,
      featuredProducts,
      sellableProducts,
      productsWithImages,
      productsWithAttributes,
      avgPrice,
      priceRange,
    ] = await Promise.all([
      this.db('products').count('* as count').first(),
      this.db('products').where('is_active', true).count('* as count').first(),
      this.db('products').where('is_featured', true).count('* as count').first(),
      this.db('products').where('is_sellable', true).count('* as count').first(),
      this.db('products').whereRaw('array_length(image_urls, 1) > 0').count('* as count').first(),
      this.db('products')
        .join('product_attributes', 'products.id', 'product_attributes.product_id')
        .countDistinct('products.id as count')
        .first(),
      this.db('products').avg('selling_price as avg').first(),
      this.db('products')
        .select(
          this.db.raw('MIN(selling_price) as min_price'),
          this.db.raw('MAX(selling_price) as max_price')
        )
        .first(),
    ]);

    return {
      totalProducts: parseInt(totalProducts?.count as string, 10),
      activeProducts: parseInt(activeProducts?.count as string, 10),
      featuredProducts: parseInt(featuredProducts?.count as string, 10),
      sellableProducts: parseInt(sellableProducts?.count as string, 10),
      productsWithImages: parseInt(productsWithImages?.count as string, 10),
      productsWithAttributes: parseInt(productsWithAttributes?.count as string, 10),
      averagePrice: parseFloat(avgPrice?.avg as string) || 0,
      priceRange: {
        min: parseFloat(priceRange?.min_price as string) || 0,
        max: parseFloat(priceRange?.max_price as string) || 0,
      },
    };
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<Product> {
    const product = await this.db('products')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo_url',
        'brands.country as brand_country',
        'categories.name as category_name',
        'categories.slug as category_slug',
        'categories.description as category_description'
      )
      .where('products.barcode', barcode)
      .where('products.is_active', true)
      .first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.mapToProduct(product);
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku: string): Promise<Product> {
    const product = await this.db('products')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo_url',
        'brands.country as brand_country',
        'categories.name as category_name',
        'categories.slug as category_slug',
        'categories.description as category_description'
      )
      .where('products.sku', sku)
      .where('products.is_active', true)
      .first();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.mapToProduct(product);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    query: ProductListQuery = {}
  ): Promise<ProductListResponse> {
    // Verify category exists
    const category = await this.db('categories')
      .where('id', categoryId)
      .first();

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return this.getProducts({ ...query, categoryId });
  }

  /**
   * Generate URL-friendly slug from product name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate SKU from product name
   */
  private generateSKU(name: string): string {
    const prefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3);
    
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }

  /**
   * Map database row to ProductImage object
   */
  private mapToProductImage(row: any): ProductImage {
    return {
      id: row.id,
      productId: row.product_id,
      imageUrl: row.image_url,
      altText: row.alt_text,
      displayOrder: row.display_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    };
  }

  /**
   * Map database row to ProductAttribute object
   */
  private mapToProductAttribute(row: any): ProductAttribute {
    return {
      id: row.id,
      productId: row.product_id,
      attributeName: row.attribute_name,
      attributeValue: row.attribute_value,
      createdAt: row.created_at,
    };
  }

  /**
   * Map database row to Product object
   */
  private mapToProduct(row: any): Product {
    const product: Product = {
      id: row.id,
      categoryId: row.category_id,
      brandId: row.brand_id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      detailedDescription: row.detailed_description,
      brand: row.brand || row.brand_name, // Use brand name from join if available
      unitSize: row.unit_size,
      unitType: row.unit_type,
      price: row.price,
      mrp: row.mrp,
      sellingPrice: row.selling_price,
      taxPercent: row.tax_percent || 0,
      discountPercent: row.discount_percent || 0,
      weight: row.weight,
      dimensions: row.dimensions,
      storageInfo: row.storage_info,
      ingredients: row.ingredients,
      nutritionInfo: row.nutrition_info,
      shelfLifeDays: row.shelf_life_days,
      searchKeywords: row.search_keywords,
      tags: row.tags,
      isFeatured: row.is_featured || false,
      isReturnable: row.is_returnable !== false, // Default to true
      isSellable: row.is_sellable !== false, // Default to true
      imageUrls: row.image_urls || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Add inventory information if available from join
    if (row.available_stock !== undefined && row.available_stock !== null) {
      product.stockQuantity = parseInt(row.available_stock, 10) || 0;
      product.isAvailable = product.stockQuantity > 0 && product.isSellable && product.isActive;
    } else {
      // Default to unavailable if no inventory data
      product.stockQuantity = 0;
      product.isAvailable = false;
    }

    // Calculate final price after discounts
    if (product.sellingPrice && product.discountPercent > 0) {
      product.finalPrice = product.sellingPrice * (1 - product.discountPercent / 100);
    } else {
      product.finalPrice = product.sellingPrice;
    }

    // Add brand information if available from join
    if (row.brand_id && row.brand_name) {
      product.brandInfo = {
        id: row.brand_id,
        name: row.brand_name,
        logoUrl: row.brand_logo_url,
        country: row.brand_country,
      };
    }

    // Add category information with hierarchy if available from join
    if (row.category_id && row.category_name) {
      let categoryDisplayName = row.category_name;
      
      // If this is a subcategory, show parent > child format
      if (row.parent_category_name) {
        categoryDisplayName = `${row.parent_category_name} > ${row.category_name}`;
      }
      
      product.category = {
        id: row.category_id,
        name: categoryDisplayName,
        slug: row.category_slug,
        description: row.category_description,
        parentId: row.category_parent_id,
        parentName: row.parent_category_name,
      };
    }

    return product;
  }

  /**
   * Get CSV template for bulk upload
   */
  getBulkUploadTemplate(): string {
    // Column headers
    const headers = [
      'name',
      'description',
      'categoryId',
      'brandId',
      'sku',
      'barcode',
      'unitSize',
      'unitType',
      'mrp',
      'sellingPrice',
      'taxPercent',
      'discountPercent',
      'weight',
      'dimensions',
      'storageInfo',
      'ingredients',
      'nutritionInfo',
      'shelfLifeDays',
      'searchKeywords',
      'tags',
      'isFeatured',
      'isReturnable',
      'isSellable',
      'isActive',
      'imageUrls'
    ];

    // Hints/descriptions for each column
    const hints = [
      'Product name (REQUIRED - max 255 chars)',
      'Short description (optional - max 1000 chars)',
      'Category UUID from system (optional - get from Categories page)',
      'Brand UUID from system (optional - get from Brands page)',
      'Stock Keeping Unit (optional - auto-generated if empty - format: UPPERCASE-123)',
      'Product barcode (optional - numbers only)',
      'Product size/quantity (optional - e.g. 1, 500, 2.5)',
      'Unit of measurement (optional - L, kg, g, ml, pcs)',
      'Maximum Retail Price (REQUIRED - must be > 0)',
      'Selling price (REQUIRED - must be > 0 and <= MRP)',
      'Tax percentage (optional - 0-100, default: 0)',
      'Discount percentage (optional - 0-100, default: 0)',
      'Weight in grams (optional)',
      'Product dimensions (optional - e.g. 10x10x20)',
      'Storage instructions (optional)',
      'Product ingredients (optional - for food items)',
      'Nutritional information (optional)',
      'Shelf life in days (optional)',
      'Search keywords (optional - comma-separated)',
      'Product tags (optional - comma-separated)',
      'Featured product (optional - true/false, default: false)',
      'Can be returned (optional - true/false, default: true)',
      'Available for sale (optional - true/false, default: true)',
      'Product is active (optional - true/false, default: true)',
      'Image URLs (optional - comma-separated URLs)'
    ];

    // Build CSV with headers and hints
    const lines = [
      '# Product Bulk Upload Template',
      '# Instructions: Fill in your product data below. Delete this instruction section before uploading.',
      '# REQUIRED fields: name, mrp, sellingPrice',
      '# All other fields are optional',
      '# Boolean fields: use lowercase true or false',
      '# Multiple values: separate with commas (no spaces)',
      '',
      headers.join(','),
      hints.join(',')
    ];

    return lines.join('\n');
  }

  /**
   * Bulk upload products from CSV
   */
  async bulkUploadProducts(fileBuffer: Buffer): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data?: any }>;
  }> {
    const csvParse = require('csv-parse/sync');
    
    try {
      let content = fileBuffer.toString('utf-8');
      
      // Remove comment lines (lines starting with #)
      content = content
        .split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .join('\n');
      
      const records = csvParse.parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        comment: '#', // Also skip any remaining comment lines
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string; data?: any }>,
      };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2; // +2 because of header row and 0-based index

        try {
          // Parse and validate the row
          const productData: CreateProductDto = {
            name: row.name?.trim(),
            description: row.description?.trim() || undefined,
            categoryId: row.categoryId?.trim() || undefined,
            brandId: row.brandId?.trim() || undefined,
            sku: row.sku?.trim() || undefined,
            barcode: row.barcode?.trim() || undefined,
            unitSize: row.unitSize?.trim() || undefined,
            unitType: row.unitType?.trim() || undefined,
            mrp: row.mrp ? parseFloat(row.mrp) : 0,
            sellingPrice: row.sellingPrice ? parseFloat(row.sellingPrice) : 0,
            taxPercent: row.taxPercent ? parseFloat(row.taxPercent) : 0,
            discountPercent: row.discountPercent ? parseFloat(row.discountPercent) : 0,
            weight: row.weight ? parseFloat(row.weight) : undefined,
            dimensions: row.dimensions?.trim() || undefined,
            storageInfo: row.storageInfo?.trim() || undefined,
            ingredients: row.ingredients?.trim() || undefined,
            nutritionInfo: row.nutritionInfo?.trim() || undefined,
            shelfLifeDays: row.shelfLifeDays ? parseInt(row.shelfLifeDays) : undefined,
            searchKeywords: row.searchKeywords?.trim() || undefined,
            tags: row.tags?.trim() || undefined,
            isFeatured: row.isFeatured?.toLowerCase() === 'true',
            isReturnable: row.isReturnable?.toLowerCase() === 'true',
            isSellable: row.isSellable?.toLowerCase() !== 'false', // Default true
            isActive: row.isActive?.toLowerCase() !== 'false', // Default true
            imageUrls: row.imageUrls?.trim() ? row.imageUrls.split(',').map((url: string) => url.trim()) : undefined,
          };

          // Validate required fields
          if (!productData.name) {
            throw new Error('Product name is required');
          }

          if (!productData.mrp || productData.mrp <= 0) {
            throw new Error('Valid MRP is required');
          }

          if (!productData.sellingPrice || productData.sellingPrice <= 0) {
            throw new Error('Valid selling price is required');
          }

          if (productData.sellingPrice > productData.mrp) {
            throw new Error('Selling price cannot be greater than MRP');
          }

          // Create the product
          await this.createProduct(productData);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error',
            data: row,
          });
          logger.error(`Failed to create product at row ${rowNumber}:`, error);
        }
      }

      return results;
    } catch (error: any) {
      logger.error('Failed to parse CSV file:', error);
      throw new AppError('Failed to parse CSV file: ' + error.message, 400, 'CSV_PARSE_ERROR');
    }
  }
}

export const productService = new ProductService();
