import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

export interface SkuGenerationOptions {
  sellerId: string;
  productId: string;
  attributeValues?: Record<string, string>;
  customSku?: string;
}

export interface SkuConfiguration {
  prefix: string;
  suffix: string;
  pattern: 'AUTO' | 'CUSTOM' | 'TEMPLATE';
  template?: string;
  counter: number;
}

@Injectable()
export class SkuGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async generateSku(options: SkuGenerationOptions): Promise<string> {
    this.logger.log('SkuGeneratorService.generateSku', { options });

    // If custom SKU provided, validate and return
    if (options.customSku) {
      await this.validateSkuUniqueness(options.customSku);
      return options.customSku;
    }

    // Get seller's SKU configuration
    const config = await this.getSkuConfiguration(options.sellerId);
    
    switch (config.pattern) {
      case 'AUTO':
        return this.generateAutoSku(config, options);
      case 'TEMPLATE':
        return this.generateTemplateSku(config, options);
      case 'CUSTOM':
        throw new Error('Custom SKU pattern requires explicit SKU value');
      default:
        throw new Error(`Unknown SKU pattern: ${config.pattern}`);
    }
  }

  async validateSkuUniqueness(sku: string): Promise<void> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });

    if (existing) {
      throw new Error(`SKU '${sku}' already exists`);
    }
  }

  async reserveSku(sku: string, variantId: string): Promise<void> {
    // In a real implementation, you might want to use a separate table
    // for SKU reservations to handle race conditions better
    await this.validateSkuUniqueness(sku);
  }

  private async getSkuConfiguration(sellerId: string): Promise<SkuConfiguration> {
    const config = await this.prisma.skuConfiguration.findUnique({
      where: { sellerId },
    });

    if (!config || !config.isActive) {
      // Return default configuration
      return {
        prefix: '',
        suffix: '',
        pattern: 'AUTO',
        counter: 1,
      };
    }

    return {
      prefix: config.prefix,
      suffix: config.suffix,
      pattern: config.pattern as 'AUTO' | 'CUSTOM' | 'TEMPLATE',
      template: config.template || undefined,
      counter: config.counter,
    };
  }

  private async generateAutoSku(
    config: SkuConfiguration,
    options: SkuGenerationOptions
  ): Promise<string> {
    const maxAttempts = 10;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const counter = await this.getNextCounter(options.sellerId);
      const sku = this.buildAutoSku(config, counter, options);

      try {
        await this.validateSkuUniqueness(sku);
        return sku;
      } catch (error) {
        attempt++;
        this.logger.warn('SKU collision detected, retrying', { sku, attempt });
      }
    }

    throw new Error('Failed to generate unique SKU after maximum attempts');
  }

  private async generateTemplateSku(
    config: SkuConfiguration,
    options: SkuGenerationOptions
  ): Promise<string> {
    if (!config.template) {
      throw new Error('Template pattern requires template configuration');
    }

    const counter = await this.getNextCounter(options.sellerId);
    const sku = this.buildTemplateSku(config, counter, options);

    await this.validateSkuUniqueness(sku);
    return sku;
  }

  private buildAutoSku(
    config: SkuConfiguration,
    counter: number,
    options: SkuGenerationOptions
  ): string {
    const parts: string[] = [];

    // Add prefix
    if (config.prefix) {
      parts.push(config.prefix);
    }

    // Add product identifier (first 8 chars of product ID)
    parts.push(options.productId.substring(0, 8).toUpperCase());

    // Add counter (padded to 4 digits)
    parts.push(counter.toString().padStart(4, '0'));

    // Add attribute hash if variants exist
    if (options.attributeValues && Object.keys(options.attributeValues).length > 0) {
      const hash = this.generateAttributeHash(options.attributeValues);
      parts.push(hash);
    }

    // Add suffix
    if (config.suffix) {
      parts.push(config.suffix);
    }

    return parts.join('-');
  }

  private buildTemplateSku(
    config: SkuConfiguration,
    counter: number,
    options: SkuGenerationOptions
  ): string {
    let sku = config.template!;

    // Replace template variables
    sku = sku.replace('{PREFIX}', config.prefix || '');
    sku = sku.replace('{SUFFIX}', config.suffix || '');
    sku = sku.replace('{PRODUCT_ID}', options.productId.substring(0, 8).toUpperCase());
    sku = sku.replace('{COUNTER}', counter.toString().padStart(4, '0'));
    sku = sku.replace('{COUNTER_6}', counter.toString().padStart(6, '0'));
    sku = sku.replace('{TIMESTAMP}', Date.now().toString().slice(-8));

    // Replace attribute values
    if (options.attributeValues) {
      Object.entries(options.attributeValues).forEach(([key, value]) => {
        const placeholder = `{ATTR_${key.toUpperCase()}}`;
        sku = sku.replace(placeholder, this.sanitizeForSku(value));
      });
    }

    // Clean up any remaining template variables
    sku = sku.replace(/\{[^}]+\}/g, '');

    // Remove multiple consecutive separators
    sku = sku.replace(/[-_]{2,}/g, '-');

    // Remove leading/trailing separators
    sku = sku.replace(/^[-_]+|[-_]+$/g, '');

    return sku.toUpperCase();
  }

  private async getNextCounter(sellerId: string): Promise<number> {
    // Atomic counter increment
    const result = await this.prisma.skuConfiguration.update({
      where: { sellerId },
      data: { counter: { increment: 1 } },
      select: { counter: true },
    });

    return result.counter;
  }

  private generateAttributeHash(attributeValues: Record<string, string>): string {
    // Create a deterministic hash from attribute values
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

    return Math.abs(hash).toString(16).substring(0, 4).toUpperCase();
  }

  private sanitizeForSku(value: string): string {
    return value
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 8)
      .toUpperCase();
  }

  // Configuration management
  async updateSkuConfiguration(
    sellerId: string,
    config: Partial<SkuConfiguration>,
    updatedBy: string
  ): Promise<void> {
    await this.prisma.skuConfiguration.upsert({
      where: { sellerId },
      create: {
        sellerId,
        ...config,
        createdBy: updatedBy,
      },
      update: {
        ...config,
        updatedBy,
      },
    });

    this.logger.log('SKU configuration updated', { sellerId, config });
  }

  async getSkuConfigurationForSeller(sellerId: string): Promise<SkuConfiguration | null> {
    const config = await this.prisma.skuConfiguration.findUnique({
      where: { sellerId },
    });

    if (!config) return null;

    return {
      prefix: config.prefix,
      suffix: config.suffix,
      pattern: config.pattern as 'AUTO' | 'CUSTOM' | 'TEMPLATE',
      template: config.template || undefined,
      counter: config.counter,
    };
  }
}