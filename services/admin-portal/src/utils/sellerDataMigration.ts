import { Seller } from '../services/sellerService';

/**
 * Legacy seller interface for backward compatibility
 */
interface LegacySeller {
  id: string;
  businessName?: string;
  businessType?: string;
  gstin?: string;
  ownerName?: string;
  phone?: string;
  email: string;
  city?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

/**
 * Transforms legacy seller data to the new comprehensive format
 * This ensures backward compatibility with existing seller records
 */
export function migrateLegacySellerData(legacySeller: LegacySeller): Seller {
  return {
    id: legacySeller.id,
    // Map legacy fields to new structure
    fullName: legacySeller.ownerName || 'Legacy User',
    email: legacySeller.email,
    mobile: legacySeller.phone,
    
    // Business information
    sellerType: legacySeller.businessName ? 'business' : 'individual',
    businessName: legacySeller.businessName,
    businessType: legacySeller.businessType,
    
    // Address - create from legacy city if available
    homeAddress: legacySeller.city ? {
      addressLine1: 'Legacy Address',
      city: legacySeller.city,
      state: 'Unknown',
      pinCode: ''
    } : undefined,
    businessAddress: legacySeller.city ? {
      sameAsHome: true,
      city: legacySeller.city,
      state: 'Unknown',
      pinCode: ''
    } : undefined,
    
    // Tax information
    gstRegistered: Boolean(legacySeller.gstin),
    gstin: legacySeller.gstin,
    
    // System fields
    status: legacySeller.status,
    verificationNotes: legacySeller.verificationNotes,
    createdAt: legacySeller.createdAt,
    updatedAt: legacySeller.updatedAt,
    approvedAt: legacySeller.approvedAt,
    approvedBy: legacySeller.approvedBy,
  };
}

/**
 * Checks if a seller record is in legacy format
 */
export function isLegacySellerData(seller: any): seller is LegacySeller {
  return (
    seller &&
    typeof seller.id === 'string' &&
    typeof seller.email === 'string' &&
    !seller.fullName && // New format has fullName
    (seller.ownerName || seller.businessName) // Legacy format has these
  );
}

/**
 * Normalizes seller data to ensure it works with the new UI components
 */
export function normalizeSellerData(seller: any): Seller {
  if (isLegacySellerData(seller)) {
    return migrateLegacySellerData(seller);
  }
  return seller as Seller;
}

/**
 * Gets display name for a seller (handles both legacy and new formats)
 */
export function getSellerDisplayName(seller: Seller): string {
  return seller.businessName || seller.fullName || 'Unknown Seller';
}

/**
 * Gets seller contact info (handles both legacy and new formats)
 */
export function getSellerContact(seller: Seller): { email: string; phone?: string } {
  return {
    email: seller.email,
    phone: seller.mobile || undefined
  };
}

/**
 * Gets seller location info (handles both legacy and new formats)
 */
export function getSellerLocation(seller: Seller): string {
  if (seller.homeAddress) {
    return `${seller.homeAddress.city}, ${seller.homeAddress.state}`;
  }
  return 'Location not available';
}