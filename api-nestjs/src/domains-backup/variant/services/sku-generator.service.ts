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
    try {
      // Get SKU configuration from key-value store
      const configs = await this.prisma.configuration.findMany({
        where: {
          key: {
            in: [
              `sku.${sellerId}.prefix`,
              `sku.${sellerId}.suffix`, 
              `sku.${sellerId}.pattern`,
              `sku.${sellerId}.template`,
              `sku.${sellerId}.counter`,
              `sku.${sellerId}.isActive`
            ]
          }
        }
      });

      const configMap = new Map(configs.map(c => [c.key, c.value]));
      
      const isActive = configMap.get(`sku.${sellerId}.isActive`) === 'true';
      
      if (!isActive) {
        // Return default configuration
        return {
          prefix: '',
          suffix: '',
          pattern: 'AUTO',
          counter: 1,
        };
      }

      return {
        prefix: (configMap.get(`sku.${sellerId}.prefix`) as string) || '',
        suffix: (configMap.get(`sku.${sellerId}.suffix`) as string) || '',
        pattern: (configMap.get(`sku.${sellerId}.pattern`) as 'AUTO' | 'CUSTOM' | 'TEMPLATE') || 'AUTO',
        template: (configMap.get(`sku.${sellerId}.template`) as string) || undefined,
        counter: parseInt((configMap.get(`sku.${sellerId}.counter`) as string) || '1'),
      };
    } catch (error) {
      this.logger.error('Failed to get SKU configuration', error, { sellerId });
      // Return default configuration on error
      return {
        prefix: '',
        suffix: '',
        pattern: 'AUTO',
        counter: 1,
      };
    }
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
    try {
      // Atomic counter increment using transaction
      const counterKey = `sku.${sellerId}.counter`;
      
      return await this.prisma.$transaction(async (tx) => {
        // Get current counter value
        const currentConfig = await tx.configuration.findUnique({
          where: { 
            key_tenantId_environment: {
              key: counterKey,
              tenantId: '',
              environment: 'production'
            }
          }
        });

        const currentValue = currentConfig ? parseInt(currentConfig.value) : 0;
        const nextValue = currentValue + 1;

        // Update counter
        await tx.configuration.upsert({
          where: { 
            key_tenantId_environment: {
              key: counterKey,
              tenantId: '',
              environment: 'production'
            }
          },
          create: {
            key: counterKey,
            value: nextValue.toString(),
            type: 'number',
            tenantId: '',
            environment: 'production'
          },
          update: {
            value: nextValue.toString()
          }
        });

        return nextValue;
      });
    } catch (error) {
      this.logger.error('Failed to get next counter', error, { sellerId });
      // Fallback to timestamp-based counter
      return Date.now() % 10000;
    }
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
    try {
      // Update each configuration value separately
      const updates: Promise<void>[] = [];
      
      if (config.prefix !== undefined) {
        updates.push(this.upsertConfigValue(`sku.${sellerId}.prefix`, config.prefix));
      }
      if (config.suffix !== undefined) {
        updates.push(this.upsertConfigValue(`sku.${sellerId}.suffix`, config.suffix));
      }
      if (config.pattern !== undefined) {
        updates.push(this.upsertConfigValue(`sku.${sellerId}.pattern`, config.pattern));
      }
      if (config.template !== undefined) {
        updates.push(this.upsertConfigValue(`sku.${sellerId}.template`, config.template));
      }
      if (config.counter !== undefined) {
        updates.push(this.upsertConfigValue(`sku.${sellerId}.counter`, config.counter.toString()));
      }
      
      // Set as active
      updates.push(this.upsertConfigValue(`sku.${sellerId}.isActive`, 'true'));
      
      await Promise.all(updates);
      
      this.logger.log('SKU configuration updated', { sellerId, config });
    } catch (error) {
      this.logger.error('Failed to update SKU configuration', error, { sellerId, config });
      throw error;
    }
  }

  private async upsertConfigValue(key: string, value: string): Promise<void> {
    await this.prisma.configuration.upsert({
      where: {
        key_tenantId_environment: {
          key,
          tenantId: '',
          environment: 'production'
        }
      },
      create: {
        key,
        value,
        type: 'string',
        tenantId: '',
        environment: 'production'
      },
      update: {
        value
      }
    });
  }

  async getSkuConfigurationForSeller(sellerId: string): Promise<SkuConfiguration | null> {
    try {
      const configs = await this.prisma.configuration.findMany({
        where: {
          key: {
            in: [
              `sku.${sellerId}.prefix`,
              `sku.${sellerId}.suffix`, 
              `sku.${sellerId}.pattern`,
              `sku.${sellerId}.template`,
              `sku.${sellerId}.counter`,
              `sku.${sellerId}.isActive`
            ]
          }
        }
      });

      if (configs.length === 0) return null;

      const configMap = new Map(configs.map(c => [c.key, c.value]));
      
      const isActive = configMap.get(`sku.${sellerId}.isActive`) === 'true';
      if (!isActive) return null;

      return {
        prefix: (configMap.get(`sku.${sellerId}.prefix`) as string) || '',
        suffix: (configMap.get(`sku.${sellerId}.suffix`) as string) || '',
        pattern: (configMap.get(`sku.${sellerId}.pattern`) as 'AUTO' | 'CUSTOM' | 'TEMPLATE') || 'AUTO',
        template: (configMap.get(`sku.${sellerId}.template`) as string) || undefined,
        counter: parseInt((configMap.get(`sku.${sellerId}.counter`) as string) || '1'),
      };
    } catch (error) {
      this.logger.error('Failed to get SKU configuration for seller', error, { sellerId });
      return null;
    }
  }
}