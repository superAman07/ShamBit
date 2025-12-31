import { UserRole } from '../../common/types';

export class InventoryPolicies {
  static canAccess(
    inventory: any,
    userId?: string,
    userRole?: UserRole,
  ): boolean {
    if (!userId) return true;
    if (userRole === UserRole.SELLER && inventory?.sellerId) {
      return inventory.sellerId === userId;
    }
    return true;
  }
}
