// Authentication form data types
export interface LoginFormData {
  identifier: string; // email or mobile
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  otp?: string;
  sessionId?: string;
}

export interface ForgotPasswordFormData {
  identifier: string; // email or mobile
}

export interface ResetPasswordFormData {
  token?: string;
  mobile?: string;
  otp?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface OTPVerificationData {
  mobile: string;
  otp: string;
  sessionId?: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidation {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string, formData?: any) => string;
}

// Form state types
export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  touched: Record<string, boolean>;
}

// OTP state
export interface OTPState {
  sent: boolean;
  verified: boolean;
  timeRemaining: number;
  attemptsRemaining: number;
  cooldownActive: boolean;
  method: 'sms' | 'whatsapp';
}

// Auth flow types
export type AuthStep = 'login' | 'register' | 'otp-verification' | 'forgot-password' | 'reset-password' | 'success';

export interface AuthFlowState {
  currentStep: AuthStep;
  previousStep?: AuthStep;
  data: Record<string, any>;
  sessionId?: string;
}

// API response types
export interface AuthResponse {
  success: boolean;
  data?: {
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
    seller?: any;
    sessionId?: string;
    expiresIn?: number;
    verified?: boolean;
    otpSent?: boolean;
    attemptsRemaining?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Component prop types
export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  maxLength?: number;
  className?: string;
}

export interface PasswordFieldProps extends Omit<FormFieldProps, 'type'> {
  showStrength?: boolean;
  requirements?: boolean;
}

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export interface LoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export interface ErrorAlertProps {
  error: string;
  suggestion?: string;
  onDismiss?: () => void;
  className?: string;
}

export interface SuccessMessageProps {
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  className?: string;
}

// Validation patterns
export const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s.'-]+$/,
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  otp: /^\d{6}$/
} as const;

// Password strength levels
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
  requirements: Array<{
    met: boolean;
    text: string;
  }>;
}