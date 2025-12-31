import { BadRequestException } from '@nestjs/common';

export class BrandValidators {
  // Reserved words that cannot be used in brand names or slugs
  private static readonly RESERVED_WORDS = [
    'admin',
    'api',
    'www',
    'mail',
    'ftp',
    'localhost',
    'test',
    'staging',
    'dev',
    'development',
    'prod',
    'production',
    'app',
    'application',
    'system',
    'root',
    'null',
    'undefined',
    'true',
    'false',
    'brand',
    'brands',
    'category',
    'categories',
    'product',
    'products',
    'user',
    'users',
    'seller',
    'sellers',
    'admin',
    'admins',
    'support',
    'help',
    'about',
    'contact',
    'privacy',
    'terms',
    'legal',
    'copyright',
  ];

  // Profanity filter (basic implementation - use external service in production)
  private static readonly PROFANITY_WORDS: string[] = [
    // Add profanity words here - keeping empty for example
  ];

  // Trademark conflicts (would be populated from external service)
  private static readonly TRADEMARK_CONFLICTS: string[] = [
    // Add known trademark conflicts here
  ];

  static validateBrandName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Brand name is required');
    }

    const trimmedName = name.trim();

    // Length validation
    if (trimmedName.length < 2) {
      throw new BadRequestException(
        'Brand name must be at least 2 characters long',
      );
    }

    if (trimmedName.length > 100) {
      throw new BadRequestException(
        'Brand name must not exceed 100 characters',
      );
    }

    // Unicode normalization
    const normalizedName = trimmedName.normalize('NFC');

    // Case-insensitive reserved word check
    const lowerName = normalizedName.toLowerCase();
    if (this.RESERVED_WORDS.includes(lowerName)) {
      throw new BadRequestException(
        `"${trimmedName}" is a reserved word and cannot be used as a brand name`,
      );
    }

    // Profanity filter
    if (this.containsProfanity(lowerName)) {
      throw new BadRequestException(
        'Brand name contains inappropriate content',
      );
    }

    // Basic character validation (allow letters, numbers, spaces, hyphens, apostrophes)
    const validNamePattern = /^[a-zA-Z0-9\s\-'&.]+$/;
    if (!validNamePattern.test(normalizedName)) {
      throw new BadRequestException(
        'Brand name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods are allowed',
      );
    }

    // No leading/trailing spaces or special characters
    if (normalizedName !== normalizedName.trim()) {
      throw new BadRequestException(
        'Brand name cannot have leading or trailing spaces',
      );
    }

    // No consecutive spaces
    if (/\s{2,}/.test(normalizedName)) {
      throw new BadRequestException(
        'Brand name cannot contain consecutive spaces',
      );
    }
  }

  static validateBrandSlug(slug: string): string {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Brand slug is required');
    }

    const trimmedSlug = slug.trim().toLowerCase();

    // Length validation
    if (trimmedSlug.length < 2) {
      throw new BadRequestException(
        'Brand slug must be at least 2 characters long',
      );
    }

    if (trimmedSlug.length > 100) {
      throw new BadRequestException(
        'Brand slug must not exceed 100 characters',
      );
    }

    // Slug pattern validation (lowercase letters, numbers, hyphens only)
    const validSlugPattern = /^[a-z0-9-]+$/;
    if (!validSlugPattern.test(trimmedSlug)) {
      throw new BadRequestException(
        'Brand slug must contain only lowercase letters, numbers, and hyphens',
      );
    }

    // Cannot start or end with hyphen
    if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
      throw new BadRequestException(
        'Brand slug cannot start or end with a hyphen',
      );
    }

    // No consecutive hyphens
    if (/--/.test(trimmedSlug)) {
      throw new BadRequestException(
        'Brand slug cannot contain consecutive hyphens',
      );
    }

    // Reserved word check
    if (this.RESERVED_WORDS.includes(trimmedSlug)) {
      throw new BadRequestException(
        `"${trimmedSlug}" is a reserved slug and cannot be used`,
      );
    }

    return trimmedSlug;
  }

  static validateDescription(description?: string): void {
    if (description && description.length > 1000) {
      throw new BadRequestException(
        'Brand description must not exceed 1000 characters',
      );
    }

    if (description && this.containsProfanity(description.toLowerCase())) {
      throw new BadRequestException(
        'Brand description contains inappropriate content',
      );
    }
  }

  static validateUrl(url: string, fieldName: string): void {
    try {
      const urlObj = new URL(url);

      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new BadRequestException(
          `${fieldName} must use HTTP or HTTPS protocol`,
        );
      }

      // Basic domain validation
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        throw new BadRequestException(`${fieldName} must have a valid domain`);
      }
    } catch (error) {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }
  }

  static validateCategoryIds(categoryIds: string[]): void {
    if (!Array.isArray(categoryIds)) {
      throw new BadRequestException('Category IDs must be an array');
    }

    if (categoryIds.length === 0) {
      throw new BadRequestException('At least one category must be assigned');
    }

    if (categoryIds.length > 10) {
      throw new BadRequestException(
        'Cannot assign more than 10 categories to a brand',
      );
    }

    // Validate each category ID format (assuming CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    for (const categoryId of categoryIds) {
      if (typeof categoryId !== 'string' || !cuidPattern.test(categoryId)) {
        throw new BadRequestException(
          `Invalid category ID format: ${categoryId}`,
        );
      }
    }

    // Check for duplicates
    const uniqueIds = new Set(categoryIds);
    if (uniqueIds.size !== categoryIds.length) {
      throw new BadRequestException('Duplicate category IDs are not allowed');
    }
  }

  static generateSlugFromName(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .normalize('NFC')
        // Replace spaces and special characters with hyphens
        .replace(/[^a-z0-9]+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
    );
  }

  static validateBusinessJustification(justification: string): void {
    if (!justification || justification.trim().length === 0) {
      throw new BadRequestException('Business justification is required');
    }

    const trimmed = justification.trim();

    if (trimmed.length < 50) {
      throw new BadRequestException(
        'Business justification must be at least 50 characters long',
      );
    }

    if (trimmed.length > 2000) {
      throw new BadRequestException(
        'Business justification must not exceed 2000 characters',
      );
    }

    if (this.containsProfanity(trimmed.toLowerCase())) {
      throw new BadRequestException(
        'Business justification contains inappropriate content',
      );
    }
  }

  static validateIdempotencyKey(key?: string): void {
    if (key) {
      // UUID v4 format validation
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(key)) {
        throw new BadRequestException(
          'Idempotency key must be a valid UUID v4',
        );
      }
    }
  }

  // Check for trademark conflicts (placeholder - integrate with external service)
  static async checkTrademarkConflicts(name: string): Promise<void> {
    const lowerName = name.toLowerCase();

    // Basic check against known conflicts
    for (const conflict of this.TRADEMARK_CONFLICTS) {
      if (lowerName.includes(conflict.toLowerCase())) {
        throw new BadRequestException(
          `Brand name may conflict with trademark: ${conflict}`,
        );
      }
    }

    // TODO: Integrate with external trademark checking service
    // This would make API calls to trademark databases
  }

  private static containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.PROFANITY_WORDS.some((word) => lowerText.includes(word));
  }

  // Validate brand name uniqueness (case-insensitive)
  static normalizeForUniqueness(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .normalize('NFC')
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Remove common punctuation for comparison
        .replace(/[.,!?;:'"()[\]{}]/g, '')
    );
  }
}
