import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from './enums/product-status.enum';
import { ProductModerationStatus } from './enums/product-moderation-status.enum';
import { ProductVisibility } from './enums/product-visibility.enum';

export class ProductValidators {
  // ============================================================================
  // BASIC FIELD VALIDATION
  // ============================================================================

  static validateProductName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Product name is required');
    }

    if (name.length > 200) {
      throw new BadRequestException('Product name cannot exceed 200 characters');
    }

    if (name.length < 2) {
      throw new BadRequestException('Product name must be at least 2 characters');
    }

    // Check for invalid characters
    const invalidChars = /[<>{}[\]\\\/]/;
    if (invalidChars.test(name)) {
      throw new BadRequestException('Product name contains invalid characters');
    }
  }

  static validateProductSlug(slug: string): string {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Product slug is required');
    }

    // Normalize slug
    const normalizedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalizedSlug.length < 2) {
      throw new BadRequestException('Product slug must be at least 2 characters after normalization');
    }

    if (normalizedSlug.length > 200) {
      throw new BadRequestException('Product slug cannot exceed 200 characters');
    }

    // Check for reserved slugs
    const reservedSlugs = [
      'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'test',
      'new', 'create', 'edit', 'delete', 'update', 'search',
      'products', 'categories', 'brands', 'sellers'
    ];

    if (reservedSlugs.includes(normalizedSlug)) {
      throw new BadRequestException(`Slug '${normalizedSlug}' is reserved and cannot be used`);
    }

    return normalizedSlug;
  }

  static validateProductDescription(description?: string): void {
    if (description && description.length > 5000) {
      throw new BadRequestException('Product description cannot exceed 5000 characters');
    }
  }

  static validateShortDescription(shortDescription?: string): void {
    if (shortDescription && shortDescription.length > 500) {
      throw new BadRequestException('Short description cannot exceed 500 characters');
    }
  }

  // ============================================================================
  // SEO VALIDATION
  // ============================================================================

  static validateSeoTitle(seoTitle?: string): void {
    if (seoTitle && seoTitle.length > 60) {
      throw new BadRequestException('SEO title should not exceed 60 characters for optimal search results');
    }
  }

  static validateSeoDescription(seoDescription?: string): void {
    if (seoDescription && seoDescription.length > 160) {
      throw new BadRequestException('SEO description should not exceed 160 characters for optimal search results');
    }
  }

  static validateSeoKeywords(seoKeywords?: string[]): void {
    if (seoKeywords) {
      if (seoKeywords.length > 20) {
        throw new BadRequestException('Cannot have more than 20 SEO keywords');
      }

      for (const keyword of seoKeywords) {
        if (keyword.length > 50) {
          throw new BadRequestException('SEO keywords cannot exceed 50 characters each');
        }
      }
    }
  }

  // ============================================================================
  // MEDIA VALIDATION
  // ============================================================================

  static validateImages(images: string[]): void {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    if (images.length > 20) {
      throw new BadRequestException('Cannot have more than 20 product images');
    }

    for (const image of images) {
      this.validateUrl(image, 'Product image');
    }
  }

  static validateVideos(videos?: string[]): void {
    if (videos) {
      if (videos.length > 10) {
        throw new BadRequestException('Cannot have more than 10 product videos');
      }

      for (const video of videos) {
        this.validateUrl(video, 'Product video');
      }
    }
  }

  static validateDocuments(documents?: string[]): void {
    if (documents) {
      if (documents.length > 10) {
        throw new BadRequestException('Cannot have more than 10 product documents');
      }

      for (const document of documents) {
        this.validateUrl(document, 'Product document');
      }
    }
  }

  static validateUrl(url: string, fieldName: string): void {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }

    if (url.length > 2000) {
      throw new BadRequestException(`${fieldName} URL cannot exceed 2000 characters`);
    }
  }

  // ============================================================================
  // TAGS VALIDATION
  // ============================================================================

  static validateTags(tags?: string[]): void {
    if (tags) {
      if (tags.length > 20) {
        throw new BadRequestException('Cannot have more than 20 product tags');
      }

      for (const tag of tags) {
        if (tag.length > 50) {
          throw new BadRequestException('Product tags cannot exceed 50 characters each');
        }

        if (tag.trim().length === 0) {
          throw new BadRequestException('Product tags cannot be empty');
        }
      }
    }
  }

  // ============================================================================
  // VARIANT VALIDATION
  // ============================================================================

  static validateVariantConfiguration(hasVariants: boolean, variantAttributes?: string[]): void {
    if (hasVariants) {
      if (!variantAttributes || variantAttributes.length === 0) {
        throw new BadRequestException('Products with variants must have at least one variant attribute');
      }

      if (variantAttributes.length > 10) {
        throw new BadRequestException('Cannot have more than 10 variant attributes');
      }
    } else {
      if (variantAttributes && variantAttributes.length > 0) {
        throw new BadRequestException('Products without variants cannot have variant attributes');
      }
    }
  }

  // ============================================================================
  // STATUS VALIDATION
  // ============================================================================

  static validateStatusTransition(
    currentStatus: ProductStatus,
    newStatus: ProductStatus,
    userRole: string,
    isOwner: boolean
  ): void {
    const { canTransitionTo, isApprovalRequired } = require('./enums/product-status.enum');

    if (!canTransitionTo(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Check if user has permission for this transition
    if (isApprovalRequired(currentStatus, newStatus) && userRole !== 'ADMIN') {
      throw new BadRequestException('Admin approval required for this status change');
    }

    // Sellers can only transition their own products in certain states
    if (!isOwner && userRole !== 'ADMIN') {
      throw new BadRequestException('Only product owners or admins can change product status');
    }

    // Additional business rules
    if (newStatus === ProductStatus.PUBLISHED && userRole === 'SELLER' && !isOwner) {
      throw new BadRequestException('Only product owners can publish their products');
    }
  }

  static validateModerationStatusTransition(
    currentStatus: ProductModerationStatus,
    newStatus: ProductModerationStatus,
    userRole: string
  ): void {
    const { canModerationTransitionTo } = require('./enums/product-moderation-status.enum');

    if (!canModerationTransitionTo(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid moderation status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Only admins and moderators can change moderation status
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      throw new BadRequestException('Only administrators and moderators can change moderation status');
    }
  }

  // ============================================================================
  // BUSINESS RULE VALIDATION
  // ============================================================================

  static validateProductForSubmission(product: any): void {
    // Required fields for submission
    if (!product.name || product.name.trim().length === 0) {
      throw new BadRequestException('Product name is required for submission');
    }

    if (!product.description || product.description.trim().length === 0) {
      throw new BadRequestException('Product description is required for submission');
    }

    if (!product.images || product.images.length === 0) {
      throw new BadRequestException('At least one product image is required for submission');
    }

    if (!product.categoryId) {
      throw new BadRequestException('Product category is required for submission');
    }

    if (!product.brandId) {
      throw new BadRequestException('Product brand is required for submission');
    }

    // Validate minimum content quality
    if (product.description.length < 50) {
      throw new BadRequestException('Product description must be at least 50 characters for submission');
    }
  }

  static validateProductForPublishing(product: any): void {
    // All submission requirements plus additional publishing requirements
    this.validateProductForSubmission(product);

    // Must be approved
    if (product.moderationStatus !== ProductModerationStatus.APPROVED) {
      throw new BadRequestException('Product must be approved before publishing');
    }

    // Additional quality checks for publishing
    if (!product.shortDescription || product.shortDescription.trim().length === 0) {
      throw new BadRequestException('Short description is required for publishing');
    }

    if (product.images.length < 2) {
      throw new BadRequestException('At least 2 product images are required for publishing');
    }
  }

  // ============================================================================
  // METADATA VALIDATION
  // ============================================================================

  static validateMetadata(metadata?: any): void {
    if (metadata) {
      try {
        // Ensure metadata can be serialized to JSON
        JSON.stringify(metadata);
      } catch {
        throw new BadRequestException('Product metadata must be valid JSON');
      }

      // Check metadata size (approximate)
      const metadataString = JSON.stringify(metadata);
      if (metadataString.length > 10000) {
        throw new BadRequestException('Product metadata cannot exceed 10KB');
      }
    }
  }

  // ============================================================================
  // DISPLAY ORDER VALIDATION
  // ============================================================================

  static validateDisplayOrder(displayOrder?: number): void {
    if (displayOrder !== undefined) {
      if (displayOrder < 0 || displayOrder > 9999) {
        throw new BadRequestException('Display order must be between 0 and 9999');
      }
    }
  }

  // ============================================================================
  // SCHEDULED PUBLISHING VALIDATION
  // ============================================================================

  static validateScheduledPublishAt(scheduledPublishAt?: Date): void {
    if (scheduledPublishAt) {
      const now = new Date();
      const scheduledDate = new Date(scheduledPublishAt);

      if (scheduledDate <= now) {
        throw new BadRequestException('Scheduled publish date must be in the future');
      }

      // Don't allow scheduling too far in the future (1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (scheduledDate > oneYearFromNow) {
        throw new BadRequestException('Cannot schedule publishing more than 1 year in advance');
      }
    }
  }

  // ============================================================================
  // COMPREHENSIVE PRODUCT VALIDATION
  // ============================================================================

  static validateProduct(productData: any): void {
    this.validateProductName(productData.name);
    
    if (productData.slug) {
      productData.slug = this.validateProductSlug(productData.slug);
    }

    this.validateProductDescription(productData.description);
    this.validateShortDescription(productData.shortDescription);
    this.validateSeoTitle(productData.seoTitle);
    this.validateSeoDescription(productData.seoDescription);
    this.validateSeoKeywords(productData.seoKeywords);
    this.validateImages(productData.images);
    this.validateVideos(productData.videos);
    this.validateDocuments(productData.documents);
    this.validateTags(productData.tags);
    this.validateVariantConfiguration(productData.hasVariants, productData.variantAttributes);
    this.validateMetadata(productData.metaData);
    this.validateDisplayOrder(productData.displayOrder);
    this.validateScheduledPublishAt(productData.scheduledPublishAt);
  }
}