import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProductService } from '../product.service';
import { UserRole } from '../../../common/types';

@Injectable()
export class ProductOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly productService: ProductService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const productId = request.params.id;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!productId) {
      throw new ForbiddenException('Product ID is required');
    }

    // Admin users have full access
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    try {
      // Get the product to check ownership
      const product = await this.productService.findById(
        productId,
        {},
        user.id,
        user.role,
      );

      // Check if user is the owner
      if (product.sellerId === user.id) {
        return true;
      }

      throw new ForbiddenException('You can only access your own products');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Product not found');
      }
      throw error;
    }
  }
}
