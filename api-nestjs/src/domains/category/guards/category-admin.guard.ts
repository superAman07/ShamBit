import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CategoryService } from '../category.service';
import { UserRole } from '../../../common/types';

@Injectable()
export class CategoryAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly categoryService: CategoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Admin users have full access
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // For category operations, only admins are allowed
    // This is different from brands where sellers can manage their own brands
    throw new ForbiddenException(
      'Admin access required for category operations',
    );
  }
}
