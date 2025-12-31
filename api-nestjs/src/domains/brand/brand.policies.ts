import {
  BrandStatus,
  BrandStatusTransitions,
  ADMIN_ONLY_TRANSITIONS,
  USABLE_BRAND_STATUSES,
} from './enums/brand-status.enum';
import { BrandScope, BrandPermission } from './enums/brand-scope.enum';
import { Brand } from './entities/brand.entity';
import { UserRole } from '../../common/types';

export class BrandPolicies {
  // State machine validation
  static canTransitionTo(
    currentStatus: BrandStatus,
    newStatus: BrandStatus,
  ): boolean {
    const allowedTransitions = BrandStatusTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  static requiresAdminApproval(newStatus: BrandStatus): boolean {
    return ADMIN_ONLY_TRANSITIONS.includes(newStatus);
  }

  static isUsableInProducts(status: BrandStatus): boolean {
    return USABLE_BRAND_STATUSES.includes(status);
  }

  // Visibility and access policies
  static canUserViewBrand(
    brand: Brand,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Admins can view all brands
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Global brands are visible to all
    if (brand.scope === BrandScope.GLOBAL) {
      return true;
    }

    // Owner can always view their brand
    if (brand.sellerId === userId) {
      return true;
    }

    // For shared brands, check access table (would need to query BrandAccess)
    if (brand.scope === BrandScope.SELLER_SHARED) {
      // This would require a database query in practice
      return false; // Placeholder - implement in service layer
    }

    // Private brands only visible to owner
    return false;
  }

  static canUserUseBrand(
    brand: Brand,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Must be usable status first
    if (!this.isUsableInProducts(brand.status)) {
      return false;
    }

    // Admins can use any active brand
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Global brands are usable by all sellers
    if (brand.scope === BrandScope.GLOBAL) {
      return true;
    }

    // Owner can always use their brand
    if (brand.sellerId === userId) {
      return true;
    }

    // For shared brands, check USE permission (would need database query)
    if (brand.scope === BrandScope.SELLER_SHARED) {
      return false; // Placeholder - implement in service layer
    }

    return false;
  }

  static canUserModifyBrand(
    brand: Brand,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Admins can modify any brand
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Only owner can modify their brand
    if (brand.sellerId === userId) {
      return true;
    }

    return false;
  }

  static canUserDeleteBrand(
    brand: Brand,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins can delete brands
    return userRole === UserRole.ADMIN;
  }

  // Category constraint validation
  static canBrandBeUsedInCategory(brand: Brand, categoryId: string): boolean {
    // If allowed categories are specified, category must be in the list
    if (brand.allowedCategories && brand.allowedCategories.length > 0) {
      if (!brand.allowedCategories.includes(categoryId)) {
        return false;
      }
    }

    // If restricted categories are specified, category must not be in the list
    if (brand.restrictedCategories && brand.restrictedCategories.length > 0) {
      if (brand.restrictedCategories.includes(categoryId)) {
        return false;
      }
    }

    return true;
  }

  // Brand access granting policies
  static canGrantBrandAccess(
    brand: Brand,
    granterId: string,
    granterRole: UserRole,
    targetSellerId: string,
    permission: BrandPermission,
  ): boolean {
    // Admins can grant access to any brand
    if (granterRole === UserRole.ADMIN) {
      return true;
    }

    // Brand owner can grant access to their shared brands
    if (
      brand.sellerId === granterId &&
      brand.scope === BrandScope.SELLER_SHARED
    ) {
      return true;
    }

    // Cannot grant USE permission to private brands
    if (
      brand.scope === BrandScope.SELLER_PRIVATE &&
      permission === BrandPermission.USE
    ) {
      return false;
    }

    return false;
  }

  // Request validation policies
  static canCreateBrandRequest(userId: string, userRole: UserRole): boolean {
    // Only sellers can create brand requests
    return userRole === UserRole.SELLER;
  }

  static canHandleBrandRequest(userId: string, userRole: UserRole): boolean {
    // Only admins can handle brand requests
    return userRole === UserRole.ADMIN;
  }
}
