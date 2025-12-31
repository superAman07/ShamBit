export enum BrandStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export const BrandStatusLabels = {
  [BrandStatus.DRAFT]: 'Draft',
  [BrandStatus.PENDING_APPROVAL]: 'Pending Approval',
  [BrandStatus.APPROVED]: 'Approved',
  [BrandStatus.REJECTED]: 'Rejected',
  [BrandStatus.ACTIVE]: 'Active',
  [BrandStatus.INACTIVE]: 'Inactive',
  [BrandStatus.SUSPENDED]: 'Suspended',
  [BrandStatus.ARCHIVED]: 'Archived',
} as const;

export const BrandStatusDescriptions = {
  [BrandStatus.DRAFT]: 'Brand is being created and not yet submitted',
  [BrandStatus.PENDING_APPROVAL]: 'Brand is awaiting admin approval',
  [BrandStatus.APPROVED]: 'Brand is approved but not yet active',
  [BrandStatus.REJECTED]: 'Brand request was rejected',
  [BrandStatus.ACTIVE]: 'Brand is active and available for use',
  [BrandStatus.INACTIVE]:
    'Brand is inactive and not available for new products',
  [BrandStatus.SUSPENDED]: 'Brand is suspended due to policy violations',
  [BrandStatus.ARCHIVED]: 'Brand is archived and cannot be used',
} as const;

// State machine transitions
export const BrandStatusTransitions: Record<BrandStatus, BrandStatus[]> = {
  [BrandStatus.DRAFT]: [BrandStatus.PENDING_APPROVAL, BrandStatus.ARCHIVED],
  [BrandStatus.PENDING_APPROVAL]: [
    BrandStatus.APPROVED,
    BrandStatus.REJECTED,
    BrandStatus.DRAFT,
  ],
  [BrandStatus.APPROVED]: [BrandStatus.ACTIVE, BrandStatus.REJECTED],
  [BrandStatus.REJECTED]: [BrandStatus.DRAFT, BrandStatus.ARCHIVED],
  [BrandStatus.ACTIVE]: [
    BrandStatus.INACTIVE,
    BrandStatus.SUSPENDED,
    BrandStatus.ARCHIVED,
  ],
  [BrandStatus.INACTIVE]: [BrandStatus.ACTIVE, BrandStatus.ARCHIVED],
  [BrandStatus.SUSPENDED]: [
    BrandStatus.ACTIVE,
    BrandStatus.INACTIVE,
    BrandStatus.ARCHIVED,
  ],
  [BrandStatus.ARCHIVED]: [], // Terminal state
};

// Statuses that allow product usage
export const USABLE_BRAND_STATUSES = [BrandStatus.ACTIVE];

// Statuses that require admin approval
export const ADMIN_ONLY_TRANSITIONS = [
  BrandStatus.APPROVED,
  BrandStatus.REJECTED,
  BrandStatus.SUSPENDED,
];
