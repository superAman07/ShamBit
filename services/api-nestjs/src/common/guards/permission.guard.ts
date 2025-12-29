import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { AuthorizationService } from '../../infrastructure/authorization/authorization.service';
import { AuthorizationContext } from '../types/authorization.types';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    if (!user || !tenant) {
      throw new ForbiddenException('User or tenant context not found');
    }

    // Build authorization context
    const authContext: AuthorizationContext = {
      user: {
        id: user.sub,
        roles: user.roles || [],
        attributes: user.attributes || {},
      },
      tenant: {
        id: tenant.tenantId,
        type: tenant.tenantType,
        attributes: tenant.attributes || {},
      },
      resource: {
        type: this.extractResourceType(request),
        id: request.params.id,
        attributes: {},
      },
      environment: {
        timestamp: new Date(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    };

    // Check each required permission
    for (const permission of requiredPermissions) {
      const result = await this.authorizationService.authorize(
        authContext,
        permission,
      );

      if (!result.allowed) {
        throw new ForbiddenException(
          result.reason || `Permission '${permission}' denied`,
        );
      }
    }

    return true;
  }

  private extractResourceType(request: any): string {
    // Extract resource type from URL path
    const path = request.route?.path || request.url;
    const segments = path.split('/').filter(Boolean);
    
    // Assuming format: /api/v1/{resource}/...
    if (segments.length >= 3) {
      return segments[2]; // Skip 'api' and 'v1'
    }
    
    return 'unknown';
  }
}