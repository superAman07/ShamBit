// Simplified Seller Registration Types
// Based on the design document for minimal 4-field registration

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: 'India';
  landmark?: string;
  addressType: 'registered' | 'warehouse' | 'pickup';
}

// Minimal registration form (4 fields only)
export interface RegistrationFormData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}

// OTP verification interfaces
export interface OTPVerificationRequest {
  mobile: string;
  otp: string;
}

export interface OTPVerificationResponse {
  success: boolean;
  data: {
    verified: boolean;
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
    seller?: SellerBasicInfo;
  };
}

// Basic seller info returned after registration
export interface SellerBasicInfo {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  status: SellerStatus;
  verificationStatus: VerificationStatus;
  canListProducts: boolean;
  payoutEnabled: boolean;
  createdAt: Date;
}

// Progressive profile completion data structures
export interface BusinessDetails {
  businessName?: string;
  businessType?: 'individual' | 'proprietorship' | 'partnership' | 'llp' | 'private_limited';
  natureOfBusiness?: string;
  yearOfEstablishment?: number;
  primaryProductCategories?: string;
}

export interface AddressInfo {
  registeredAddress: Address;
  warehouseAddresses: Address[];
}

export interface TaxCompliance {
  panNumber?: string;
  panHolderName?: string;
  gstRegistered: boolean;
  gstNumber?: string;
  aadhaarNumber?: string;
  // Non-GST seller support
  gstExempt?: boolean;
  exemptionReason?: 'turnover_below_threshold' | 'exempt_goods' | 'composition_scheme';
  turnoverDeclaration?: number;
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationMethod: 'cancelled_cheque' | 'bank_statement';
}

// Document management
export interface Document {
  id: string;
  sellerId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  version: number;
  previousVersions?: DocumentVersion[];
  uploadedAt: Date;
  verificationStatus: 'pending' | 'processing' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  checksumValidated: boolean;
  corruptionDetected: boolean;
  qualityScore?: number;
  extractedData?: Record<string, any>;
  auditTrail: DocumentAuditEntry[];
  retentionPolicy: {
    retainUntil: Date;
    legalHoldStatus: boolean;
  };
}

export interface DocumentVersion {
  version: number;
  fileUrl: string;
  fileHash: string;
  uploadedAt: Date;
  replacedReason: string;
}

export interface DocumentAuditEntry {
  id: string;
  action: 'uploaded' | 'verified' | 'rejected' | 'replaced' | 'downloaded' | 'deleted';
  performedBy: string;
  performedAt: Date;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export type DocumentType = 
  | 'pan_card' 
  | 'gst_certificate' 
  | 'bank_proof' 
  | 'aadhaar' 
  | 'business_certificate' 
  | 'address_proof' 
  | 'udyam_certificate';

// Core seller model with simplified structure
export interface Seller {
  id: string;
  
  // Basic Registration Data (Required)
  fullName: string;
  mobile: string;
  email: string;
  passwordHash: string;
  
  // Verification Status
  mobileVerified: boolean;
  emailVerified: boolean;
  
  // Profile Completion (Optional initially)
  businessDetails?: BusinessDetails;
  addressInfo?: AddressInfo;
  taxCompliance?: TaxCompliance;
  bankDetails?: BankDetails;
  
  // Risk and Fraud Detection
  riskScore?: number;
  riskFlags?: string[];
  lastRiskAssessment?: Date;
  deviceFingerprints?: string[];
  suspiciousActivityFlags?: string[];
  
  // Account Management
  accountStatus: 'active' | 'deactivated' | 'deleted';
  deactivationReason?: string;
  deactivatedAt?: Date;
  deletionScheduledAt?: Date;
  dataExportRequested?: boolean;
  
  // System Fields
  status: SellerStatus;
  verificationStatus: VerificationStatus;
  canListProducts: boolean;
  payoutEnabled: boolean;
  
  // Feature Access Control
  featureAccess: {
    productListing: boolean;
    payoutProcessing: boolean;
    bulkOperations: boolean;
    advancedAnalytics: boolean;
  };
  
  // Service Level Tracking
  slaTracking: {
    documentSubmissionDate?: Date;
    reviewStartDate?: Date;
    reviewCompletionDate?: Date;
    payoutSetupDate?: Date;
    escalationLevel: number;
  };
  
  // Audit Fields
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lastFailedLoginAt?: Date;
  accountLockedUntil?: Date;
}

export type SellerStatus = 'active' | 'suspended' | 'deactivated';
export type VerificationStatus = 'pending' | 'in_review' | 'verified' | 'rejected';

// Profile completion tracking
export interface ProfileCompletionStatus {
  basicInfo: boolean;
  businessDetails: boolean;
  addressInfo: boolean;
  taxCompliance: boolean;
  bankDetails: boolean;
  documentVerification: boolean;
  overallProgress: number;
  requiredSections: string[];
  optionalSections: string[];
  unlockedFeatures: string[];
  nextSteps: string[];
}

// Audit logging
export interface AuditLog {
  id: string;
  sellerId: string;
  action: string;
  entityType: 'seller' | 'document' | 'profile';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy: string;
  performedAt: Date;
  ipAddress: string;
  userAgent: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

// Registration API interfaces
export interface RegistrationRequest {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegistrationResponse {
  success: boolean;
  data: {
    sellerId: string;
    otpSent: boolean;
    expiresIn: number;
    riskAssessment?: {
      riskLevel: 'low' | 'medium' | 'high';
      flags: string[];
    };
  };
}

// Profile update interfaces
export interface ProfileUpdateRequest {
  section: 'business' | 'address' | 'tax' | 'bank';
  data: Record<string, any>;
}

export interface ProfileUpdateResponse {
  success: boolean;
  data: {
    updated: boolean;
    completionStatus: ProfileCompletionStatus;
  };
}

// Token management
export interface TokenConfiguration {
  accessToken: {
    expiryTime: string; // '15 minutes'
    algorithm: string; // 'RS256'
    issuer: string; // 'shambit-seller-auth'
  };
  refreshToken: {
    expiryTime: string; // '7 days'
    rotationStrategy: string; // 'on_use'
    reuseDetection: boolean;
    family: string; // 'token_family_id'
  };
  logout: {
    invalidateAll: boolean;
    blacklistDuration: string; // '7 days'
  };
}

// Admin role-based access control
export interface AdminRoles {
  superadmin: {
    permissions: string[];
    description: string;
  };
  reviewer: {
    permissions: string[];
    description: string;
  };
  verifier: {
    permissions: string[];
    description: string;
  };
  auditor: {
    permissions: string[];
    description: string;
  };
}

// Fraud detection
export interface FraudDetectionService {
  riskScoring: {
    deviceFingerprinting: boolean;
    behaviorAnalysis: boolean;
    velocityChecks: boolean;
    blacklistChecking: boolean;
  };
  ruleEngine: {
    suspiciousPatterns: string[];
    autoSuspendThreshold: number;
    manualReviewThreshold: number;
  };
  escalation: {
    autoSuspend: boolean;
    notifyAdmin: boolean;
    requireManualReview: boolean;
  };
}

// Rate Limiting and Security Models
export interface RateLimitRecord {
  id: string;
  identifier: string; // IP address, mobile number, or user ID
  identifierType: 'ip' | 'mobile' | 'user' | 'device';
  endpoint: string;
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  blocked: boolean;
  blockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityEvent {
  id: string;
  sellerId?: string;
  eventType: 'login_failure' | 'otp_abuse' | 'suspicious_device' | 'rate_limit_exceeded' | 'account_locked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface DeviceFingerprint {
  id: string;
  sellerId?: string;
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
  trusted: boolean;
  riskScore: number;
  associatedAccounts: string[];
  metadata: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
  };
}

// Analytics and Monitoring Models
export interface RegistrationAnalytics {
  id: string;
  sessionId: string;
  sellerId?: string;
  event: 'started' | 'form_filled' | 'otp_sent' | 'otp_verified' | 'completed' | 'abandoned';
  timestamp: Date;
  exitPoint?: string;
  completionTime?: number;
  errorEncountered?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  source: string;
  metadata: Record<string, any>;
}

export interface ConversionFunnel {
  date: Date;
  started: number;
  formFilled: number;
  otpSent: number;
  otpVerified: number;
  completed: number;
  conversionRate: number;
  averageCompletionTime: number;
  commonExitPoints: string[];
}

// Admin and Compliance Models
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'reviewer' | 'verifier' | 'auditor';
  permissions: string[];
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceRecord {
  id: string;
  sellerId: string;
  complianceType: 'kyc' | 'tax' | 'bank' | 'document';
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  lastChecked: Date;
  nextReviewDate: Date;
  violations?: string[];
  remedialActions?: string[];
  complianceOfficer?: string;
}

// OTP Management
export interface OTPRecord {
  id: string;
  mobile: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  ipAddress?: string;
}

export interface OTPResendRequest {
  mobile: string;
  method: 'sms' | 'whatsapp';
}

export interface OTPResendResponse {
  success: boolean;
  data: {
    sent: boolean;
    expiresIn: number;
    attemptsRemaining: number;
    cooldownSeconds?: number;
  };
}

// Session Management
export interface SessionRecord {
  id: string;
  sellerId: string;
  refreshTokenHash: string;
  tokenFamily: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Login and Authentication
export interface LoginRequest {
  identifier: string; // email or mobile
  password: string;
  deviceFingerprint?: string;
  ipAddress: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    seller: SellerProfile;
    requiresAdditionalVerification: boolean;
    rateLimitInfo: {
      remaining: number;
      lockoutSeconds?: number;
    };
  };
}

export interface SellerProfile extends Seller {
  // Extended profile information
}

// Document Upload
export interface DocumentUploadRequest {
  type: DocumentType;
  file: File;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  data: {
    documentId: string;
    uploadUrl?: string;
    verificationStatus: 'pending' | 'processing';
    estimatedReviewTime: string;
  };
}

// Service Level Agreements
export interface ServiceLevelAgreements {
  documentReview: string; // '48 hours'
  supportResponse: string; // '24 hours'
  payoutSetup: string; // '24 hours'
  currentProcessingTime?: string;
  queuePosition?: number;
}

// Validation Rules
export interface ValidationRules {
  mobile: {
    pattern: RegExp;
    message: string;
  };
  password: {
    minLength: number;
    requireMixed: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    strengthIndicator: boolean;
  };
  email: {
    pattern: RegExp;
    message: string;
  };
}

// OTP Configuration
export interface OTPConfig {
  length: number;
  expiryMinutes: number;
  maxAttempts: number;
  cooldownMinutes: number;
  autoFocus: boolean;
  numericKeypad: boolean;
}

// Rate Limiting Configuration
export interface RateLimitingConfiguration {
  endpoints: {
    registration: {
      limit: number;
      window: string;
      identifier: string;
      blockDuration: string;
    };
    login: {
      limit: number;
      window: string;
      identifier: string;
      progressiveDelay: boolean;
      accountLockout: {
        threshold: number;
        duration: string;
      };
    };
    otpRequest: {
      limit: number;
      window: string;
      identifier: string;
      cooldown: string;
      deviceFingerprinting: boolean;
    };
    apiGeneral: {
      limit: number;
      window: string;
      identifier: string;
      burstAllowance: number;
    };
  };
}
