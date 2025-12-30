import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  AuthorizationContext,
  AuthorizationResult,
  Permission,
  PolicyCondition,
  PolicyOperator,
} from '../../common/types/authorization.types';

@Injectable()
export class AuthorizationService {
  private readonly PERMISSION_CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async authorize(
    context: AuthorizationContext,
    requiredPermission: string,
  ): Promise<AuthorizationResult> {
    // Get user permissions
    const permissions = await this.getUserPermissions(
      context.user.id,
      context.tenant.id,
    );

    // Find matching permission
    const permission = permissions.find(p => 
      p.name === requiredPermission ||
      this.matchesResourceAction(p, requiredPermission)
    );

    if (!permission) {
      return {
        allowed: false,
        reason: `Permission '${requiredPermission}' not found`,
      };
    }

    // Evaluate conditions (ABAC)
    if (permission.conditions && permission.conditions.length > 0) {
      const conditionResult = this.evaluateConditions(
        permission.conditions,
        context,
      );

      if (!conditionResult.allowed) {
        return conditionResult;
      }
    }

    // Check ownership if required
    if (this.requiresOwnership(permission, context)) {
      const ownershipResult = await this.checkOwnership(context);
      if (!ownershipResult.allowed) {
        return ownershipResult;
      }
    }

    return { allowed: true };
  }

  async hasPermission(
    userId: string,
    tenantId: string,
    permission: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissions.some(p => 
      p.name === permission ||
      this.matchesResourceAction(p, permission)
    );
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}:${tenantId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, tenantId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    const permissions: Permission[] = [];
    
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const permission = rolePermission.permission;
        const conditions = Array.isArray(permission.conditions) 
          ? permission.conditions as unknown as PolicyCondition[]
          : [];
        
        permissions.push({
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          conditions,
        });
      }
    }

    // Cache the result
    await this.redis.set(
      cacheKey,
      JSON.stringify(permissions),
      this.PERMISSION_CACHE_TTL,
    );

    return permissions;
  }

  private matchesResourceAction(permission: Permission, required: string): boolean {
    // Format: resource:action (e.g., "product:read", "order:write")
    const [resource, action] = required.split(':');
    return permission.resource === resource && permission.action === action;
  }

  private evaluateConditions(
    conditions: PolicyCondition[],
    context: AuthorizationContext,
  ): AuthorizationResult {
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context);
      if (!result) {
        return {
          allowed: false,
          reason: `Condition failed: ${condition.attribute} ${condition.operator} ${condition.value}`,
        };
      }
    }

    return { allowed: true };
  }

  private evaluateCondition(
    condition: PolicyCondition,
    context: AuthorizationContext,
  ): boolean {
    const value = this.getAttributeValue(condition.attribute, context);
    
    switch (condition.operator) {
      case PolicyOperator.EQUALS:
        return value === condition.value;
      case PolicyOperator.NOT_EQUALS:
        return value !== condition.value;
      case PolicyOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(value);
      case PolicyOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case PolicyOperator.GREATER_THAN:
        return value > condition.value;
      case PolicyOperator.LESS_THAN:
        return value < condition.value;
      case PolicyOperator.CONTAINS:
        return typeof value === 'string' && value.includes(condition.value);
      case PolicyOperator.STARTS_WITH:
        return typeof value === 'string' && value.startsWith(condition.value);
      case PolicyOperator.ENDS_WITH:
        return typeof value === 'string' && value.endsWith(condition.value);
      default:
        return false;
    }
  }

  private getAttributeValue(attribute: string, context: AuthorizationContext): any {
    const [category, key] = attribute.split('.');
    
    switch (category) {
      case 'user':
        return context.user.attributes[key] || context.user[key];
      case 'tenant':
        return context.tenant.attributes[key] || context.tenant[key];
      case 'resource':
        return context.resource.attributes[key] || context.resource[key];
      case 'environment':
        return context.environment[key];
      default:
        return null;
    }
  }

  private requiresOwnership(permission: Permission, context: AuthorizationContext): boolean {
    return permission.conditions?.some(c => 
      c.attribute === 'resource.ownerId' || 
      c.attribute === 'user.id'
    ) || false;
  }

  private async checkOwnership(context: AuthorizationContext): Promise<AuthorizationResult> {
    if (!context.resource.id) {
      return { allowed: true }; // No specific resource to check ownership
    }

    // Check ownership based on resource type
    let ownerId: string | null = null;

    switch (context.resource.type) {
      case 'product':
        const product = await this.prisma.product.findUnique({
          where: { id: context.resource.id },
          select: { sellerId: true },
        });
        ownerId = product?.sellerId || null;
        break;
      case 'order':
        const order = await this.prisma.order.findUnique({
          where: { id: context.resource.id },
          select: { userId: true },
        });
        ownerId = order?.userId || null;
        break;
      // Add more resource types as needed
    }

    if (ownerId && ownerId !== context.user.id) {
      return {
        allowed: false,
        reason: 'Access denied: User is not the owner of this resource',
      };
    }

    return { allowed: true };
  }

  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    const cacheKey = `permissions:${userId}:${tenantId}`;
    await this.redis.del(cacheKey);
  }
}