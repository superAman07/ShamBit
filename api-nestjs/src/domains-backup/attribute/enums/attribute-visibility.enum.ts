export enum AttributeVisibility {
  PUBLIC = 'PUBLIC',         // Visible to all users (customers, sellers, admins)
  INTERNAL = 'INTERNAL',     // Visible to sellers and admins only
  ADMIN_ONLY = 'ADMIN_ONLY', // Visible to admins only
}

export const AttributeVisibilityLabels: Record<AttributeVisibility, string> = {
  [AttributeVisibility.PUBLIC]: 'Public',
  [AttributeVisibility.INTERNAL]: 'Internal',
  [AttributeVisibility.ADMIN_ONLY]: 'Admin Only',
};

export const AttributeVisibilityDescriptions: Record<AttributeVisibility, string> = {
  [AttributeVisibility.PUBLIC]: 'Visible to all users including customers',
  [AttributeVisibility.INTERNAL]: 'Visible to sellers and administrators only',
  [AttributeVisibility.ADMIN_ONLY]: 'Visible to administrators only',
};

export const AttributeVisibilityIcons: Record<AttributeVisibility, string> = {
  [AttributeVisibility.PUBLIC]: '🌐',
  [AttributeVisibility.INTERNAL]: '🏢',
  [AttributeVisibility.ADMIN_ONLY]: '🔒',
};

// Role-based visibility checks
export const canUserSeeAttribute = (
  visibility: AttributeVisibility,
  userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null
): boolean => {
  switch (visibility) {
    case AttributeVisibility.PUBLIC:
      return true; // Everyone can see public attributes
    case AttributeVisibility.INTERNAL:
      return userRole === 'SELLER' || userRole === 'ADMIN';
    case AttributeVisibility.ADMIN_ONLY:
      return userRole === 'ADMIN';
    default:
      return false;
  }
};

export const canUserEditAttribute = (
  visibility: AttributeVisibility,
  userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null
): boolean => {
  // Only admins can edit attributes regardless of visibility
  return userRole === 'ADMIN';
};

export const getVisibilityForRole = (userRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | null): AttributeVisibility[] => {
  switch (userRole) {
    case 'ADMIN':
      return [AttributeVisibility.PUBLIC, AttributeVisibility.INTERNAL, AttributeVisibility.ADMIN_ONLY];
    case 'SELLER':
      return [AttributeVisibility.PUBLIC, AttributeVisibility.INTERNAL];
    case 'CUSTOMER':
    default:
      return [AttributeVisibility.PUBLIC];
  }
};