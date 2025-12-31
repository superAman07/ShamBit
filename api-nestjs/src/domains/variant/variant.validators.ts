import { BadRequestException } from '@nestjs/common';
import { VariantStatus, canTransitionTo } from './enums/variant-status.enum';
import { ProductVariant } from './entities/variant.entity';

export class VariantValidators {
  // ============================================================================
  // CRITICAL SAFETY INVARIANTS - NEVER BYPASS THESE
  // ============================================================================

  /**
   * SAFETY: SKU immutable after activation
   */
  static validateSkuImmutability(
    variant: ProductVariant,
    newSku?: string,
  ): void {
    if (
      variant.status === VariantStatus.ACTIVE &&
      newSku &&
      newSku !== variant.sku
    ) {
      throw new BadRequestException('Cannot change SKU of active variant');
    }
  }

  /**
   * SAFETY: Variant attribute set immutable once ACTIVE
   */
  static validateAttributeImmutability(
    variant: ProductVariant,
    newAttributeValues?: Record<string, string>,
  ): void {
    if (variant.status === VariantStatus.ACTIVE && newAttributeValues) {
      throw new BadRequestException(
        'Cannot change attributes of active variant',
      );
    }
  }

  /**
   * SAFETY: Variant must be disabled before archival
   */
  static validateStatusTransition(
    currentStatus: VariantStatus,
    newStatus: VariantStatus,
  ): void {
    if (!canTransitionTo(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Special rule: Must disable before archiving
    if (
      newStatus === VariantStatus.ARCHIVED &&
      currentStatus === VariantStatus.ACTIVE
    ) {
      throw new BadRequestException('Must disable variant before archiving');
    }
  }

  /**
   * SAFETY: No deletion if inventory exists
   */
  static validateVariantDeletion(
    variant: ProductVariant,
    hasInventory: boolean,
  ): void {
    if (hasInventory) {
      throw new BadRequestException(
        'Cannot delete variant with existing inventory',
      );
    }

    if (variant.status === VariantStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active variant');
    }
  }

  /**
   * SAFETY: Variant belongs to exactly one product
   */
  static validateProductOwnership(
    variant: ProductVariant,
    expectedProductId: string,
  ): void {
    if (variant.productId !== expectedProductId) {
      throw new BadRequestException(
        'Variant does not belong to specified product',
      );
    }
  }

  /**
   * SAFETY: SKU format validation
   */
  static validateSkuFormat(sku: string): void {
    if (!sku || sku.trim().length === 0) {
      throw new BadRequestException('SKU is required');
    }

    if (sku.length > 100) {
      throw new BadRequestException('SKU too long - maximum 100 characters');
    }

    // SKU must be alphanumeric with hyphens and underscores only
    const skuPattern = /^[A-Z0-9\-_]+$/;
    if (!skuPattern.test(sku)) {
      throw new BadRequestException(
        'SKU must contain only uppercase letters, numbers, hyphens, and underscores',
      );
    }
  }

  /**
   * SAFETY: Attribute combination validation
   */
  static validateAttributeCombination(
    attributeValues: Record<string, string>,
    requiredAttributes: string[],
  ): void {
    // Check all required attributes are present
    for (const requiredAttr of requiredAttributes) {
      if (!attributeValues[requiredAttr]) {
        throw new BadRequestException(
          `Missing required attribute: ${requiredAttr}`,
        );
      }
    }

    // Check no extra attributes
    const providedAttributes = Object.keys(attributeValues);
    for (const providedAttr of providedAttributes) {
      if (!requiredAttributes.includes(providedAttr)) {
        throw new BadRequestException(`Unexpected attribute: ${providedAttr}`);
      }
    }

    // Validate attribute values are not empty
    for (const [attrId, value] of Object.entries(attributeValues)) {
      if (!value || value.trim().length === 0) {
        throw new BadRequestException(`Attribute ${attrId} cannot be empty`);
      }
    }
  }

  /**
   * SAFETY: Variant generation limits
   */
  static validateVariantGeneration(
    combinationCount: number,
    maxCombinations: number = 1000,
  ): void {
    if (combinationCount <= 0) {
      throw new BadRequestException('No valid variant combinations found');
    }

    if (combinationCount > maxCombinations) {
      throw new BadRequestException(
        `Too many variant combinations: ${combinationCount}. Maximum: ${maxCombinations}`,
      );
    }
  }

  /**
   * SAFETY: Price override validation
   */
  static validatePriceOverride(priceOverride?: number): void {
    if (priceOverride !== undefined && priceOverride !== null) {
      if (priceOverride < 0) {
        throw new BadRequestException('Price override cannot be negative');
      }

      if (priceOverride > 1000000) {
        throw new BadRequestException(
          'Price override too large - maximum $1,000,000',
        );
      }

      // Check for reasonable decimal places (max 2)
      const decimalPlaces = (priceOverride.toString().split('.')[1] || '')
        .length;
      if (decimalPlaces > 2) {
        throw new BadRequestException(
          'Price override cannot have more than 2 decimal places',
        );
      }
    }
  }

  /**
   * SAFETY: Image URL validation
   */
  static validateImageUrls(images: string[]): void {
    if (images.length > 20) {
      throw new BadRequestException('Too many images - maximum 20 per variant');
    }

    for (const imageUrl of images) {
      if (!imageUrl || imageUrl.trim().length === 0) {
        throw new BadRequestException('Image URL cannot be empty');
      }

      if (imageUrl.length > 500) {
        throw new BadRequestException(
          'Image URL too long - maximum 500 characters',
        );
      }

      // Basic URL format validation
      try {
        new URL(imageUrl);
      } catch {
        throw new BadRequestException(`Invalid image URL: ${imageUrl}`);
      }
    }
  }

  /**
   * SAFETY: Bulk operation validation
   */
  static validateBulkOperation(
    itemCount: number,
    maxItems: number = 100,
  ): void {
    if (itemCount <= 0) {
      throw new BadRequestException(
        'Bulk operation must include at least one item',
      );
    }

    if (itemCount > maxItems) {
      throw new BadRequestException(
        `Bulk operation too large: ${itemCount} items. Maximum: ${maxItems}`,
      );
    }
  }

  /**
   * SAFETY: Metadata validation
   */
  static validateMetadata(metadata?: Record<string, any>): void {
    if (metadata) {
      const metadataString = JSON.stringify(metadata);
      if (metadataString.length > 10000) {
        throw new BadRequestException('Metadata too large - maximum 10KB');
      }
    }
  }
}
