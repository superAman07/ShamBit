import { z } from 'zod';

// Document upload schema
export const documentUploadSchema = z.object({
  panCard: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  aadhaarCard: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  passport: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  businessCertificate: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  gstCertificate: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  addressProof: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  photograph: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional(),
  cancelledCheque: z.object({
    uploaded: z.boolean().default(false),
    url: z.string().optional(),
    verified: z.boolean().default(false),
    verificationNotes: z.string().optional()
  }).optional()
});

export const sellerRegistrationSchema = z.object({
  // Part A: Personal Details
  fullName: z.string().min(2, 'Full name must be at least 2 characters (as per Aadhaar)'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  
  // Part B: Business Information
  sellerType: z.enum(['individual', 'business']),
  businessType: z.enum(['proprietorship', 'partnership', 'llp', 'private_limited', 'individual_seller']).optional(),
  businessName: z.string().optional(),
  natureOfBusiness: z.string().min(10, 'Please describe your business nature (minimum 10 characters)').optional(),
  primaryBusinessActivity: z.string().optional(),
  yearOfEstablishment: z.number().min(1900).max(new Date().getFullYear(), 'Year cannot be in the future').optional(),
  businessPhone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit business phone number').optional(),
  businessEmail: z.string().email('Please enter a valid business email address').optional(),
  
  // Part C: Address Information
  registeredBusinessAddress: z.object({
    addressLine1: z.string().min(5, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pinCode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits')
  }),
  
  // Warehouse/Pickup Addresses (multiple allowed for hyperlocal)
  warehouseAddresses: z.array(z.object({
    id: z.string().optional(), // For updates
    isPrimary: z.boolean().default(false),
    sameAsRegistered: z.boolean().default(false),
    addressLine1: z.string().min(5, 'Warehouse address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pinCode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
    contactPerson: z.string().optional(),
    contactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid contact phone').optional(),
    operatingHours: z.string().optional(), // e.g., "9:00 AM - 6:00 PM"
    maxDeliveryRadius: z.number().min(1).max(50).optional() // in kilometers for hyperlocal
  })).min(1, 'At least one warehouse/pickup address is required'),
  
  // Part D: Tax & Compliance Details
  gstRegistered: z.boolean(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST Number format').optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)'),
  panHolderName: z.string().min(2, 'PAN holder name is required'),
  tdsApplicable: z.boolean().default(false),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits').optional(),
  
  // Part E: Bank Account Details (For Payouts)
  bankDetails: z.object({
    accountHolderName: z.string().min(2, 'Account holder name is required'),
    bankName: z.string().min(2, 'Bank name is required'),
    accountNumber: z.string().min(9, 'Account number must be at least 9 digits'),
    confirmAccountNumber: z.string().min(9, 'Please confirm account number'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., SBIN0001234)'),
    accountType: z.enum(['savings', 'current']),
    branchName: z.string().optional(),
    branchAddress: z.string().optional()
  }),
  
  // Part F: Document Upload Status
  documents: documentUploadSchema.optional(),
  
  // Additional Operational Information
  primaryProductCategories: z.string().min(10, 'Please describe your primary product categories'),
  estimatedMonthlyOrderVolume: z.enum(['0-50', '51-200', '201-500', '500+']),
  preferredPickupTimeSlots: z.string().min(5, 'Please specify preferred pickup time slots'),
  maxOrderProcessingTime: z.number().min(1).max(30, 'Processing time cannot exceed 30 days'),
  
  // Mobile & Email Verification Status
  mobileVerified: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  mobileOtp: z.string().optional(),
  emailOtp: z.string().optional(),
  
  // Financial Terms & Agreements
  commissionRateAccepted: z.boolean(),
  paymentSettlementTermsAccepted: z.boolean(),
  
  // Legal Declarations & Agreements
  termsAndConditionsAccepted: z.boolean(),
  returnPolicyAccepted: z.boolean(),
  dataComplianceAccepted: z.boolean(),
  privacyPolicyAccepted: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.bankDetails.accountNumber === data.bankDetails.confirmAccountNumber, {
  message: "Account numbers don't match",
  path: ["bankDetails", "confirmAccountNumber"],
}).refine((data) => {
  // If GST registered, GST number is required
  if (data.gstRegistered && !data.gstNumber && !data.gstin) {
    return false;
  }
  return true;
}, {
  message: "GST Number or GSTIN is required when GST registered",
  path: ["gstNumber"],
}).refine((data) => {
  // If business type, business name is required
  if (data.sellerType === 'business' && !data.businessName) {
    return false;
  }
  return true;
}, {
  message: "Business name is required for business sellers",
  path: ["businessName"],
});

// Document interface
export interface DocumentInfo {
  uploaded: boolean;
  url?: string;
  verified: boolean;
  verificationNotes?: string;
  uploadedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface SellerDocuments {
  panCard?: DocumentInfo;
  aadhaarCard?: DocumentInfo;
  passport?: DocumentInfo;
  businessCertificate?: DocumentInfo;
  gstCertificate?: DocumentInfo;
  addressProof?: DocumentInfo;
  photograph?: DocumentInfo;
  cancelledCheque?: DocumentInfo;
}

export interface WarehouseAddress {
  id?: string;
  isPrimary: boolean;
  sameAsRegistered: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  maxDeliveryRadius?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Seller {
  id: string;
  
  // Part A: Personal Details
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  email: string;
  
  // Part B: Business Information
  sellerType: 'individual' | 'business';
  businessType?: 'proprietorship' | 'partnership' | 'llp' | 'private_limited' | 'individual_seller';
  businessName?: string;
  natureOfBusiness?: string;
  primaryBusinessActivity?: string;
  yearOfEstablishment?: number;
  businessPhone?: string;
  businessEmail?: string;
  
  // Part C: Address Information
  registeredBusinessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  warehouseAddresses: WarehouseAddress[];
  
  // Part D: Tax & Compliance Details
  gstRegistered: boolean;
  gstNumber?: string;
  gstin?: string;
  panNumber: string;
  panHolderName: string;
  tdsApplicable: boolean;
  aadhaarNumber?: string;
  
  // Part E: Bank Account Details
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'savings' | 'current';
    branchName?: string;
    branchAddress?: string;
  };
  
  // Part F: Document Upload Status
  documents?: SellerDocuments;
  
  // Operational Information
  primaryProductCategories: string;
  estimatedMonthlyOrderVolume: '0-50' | '51-200' | '201-500' | '500+';
  preferredPickupTimeSlots: string;
  maxOrderProcessingTime: number;
  
  // Verification Status
  mobileVerified: boolean;
  emailVerified: boolean;
  documentsVerified: boolean;
  overallVerificationStatus: 'pending' | 'in_review' | 'approved' | 'rejected' | 'suspended';
  
  // System Fields
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  
  // Login Credentials (generated after approval)
  username?: string;
  loginCredentialsGenerated: boolean;
  credentialsSentAt?: Date;
}

export interface SellerFilters {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
  city?: string;
  businessType?: string;
}

export interface SellerListResponse {
  sellers: Seller[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Document upload schemas
export const documentUploadRequestSchema = z.object({
  documentType: z.enum(['panCard', 'aadhaarCard', 'passport', 'businessCertificate', 'gstCertificate', 'addressProof', 'photograph', 'cancelledCheque']),
  documentUrl: z.string().url('Invalid document URL'),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional()
});

export const documentVerificationSchema = z.object({
  documentType: z.enum(['panCard', 'aadhaarCard', 'passport', 'businessCertificate', 'gstCertificate', 'addressProof', 'photograph', 'cancelledCheque']),
  verified: z.boolean(),
  verificationNotes: z.string().optional(),
  adminId: z.string()
});

// OTP verification schemas
export const mobileOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

export const emailOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

// Seller update schemas
export const sellerUpdateSchema = z.object({
  // Allow partial updates of most fields except critical ones
  businessName: z.string().optional(),
  natureOfBusiness: z.string().optional(),
  primaryBusinessActivity: z.string().optional(),
  businessPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  businessEmail: z.string().email().optional(),
  primaryProductCategories: z.string().optional(),
  estimatedMonthlyOrderVolume: z.enum(['0-50', '51-200', '201-500', '500+']).optional(),
  preferredPickupTimeSlots: z.string().optional(),
  maxOrderProcessingTime: z.number().min(1).max(30).optional(),
  warehouseAddresses: z.array(z.object({
    id: z.string().optional(),
    isPrimary: z.boolean().default(false),
    sameAsRegistered: z.boolean().default(false),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pinCode: z.string().regex(/^\d{6}$/),
    contactPerson: z.string().optional(),
    contactPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    operatingHours: z.string().optional(),
    maxDeliveryRadius: z.number().min(1).max(50).optional()
  })).optional()
});

export const sellerStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  adminId: z.string()
});

export interface SellerStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  recentRegistrations: number; // Last 30 days
  documentsVerified: number;
  documentsPending: number;
  topCities: Array<{
    city: string;
    count: number;
  }>;
  businessTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  verificationStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
}

// Export all type inferences
export type SellerRegistrationData = z.infer<typeof sellerRegistrationSchema>;
export type DocumentUploadRequest = z.infer<typeof documentUploadRequestSchema>;
export type DocumentVerification = z.infer<typeof documentVerificationSchema>;
export type MobileOtpVerification = z.infer<typeof mobileOtpSchema>;
export type EmailOtpVerification = z.infer<typeof emailOtpSchema>;
export type SellerUpdate = z.infer<typeof sellerUpdateSchema>;
export type SellerStatusUpdate = z.infer<typeof sellerStatusUpdateSchema>;