import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SellerLayout from './layout/SellerLayout';
import DashboardOverview from './steps/DashboardOverview';
import AccountStep from './steps/AccountStep';
import BusinessStep from './steps/BusinessStep';
import TaxStep from './steps/TaxStep';
import BankStep from './steps/BankStep';
import DocumentsStep from './steps/DocumentsStep';
import ReviewStep from './steps/ReviewStep';
import { useSellerProfile } from './hooks/useSellerProfile';
import { useStepAccess } from './hooks/useStepAccess';
import { sellerApi, errorUtils } from '../../utils/api';
import type { OnboardingStep, SaveOptions } from './types';

const SellerOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { seller, sectionStatus, loading, refetch, updateSectionStatus } = useSellerProfile();
  const { getStepAccess } = useStepAccess(seller, sectionStatus);

  const handleSectionSave = async (section: string, data: any, options?: SaveOptions) => {
    try {
      setError(null);
      
      const payload = {
        ...data,
        saveAsDraft: options?.saveAsDraft ?? false,
        skipValidation: options?.skipValidation ?? false,
      };
      
      // Call appropriate API based on section
      switch (section) {
        case 'business':
          await sellerApi.updateBusinessDetails(payload);
          break;
        case 'tax':
          await sellerApi.updateTaxInformation(payload);
          break;
        case 'bank':
          await sellerApi.updateBankDetails(payload);
          break;
        case 'documents':
          // Document upload is handled separately in the documents form
          break;
        default:
          throw new Error(`Unknown section: ${section}`);
      }

      // Update section status only if not saving as draft
      if (!options?.saveAsDraft) {
        updateSectionStatus(section as keyof typeof sectionStatus, true);
      }
      
      // Reload seller data to get updated info
      await refetch();
      
    } catch (error) {
      console.error(`Error saving ${section}:`, error);
      setError(errorUtils.getErrorMessage(error));
      throw error;
    }
  };

  // Create step-specific save functions
  const saveForStep = (step: OnboardingStep) => {
    return async (data: any, options?: SaveOptions) => {
      await handleSectionSave(step, data, options);
    };
  };

  const handleApplicationSubmit = async () => {
    const canSubmit = Object.values(sectionStatus).every(Boolean);
    
    if (!canSubmit) {
      setError('Please complete all sections before submitting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await sellerApi.submitApplication();
      
      // Reload seller data to get updated status
      await refetch();
      
      // Navigate to review step
      setCurrentStep('review');
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(errorUtils.getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepNavigation = (step: OnboardingStep) => {
    const stepAccess = getStepAccess(step);
    if (stepAccess.canAccess) {
      setCurrentStep(step);
    }
  };

  const calculateProgress = (): number => {
    const completedSections = Object.values(sectionStatus).filter(Boolean).length;
    return (completedSections / 4) * 100;
  };

  const canSubmitApplication = (): boolean => {
    return Object.values(sectionStatus).every(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6F61] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 text-red-500 mx-auto mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const renderCurrentStep = () => {
    const baseStepProps = {
      seller,
      canEdit: getStepAccess(currentStep).canEdit,
      isLoading: submitting
    };

    switch (currentStep) {
      case 'account':
        return <AccountStep {...baseStepProps} onSave={saveForStep('account')} />;
      case 'business':
        return <BusinessStep {...baseStepProps} onSave={saveForStep('business')} />;
      case 'tax':
        return <TaxStep {...baseStepProps} onSave={saveForStep('tax')} />;
      case 'bank':
        return <BankStep {...baseStepProps} onSave={saveForStep('bank')} />;
      case 'documents':
        return <DocumentsStep {...baseStepProps} onSave={saveForStep('documents')} />;
      case 'review':
        return (
          <ReviewStep 
            {...baseStepProps}
            onSave={saveForStep('review')}
            onSubmitApplication={handleApplicationSubmit}
            canSubmit={canSubmitApplication()}
            submitting={submitting}
          />
        );
      default:
        return (
          <DashboardOverview 
            seller={seller}
            sectionStatus={sectionStatus}
            progress={calculateProgress()}
            onNavigateToSection={handleStepNavigation}
            onSubmitApplication={handleApplicationSubmit}
            canSubmit={canSubmitApplication()}
            submitting={submitting}
          />
        );
    }
  };

  return (
    <SellerLayout
      currentStep={currentStep}
      seller={seller}
      showStepper={currentStep !== 'business'} // Hide stepper on dashboard
      showStatusBanner={true}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>

      {/* Global Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-red-500 flex-shrink-0">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </SellerLayout>
  );
};

export default SellerOnboarding;