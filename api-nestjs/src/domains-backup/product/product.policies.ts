import { ProductStatus } from './enums/product-status.enum';
import { ProductModerationStatus } from './enums/product-moderation-status.enum';
import { ProductVisibility } from './enums/product-visibility.enum';
import { Product } from './entities/product.entity';

export class ProductPolicies {
  // ============================================================================
  // PERMISSION POLICIES
  // ============================================================================

  static canUserViewProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Deleted products are not viewable
    if (product.isDeleted) {
      return false;
    }

    // Admins can view all products
    if (userRole === 'ADMIN') {
      return true;
    }

    // Owners can always view their own products
    if (userId === product.sellerId) {
      return true;
    }

    // Check visibility rules for non-owners
    switch (product.visibility) {
      case ProductVisibility.PUBLIC:
        // Public products are visible if published
        return product.status === ProductStatus.PUBLISHED;
      
      case ProductVisibility.INTERNAL:
        // Internal products are visible to sellers and admins
        return userRole === 'SELLER' || userRole === 'ADMIN';
      
      case ProductVisibility.PRIVATE:
        // Private products are only visible to owner and admins
        return false;
      
      default:
        return false;
    }
  }

  static canUserEditProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Deleted products cannot be edited
    if (product.isDeleted) {
      return false;
    }

    // Admins can edit all products
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can edit their products
    if (userId !== product.sellerId) {
      return false;
    }

    // Check if product is in an editable state
    return product.canBeEdited;
  }

  static canUserDeleteProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Already deleted products cannot be deleted again
    if (product.isDeleted) {
      return false;
    }

    // Admins can delete all products
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can delete their products
    if (userId !== product.sellerId) {
      return false;
    }

    // Check if product is in a deletable state
    return product.canBeDeleted;
  }

  static canUserModerateProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Only admins and moderators can moderate products
    return userRole === 'ADMIN' || userRole === 'MODERATOR';
  }

  static canUserPublishProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Admins can publish any product
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can publish their products
    if (userId !== product.sellerId) {
      return false;
    }

    // Check if product can be published
    return product.canBePublished;
  }

  static canUserFeatureProduct(
    product: Product,
    userId?: string,
    userRole?: string
  ): boolean {
    // Only admins can feature products
    if (userRole !== 'ADMIN') {
      return false;
    }

    // Product must be published to be featured
    return product.status === ProductStatus.PUBLISHED;
  }

  // ============================================================================
  // STATUS TRANSITION POLICIES
  // ============================================================================

  static canTransitionToStatus(
    currentStatus: ProductStatus,
    newStatus: ProductStatus,
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    const { canTransitionTo, isApprovalRequired } = require('./enums/product-status.enum');

    // Check if transition is allowed
    if (!canTransitionTo(currentStatus, newStatus)) {
      return false;
    }

    // Check user permissions for the transition
    if (isApprovalRequired(currentStatus, newStatus) && userRole !== 'ADMIN') {
      return false;
    }

    // Sellers can only transition their own products
    if (userRole === 'SELLER' && !isOwner) {
      return false;
    }

    return true;
  }

  static canTransitionToModerationStatus(
    currentStatus: ProductModerationStatus,
    newStatus: ProductModerationStatus,
    userRole?: string
  ): boolean {
    const { canModerationTransitionTo } = require('./enums/product-moderation-status.enum');

    // Check if transition is allowed
    if (!canModerationTransitionTo(currentStatus, newStatus)) {
      return false;
    }

    // Only admins and moderators can change moderation status
    return userRole === 'ADMIN' || userRole === 'MODERATOR';
  }

  // ============================================================================
  // BUSINESS RULE POLICIES
  // ============================================================================

  static canSubmitProduct(product: Product): boolean {
    // Product must be in draft status
    if (product.status !== ProductStatus.DRAFT) {
      return false;
    }

    // Product must have required fields
    if (!product.name || !product.description || !product.categoryId || !product.brandId) {
      return false;
    }

    // Product must have at least one image
    if (!product.images || product.images.length === 0) {
      return false;
    }

    return true;
  }

  static canApproveProduct(product: Product): boolean {
    // Product must be submitted for approval
    if (product.status !== ProductStatus.SUBMITTED) {
      return false;
    }

    // Product must be pending moderation or under review
    return [
      ProductModerationStatus.PENDING,
      ProductModerationStatus.REVIEWING
    ].includes(product.moderationStatus);
  }

  static canRejectProduct(product: Product): boolean {
    // Product must be submitted or approved
    return [ProductStatus.SUBMITTED, ProductStatus.APPROVED].includes(product.status);
  }

  static canPublishProduct(product: Product): boolean {
    // Product must be approved
    if (product.status !== ProductStatus.APPROVED) {
      return false;
    }

    // Product must be moderation approved
    if (product.moderationStatus !== ProductModerationStatus.APPROVED) {
      return false;
    }

    return true;
  }

  static canSuspendProduct(product: Product): boolean {
    // Can only suspend published products
    return product.status === ProductStatus.PUBLISHED;
  }

  static canArchiveProduct(product: Product): boolean {
    // Can archive products in any status except already archived
    return product.status !== ProductStatus.ARCHIVED;
  }

  // ============================================================================
  // CATEGORY & BRAND POLICIES
  // ============================================================================

  static canChangeCategoryTo(
    product: Product,
    newCategoryId: string,
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Admins can always change categories
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can change their product's category
    if (!isOwner) {
      return false;
    }

    // Can only change category for editable products
    if (!product.canBeEdited) {
      return false;
    }

    // Cannot change to the same category
    if (product.categoryId === newCategoryId) {
      return false;
    }

    return true;
  }

  static canChangeBrandTo(
    product: Product,
    newBrandId: string,
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Admins can always change brands
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can change their product's brand
    if (!isOwner) {
      return false;
    }

    // Can only change brand for editable products
    if (!product.canBeEdited) {
      return false;
    }

    // Cannot change to the same brand
    if (product.brandId === newBrandId) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // VARIANT POLICIES
  // ============================================================================

  static canModifyVariantConfiguration(
    product: Product,
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Admins can always modify variant configuration
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can modify their product's variant configuration
    if (!isOwner) {
      return false;
    }

    // Can only modify variant configuration for editable products
    if (!product.canBeEdited) {
      return false;
    }

    // TODO: Add check for existing variants - cannot modify if variants already exist
    // This would require checking the variants table
    
    return true;
  }

  static canAddVariantAttribute(
    product: Product,
    attributeId: string
  ): boolean {
    // Product must support variants
    if (!product.hasVariants) {
      return false;
    }

    // Attribute must not already be a variant attribute
    if (product.variantAttributes.includes(attributeId)) {
      return false;
    }

    // Cannot have more than 10 variant attributes
    if (product.variantAttributes.length >= 10) {
      return false;
    }

    return true;
  }

  static canRemoveVariantAttribute(
    product: Product,
    attributeId: string
  ): boolean {
    // Attribute must be a variant attribute
    if (!product.variantAttributes.includes(attributeId)) {
      return false;
    }

    // TODO: Add check for existing variants using this attribute
    // Cannot remove if variants exist that use this attribute
    
    return true;
  }

  // ============================================================================
  // MEDIA POLICIES
  // ============================================================================

  static canAddMedia(
    product: Product,
    mediaType: 'image' | 'video' | 'document',
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Admins can always add media
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can add media to their products
    if (!isOwner) {
      return false;
    }

    // Check media limits
    switch (mediaType) {
      case 'image':
        return product.images.length < 20;
      case 'video':
        return product.videos.length < 10;
      case 'document':
        return product.documents.length < 10;
      default:
        return false;
    }
  }

  static canRemoveMedia(
    product: Product,
    mediaType: 'image' | 'video' | 'document',
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Admins can always remove media
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can remove media from their products
    if (!isOwner) {
      return false;
    }

    // For images, must have at least one remaining
    if (mediaType === 'image' && product.images.length <= 1) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // BULK OPERATION POLICIES
  // ============================================================================

  static canPerformBulkOperation(
    operation: string,
    productIds: string[],
    userRole?: string
  ): boolean {
    // Only admins can perform bulk operations
    if (userRole !== 'ADMIN') {
      return false;
    }

    // Limit bulk operation size
    if (productIds.length > 100) {
      return false;
    }

    // Check operation type
    const allowedOperations = [
      'status_update',
      'feature_toggle',
      'tag_update',
      'bulk_delete',
      'bulk_archive'
    ];

    return allowedOperations.includes(operation);
  }

  // ============================================================================
  // CLONE POLICIES
  // ============================================================================

  static canCloneProduct(
    product: Product,
    userRole?: string,
    isOwner?: boolean
  ): boolean {
    // Deleted products cannot be cloned
    if (product.isDeleted) {
      return false;
    }

    // Admins can clone any product
    if (userRole === 'ADMIN') {
      return true;
    }

    // Only owners can clone their products
    if (!isOwner) {
      return false;
    }

    // Can only clone products that are not in draft status
    // (to prevent cloning incomplete products)
    return product.status !== ProductStatus.DRAFT;
  }

  // ============================================================================
  // SEARCH & DISCOVERY POLICIES
  // ============================================================================

  static isProductSearchable(product: Product): boolean {
    // Only published, approved products are searchable
    return product.status === ProductStatus.PUBLISHED &&
           product.moderationStatus === ProductModerationStatus.APPROVED &&
           !product.isDeleted;
  }

  static isProductFeaturable(product: Product): boolean {
    // Only published products can be featured
    return product.status === ProductStatus.PUBLISHED &&
           product.moderationStatus === ProductModerationStatus.APPROVED &&
           !product.isDeleted;
  }

  // ============================================================================
  // AUDIT & COMPLIANCE POLICIES
  // ============================================================================

  static requiresAuditLog(
    action: string,
    product: Product
  ): boolean {
    // All actions on published products require audit logs
    if (product.status === ProductStatus.PUBLISHED) {
      return true;
    }

    // Certain actions always require audit logs
    const auditRequiredActions = [
      'status_change',
      'moderation_change',
      'category_change',
      'brand_change',
      'delete',
      'feature_toggle'
    ];

    return auditRequiredActions.includes(action);
  }

  static requiresModerationReview(
    product: Product,
    changes: Record<string, any>
  ): boolean {
    // Published products require moderation review for significant changes
    if (product.status !== ProductStatus.PUBLISHED) {
      return false;
    }

    // Changes that require moderation review
    const significantChanges = [
      'name',
      'description',
      'categoryId',
      'brandId',
      'images'
    ];

    return Object.keys(changes).some(key => significantChanges.includes(key));
  }
}