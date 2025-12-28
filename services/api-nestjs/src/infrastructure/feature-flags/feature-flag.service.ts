import { Injectable } from '@nestjs/common';
import { FeatureFlagRepository } from './feature-flag.repository';
import { LoggerService } from '../observability/logger.service';
import { RedisService } from '../redis/redis.service';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetRules?: Record<string, any>;
  environment: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeatureFlagDto {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetRules?: Record<string, any>;
  environment?: string;
}

export interface FeatureFlagContext {
  userId?: string;
  userRoles?: string[];
  sellerId?: string;
  environment?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FeatureFlagService {
  private readonly CACHE_PREFIX = 'feature_flag:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  // Helper method to transform Prisma result to FeatureFlag interface
  private transformToFeatureFlag(prismaFlag: any): FeatureFlag | null {
    if (!prismaFlag) return null;
    
    return {
      ...prismaFlag,
      description: prismaFlag.description || undefined, // Convert null to undefined
    };
  }

  // Helper method to transform array of Prisma results
  private transformToFeatureFlags(prismaFlags: any[]): FeatureFlag[] {
    return prismaFlags.map(flag => this.transformToFeatureFlag(flag)).filter(Boolean) as FeatureFlag[];
  }

  async isEnabled(
    flagKey: string,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    this.logger.debug('FeatureFlagService.isEnabled', { flagKey, context });

    // Try cache first
    const cacheKey = `${this.CACHE_PREFIX}${flagKey}`;
    const cachedFlag = await this.redisService.get(cacheKey);
    
    let flag: FeatureFlag | null;
    if (cachedFlag) {
      flag = JSON.parse(cachedFlag);
    } else {
      const prismaFlag = await this.featureFlagRepository.findByKey(flagKey);
      flag = this.transformToFeatureFlag(prismaFlag);
      if (flag) {
        await this.redisService.set(cacheKey, JSON.stringify(flag), this.CACHE_TTL);
      }
    }

    if (!flag) {
      this.logger.warn('Feature flag not found', { flagKey });
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.isEnabled) {
      return false;
    }

    // Check environment
    const currentEnv = context?.environment || process.env.NODE_ENV || 'production';
    if (flag.environment !== currentEnv) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashContext(flagKey, context);
      const percentage = hash % 100;
      if (percentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check target rules
    if (flag.targetRules && Object.keys(flag.targetRules).length > 0) {
      return this.evaluateTargetRules(flag.targetRules, context);
    }

    return true;
  }

  async createFlag(
    createDto: CreateFeatureFlagDto,
    createdBy: string,
  ): Promise<FeatureFlag> {
    this.logger.log('FeatureFlagService.createFlag', { key: createDto.key, createdBy });

    const prismaFlag = await this.featureFlagRepository.create({
      ...createDto,
      isEnabled: createDto.isEnabled ?? false,
      rolloutPercentage: createDto.rolloutPercentage ?? 0,
      environment: createDto.environment ?? 'production',
      createdBy,
    });

    const flag = this.transformToFeatureFlag(prismaFlag);

    // Invalidate cache
    await this.invalidateCache(flag!.key);

    return flag!;
  }

  async updateFlag(
    id: string,
    updateData: Partial<CreateFeatureFlagDto>,
  ): Promise<FeatureFlag> {
    this.logger.log('FeatureFlagService.updateFlag', { id, updateData });

    const prismaFlag = await this.featureFlagRepository.update(id, updateData);
    const flag = this.transformToFeatureFlag(prismaFlag);
    
    // Invalidate cache
    await this.invalidateCache(flag!.key);

    return flag!;
  }

  async toggleFlag(id: string): Promise<FeatureFlag> {
    this.logger.log('FeatureFlagService.toggleFlag', { id });

    const prismaFlag = await this.featureFlagRepository.findById(id);
    if (!prismaFlag) {
      throw new Error('Feature flag not found');
    }

    const updatedPrismaFlag = await this.featureFlagRepository.update(id, {
      isEnabled: !prismaFlag.isEnabled,
    });

    const updatedFlag = this.transformToFeatureFlag(updatedPrismaFlag);

    // Invalidate cache
    await this.invalidateCache(updatedFlag!.key);

    return updatedFlag!;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    const prismaFlags = await this.featureFlagRepository.findAll();
    return this.transformToFeatureFlags(prismaFlags);
  }

  async getFlagById(id: string): Promise<FeatureFlag | null> {
    const prismaFlag = await this.featureFlagRepository.findById(id);
    return this.transformToFeatureFlag(prismaFlag);
  }

  async getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]> {
    const prismaFlags = await this.featureFlagRepository.findByEnvironment(environment);
    return this.transformToFeatureFlags(prismaFlags);
  }

  // Bulk operations for performance
  async checkMultipleFlags(
    flagKeys: string[],
    context?: FeatureFlagContext,
  ): Promise<Record<string, boolean>> {
    this.logger.debug('FeatureFlagService.checkMultipleFlags', {
      flagKeys,
      context,
    });

    const results: Record<string, boolean> = {};

    // Check all flags in parallel
    const promises = flagKeys.map(async (key) => {
      const isEnabled = await this.isEnabled(key, context);
      return { key, isEnabled };
    });

    const flagResults = await Promise.all(promises);
    
    for (const result of flagResults) {
      results[result.key] = result.isEnabled;
    }

    return results;
  }

  // Gradual rollout helpers
  async increaseRollout(
    id: string,
    percentage: number,
  ): Promise<FeatureFlag> {
    this.logger.log('FeatureFlagService.increaseRollout', { id, percentage });

    const flag = await this.featureFlagRepository.findById(id);
    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const newPercentage = Math.min(100, Math.max(0, percentage));
    
    return this.updateFlag(id, { rolloutPercentage: newPercentage });
  }

  async killSwitch(id: string): Promise<FeatureFlag> {
    this.logger.warn('FeatureFlagService.killSwitch', { id });

    return this.updateFlag(id, {
      isEnabled: false,
      rolloutPercentage: 0,
    });
  }

  private hashContext(flagKey: string, context?: FeatureFlagContext): number {
    // Simple hash function for consistent rollout
    const str = `${flagKey}:${context?.userId || 'anonymous'}`;
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  private evaluateTargetRules(
    rules: Record<string, any>,
    context?: FeatureFlagContext,
  ): boolean {
    if (!context) {
      return false;
    }

    // User ID targeting
    if (rules.userIds && Array.isArray(rules.userIds)) {
      if (context.userId && rules.userIds.includes(context.userId)) {
        return true;
      }
    }

    // Role targeting
    if (rules.roles && Array.isArray(rules.roles) && context.userRoles) {
      const hasRole = rules.roles.some(role => context.userRoles!.includes(role));
      if (hasRole) {
        return true;
      }
    }

    // Seller targeting
    if (rules.sellerIds && Array.isArray(rules.sellerIds)) {
      if (context.sellerId && rules.sellerIds.includes(context.sellerId)) {
        return true;
      }
    }

    // Custom metadata rules
    if (rules.metadata && context.metadata) {
      for (const [key, value] of Object.entries(rules.metadata)) {
        if (context.metadata[key] === value) {
          return true;
        }
      }
    }

    return false;
  }

  private async invalidateCache(flagKey: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${flagKey}`;
    await this.redisService.del(cacheKey);
  }
}