import { useState, useCallback } from 'react';
import type { FormState, ValidationResult, FieldValidation } from '../types';
import { VALIDATION_PATTERNS } from '../types';

interface UseAuthFormOptions<T> {
  initialData: T;
  validationRules?: Record<keyof T, FieldValidation>;
  onSubmit?: (data: T) => Promise<void>;
}

export const useAuthForm = <T extends Record<string, any>>({
  initialData,
  validationRules = {},
  onSubmit
}: UseAuthFormOptions<T>) => {
  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    isSubmitting: false,
    isValid: false,
    touched: {}
  });

  const validateField = useCallback((field: keyof T, value: any, allData?: T): string => {
    const rules = validationRules[field];
    if (!rules) return '';

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${String(field)} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return '';
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return getPatternErrorMessage(field as string, rules.pattern);
    }

    // Length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `${String(field)} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `${String(field)} cannot exceed ${rules.maxLength} characters`;
    }

    // Custom validation
    if (rules.customValidator) {
      return rules.customValidator(value, allData || formState.data);
    }

    return '';
  }, [validationRules, formState.data]);

  const getPatternErrorMessage = (field: string, pattern: RegExp): string => {
    if (pattern === VALIDATION_PATTERNS.email) {
      return 'Please enter a valid email address';
    }
    if (pattern === VALIDATION_PATTERNS.mobile) {
      return 'Please enter a valid 10-digit mobile number starting with 6-9';
    }
    if (pattern === VALIDATION_PATTERNS.password) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    if (pattern === VALIDATION_PATTERNS.name) {
      return 'Name can only contain letters, spaces, dots, hyphens, and apostrophes';
    }
    if (pattern === VALIDATION_PATTERNS.otp) {
      return 'OTP must be exactly 6 digits';
    }
    return `Invalid ${field} format`;
  };

  const validateForm = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    
    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field as keyof T, formState.data[field], formState.data);
      if (error) {
        errors[field] = error;
      }
    });

    const isValid = Object.keys(errors).length === 0;
    
    setFormState(prev => ({
      ...prev,
      errors,
      isValid
    }));

    return { isValid, errors };
  }, [formState.data, validateField, validationRules]);

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormState(prev => {
      const newData = { ...prev.data, [field]: value };
      const error = validateField(field, value, newData);
      
      return {
        ...prev,
        data: newData,
        errors: { ...prev.errors, [field]: error },
        touched: { ...prev.touched, [field]: true }
      };
    });
  }, [validateField]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error }
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: '' }
    }));
  }, []);

  const setFormError = useCallback((error: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, form: error }
    }));
  }, []);

  const clearFormError = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, form: '' }
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      data: initialData,
      errors: {},
      isSubmitting: false,
      isValid: false,
      touched: {}
    });
  }, [initialData]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const validation = validateForm();
    if (!validation.isValid || !onSubmit) {
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(formState.data);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError('An error occurred. Please try again.');
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, onSubmit, formState.data, setFormError]);

  return {
    formState,
    updateField,
    setFieldError,
    clearFieldError,
    setFormError,
    clearFormError,
    validateForm,
    resetForm,
    handleSubmit
  };
};