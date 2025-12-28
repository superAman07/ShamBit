import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ConfigValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  tenantId?: string;
  environment?: string;
  description?: string;
  isSecret?: boolean;
}

@Injectable()
export class DynamicConfigService implements OnModuleInit {
  private readonly logger = new Logger(DynamicConfigService.name);
  private readonly CONFIG_CACHE_TTL = 300; // 5 minutes
  private readonly configCache = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Load initial configuration
    await this.loadConfiguration();
    
    // Set up configuration refresh interval
    setInterval(() => {
      this.refreshConfiguration();
    }, 60000); // Refresh every minute
  }

  async get<T = any>(
    key: string,
    defaultValue?: T,
    tenantId?: string,
    environment?: string,
  ): Promise<T> {
    const cacheKey = this.buildCacheKey(key, tenantId, environment);
    
    // Check memory cache first
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey);
    }

    // Check Redis cache
    const cached = await this.redis.get(`config:${cacheKey}`);
    if (cached) {
      const value = JSON.parse(cached);
      this.configCache.set(cacheKey, value);
      return value;
    }

    // Fetch from database with priority order
    const config = await this.fetchConfigFromDB(key, tenantId, environment);
    
    if (config) {
      const value = this.parseConfigValue(config.value, config.type);
      
      // Cache the result
      this.configCache.set(cacheKey, value);
      await this.redis.set(
        `config:${cacheKey}`,
        JSON.stringify(value),
        this.CONFIG_CACHE_TTL,
      );
      
      return value;
    }

    return defaultValue as T;
  }

  async set(
    key: string,
    value: any,
    type: ConfigValue['type'] = 'string',
    tenantId?: string,
    environment?: string,
    description?: string,
    isSecret: boolean = false,
  ): Promise<void> {
    const serializedValue = this.serializeConfigValue(value, type);
    
    await this.prisma.configuration.upsert({
      where: {
        key_tenantId_environment: {
          key,
          tenantId: tenantId || '',
          environment: environment || process.env.NODE_ENV || 'development',
        },
      },
      update: {
        value: serializedValue,
        type,
        description,
        isSecret,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: serializedValue,
        type,
        tenantId: tenantId || '',
        environment: environment || process.env.NODE_ENV || 'development',
        description,
        isSecret,
      },
    });

    // Invalidate cache
    const cacheKey = this.buildCacheKey(key, tenantId, environment);
    this.configCache.delete(cacheKey);
    await this.redis.del(`config:${cacheKey}`);

    // Emit configuration change event
    this.eventEmitter.emit('config.changed', {
      key,
      value,
      tenantId,
      environment,
    });

    this.logger.log(`Configuration updated: ${key}`);
  }

  async delete(key: string, tenantId?: string, environment?: string): Promise<void> {
    await this.prisma.configuration.delete({
      where: {
        key_tenantId_environment: {
          key,
          tenantId: tenantId || '',
          environment: environment || process.env.NODE_ENV || 'development',
        },
      },
    });

    // Invalidate cache
    const cacheKey = this.buildCacheKey(key, tenantId, environment);
    this.configCache.delete(cacheKey);
    await this.redis.del(`config:${cacheKey}`);

    this.logger.log(`Configuration deleted: ${key}`);
  }

  async getAll(tenantId?: string, environment?: string): Promise<ConfigValue[]> {
    const configs = await this.prisma.configuration.findMany({
      where: {
        tenantId: tenantId || '',
        environment: environment || process.env.NODE_ENV || 'development',
      },
      orderBy: { key: 'asc' },
    });

    return configs.map(config => ({
      key: config.key,
      value: this.parseConfigValue(config.value, config.type),
      type: config.type as ConfigValue['type'],
      tenantId: config.tenantId || undefined,
      environment: config.environment,
      description: config.description || undefined,
      isSecret: config.isSecret,
    }));
  }

  async reload(): Promise<void> {
    this.logger.log('Reloading configuration...');
    
    // Clear caches
    this.configCache.clear();
    await this.redis.del('config:*');
    
    // Reload from database
    await this.loadConfiguration();
    
    this.eventEmitter.emit('config.reloaded');
    this.logger.log('Configuration reloaded');
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configs = await this.prisma.configuration.findMany();
      
      for (const config of configs) {
        const cacheKey = this.buildCacheKey(
          config.key,
          config.tenantId || undefined,
          config.environment,
        );
        
        const value = this.parseConfigValue(config.value, config.type);
        this.configCache.set(cacheKey, value);
      }
      
      this.logger.log(`Loaded ${configs.length} configuration entries`);
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
    }
  }

  private async refreshConfiguration(): Promise<void> {
    try {
      // Check for configuration changes
      const lastUpdate = await this.redis.get('config:last_update');
      const currentTime = new Date();
      
      if (lastUpdate) {
        const lastUpdateTime = new Date(lastUpdate);
        const timeDiff = currentTime.getTime() - lastUpdateTime.getTime();
        
        // Only refresh if it's been more than 5 minutes
        if (timeDiff < 300000) {
          return;
        }
      }

      await this.loadConfiguration();
      await this.redis.set('config:last_update', currentTime.toISOString());
    } catch (error) {
      this.logger.error('Failed to refresh configuration', error);
    }
  }

  private async fetchConfigFromDB(
    key: string,
    tenantId?: string,
    environment?: string,
  ): Promise<any> {
    const currentEnv = environment || process.env.NODE_ENV || 'development';
    
    // Priority order: tenant+environment > tenant+default > global+environment > global+default
    const queries = [
      { key, tenantId: tenantId || '', environment: currentEnv },
      { key, tenantId: tenantId || '', environment: 'default' },
      { key, tenantId: '', environment: currentEnv },
      { key, tenantId: '', environment: 'default' },
    ];

    for (const query of queries) {
      const config = await this.prisma.configuration.findUnique({
        where: {
          key_tenantId_environment: query,
        },
      });

      if (config) {
        return config;
      }
    }

    return null;
  }

  private buildCacheKey(key: string, tenantId?: string, environment?: string): string {
    const env = environment || process.env.NODE_ENV || 'development';
    const tenant = tenantId || 'global';
    return `${key}:${tenant}:${env}`;
  }

  private parseConfigValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private serializeConfigValue(value: any, type: string): string {
    switch (type) {
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }
}