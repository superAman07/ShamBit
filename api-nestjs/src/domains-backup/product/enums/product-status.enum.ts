export enum ProductStatus {
  DRAFT = 'DRAFT',           // Being created/edited by seller
  SUBMITTED = 'SUBMITTED',   // Submitted for review
  APPROVED = 'APPROVED',     // Approved by admin/moderator
  PUBLISHED = 'PUBLISHED',   // Live and visible to customers
  REJECTED = 'REJECTED',     // Rejected during review
  SUSPENDED = 'SUSPENDED',   // Temporarily suspended
  ARCHIVED = 'ARCHIVED',     // Permanently archived
}

export const ProductStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: 'Draft',
  [ProductStatus.SUBMITTED]: 'Submitted',
  [ProductStatus.APPROVED]: 'Approved',
  [ProductStatus.PUBLISHED]: 'Published',
  [ProductStatus.REJECTED]: 'Rejected',
  [ProductStatus.SUSPENDED]: 'Suspended',
  [ProductStatus.ARCHIVED]: 'Archived',
};

export const ProductStatusDescriptions: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: 'Product is being created or edited by the seller',
  [ProductStatus.SUBMITTED]: 'Product has been submitted for admin review',
  [ProductStatus.APPROVED]: 'Product has been approved and can be published',
  [ProductStatus.PUBLISHED]: 'Product is live and visible to customers',
  [ProductStatus.REJECTED]: 'Product was rejected during review process',
  [ProductStatus.SUSPENDED]: 'Product is temporarily suspended from sale',
  [ProductStatus.ARCHIVED]: 'Product is permanently archived and cannot be restored',
};

export const ProductStatusColors: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: '#6B7280',      // Gray
  [ProductStatus.SUBMITTED]: '#3B82F6',  // Blue
  [ProductStatus.APPROVED]: '#10B981',   // Green
  [ProductStatus.PUBLISHED]: '#059669',  // Dark Green
  [ProductStatus.REJECTED]: '#EF4444',   // Red
  [ProductStatus.SUSPENDED]: '#F59E0B',  // Yellow
  [ProductStatus.ARCHIVED]: '#374151',   // Dark Gray
};

// Status transition rules - defines allowed state transitions
export const ALLOWED_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [
    ProductStatus.SUBMITTED,
    ProductStatus.ARCHIVED,
  ],
  [ProductStatus.SUBMITTED]: [
    ProductStatus.APPROVED,
    ProductStatus.REJECTED,
    ProductStatus.DRAFT, // Can be sent back to draft
  ],
  [ProductStatus.APPROVED]: [
    ProductStatus.PUBLISHED,
    ProductStatus.REJECTED,
    ProductStatus.DRAFT, // Can be sent back for edits
  ],
  [ProductStatus.PUBLISHED]: [
    ProductStatus.SUSPENDED,
    ProductStatus.ARCHIVED,
    ProductStatus.DRAFT, // Can be unpublished for edits
  ],
  [ProductStatus.REJECTED]: [
    ProductStatus.DRAFT,     // Can be edited and resubmitted
    ProductStatus.ARCHIVED,
  ],
  [ProductStatus.SUSPENDED]: [
    ProductStatus.PUBLISHED, // Can be reactivated
    ProductStatus.ARCHIVED,
    ProductStatus.DRAFT,     // Can be edited
  ],
  [ProductStatus.ARCHIVED]: [], // No transitions from archived
};

// Helper functions for status management
export const canTransitionTo = (from: ProductStatus, to: ProductStatus): boolean => {
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) || false;
};

export const getAvailableTransitions = (currentStatus: ProductStatus): ProductStatus[] => {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
};

export const isPubliclyVisible = (status: ProductStatus): boolean => {
  return status === ProductStatus.PUBLISHED;
};

export const isEditableByOwner = (status: ProductStatus): boolean => {
  return [ProductStatus.DRAFT, ProductStatus.REJECTED].includes(status);
};

export const requiresModeration = (status: ProductStatus): boolean => {
  return status === ProductStatus.SUBMITTED;
};

export const isApprovalRequired = (fromStatus: ProductStatus, toStatus: ProductStatus): boolean => {
  // Transitions that require admin approval
  const approvalTransitions = [
    [ProductStatus.SUBMITTED, ProductStatus.APPROVED],
    [ProductStatus.APPROVED, ProductStatus.PUBLISHED],
  ];
  
  return approvalTransitions.some(([from, to]) => from === fromStatus && to === toStatus);
};

export const canBeDeleted = (status: ProductStatus): boolean => {
  // Only draft and rejected products can be permanently deleted
  return [ProductStatus.DRAFT, ProductStatus.REJECTED].includes(status);
};

export const canBeFeatured = (status: ProductStatus): boolean => {
  // Only published products can be featured
  return status === ProductStatus.PUBLISHED;
};

// Status groups for filtering and queries
export const DRAFT_STATUSES = [ProductStatus.DRAFT];
export const PENDING_STATUSES = [ProductStatus.SUBMITTED];
export const ACTIVE_STATUSES = [ProductStatus.APPROVED, ProductStatus.PUBLISHED];
export const INACTIVE_STATUSES = [ProductStatus.REJECTED, ProductStatus.SUSPENDED, ProductStatus.ARCHIVED];
export const VISIBLE_STATUSES = [ProductStatus.PUBLISHED];
export const MODERATION_STATUSES = [ProductStatus.SUBMITTED, ProductStatus.REJECTED];