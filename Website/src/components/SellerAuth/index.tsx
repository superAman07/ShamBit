// Main page components (only what we actually use)
export { default as SellerInfoPage } from './pages/SellerInfoPage';
export { default as SellerRegistrationPage } from './pages/SellerRegistrationPage';
export { default as SellerLoginPage } from './pages/SellerLoginPage';

// Layout components (used by other pages)
export { default as SellerLayout } from './layout/SellerLayout';
export { default as AuthLayout } from './layout/AuthLayout';

// Form components (used by other pages)
export { default as ForgotPasswordForm } from './forms/ForgotPasswordForm';
export { default as ResetPasswordForm } from './forms/ResetPasswordForm';

// Essential components (used by the registration page)
export { default as FormField } from './components/FormField';
export { default as PasswordField } from './components/PasswordField';
export { default as LoadingButton } from './components/LoadingButton';
export { default as ErrorAlert } from './components/ErrorAlert';
export { default as SuccessMessage } from './components/SuccessMessage';
export { default as ProgressIndicator } from './components/ProgressIndicator';
export { default as OTPInput } from './components/OTPInput';

// Forms (used by the registration page)
export { default as OTPVerificationForm } from './forms/OTPVerificationForm';

// Hooks (used by the registration page)
export { default as useAuthForm } from './hooks/useAuthForm';

// Types (used by the registration page)
export * from './types';