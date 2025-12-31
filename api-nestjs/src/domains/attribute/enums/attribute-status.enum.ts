export enum AttributeStatus {
  DRAFT = 'DRAFT', // Being created/edited, not yet available
  ACTIVE = 'ACTIVE', // Available for use in products
  DEPRECATED = 'DEPRECATED', // Still usable but discouraged for new products
  ARCHIVED = 'ARCHIVED', // No longer usable, historical data only
}

export const AttributeStatusLabels: Record<AttributeStatus, string> = {
  [AttributeStatus.DRAFT]: 'Draft',
  [AttributeStatus.ACTIVE]: 'Active',
  [AttributeStatus.DEPRECATED]: 'Deprecated',
  [AttributeStatus.ARCHIVED]: 'Archived',
};

export const AttributeStatusDescriptions: Record<AttributeStatus, string> = {
  [AttributeStatus.DRAFT]:
    'Attribute is being created or edited and not yet available for use',
  [AttributeStatus.ACTIVE]:
    'Attribute is active and available for use in products',
  [AttributeStatus.DEPRECATED]:
    'Attribute is deprecated but still usable for existing products',
  [AttributeStatus.ARCHIVED]:
    'Attribute is archived and no longer usable for new products',
};

export const AttributeStatusColors: Record<AttributeStatus, string> = {
  [AttributeStatus.DRAFT]: '#6B7280', // Gray
  [AttributeStatus.ACTIVE]: '#10B981', // Green
  [AttributeStatus.DEPRECATED]: '#F59E0B', // Yellow
  [AttributeStatus.ARCHIVED]: '#EF4444', // Red
};

// Status transition rules
export const ALLOWED_STATUS_TRANSITIONS: Record<
  AttributeStatus,
  AttributeStatus[]
> = {
  [AttributeStatus.DRAFT]: [AttributeStatus.ACTIVE, AttributeStatus.ARCHIVED],
  [AttributeStatus.ACTIVE]: [
    AttributeStatus.DEPRECATED,
    AttributeStatus.ARCHIVED,
  ],
  [AttributeStatus.DEPRECATED]: [
    AttributeStatus.ACTIVE,
    AttributeStatus.ARCHIVED,
  ],
  [AttributeStatus.ARCHIVED]: [], // No transitions from archived
};

export const canTransitionTo = (
  from: AttributeStatus,
  to: AttributeStatus,
): boolean => {
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) || false;
};

export const getAvailableTransitions = (
  currentStatus: AttributeStatus,
): AttributeStatus[] => {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
};

export const isUsableStatus = (status: AttributeStatus): boolean => {
  return [AttributeStatus.ACTIVE, AttributeStatus.DEPRECATED].includes(status);
};

export const isEditableStatus = (status: AttributeStatus): boolean => {
  return [
    AttributeStatus.DRAFT,
    AttributeStatus.ACTIVE,
    AttributeStatus.DEPRECATED,
  ].includes(status);
};
