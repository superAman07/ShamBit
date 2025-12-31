export enum BrandScope {
  GLOBAL = 'GLOBAL', // Visible to all sellers
  SELLER_PRIVATE = 'SELLER_PRIVATE', // Only creator seller
  SELLER_SHARED = 'SELLER_SHARED', // Shared across selected sellers
}

export enum BrandPermission {
  VIEW = 'VIEW', // Can see the brand
  USE = 'USE', // Can use in products
}

export const BrandScopeLabels = {
  [BrandScope.GLOBAL]: 'Global Brand',
  [BrandScope.SELLER_PRIVATE]: 'Private Brand',
  [BrandScope.SELLER_SHARED]: 'Shared Brand',
} as const;

export const BrandPermissionLabels = {
  [BrandPermission.VIEW]: 'View Only',
  [BrandPermission.USE]: 'Can Use',
} as const;
