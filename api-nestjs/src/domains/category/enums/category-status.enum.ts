export enum CategoryStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

export const CategoryStatusLabels = {
  [CategoryStatus.DRAFT]: 'Draft',
  [CategoryStatus.ACTIVE]: 'Active',
  [CategoryStatus.INACTIVE]: 'Inactive',
  [CategoryStatus.ARCHIVED]: 'Archived',
  [CategoryStatus.REJECTED]: 'Rejected',
} as const;

export const CategoryStatusDescriptions = {
  [CategoryStatus.DRAFT]: 'Category is being created and not yet published',
  [CategoryStatus.ACTIVE]: 'Category is active and visible to users',
  [CategoryStatus.INACTIVE]: 'Category is temporarily disabled',
  [CategoryStatus.ARCHIVED]: 'Category is archived and cannot be used',
  [CategoryStatus.REJECTED]: 'Category was rejected during review',
} as const;

// State machine transitions
export const CategoryStatusTransitions: Record<
  CategoryStatus,
  CategoryStatus[]
> = {
  [CategoryStatus.DRAFT]: [
    CategoryStatus.ACTIVE,
    CategoryStatus.REJECTED,
    CategoryStatus.ARCHIVED,
  ],
  [CategoryStatus.ACTIVE]: [CategoryStatus.INACTIVE, CategoryStatus.ARCHIVED],
  [CategoryStatus.INACTIVE]: [CategoryStatus.ACTIVE, CategoryStatus.ARCHIVED],
  [CategoryStatus.REJECTED]: [CategoryStatus.DRAFT, CategoryStatus.ARCHIVED],
  [CategoryStatus.ARCHIVED]: [], // Terminal state
};

// Statuses that allow products
export const PRODUCT_ALLOWED_STATUSES = [CategoryStatus.ACTIVE];

// Statuses that are visible to users
export const VISIBLE_STATUSES = [
  CategoryStatus.ACTIVE,
  CategoryStatus.INACTIVE,
];

// Statuses that require admin approval
export const ADMIN_ONLY_TRANSITIONS = [
  CategoryStatus.ACTIVE,
  CategoryStatus.REJECTED,
  CategoryStatus.ARCHIVED,
];
