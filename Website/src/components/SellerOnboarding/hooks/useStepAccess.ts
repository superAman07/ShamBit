import { useMemo } from 'react';
import type { OnboardingStep, SellerProfile, SectionStatus, StepAccess, StepStatus } from '../types';

export interface UseStepAccessReturn {
  getStepAccess: (step: OnboardingStep) => StepAccess;
  getStepStatus: (step: OnboardingStep) => StepStatus;
  canAccessStep: (step: OnboardingStep) => boolean;
  canEditStep: (step: OnboardingStep) => boolean;
  getNextAvailableStep: (currentStep: OnboardingStep) => OnboardingStep | null;
}

export const useStepAccess = (
  seller: SellerProfile | null,
  sectionStatus: SectionStatus
): UseStepAccessReturn => {
  
  const stepOrder: OnboardingStep[] = ['account', 'business', 'tax', 'bank', 'documents', 'review'];

  const getStepStatus = (step: OnboardingStep): StepStatus => {
    if (!seller) return 'locked';

    // Account step is always completed after registration
    if (step === 'account') {
      return 'completed';
    }

    // Review step logic
    if (step === 'review') {
      const allCompleted = Object.values(sectionStatus).every(Boolean);
      if (!allCompleted) return 'locked';
      
      switch (seller.applicationStatus) {
        case 'submitted':
        case 'approved':
          return 'completed';
        case 'rejected':
          return 'rejected';
        case 'clarification_needed':
          return 'clarification_needed';
        default:
          return 'active';
      }
    }

    // Other steps
    const sectionKey = step as keyof SectionStatus;
    const isCompleted = sectionStatus[sectionKey];
    
    if (isCompleted) {
      // Check if step needs clarification or is rejected
      if (seller.applicationStatus === 'rejected' || seller.applicationStatus === 'clarification_needed') {
        return 'clarification_needed';
      }
      return 'completed';
    }

    // Check if step is accessible (sequential access)
    const currentStepIndex = stepOrder.indexOf(step);
    const previousSteps = stepOrder.slice(0, currentStepIndex);
    
    // Account is always accessible
    if (step === 'business') return 'active';
    
    // Other steps require previous steps to be completed
    const previousCompleted = previousSteps.every(prevStep => {
      if (prevStep === 'account') return true;
      return sectionStatus[prevStep as keyof SectionStatus];
    });

    return previousCompleted ? 'active' : 'locked';
  };

  const canEditStep = (step: OnboardingStep): boolean => {
    if (!seller) return false;
    
    // Account step is not editable in onboarding flow
    if (step === 'account') return false;
    
    // Review step is not directly editable
    if (step === 'review') return false;
    
    // Can edit if application is incomplete, rejected, or needs clarification
    return ['incomplete', 'rejected', 'clarification_needed'].includes(seller.applicationStatus);
  };

  const canAccessStep = (step: OnboardingStep): boolean => {
    const status = getStepStatus(step);
    return status !== 'locked';
  };

  const getStepAccess = (step: OnboardingStep): StepAccess => {
    const status = getStepStatus(step);
    const canAccess = canAccessStep(step);
    const canEdit = canEditStep(step);
    
    let reason: string | undefined;
    if (!canAccess) {
      reason = 'Complete previous steps to unlock this section';
    } else if (!canEdit && status === 'completed') {
      reason = 'This section has been submitted and is under review';
    }

    return {
      canAccess,
      canEdit,
      status,
      reason
    };
  };

  const getNextAvailableStep = (currentStep: OnboardingStep): OnboardingStep | null => {
    const currentIndex = stepOrder.indexOf(currentStep);
    
    for (let i = currentIndex + 1; i < stepOrder.length; i++) {
      const nextStep = stepOrder[i];
      if (canAccessStep(nextStep)) {
        return nextStep;
      }
    }
    
    return null;
  };

  return useMemo(() => ({
    getStepAccess,
    getStepStatus,
    canAccessStep,
    canEditStep,
    getNextAvailableStep
  }), [seller, sectionStatus]);
};