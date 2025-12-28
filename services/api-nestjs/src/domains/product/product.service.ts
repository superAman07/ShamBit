import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ProductRepository } from './repositories/product.repository';
import { ProductAttributeValueRepository } from './repositories/product-attribute-value.repository';
import { ProductAuditService } from './services/product-audit.service';
import { ProductIntegrationService } from './services/product-integration.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Product } from './entities/product.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductStatus } from './enums/product-status.enum';
import { ProductModerationStatus } from './enums/product-moderation-status.enum';
import { ProductVisibility } from './enums/product-visibility.enum';
import { ProductPolicies } from './product.policies';
import { ProductValidators } from './product.validators';

import { CreateProductDto } from './dtos/create-product.dto';
import {
  UpdateProductDto,
  ProductStatusUpdateDto,
  ProductModerationDto,
  ProductCategoryUpdateDto,
  ProductBrandUpdateDto,
  BulkProductUpdateDto,
  ProductCloneDto,
} from './dtos/update-product.dto';

import {
  ProductFilters,
  PaginationOptions,
  ProductIncludeOptions,
  ProductStatistics,
  BulkUpdateData,
} from './interfaces/product-repository.interface';

import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductStatusChangedEvent,
  ProductSubmittedEvent,
  ProductApprovedEvent,
  ProductRejectedEvent,
  ProductPublishedEvent,
  ProductUnpublishedEvent,
  ProductSuspendedEvent,
  ProductArchivedEvent,
  ProductModerationStatusChangedEvent,
  ProductFlaggedEvent,
  ProductCategoryChangedEvent,
  ProductBrandChangedEvent,
  ProductFeaturedEvent,
  ProductUnfeaturedEvent,
  ProductClonedEvent,
  ProductBulkOperationEvent,
} from './events/product.events';

import { UserRole } from '../../common/types';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productAttributeValueRepository: ProductAttributeValueRepository,
    private readonly productAuditService: ProductAuditService,
    private readonly productIntegrationService: ProductIntegrationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {},
    includes: ProductIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('ProductService.findAll', { filters, pagination, userId });

    // Apply visibility filters based on user role
    const enhancedFilters = this.applyVisibilityFilters(filters, userRole, userId);

    return this.productRepository.findAll(enhancedFilters, pagination, includes);
  }

  async findById(
    id: string,
    includes: ProductIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Product> {
    const product = await this.productRepository.findById(id, includes);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user can view this product
    if (!ProductPolicies.canUserViewProduct(product, userId, userRole)) {
      throw new ForbiddenException('Access denied to this product');
    }

    return product;
  }

  async findBySlug(
    slug: string,
    includes: ProductIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug, includes);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user can view this product
    if (!ProductPolicies.canUserViewProduct(product, userId, userRole)) {
      throw new ForbiddenException('Access denied to this product');
    }

    return product;
  }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  async create(
    createProductDto: CreateProductDto,
    createdBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.create', { createProductDto, createdBy });

    // Validate input data
    ProductValidators.validateProduct(createProductDto);

    // Generate slug if not provided
    if (!createProductDto.slug) {
      createProductDto.slug = ProductValidators.validateProductSlug(
        createProductDto.name.toLowerCase().replace(/\s+/g, '-')
      );
    } else {
      createProductDto.slug = ProductValidators.validateProductSlug(createProductDto.slug);
    }

    // Check slug uniqueness
    const slugExists = !(await this.productRepository.validateSlug(createProductDto.slug));
    if (slugExists) {
      throw new ConflictException('Product with this slug already exists');
    }

    // Validate category and brand integration
    await this.productIntegrationService.validateCategoryBrandCombination(
      createProductDto.categoryId,
      createProductDto.brandId
    );

    // Validate seller can use this brand
    await this.productIntegrationService.validateSellerCanUseBrand(
      createdBy,
      createProductDto.brandId
    );

    // Set default values
    const productData = {
      ...createProductDto,
      sellerId: createdBy,
      status: ProductStatus.DRAFT,
      moderationStatus: ProductModerationStatus.PENDING,
      visibility: createProductDto.visibility || ProductVisibility.PRIVATE,
      version: 1,
      createdBy,
    };
    
    // Convert scheduledPublishAt string to Date if provided
    if (createProductDto.scheduledPublishAt) {
      productData.scheduledPublishAt = new Date(createProductDto.scheduledPublishAt);
    }

    // Create the product
    const product = await this.productRepository.create(productData);

    // Handle attribute values if provided
    if (createProductDto.attributeValues && createProductDto.attributeValues.length > 0) {
      await this.setAttributeValues(product.id, createProductDto.attributeValues, createdBy);
    } else {
      // Inherit attributes from category
      await this.inheritAttributesFromCategory(product.id, product.categoryId, createdBy);
    }

    // Create audit log
    await this.productAuditService.logAction(
      product.id,
      'CREATE',
      createdBy,
      null,
      product,
      'Product created'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductCreatedEvent.eventName,
      new ProductCreatedEvent(
        product.id,
        product.name,
        product.slug,
        product.categoryId,
        product.brandId,
        product.sellerId,
        product.status,
        createdBy
      )
    );

    this.logger.log('Product created successfully', { productId: product.id });
    return product;
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.update', { id, updateProductDto, updatedBy });

    const existingProduct = await this.findById(id, {}, updatedBy, userRole);

    // Check permissions
    if (!ProductPolicies.canUserEditProduct(existingProduct, updatedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to update this product');
    }

    // Validate input data
    if (updateProductDto.name) {
      ProductValidators.validateProductName(updateProductDto.name);
    }

    if (updateProductDto.slug) {
      updateProductDto.slug = ProductValidators.validateProductSlug(updateProductDto.slug);
      
      // Check slug uniqueness
      const slugExists = !(await this.productRepository.validateSlug(updateProductDto.slug, id));
      if (slugExists) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    // Validate other fields
    ProductValidators.validateProductDescription(updateProductDto.description);
    ProductValidators.validateShortDescription(updateProductDto.shortDescription);
    ProductValidators.validateSeoTitle(updateProductDto.seoTitle);
    ProductValidators.validateSeoDescription(updateProductDto.seoDescription);
    ProductValidators.validateSeoKeywords(updateProductDto.seoKeywords);
    
    if (updateProductDto.images) {
      ProductValidators.validateImages(updateProductDto.images);
    }
    
    ProductValidators.validateVideos(updateProductDto.videos);
    ProductValidators.validateDocuments(updateProductDto.documents);
    ProductValidators.validateTags(updateProductDto.tags);
    ProductValidators.validateMetadata(updateProductDto.metaData);
    ProductValidators.validateDisplayOrder(updateProductDto.displayOrder);
    ProductValidators.validateScheduledPublishAt(updateProductDto.scheduledPublishAt);

    // Validate variant configuration changes
    if (updateProductDto.hasVariants !== undefined || updateProductDto.variantAttributes) {
      const hasVariants = updateProductDto.hasVariants ?? existingProduct.hasVariants;
      const variantAttributes = updateProductDto.variantAttributes ?? existingProduct.variantAttributes;
      
      ProductValidators.validateVariantConfiguration(hasVariants, variantAttributes);
      
      if (!ProductPolicies.canModifyVariantConfiguration(existingProduct, userRole, updatedBy === existingProduct.sellerId)) {
        throw new ForbiddenException('Cannot modify variant configuration for this product');
      }
    }

    // Increment version for optimistic locking
    const updateData = {
      ...updateProductDto,
      version: existingProduct.version + 1,
      updatedBy,
    };
    
    // Convert scheduledPublishAt string to Date if provided
    if (updateProductDto.scheduledPublishAt) {
      updateData.scheduledPublishAt = new Date(updateProductDto.scheduledPublishAt);
    }
    
    const updatedProduct = await this.productRepository.update(id, updateData);

    // Handle attribute values if provided
    if (updateProductDto.attributeValues) {
      await this.setAttributeValues(id, updateProductDto.attributeValues, updatedBy);
    }

    // Check if moderation review is required
    const changes = this.calculateChanges(existingProduct, updatedProduct);
    if (ProductPolicies.requiresModerationReview(existingProduct, changes)) {
      await this.updateModerationStatus(
        id,
        ProductModerationStatus.PENDING,
        'system',
        'Product requires moderation review due to significant changes'
      );
    }

    // Create audit log
    await this.productAuditService.logAction(
      id,
      'UPDATE',
      updatedBy,
      existingProduct,
      updatedProduct,
      'Product updated'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductUpdatedEvent.eventName,
      new ProductUpdatedEvent(
        id,
        updatedProduct.name,
        changes,
        updatedBy
      )
    );

    this.logger.log('Product updated successfully', { productId: id });
    return updatedProduct;
  }

  // ============================================================================
  // STATUS OPERATIONS
  // ============================================================================

  async updateStatus(
    id: string,
    statusUpdate: ProductStatusUpdateDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.updateStatus', { id, statusUpdate, updatedBy });

    const product = await this.findById(id, {}, updatedBy, userRole);
    const isOwner = updatedBy === product.sellerId;

    // Validate status transition
    ProductValidators.validateStatusTransition(
      product.status,
      statusUpdate.status,
      userRole,
      isOwner
    );

    // Additional business rule validation
    if (statusUpdate.status === ProductStatus.SUBMITTED) {
      ProductValidators.validateProductForSubmission(product);
    }

    if (statusUpdate.status === ProductStatus.PUBLISHED) {
      ProductValidators.validateProductForPublishing(product);
    }

    // Update status
    const updatedProduct = await this.productRepository.updateStatus(
      id,
      statusUpdate.status,
      updatedBy,
      statusUpdate.reason
    );

    // Create audit log
    await this.productAuditService.logAction(
      id,
      `STATUS_CHANGE_${statusUpdate.status}`,
      updatedBy,
      { status: product.status },
      { status: statusUpdate.status },
      statusUpdate.reason || 'Status updated'
    );

    // Emit status-specific events
    await this.emitStatusChangeEvent(updatedProduct, product.status, updatedBy, statusUpdate.reason);

    this.logger.log('Product status updated successfully', { productId: id, status: statusUpdate.status });
    return updatedProduct;
  }

  async updateModerationStatus(
    id: string,
    moderationStatus: ProductModerationStatus,
    moderatedBy: string,
    notes?: string
  ): Promise<Product> {
    this.logger.log('ProductService.updateModerationStatus', { id, moderationStatus, moderatedBy });

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate moderation status transition
    ProductValidators.validateModerationStatusTransition(
      product.moderationStatus,
      moderationStatus,
      'ADMIN' // Assume admin for now, should be passed from controller
    );

    // Update moderation status
    const updatedProduct = await this.productRepository.updateModerationStatus(
      id,
      moderationStatus,
      moderatedBy,
      notes
    );

    // Create audit log
    await this.productAuditService.logAction(
      id,
      `MODERATION_${moderationStatus}`,
      moderatedBy,
      { moderationStatus: product.moderationStatus },
      { moderationStatus },
      notes || 'Moderation status updated'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductModerationStatusChangedEvent.eventName,
      new ProductModerationStatusChangedEvent(
        id,
        product.name,
        product.moderationStatus,
        moderationStatus,
        product.sellerId,
        moderatedBy,
        notes
      )
    );

    this.logger.log('Product moderation status updated', { productId: id, status: moderationStatus });
    return updatedProduct;
  }

  // ============================================================================
  // CATEGORY & BRAND OPERATIONS
  // ============================================================================

  async updateCategory(
    id: string,
    categoryUpdate: ProductCategoryUpdateDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.updateCategory', { id, categoryUpdate, updatedBy });

    const product = await this.findById(id, {}, updatedBy, userRole);
    const isOwner = updatedBy === product.sellerId;

    // Check permissions
    if (!ProductPolicies.canChangeCategoryTo(product, categoryUpdate.categoryId, userRole, isOwner)) {
      throw new ForbiddenException('Cannot change product category');
    }

    // Validate new category
    await this.productIntegrationService.validateCategoryExists(categoryUpdate.categoryId);
    await this.productIntegrationService.validateCategoryBrandCombination(
      categoryUpdate.categoryId,
      product.brandId
    );

    const oldCategoryId = product.categoryId;

    // Update category
    const updatedProduct = await this.productRepository.updateCategory(
      id,
      categoryUpdate.categoryId,
      updatedBy,
      categoryUpdate.reason
    );

    // Handle attribute inheritance if requested
    if (categoryUpdate.inheritAttributes) {
      await this.inheritAttributesFromCategory(id, categoryUpdate.categoryId, updatedBy);
    }

    // Create audit log
    await this.productAuditService.logAction(
      id,
      'CATEGORY_CHANGE',
      updatedBy,
      { categoryId: oldCategoryId },
      { categoryId: categoryUpdate.categoryId },
      categoryUpdate.reason || 'Category changed'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductCategoryChangedEvent.eventName,
      new ProductCategoryChangedEvent(
        id,
        product.name,
        oldCategoryId,
        categoryUpdate.categoryId,
        product.sellerId,
        updatedBy,
        categoryUpdate.reason
      )
    );

    this.logger.log('Product category updated successfully', { productId: id });
    return updatedProduct;
  }

  async updateBrand(
    id: string,
    brandUpdate: ProductBrandUpdateDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.updateBrand', { id, brandUpdate, updatedBy });

    const product = await this.findById(id, {}, updatedBy, userRole);
    const isOwner = updatedBy === product.sellerId;

    // Check permissions
    if (!ProductPolicies.canChangeBrandTo(product, brandUpdate.brandId, userRole, isOwner)) {
      throw new ForbiddenException('Cannot change product brand');
    }

    // Validate new brand
    await this.productIntegrationService.validateBrandExists(brandUpdate.brandId);
    await this.productIntegrationService.validateCategoryBrandCombination(
      product.categoryId,
      brandUpdate.brandId
    );
    await this.productIntegrationService.validateSellerCanUseBrand(
      product.sellerId,
      brandUpdate.brandId
    );

    const oldBrandId = product.brandId;

    // Update brand
    const updatedProduct = await this.productRepository.updateBrand(
      id,
      brandUpdate.brandId,
      updatedBy,
      brandUpdate.reason
    );

    // Create audit log
    await this.productAuditService.logAction(
      id,
      'BRAND_CHANGE',
      updatedBy,
      { brandId: oldBrandId },
      { brandId: brandUpdate.brandId },
      brandUpdate.reason || 'Brand changed'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductBrandChangedEvent.eventName,
      new ProductBrandChangedEvent(
        id,
        product.name,
        oldBrandId,
        brandUpdate.brandId,
        product.sellerId,
        updatedBy,
        brandUpdate.reason
      )
    );

    this.logger.log('Product brand updated successfully', { productId: id });
    return updatedProduct;
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  async delete(
    id: string,
    deletedBy: string,
    userRole: UserRole,
    reason?: string
  ): Promise<void> {
    this.logger.log('ProductService.delete', { id, deletedBy });

    const product = await this.findById(id, {}, deletedBy, userRole);

    // Check permissions
    if (!ProductPolicies.canUserDeleteProduct(product, deletedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to delete this product');
    }

    await this.productRepository.softDelete(id, deletedBy, reason);

    // Create audit log
    await this.productAuditService.logAction(
      id,
      'DELETE',
      deletedBy,
      product,
      null,
      reason || 'Product deleted'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductDeletedEvent.eventName,
      new ProductDeletedEvent(
        id,
        product.name,
        product.sellerId,
        deletedBy,
        reason
      )
    );

    this.logger.log('Product deleted successfully', { productId: id });
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  async searchProducts(
    query: string,
    filters: ProductFilters = {},
    pagination: PaginationOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    const searchFilters = {
      ...this.applyVisibilityFilters(filters, userRole, userId),
      search: query,
    };

    return this.productRepository.fullTextSearch(query, searchFilters);
  }

  // ============================================================================
  // FEATURED OPERATIONS
  // ============================================================================

  async setFeatured(
    id: string,
    isFeatured: boolean,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.setFeatured', { id, isFeatured, updatedBy });

    const product = await this.findById(id, {}, updatedBy, userRole);

    // Check permissions
    if (!ProductPolicies.canUserFeatureProduct(product, updatedBy, userRole)) {
      throw new ForbiddenException('Insufficient permissions to feature this product');
    }

    const updatedProduct = await this.productRepository.setFeatured(id, isFeatured, updatedBy);

    // Create audit log
    await this.productAuditService.logAction(
      id,
      isFeatured ? 'FEATURE' : 'UNFEATURE',
      updatedBy,
      { isFeatured: product.isFeatured },
      { isFeatured },
      `Product ${isFeatured ? 'featured' : 'unfeatured'}`
    );

    // Emit event
    if (isFeatured) {
      this.eventEmitter.emit(
        ProductFeaturedEvent.eventName,
        new ProductFeaturedEvent(id, product.name, product.sellerId, updatedBy)
      );
    } else {
      this.eventEmitter.emit(
        ProductUnfeaturedEvent.eventName,
        new ProductUnfeaturedEvent(id, product.name, product.sellerId, updatedBy)
      );
    }

    return updatedProduct;
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkUpdate(
    bulkUpdate: BulkProductUpdateDto,
    updatedBy: string,
    userRole: UserRole
  ): Promise<Product[]> {
    this.logger.log('ProductService.bulkUpdate', { bulkUpdate, updatedBy });

    // Check permissions
    if (!ProductPolicies.canPerformBulkOperation('bulk_update', bulkUpdate.productIds, userRole)) {
      throw new ForbiddenException('Insufficient permissions for bulk operations');
    }

    const updates: BulkUpdateData[] = bulkUpdate.productIds.map(id => ({
      id,
      data: {
        status: bulkUpdate.status,
        tags: bulkUpdate.tags,
        isFeatured: bulkUpdate.isFeatured,
      },
      updatedBy,
    }));

    const updatedProducts = await this.productRepository.bulkUpdate(updates);

    // Create batch audit log
    const batchId = await this.productAuditService.logBatchAction(
      bulkUpdate.productIds,
      'BULK_UPDATE',
      updatedBy,
      bulkUpdate.reason || 'Bulk update operation'
    );

    // Emit event
    this.eventEmitter.emit(
      ProductBulkOperationEvent.eventName,
      new ProductBulkOperationEvent(
        'bulk_update',
        bulkUpdate.productIds,
        { status: bulkUpdate.status, tags: bulkUpdate.tags, isFeatured: bulkUpdate.isFeatured },
        updatedBy,
        batchId,
        bulkUpdate.reason
      )
    );

    this.logger.log('Bulk update completed', { count: updatedProducts.length });
    return updatedProducts;
  }

  // ============================================================================
  // CLONE OPERATIONS
  // ============================================================================

  async cloneProduct(
    id: string,
    cloneDto: ProductCloneDto,
    clonedBy: string,
    userRole: UserRole
  ): Promise<Product> {
    this.logger.log('ProductService.cloneProduct', { id, cloneDto, clonedBy });

    const originalProduct = await this.findById(id, { includeAttributeValues: true }, clonedBy, userRole);

    // Check permissions
    if (!ProductPolicies.canCloneProduct(originalProduct, userRole, clonedBy === originalProduct.sellerId)) {
      throw new ForbiddenException('Cannot clone this product');
    }

    // Create clone data
    const cloneData = {
      name: cloneDto.name || `${originalProduct.name} - Copy`,
      slug: cloneDto.slug || `${originalProduct.slug}-copy-${Date.now()}`,
      description: originalProduct.description,
      shortDescription: originalProduct.shortDescription,
      categoryId: originalProduct.categoryId,
      brandId: originalProduct.brandId,
      seoTitle: originalProduct.seoTitle,
      seoDescription: originalProduct.seoDescription,
      seoKeywords: originalProduct.seoKeywords,
      metaData: originalProduct.metaData,
      images: cloneDto.copyMedia ? originalProduct.images : [],
      videos: cloneDto.copyMedia ? originalProduct.videos : [],
      documents: cloneDto.copyMedia ? originalProduct.documents : [],
      tags: originalProduct.tags,
      displayOrder: originalProduct.displayOrder,
      hasVariants: originalProduct.hasVariants,
      variantAttributes: originalProduct.variantAttributes,
      visibility: ProductVisibility.PRIVATE, // Always start as private
    };

    // Create the cloned product
    const clonedProduct = await this.create(cloneData as CreateProductDto, clonedBy, userRole);

    // Copy attribute values if requested
    if (cloneDto.copyAttributeValues && originalProduct.attributeValues) {
      const attributeValues = originalProduct.attributeValues.map(av => ({
        attributeId: av.attributeId,
        value: av.getValue(),
        locale: av.locale,
      }));

      await this.setAttributeValues(clonedProduct.id, attributeValues, clonedBy);
    }

    // Emit event
    this.eventEmitter.emit(
      ProductClonedEvent.eventName,
      new ProductClonedEvent(
        id,
        clonedProduct.id,
        originalProduct.name,
        clonedProduct.name,
        originalProduct.sellerId,
        clonedBy
      )
    );

    this.logger.log('Product cloned successfully', { 
      originalId: id, 
      clonedId: clonedProduct.id 
    });

    return clonedProduct;
  }

  // ============================================================================
  // STATISTICS OPERATIONS
  // ============================================================================

  async getStatistics(): Promise<ProductStatistics> {
    return this.productRepository.getStatistics();
  }

  async getSellerStatistics(sellerId: string): Promise<ProductStatistics> {
    return this.productRepository.getSellerStatistics(sellerId);
  }

  // ============================================================================
  // ATTRIBUTE VALUE OPERATIONS
  // ============================================================================

  private async setAttributeValues(
    productId: string,
    attributeValues: Array<{ attributeId: string; value: any; locale?: string }>,
    updatedBy: string
  ): Promise<void> {
    for (const attrValue of attributeValues) {
      await this.productAttributeValueRepository.upsert({
        productId,
        attributeId: attrValue.attributeId,
        locale: attrValue.locale || 'en',
        // Value will be set based on attribute type in the repository
        stringValue: typeof attrValue.value === 'string' ? attrValue.value : undefined,
        numberValue: typeof attrValue.value === 'number' ? attrValue.value : undefined,
        booleanValue: typeof attrValue.value === 'boolean' ? attrValue.value : undefined,
        jsonValue: typeof attrValue.value === 'object' ? attrValue.value : undefined,
      });
    }
  }

  private async inheritAttributesFromCategory(
    productId: string,
    categoryId: string,
    createdBy: string
  ): Promise<void> {
    await this.productAttributeValueRepository.inheritFromCategory(productId, categoryId, createdBy);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private applyVisibilityFilters(
    filters: ProductFilters,
    userRole?: UserRole,
    userId?: string
  ): ProductFilters {
    const enhancedFilters = { ...filters };

    // Apply visibility rules based on user role
    if (userRole === UserRole.ADMIN) {
      // Admins can see all products
      return enhancedFilters;
    }

    if (userRole === UserRole.SELLER) {
      // Sellers can see their own products + public products
      if (!enhancedFilters.sellerId) {
        enhancedFilters.visibility = ProductVisibility.PUBLIC;
      }
    } else {
      // Customers can only see published public products
      enhancedFilters.visibility = ProductVisibility.PUBLIC;
      enhancedFilters.status = ProductStatus.PUBLISHED;
    }

    return enhancedFilters;
  }

  private async emitStatusChangeEvent(
    product: Product,
    oldStatus: ProductStatus,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    // Emit general status change event
    this.eventEmitter.emit(
      ProductStatusChangedEvent.eventName,
      new ProductStatusChangedEvent(
        product.id,
        product.name,
        oldStatus,
        product.status,
        product.sellerId,
        changedBy,
        reason
      )
    );

    // Emit specific status events
    switch (product.status) {
      case ProductStatus.SUBMITTED:
        this.eventEmitter.emit(
          ProductSubmittedEvent.eventName,
          new ProductSubmittedEvent(product.id, product.name, product.sellerId, changedBy)
        );
        break;
      case ProductStatus.APPROVED:
        this.eventEmitter.emit(
          ProductApprovedEvent.eventName,
          new ProductApprovedEvent(product.id, product.name, product.sellerId, changedBy)
        );
        break;
      case ProductStatus.REJECTED:
        this.eventEmitter.emit(
          ProductRejectedEvent.eventName,
          new ProductRejectedEvent(product.id, product.name, product.sellerId, changedBy, reason)
        );
        break;
      case ProductStatus.PUBLISHED:
        this.eventEmitter.emit(
          ProductPublishedEvent.eventName,
          new ProductPublishedEvent(
            product.id,
            product.name,
            product.slug,
            product.categoryId,
            product.brandId,
            product.sellerId,
            changedBy
          )
        );
        break;
      case ProductStatus.SUSPENDED:
        this.eventEmitter.emit(
          ProductSuspendedEvent.eventName,
          new ProductSuspendedEvent(product.id, product.name, product.sellerId, changedBy, reason)
        );
        break;
      case ProductStatus.ARCHIVED:
        this.eventEmitter.emit(
          ProductArchivedEvent.eventName,
          new ProductArchivedEvent(product.id, product.name, product.sellerId, changedBy, reason)
        );
        break;
    }
  }

  private calculateChanges(oldProduct: Product, newProduct: Product): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    const fields = [
      'name', 'description', 'shortDescription', 'status', 'visibility', 'moderationStatus',
      'seoTitle', 'seoDescription', 'images', 'videos', 'documents', 'tags', 'isFeatured',
      'hasVariants', 'variantAttributes', 'displayOrder'
    ];
    
    for (const field of fields) {
      const oldValue = (oldProduct as any)[field];
      const newValue = (newProduct as any)[field];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }
}