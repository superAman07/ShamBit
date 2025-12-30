import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface AttributeOption {
  attributeId: string;
  attributeName: string;
  values: string[];
}

export interface VariantCombination {
  attributeValues: Record<string, string>;
  hash: string;
}

export interface CombinationOptions {
  maxCombinations?: number;
  enabledCombinations?: string[]; // Hashes of enabled combinations
  disabledCombinations?: string[]; // Hashes of disabled combinations
  sortOrder?: 'alphabetical' | 'frequency' | 'custom';
}

@Injectable()
export class VariantCombinatorService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Generate all possible variant combinations from attribute options
   */
  generateCombinations(
    attributeOptions: AttributeOption[],
    options: CombinationOptions = {}
  ): VariantCombination[] {
    this.logger.log('VariantCombinatorService.generateCombinations', {
      attributeCount: attributeOptions.length,
      options,
    });

    if (attributeOptions.length === 0) {
      return [];
    }

    // Validate input
    this.validateAttributeOptions(attributeOptions);

    // Generate cartesian product
    const combinations = this.generateCartesianProduct(attributeOptions);

    // Apply filters and limits
    let filteredCombinations = this.applyFilters(combinations, options);

    // Apply sorting
    filteredCombinations = this.applySorting(filteredCombinations, options);

    // Apply limit
    if (options.maxCombinations && filteredCombinations.length > options.maxCombinations) {
      this.logger.warn('Combination limit exceeded', {
        generated: filteredCombinations.length,
        limit: options.maxCombinations,
      });
      filteredCombinations = filteredCombinations.slice(0, options.maxCombinations);
    }

    this.logger.log('Combinations generated successfully', {
      total: filteredCombinations.length,
    });

    return filteredCombinations;
  }

  /**
   * Generate combinations incrementally for large datasets
   */
  *generateCombinationsIterator(
    attributeOptions: AttributeOption[],
    options: CombinationOptions = {}
  ): Generator<VariantCombination, void, unknown> {
    if (attributeOptions.length === 0) {
      return;
    }

    this.validateAttributeOptions(attributeOptions);

    const indices = new Array(attributeOptions.length).fill(0);
    const maxIndices = attributeOptions.map(attr => attr.values.length - 1);
    let count = 0;

    do {
      // Build combination from current indices
      const attributeValues: Record<string, string> = {};
      for (let i = 0; i < attributeOptions.length; i++) {
        const attr = attributeOptions[i];
        attributeValues[attr.attributeId] = attr.values[indices[i]];
      }

      const combination: VariantCombination = {
        attributeValues,
        hash: this.generateCombinationHash(attributeValues),
      };

      // Apply filters
      if (this.shouldIncludeCombination(combination, options)) {
        yield combination;
        count++;

        // Check limit
        if (options.maxCombinations && count >= options.maxCombinations) {
          break;
        }
      }

      // Increment indices (like an odometer)
    } while (this.incrementIndices(indices, maxIndices));
  }

  /**
   * Calculate total possible combinations without generating them
   */
  calculateCombinationCount(attributeOptions: AttributeOption[]): number {
    if (attributeOptions.length === 0) {
      return 0;
    }

    return attributeOptions.reduce((total, attr) => total * attr.values.length, 1);
  }

  /**
   * Validate if a combination is valid
   */
  validateCombination(
    combination: Record<string, string>,
    attributeOptions: AttributeOption[]
  ): boolean {
    // Check if all required attributes are present
    const requiredAttributes = new Set(attributeOptions.map(attr => attr.attributeId));
    const providedAttributes = new Set(Object.keys(combination));

    if (requiredAttributes.size !== providedAttributes.size) {
      return false;
    }

    // Check if all attribute values are valid
    for (const attr of attributeOptions) {
      const value = combination[attr.attributeId];
      if (!value || !attr.values.includes(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a deterministic hash for a combination
   */
  generateCombinationHash(attributeValues: Record<string, string>): string {
    const sortedEntries = Object.entries(attributeValues)
      .sort(([a], [b]) => a.localeCompare(b));

    const combined = sortedEntries
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Find differences between two sets of combinations
   */
  compareCombinations(
    oldCombinations: VariantCombination[],
    newCombinations: VariantCombination[]
  ): {
    added: VariantCombination[];
    removed: VariantCombination[];
    unchanged: VariantCombination[];
  } {
    const oldHashes = new Set(oldCombinations.map(c => c.hash));
    const newHashes = new Set(newCombinations.map(c => c.hash));

    const added = newCombinations.filter(c => !oldHashes.has(c.hash));
    const removed = oldCombinations.filter(c => !newHashes.has(c.hash));
    const unchanged = newCombinations.filter(c => oldHashes.has(c.hash));

    return { added, removed, unchanged };
  }

  /**
   * Optimize attribute order for better performance
   */
  optimizeAttributeOrder(attributeOptions: AttributeOption[]): AttributeOption[] {
    // Sort by value count (ascending) to minimize early combinations
    return [...attributeOptions].sort((a, b) => a.values.length - b.values.length);
  }

  private validateAttributeOptions(attributeOptions: AttributeOption[]): void {
    if (attributeOptions.length === 0) {
      throw new Error('At least one attribute option is required');
    }

    for (const attr of attributeOptions) {
      if (!attr.attributeId || !attr.attributeName) {
        throw new Error('Attribute ID and name are required');
      }

      if (!attr.values || attr.values.length === 0) {
        throw new Error(`Attribute ${attr.attributeName} must have at least one value`);
      }

      // Check for duplicate values
      const uniqueValues = new Set(attr.values);
      if (uniqueValues.size !== attr.values.length) {
        throw new Error(`Attribute ${attr.attributeName} has duplicate values`);
      }
    }

    // Check for duplicate attribute IDs
    const attributeIds = attributeOptions.map(attr => attr.attributeId);
    const uniqueIds = new Set(attributeIds);
    if (uniqueIds.size !== attributeIds.length) {
      throw new Error('Duplicate attribute IDs found');
    }

    // Warn about large combination counts
    const totalCombinations = this.calculateCombinationCount(attributeOptions);
    if (totalCombinations > 10000) {
      this.logger.warn('Large number of combinations detected', {
        totalCombinations,
        attributeOptions: attributeOptions.map(attr => ({
          id: attr.attributeId,
          valueCount: attr.values.length,
        })),
      });
    }
  }

  private generateCartesianProduct(attributeOptions: AttributeOption[]): VariantCombination[] {
    const result: VariantCombination[] = [];
    const indices = new Array(attributeOptions.length).fill(0);
    const maxIndices = attributeOptions.map(attr => attr.values.length - 1);

    do {
      const attributeValues: Record<string, string> = {};
      for (let i = 0; i < attributeOptions.length; i++) {
        const attr = attributeOptions[i];
        attributeValues[attr.attributeId] = attr.values[indices[i]];
      }

      result.push({
        attributeValues,
        hash: this.generateCombinationHash(attributeValues),
      });
    } while (this.incrementIndices(indices, maxIndices));

    return result;
  }

  private incrementIndices(indices: number[], maxIndices: number[]): boolean {
    for (let i = indices.length - 1; i >= 0; i--) {
      if (indices[i] < maxIndices[i]) {
        indices[i]++;
        return true;
      }
      indices[i] = 0;
    }
    return false;
  }

  private applyFilters(
    combinations: VariantCombination[],
    options: CombinationOptions
  ): VariantCombination[] {
    return combinations.filter(combination => this.shouldIncludeCombination(combination, options));
  }

  private shouldIncludeCombination(
    combination: VariantCombination,
    options: CombinationOptions
  ): boolean {
    // Check if explicitly disabled
    if (options.disabledCombinations?.includes(combination.hash)) {
      return false;
    }

    // If enabled combinations are specified, only include those
    if (options.enabledCombinations?.length) {
      return options.enabledCombinations.includes(combination.hash);
    }

    return true;
  }

  private applySorting(
    combinations: VariantCombination[],
    options: CombinationOptions
  ): VariantCombination[] {
    switch (options.sortOrder) {
      case 'alphabetical':
        return combinations.sort((a, b) => {
          const aStr = this.combinationToString(a.attributeValues);
          const bStr = this.combinationToString(b.attributeValues);
          return aStr.localeCompare(bStr);
        });

      case 'frequency':
        // In a real implementation, you might sort by historical sales or popularity
        return combinations;

      case 'custom':
        // Custom sorting would be implemented based on business rules
        return combinations;

      default:
        return combinations;
    }
  }

  private combinationToString(attributeValues: Record<string, string>): string {
    return Object.entries(attributeValues)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
  }
}