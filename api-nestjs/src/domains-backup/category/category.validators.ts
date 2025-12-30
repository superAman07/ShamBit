import { BadRequestException } from '@nestjs/common';
import { CategoryPolicies } from './category.policies';

export class CategoryValidators {
  // Reserved slugs that cannot be used
  private static readonly RESERVED_SLUGS = [
    'admin', 'api', 'www', 'app', 'root', 'system', 'category', 'categories',
    'product', 'products', 'brand', 'brands', 'user', 'users', 'seller',
    'sellers', 'search', 'filter', 'sort', 'page', 'limit', 'offset',
    'new', 'edit', 'delete', 'create', 'update', 'manage', 'dashboard',
    'settings', 'config', 'help', 'support', 'about', 'contact', 'privacy',
    'terms', 'legal', 'copyright', 'null', 'undefined', 'true', 'false',
  ];

  static validateCategoryName(name: string): void {
    const validation = CategoryPolicies.validateCategoryName(name);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
  }

  static validateAndNormalizeCategorySlug(slug: string): string {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Category slug is required');
    }

    const normalizedSlug = slug.trim().toLowerCase();
    
    const validation = CategoryPolicies.validateCategorySlug(normalizedSlug);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    // Check reserved slugs
    if (this.RESERVED_SLUGS.includes(normalizedSlug)) {
      throw new BadRequestException(`"${normalizedSlug}" is a reserved slug and cannot be used`);
    }

    return normalizedSlug;
  }

  static generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFC')
      // Replace spaces and special characters with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Remove consecutive hyphens
      .replace(/-+/g, '-');
  }

  static validateCategoryDescription(description?: string): void {
    if (description) {
      if (description.length > 2000) {
        throw new BadRequestException('Category description must not exceed 2000 characters');
      }
    }
  }

  static validateSeoFields(seoTitle?: string, seoDescription?: string, seoKeywords?: string[]): void {
    if (seoTitle) {
      const titleValidation = CategoryPolicies.validateSeoTitle(seoTitle);
      if (!titleValidation.isValid) {
        throw new BadRequestException(`SEO Title: ${titleValidation.errors.join('; ')}`);
      }
    }

    if (seoDescription) {
      const descValidation = CategoryPolicies.validateSeoDescription(seoDescription);
      if (!descValidation.isValid) {
        throw new BadRequestException(`SEO Description: ${descValidation.errors.join('; ')}`);
      }
    }

    if (seoKeywords) {
      if (seoKeywords.length > 10) {
        throw new BadRequestException('SEO keywords should not exceed 10 items');
      }

      for (const keyword of seoKeywords) {
        if (keyword.length > 50) {
          throw new BadRequestException('Each SEO keyword should not exceed 50 characters');
        }
      }
    }
  }

  static validateUrl(url: string, fieldName: string): void {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new BadRequestException(`${fieldName} must use HTTP or HTTPS protocol`);
      }

      // Basic domain validation
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        throw new BadRequestException(`${fieldName} must have a valid domain`);
      }

    } catch (error) {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }
  }

  static validateBrandIds(brandIds: string[], fieldName: string): void {
    if (!Array.isArray(brandIds)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    if (brandIds.length > 100) {
      throw new BadRequestException(`${fieldName} cannot exceed 100 items`);
    }

    // Validate each brand ID format (assuming CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    for (const brandId of brandIds) {
      if (typeof brandId !== 'string' || !cuidPattern.test(brandId)) {
        throw new BadRequestException(`Invalid brand ID format in ${fieldName}: ${brandId}`);
      }
    }

    // Check for duplicates
    const uniqueIds = new Set(brandIds);
    if (uniqueIds.size !== brandIds.length) {
      throw new BadRequestException(`Duplicate brand IDs are not allowed in ${fieldName}`);
    }
  }

  static validateDisplayOrder(displayOrder: number): void {
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      throw new BadRequestException('Display order must be a non-negative integer');
    }

    if (displayOrder > 999999) {
      throw new BadRequestException('Display order cannot exceed 999999');
    }
  }

  static validateTreeDepth(depth: number): void {
    if (depth < 0) {
      throw new BadRequestException('Tree depth cannot be negative');
    }

    if (depth > CategoryPolicies.MAX_TREE_DEPTH) {
      throw new BadRequestException(`Tree depth cannot exceed ${CategoryPolicies.MAX_TREE_DEPTH} levels`);
    }
  }

  static validateCategoryPath(path: string): void {
    const validation = CategoryPolicies.validateCategoryPath(path);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
  }

  static validatePathIds(pathIds: string[]): void {
    if (!Array.isArray(pathIds)) {
      throw new BadRequestException('Path IDs must be an array');
    }

    if (pathIds.length > CategoryPolicies.MAX_TREE_DEPTH) {
      throw new BadRequestException(`Path IDs cannot exceed ${CategoryPolicies.MAX_TREE_DEPTH} items`);
    }

    // Validate each ID format
    const cuidPattern = /^c[a-z0-9]{24}$/;
    for (const id of pathIds) {
      if (typeof id !== 'string' || !cuidPattern.test(id)) {
        throw new BadRequestException(`Invalid category ID format in path: ${id}`);
      }
    }

    // Check for duplicates
    const uniqueIds = new Set(pathIds);
    if (uniqueIds.size !== pathIds.length) {
      throw new BadRequestException('Duplicate category IDs in path are not allowed');
    }
  }

  static validateMetadata(metadata: any): void {
    if (metadata && typeof metadata !== 'object') {
      throw new BadRequestException('Metadata must be an object');
    }

    if (metadata) {
      const jsonString = JSON.stringify(metadata);
      if (jsonString.length > 10000) {
        throw new BadRequestException('Metadata size cannot exceed 10KB');
      }
    }
  }

  // Attribute validation
  static validateAttributeName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Attribute name is required');
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      throw new BadRequestException('Attribute name must be at least 2 characters long');
    }

    if (trimmedName.length > 50) {
      throw new BadRequestException('Attribute name must not exceed 50 characters');
    }

    // Check for valid characters
    const validNamePattern = /^[a-zA-Z0-9\s\-'&.()]+$/;
    if (!validNamePattern.test(trimmedName)) {
      throw new BadRequestException('Attribute name contains invalid characters');
    }
  }

  static validateAttributeSlug(slug: string): string {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Attribute slug is required');
    }

    const normalizedSlug = slug.trim().toLowerCase();

    if (normalizedSlug.length < 2) {
      throw new BadRequestException('Attribute slug must be at least 2 characters long');
    }

    if (normalizedSlug.length > 50) {
      throw new BadRequestException('Attribute slug must not exceed 50 characters');
    }

    // Slug pattern validation
    const validSlugPattern = /^[a-z0-9_]+$/;
    if (!validSlugPattern.test(normalizedSlug)) {
      throw new BadRequestException('Attribute slug must contain only lowercase letters, numbers, and underscores');
    }

    // Cannot start with number or underscore
    if (/^[0-9_]/.test(normalizedSlug)) {
      throw new BadRequestException('Attribute slug cannot start with a number or underscore');
    }

    return normalizedSlug;
  }

  static generateAttributeSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFC')
      // Replace spaces and special characters with underscores
      .replace(/[^a-z0-9]+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      // Remove consecutive underscores
      .replace(/_+/g, '_');
  }

  static validateAllowedValues(allowedValues: string[], attributeType: string): void {
    if (!Array.isArray(allowedValues)) {
      throw new BadRequestException('Allowed values must be an array');
    }

    if (allowedValues.length === 0) {
      throw new BadRequestException('At least one allowed value is required for select attributes');
    }

    if (allowedValues.length > 100) {
      throw new BadRequestException('Cannot have more than 100 allowed values');
    }

    // Check for duplicates
    const uniqueValues = new Set(allowedValues);
    if (uniqueValues.size !== allowedValues.length) {
      throw new BadRequestException('Duplicate values are not allowed');
    }

    // Validate each value
    for (const value of allowedValues) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new BadRequestException('All allowed values must be non-empty strings');
      }

      if (value.length > 100) {
        throw new BadRequestException('Each allowed value must not exceed 100 characters');
      }
    }
  }

  // Tree operation validation
  static validateMoveOperation(
    categoryId: string,
    newParentId: string | null,
    currentPath: string,
    newParentPath?: string
  ): void {
    // Cannot move to self
    if (categoryId === newParentId) {
      throw new BadRequestException('Cannot move category to itself');
    }

    // Cannot move to descendant
    if (newParentPath && newParentPath.startsWith(currentPath + '/')) {
      throw new BadRequestException('Cannot move category to its own descendant');
    }

    // Validate new depth
    const newDepth = newParentPath ? newParentPath.split('/').length : 1;
    if (newDepth > CategoryPolicies.MAX_TREE_DEPTH) {
      throw new BadRequestException(`Move would exceed maximum tree depth of ${CategoryPolicies.MAX_TREE_DEPTH}`);
    }
  }

  // Bulk operation validation
  static validateBulkOperationSize(itemCount: number, operationType: string): void {
    const maxBulkSize = 100; // Configurable limit

    if (itemCount > maxBulkSize) {
      throw new BadRequestException(`Bulk ${operationType} cannot exceed ${maxBulkSize} items`);
    }

    if (itemCount === 0) {
      throw new BadRequestException(`Bulk ${operationType} requires at least one item`);
    }
  }
}