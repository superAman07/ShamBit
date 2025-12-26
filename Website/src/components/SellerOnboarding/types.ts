import type { 
  SellerBasicInfo, 
  BusinessDetails, 
  TaxCompliance, 
  BankDetails, 
  Document,
  AddressInfo
} from '@shambit/shared';

// Application status types
export type ApplicationStatus = 'incomplete' | 'submitted' | 'clarification_needed' | 'approved' | 'rejected';

// Step status for stepper
export type StepStatus = 'completed' | 'active' | 'locked' | 'rejected' | 'clarification_needed';

// Onboarding steps
export type OnboardingStep = 'account' | 'business' | 'tax' | 'bank' | 'documents' | 'review';

// Step configuration
export interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  required: boolean;
  order: number;
}

// Section completion status
export interface SectionStatus {
  business: boolean;
  tax: boolean;
  bank: boolean;
  documents: boolean;
}

// Complete seller profile with application status
export interface SellerProfile extends SellerBasicInfo {
  applicationStatus: ApplicationStatus;
  rejectionReason?: string;
  clarificationRequests?: string[];
  businessDetails?: BusinessDetails;
  taxCompliance?: TaxCompliance;
  bankDetails?: BankDetails;
  documents?: Document[];
  addressInfo?: AddressInfo;
}

// Step access control
export interface StepAccess {
  canAccess: boolean;
  canEdit: boolean;
  status: StepStatus;
  reason?: string;
}

// Stepper props
export interface StepperProps {
  currentStep: OnboardingStep;
  steps: StepConfig[];
  stepStatuses: Record<OnboardingStep, StepStatus>;
  onStepClick: (step: OnboardingStep) => void;
  className?: string;
}

// Layout props
export interface SellerLayoutProps {
  children: React.ReactNode;
  currentStep?: OnboardingStep;
  seller?: SellerProfile;
  showStepper?: boolean;
  showStatusBanner?: boolean;
}

// Status banner props
export interface StatusBannerProps {
  status: ApplicationStatus;
  rejectionReason?: string;
  clarificationRequests?: string[];
  className?: string;
}

// Save options
export interface SaveOptions {
  saveAsDraft?: boolean;
  skipValidation?: boolean;
}

// Form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Step component base props
export interface BaseStepProps {
  seller: SellerProfile;
  canEdit: boolean;
  isLoading?: boolean;
  onSave: (data: any, options?: SaveOptions) => Promise<void>;
}