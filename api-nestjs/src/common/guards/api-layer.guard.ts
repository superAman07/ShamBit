import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ApiLayer,
  API_LAYER_KEY,
  API_KEY_REQUIRED_KEY,
} from '../decorators/api-layer.decorator';

@Injectable()
export class ApiLayerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLayer = this.reflector.getAllAndOverride<ApiLayer>(
      API_LAYER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(
      API_KEY_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredLayer) {
      return true; // No layer restriction
    }

    const request = context.switchToHttp().getRequest();

    // Check API key if required
    if (requiresApiKey) {
      const apiKey = this.extractApiKey(request);
      if (!apiKey) {
        throw new UnauthorizedException('API key required');
      }

      const validApiKey = await this.validateApiKey(apiKey, requiredLayer);
      if (!validApiKey) {
        throw new UnauthorizedException('Invalid API key');
      }

      request.apiKey = validApiKey;
    }

    // Validate access based on layer
    return this.validateLayerAccess(requiredLayer, request);
  }

  private extractApiKey(request: any): string | null {
    // Check header
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    // Check query parameter
    const queryKey = request.query.api_key;
    if (queryKey) {
      return queryKey;
    }

    return null;
  }

  private async validateApiKey(apiKey: string, layer: ApiLayer): Promise<any> {
    const key = await this.prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { tenant: true },
    });

    if (!key || !key.isActive) {
      return null;
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null;
    }

    // Check layer permissions
    if (!key.permissions.includes(layer)) {
      return null;
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return key;
  }

  private validateLayerAccess(layer: ApiLayer, request: any): boolean {
    const user = request.user;
    const tenant = request.tenant;

    switch (layer) {
      case ApiLayer.PUBLIC:
        // Public APIs are accessible to everyone
        return true;

      case ApiLayer.INTERNAL:
        // Internal APIs require authentication and internal service access
        if (!user) {
          throw new UnauthorizedException(
            'Authentication required for internal API',
          );
        }

        // Check if request is from internal service
        const internalToken = request.headers['x-internal-token'];
        if (
          !internalToken ||
          internalToken !== process.env.INTERNAL_API_TOKEN
        ) {
          throw new ForbiddenException('Internal API access denied');
        }
        return true;

      case ApiLayer.ADMIN:
        // Admin APIs require admin role
        if (!user) {
          throw new UnauthorizedException(
            'Authentication required for admin API',
          );
        }

        if (!user.roles?.includes('ADMIN')) {
          throw new ForbiddenException('Admin access required');
        }
        return true;

      case ApiLayer.PARTNER:
        // Partner APIs require partner API key or partner role
        if (request.apiKey) {
          return request.apiKey.type === 'PARTNER';
        }

        if (user && user.roles?.includes('PARTNER')) {
          return true;
        }

        throw new ForbiddenException('Partner access required');

      default:
        return false;
    }
  }
}
