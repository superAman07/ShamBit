import { UserRole } from '../../common/types';

export class VariantPolicies {
  static canAccess(
    variant: any,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    if (!userId) return true;
    if (userRole === UserRole.SELLER && variant?.createdBy) {
      return variant.createdBy === userId;
    }
    return true;
  }
}
