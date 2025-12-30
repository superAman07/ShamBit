import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContext, TenantType, TenantLimits } from '../../common/types/tenant.types';

@Injectable()
export class TenantService {
  private readonly TENANT_CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getTenantContext(tenantId: string): Promise<TenantContext> {
    const cacheKey = `tenant:${tenantId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        tenantFeatures: {
          include: { feature: true }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const context: TenantContext = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantType: tenant.type as TenantType,
      features: tenant.tenantFeatures.map(tf => tf.feature.name),
      limits: this.getTenantLimits(tenant.type as TenantType),
    };

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(context), this.TENANT_CACHE_TTL);

    return context;
  }

  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    const userTenant = await this.prisma.userTenant.findFirst({
      where: {
        userId,
        tenantId,
        status: 'ACTIVE'
      }
    });

    return !!userTenant;
  }

  async checkTenantLimits(tenantId: string, resource: string, currentCount: number): Promise<void> {
    const context = await this.getTenantContext(tenantId);
    const limits = context.limits;

    switch (resource) {
      case 'users':
        if (currentCount >= limits.maxUsers) {
          throw new ForbiddenException(`Tenant has reached maximum users limit: ${limits.maxUsers}`);
        }
        break;
      case 'products':
        if (currentCount >= limits.maxProducts) {
          throw new ForbiddenException(`Tenant has reached maximum products limit: ${limits.maxProducts}`);
        }
        break;
      case 'orders':
        if (currentCount >= limits.maxOrders) {
          throw new ForbiddenException(`Tenant has reached maximum orders limit: ${limits.maxOrders}`);
        }
        break;
    }
  }

  async hasFeature(tenantId: string, featureName: string): Promise<boolean> {
    const context = await this.getTenantContext(tenantId);
    return context.features.includes(featureName);
  }

  private getTenantLimits(tenantType: TenantType): TenantLimits {
    const limitsMap = {
      [TenantType.TRIAL]: {
        maxUsers: 5,
        maxProducts: 50,
        maxOrders: 100,
        maxStorage: 100,
        apiRateLimit: 100,
        features: ['basic_analytics', 'email_support']
      },
      [TenantType.STARTER]: {
        maxUsers: 25,
        maxProducts: 500,
        maxOrders: 1000,
        maxStorage: 1000,
        apiRateLimit: 500,
        features: ['basic_analytics', 'email_support', 'custom_branding']
      },
      [TenantType.BUSINESS]: {
        maxUsers: 100,
        maxProducts: 5000,
        maxOrders: 10000,
        maxStorage: 10000,
        apiRateLimit: 2000,
        features: ['advanced_analytics', 'priority_support', 'custom_branding', 'api_access', 'webhooks']
      },
      [TenantType.ENTERPRISE]: {
        maxUsers: -1, // unlimited
        maxProducts: -1,
        maxOrders: -1,
        maxStorage: -1,
        apiRateLimit: 10000,
        features: ['all']
      }
    };

    return limitsMap[tenantType];
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    await this.redis.del(`tenant:${tenantId}`);
  }
}