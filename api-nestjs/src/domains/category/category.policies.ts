import {
  CategoryStatus,
  CategoryStatusTransitions,
  ADMIN_ONLY_TRANSITIONS,
  PRODUCT_ALLOWED_STATUSES,
} from './enums/category-status.enum';
import { CategoryVisibility } from './enums/category-visibility.enum';
import { Category } from './entities/category.entity';
import { UserRole } from '../../common/types';

export class CategoryPolicies {
  // Maximum tree depth to prevent infinite nesting
  static readonly MAX_TREE_DEPTH = 10;

  // Maximum number of children per category
  static readonly MAX_CHILDREN_PER_CATEGORY = 1000;

  // Maximum number of attributes per category
  static readonly MAX_ATTRIBUTES_PER_CATEGORY = 50;

  // State machine validation
  static canTransitionTo(
    currentStatus: CategoryStatus,
    newStatus: CategoryStatus,
  ): boolean {
    const allowedTransitions = CategoryStatusTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  static requiresAdminApproval(newStatus: CategoryStatus): boolean {
    return ADMIN_ONLY_TRANSITIONS.includes(newStatus);
  }

  static canHaveProducts(status: CategoryStatus): boolean {
    return PRODUCT_ALLOWED_STATUSES.includes(status);
  }

  // Access control policies
  static canUserViewCategory(
    category: Category,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Admins and Super Admins can view all categories
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check visibility rules
    switch (category.visibility) {
      case CategoryVisibility.PUBLIC:
        return category.isVisible();
      case CategoryVisibility.INTERNAL:
        return (
          [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SELLER].includes(
            userRole,
          ) && category.isVisible()
        );
      case CategoryVisibility.RESTRICTED:
        return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
      default:
        return false;
    }
  }

  static canUserModifyCategory(
    category: Category,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can modify categories
    return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
  }

  static canUserDeleteCategory(
    category: Category,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can delete categories
    return [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
  }

  static canUserCreateCategory(
    parentCategory: Category | null,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can create categories
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      return false;
    }

    // Check depth limit
    if (parentCategory && parentCategory.depth >= this.MAX_TREE_DEPTH) {
      return false;
    }

    // Check if parent can have children
    if (parentCategory && !parentCategory.canHaveChildren()) {
      return false;
    }

    return true;
  }

  // Tree operation policies
  static canMoveCategory(
    category: Category,
    newParent: Category | null,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can move categories
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      return false;
    }

    // Cannot move to self or descendant
    if (
      newParent &&
      (newParent.id === category.id || newParent.isDescendantOf(category.id))
    ) {
      return false;
    }

    // Check depth limit after move
    const newDepth = newParent ? newParent.depth + 1 : 0;
    if (newDepth + category.descendantCount > this.MAX_TREE_DEPTH) {
      return false;
    }

    // Check if new parent can have children
    if (newParent && !newParent.canHaveChildren()) {
      return false;
    }

    return true;
  }

  static canDeleteCategoryWithChildren(category: Category): boolean {
    // Can only delete if no children or all children are also being deleted
    return category.childCount === 0;
  }

  static canDeleteCategoryWithProducts(category: Category): boolean {
    // Can only delete if no products are assigned
    return category.productCount === 0;
  }

  // Brand constraint policies
  static canBrandBeUsedInCategory(
    category: Category,
    brandId: string,
  ): boolean {
    return category.canBrandBeUsed(brandId);
  }

  static validateBrandRequirement(
    category: Category,
    brandId?: string,
  ): boolean {
    return category.validateBrandRequirement(brandId);
  }

  // Attribute policies
  static canAddAttributeToCategory(
    category: Category,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can manage attributes
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      return false;
    }

    // Check attribute limit
    // Note: This would require querying the database in practice
    return true; // Placeholder
  }

  static canInheritAttribute(
    sourceCategory: Category,
    targetCategory: Category,
    attributeSlug: string,
  ): boolean {
    // Target must be a descendant of source
    if (!targetCategory.isDescendantOf(sourceCategory.id)) {
      return false;
    }

    // Attribute must be inheritable
    // Note: This would require checking the attribute properties
    return true; // Placeholder
  }

  static canOverrideAttribute(
    category: Category,
    attributeSlug: string,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Only admins and super admins can override attributes
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      return false;
    }

    // Attribute must be overridable
    // Note: This would require checking the attribute properties
    return true; // Placeholder
  }

  // Validation policies
  static validateCategoryName(name: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Category name is required');
    } else {
      const trimmedName = name.trim();

      if (trimmedName.length < 2) {
        errors.push('Category name must be at least 2 characters long');
      }

      if (trimmedName.length > 100) {
        errors.push('Category name must not exceed 100 characters');
      }

      // Check for invalid characters
      const validNamePattern = /^[a-zA-Z0-9\s\-'&.()]+$/;
      if (!validNamePattern.test(trimmedName)) {
        errors.push('Category name contains invalid characters');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateCategorySlug(slug: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!slug || slug.trim().length === 0) {
      errors.push('Category slug is required');
    } else {
      const trimmedSlug = slug.trim().toLowerCase();

      if (trimmedSlug.length < 2) {
        errors.push('Category slug must be at least 2 characters long');
      }

      if (trimmedSlug.length > 100) {
        errors.push('Category slug must not exceed 100 characters');
      }

      // Slug pattern validation
      const validSlugPattern = /^[a-z0-9-]+$/;
      if (!validSlugPattern.test(trimmedSlug)) {
        errors.push(
          'Category slug must contain only lowercase letters, numbers, and hyphens',
        );
      }

      // Cannot start or end with hyphen
      if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
        errors.push('Category slug cannot start or end with a hyphen');
      }

      // No consecutive hyphens
      if (/--/.test(trimmedSlug)) {
        errors.push('Category slug cannot contain consecutive hyphens');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateCategoryPath(path: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!path.startsWith('/')) {
      errors.push('Category path must start with /');
    }

    if (path.endsWith('/') && path !== '/') {
      errors.push('Category path cannot end with /');
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length > this.MAX_TREE_DEPTH) {
      errors.push(
        `Category path depth cannot exceed ${this.MAX_TREE_DEPTH} levels`,
      );
    }

    // Validate each segment
    for (const segment of segments) {
      const slugValidation = this.validateCategorySlug(segment);
      if (!slugValidation.isValid) {
        errors.push(
          `Invalid path segment "${segment}": ${slugValidation.errors.join(', ')}`,
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // SEO policies
  static validateSeoTitle(title?: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (title) {
      if (title.length > 60) {
        errors.push(
          'SEO title should not exceed 60 characters for optimal display',
        );
      }
      if (title.length < 10) {
        errors.push(
          'SEO title should be at least 10 characters for effectiveness',
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateSeoDescription(description?: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (description) {
      if (description.length > 160) {
        errors.push(
          'SEO description should not exceed 160 characters for optimal display',
        );
      }
      if (description.length < 50) {
        errors.push(
          'SEO description should be at least 50 characters for effectiveness',
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Performance policies
  static shouldRebuildMaterializedPath(
    oldParentId?: string,
    newParentId?: string,
  ): boolean {
    return oldParentId !== newParentId;
  }

  static shouldUpdateTreeStatistics(operation: string): boolean {
    return [
      'CREATE',
      'DELETE',
      'MOVE',
      'PRODUCT_ADD',
      'PRODUCT_REMOVE',
    ].includes(operation);
  }

  static shouldInvalidateCache(operation: string): boolean {
    return ['CREATE', 'UPDATE', 'DELETE', 'MOVE', 'STATUS_CHANGE'].includes(
      operation,
    );
  }
}
