export enum VariantStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export const VariantStatusTransitions: Record<VariantStatus, VariantStatus[]> = {
  [VariantStatus.DRAFT]: [VariantStatus.ACTIVE, VariantStatus.ARCHIVED],
  [VariantStatus.ACTIVE]: [VariantStatus.DISABLED, VariantStatus.ARCHIVED],
  [VariantStatus.DISABLED]: [VariantStatus.ACTIVE, VariantStatus.ARCHIVED],
  [VariantStatus.ARCHIVED]: [], // Terminal state
};

export function canTransitionTo(from: VariantStatus, to: VariantStatus): boolean {
  return VariantStatusTransitions[from].includes(to);
}

export function getValidTransitions(status: VariantStatus): VariantStatus[] {
  return VariantStatusTransitions[status];
}