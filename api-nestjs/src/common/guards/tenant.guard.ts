import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantService } from '../../infrastructure/tenant/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract tenant ID from header, subdomain, or path
    const tenantId = this.extractTenantId(request);

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate tenant access
    const hasAccess = await this.tenantService.validateTenantAccess(
      tenantId,
      user.sub,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    // Get tenant context and attach to request
    const tenantContext = await this.tenantService.getTenantContext(tenantId);
    request.tenant = tenantContext;

    return true;
  }

  private extractTenantId(request: any): string | null {
    // Priority: Header > Subdomain > Path parameter

    // 1. Check X-Tenant-ID header
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId) {
      return headerTenantId;
    }

    // 2. Check subdomain (e.g., tenant1.api.example.com)
    const host = request.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'api' && subdomain !== 'www') {
        return subdomain;
      }
    }

    // 3. Check path parameter
    const pathTenantId = request.params.tenantId;
    if (pathTenantId) {
      return pathTenantId;
    }

    return null;
  }
}
