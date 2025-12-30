import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BrandService } from '../brand.service';
import { UserRole } from '../../../common/types';

@Injectable()
export class BrandOwnershipGuard implements CanActivate {
  constructor(
    private readonly brandService: BrandService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const brandId = request.params.id;

    if (!user || !brandId) {
      throw new ForbiddenException('Authentication required');
    }

    // Admins can access any brand
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    try {
      const brand = await this.brandService.findById(brandId);

      // Check if seller owns the brand or if it's a global brand they can access
      if (user.role === UserRole.SELLER) {
        // Sellers can only modify their own brands
        if (brand.sellerId === user.id) {
          return true;
        }

        // For read operations on global brands, allow access
        const method = request.method;
        if (method === 'GET' && brand.isGlobal) {
          return true;
        }
      }

      throw new ForbiddenException('Insufficient permissions to access this brand');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ForbiddenException('Access denied');
    }
  }
}