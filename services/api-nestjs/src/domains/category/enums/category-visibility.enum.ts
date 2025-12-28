export enum CategoryVisibility {
  PUBLIC = 'PUBLIC',       // Visible to all users
  INTERNAL = 'INTERNAL',   // Visible to sellers only
  RESTRICTED = 'RESTRICTED', // Admin-only visibility
}

export const CategoryVisibilityLabels = {
  [CategoryVisibility.PUBLIC]: 'Public',
  [CategoryVisibility.INTERNAL]: 'Internal',
  [CategoryVisibility.RESTRICTED]: 'Restricted',
} as const;

export const CategoryVisibilityDescriptions = {
  [CategoryVisibility.PUBLIC]: 'Visible to all users including customers',
  [CategoryVisibility.INTERNAL]: 'Visible to sellers and admins only',
  [CategoryVisibility.RESTRICTED]: 'Visible to admins only',
} as const;