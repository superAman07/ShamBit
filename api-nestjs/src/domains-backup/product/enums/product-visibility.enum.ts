export enum ProductVisibility {
  PRIVATE = 'PRIVATE',     // Only visible to seller and admins
  INTERNAL = 'INTERNAL',   // Visible to sellers and admins
  PUBLIC = 'PUBLIC',       // Visible to everyone (when published)
}

export const ProductVisibilityLabels: Record<ProductVisibility, string> = {
  [ProductVisibility.PRIVATE]: 'Private',
  [ProductVisibility.INTERNAL]: 'Internal',
  [ProductVisibility.PUBLIC]: 'Public',
};

export const ProductVisibilityDescriptions: Record<ProductVisibility, string> = {
  [ProductVisibility.PRIVATE]: 'Only visible to the product owner and administrators',
  [ProductVisibility.INTERNAL]: 'Visible to all sellers and administrators',
  [ProductVisibility.PUBLIC]: 'Visible to everyone when product is published',
};

export const ProductVisibilityIcons: Record<ProductVisibility, string> = {
  [ProductVisibility.PRIVATE]: '🔒',
  [ProductVisibility.INTERNAL]: '🏢',
  [ProductVisibility.PUBLIC]: '🌐',
};

// Role-based visibility checks
export const canUserViewProduct = (
  visibility: ProductVisibility,
  userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null,
  isOwner: boolean = false
): boolean => {
  switch (visibility) {
    case ProductVisibility.PUBLIC:
      return true; // Everyone can see public products
    case ProductVisibility.INTERNAL:
      return userRole === 'SELLER' || userRole === 'ADMIN';
    case ProductVisibility.PRIVATE:
      return isOwner || userRole === 'ADMIN';
    default:
      return false;
  }
};

export const canUserEditProduct = (
  visibility: ProductVisibility,
  userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null,
  isOwner: boolean = false
): boolean => {
  // Only owners and admins can edit products
  return isOwner || userRole === 'ADMIN';
};

export const getVisibilityForRole = (
  userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null
): ProductVisibility[] => {
  switch (userRole) {
    case 'ADMIN':
      return [ProductVisibility.PRIVATE, ProductVisibility.INTERNAL, ProductVisibility.PUBLIC];
    case 'SELLER':
      return [ProductVisibility.INTERNAL, ProductVisibility.PUBLIC];
    case 'CUSTOMER':
    default:
      return [ProductVisibility.PUBLIC];
  }
};

export const getDefaultVisibility = (userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null): ProductVisibility => {
  switch (userRole) {
    case 'ADMIN':
      return ProductVisibility.PUBLIC;
    case 'SELLER':
      return ProductVisibility.PRIVATE; // Sellers start with private products
    default:
      return ProductVisibility.PUBLIC;
  }
};