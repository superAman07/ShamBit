export enum ProductModerationStatus {
  PENDING = 'PENDING',       // Awaiting moderation
  APPROVED = 'APPROVED',     // Approved by moderator
  REJECTED = 'REJECTED',     // Rejected by moderator
  FLAGGED = 'FLAGGED',       // Flagged for review
  REVIEWING = 'REVIEWING',   // Currently under review
}

export const ProductModerationStatusLabels: Record<ProductModerationStatus, string> = {
  [ProductModerationStatus.PENDING]: 'Pending Review',
  [ProductModerationStatus.APPROVED]: 'Approved',
  [ProductModerationStatus.REJECTED]: 'Rejected',
  [ProductModerationStatus.FLAGGED]: 'Flagged',
  [ProductModerationStatus.REVIEWING]: 'Under Review',
};

export const ProductModerationStatusDescriptions: Record<ProductModerationStatus, string> = {
  [ProductModerationStatus.PENDING]: 'Product is awaiting moderation review',
  [ProductModerationStatus.APPROVED]: 'Product has been approved by a moderator',
  [ProductModerationStatus.REJECTED]: 'Product has been rejected by a moderator',
  [ProductModerationStatus.FLAGGED]: 'Product has been flagged and needs review',
  [ProductModerationStatus.REVIEWING]: 'Product is currently being reviewed by a moderator',
};

export const ProductModerationStatusColors: Record<ProductModerationStatus, string> = {
  [ProductModerationStatus.PENDING]: '#6B7280',    // Gray
  [ProductModerationStatus.APPROVED]: '#10B981',   // Green
  [ProductModerationStatus.REJECTED]: '#EF4444',   // Red
  [ProductModerationStatus.FLAGGED]: '#F59E0B',    // Yellow
  [ProductModerationStatus.REVIEWING]: '#3B82F6',  // Blue
};

export const ProductModerationStatusIcons: Record<ProductModerationStatus, string> = {
  [ProductModerationStatus.PENDING]: '⏳',
  [ProductModerationStatus.APPROVED]: '✅',
  [ProductModerationStatus.REJECTED]: '❌',
  [ProductModerationStatus.FLAGGED]: '🚩',
  [ProductModerationStatus.REVIEWING]: '👀',
};

// Moderation status transition rules
export const ALLOWED_MODERATION_TRANSITIONS: Record<ProductModerationStatus, ProductModerationStatus[]> = {
  [ProductModerationStatus.PENDING]: [
    ProductModerationStatus.REVIEWING,
    ProductModerationStatus.APPROVED,
    ProductModerationStatus.REJECTED,
    ProductModerationStatus.FLAGGED,
  ],
  [ProductModerationStatus.REVIEWING]: [
    ProductModerationStatus.APPROVED,
    ProductModerationStatus.REJECTED,
    ProductModerationStatus.FLAGGED,
    ProductModerationStatus.PENDING, // Can be sent back to pending
  ],
  [ProductModerationStatus.APPROVED]: [
    ProductModerationStatus.FLAGGED,   // Can be flagged later
    ProductModerationStatus.REVIEWING, // Can be re-reviewed
  ],
  [ProductModerationStatus.REJECTED]: [
    ProductModerationStatus.PENDING,   // Can be resubmitted
    ProductModerationStatus.REVIEWING, // Can be re-reviewed
  ],
  [ProductModerationStatus.FLAGGED]: [
    ProductModerationStatus.REVIEWING,
    ProductModerationStatus.APPROVED,
    ProductModerationStatus.REJECTED,
  ],
};

// Helper functions for moderation management
export const canModerationTransitionTo = (
  from: ProductModerationStatus,
  to: ProductModerationStatus
): boolean => {
  return ALLOWED_MODERATION_TRANSITIONS[from]?.includes(to) || false;
};

export const getAvailableModerationTransitions = (
  currentStatus: ProductModerationStatus
): ProductModerationStatus[] => {
  return ALLOWED_MODERATION_TRANSITIONS[currentStatus] || [];
};

export const requiresModeratorAction = (status: ProductModerationStatus): boolean => {
  return [
    ProductModerationStatus.PENDING,
    ProductModerationStatus.REVIEWING,
    ProductModerationStatus.FLAGGED,
  ].includes(status);
};

export const isModeratorActionComplete = (status: ProductModerationStatus): boolean => {
  return [
    ProductModerationStatus.APPROVED,
    ProductModerationStatus.REJECTED,
  ].includes(status);
};

export const canBePublished = (moderationStatus: ProductModerationStatus): boolean => {
  return moderationStatus === ProductModerationStatus.APPROVED;
};

export const needsAttention = (status: ProductModerationStatus): boolean => {
  return [
    ProductModerationStatus.FLAGGED,
    ProductModerationStatus.REJECTED,
  ].includes(status);
};

export const isInProgress = (status: ProductModerationStatus): boolean => {
  return [
    ProductModerationStatus.PENDING,
    ProductModerationStatus.REVIEWING,
  ].includes(status);
};

// Priority levels for moderation queue
export const getModerationPriority = (status: ProductModerationStatus): number => {
  const priorities: Record<ProductModerationStatus, number> = {
    [ProductModerationStatus.FLAGGED]: 1,     // Highest priority
    [ProductModerationStatus.REVIEWING]: 2,
    [ProductModerationStatus.PENDING]: 3,
    [ProductModerationStatus.REJECTED]: 4,
    [ProductModerationStatus.APPROVED]: 5,    // Lowest priority
  };
  
  return priorities[status] || 999;
};

// Status groups for filtering and queries
export const NEEDS_MODERATION = [
  ProductModerationStatus.PENDING,
  ProductModerationStatus.REVIEWING,
  ProductModerationStatus.FLAGGED,
];

export const MODERATION_COMPLETE = [
  ProductModerationStatus.APPROVED,
  ProductModerationStatus.REJECTED,
];

export const HIGH_PRIORITY_MODERATION = [
  ProductModerationStatus.FLAGGED,
  ProductModerationStatus.REVIEWING,
];