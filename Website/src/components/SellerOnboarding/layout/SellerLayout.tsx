import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import Stepper from './Stepper';
import StatusBanner from './StatusBanner';
import type { SellerLayoutProps, StepConfig, OnboardingStep } from '../types';
import { useStepAccess } from '../hooks/useStepAccess';

const SellerLayout: React.FC<SellerLayoutProps> = ({
  children,
  currentStep = 'business',
  seller,
  showStepper = true,
  showStatusBanner = true
}) => {
  const sectionStatus = {
    business: !!seller?.businessDetails,
    tax: !!seller?.taxCompliance,
    bank: !!seller?.bankDetails,
    documents: !!(seller?.documents && seller.documents.length > 0)
  };

  const { getStepStatus } = useStepAccess(seller || null, sectionStatus);

  const steps: StepConfig[] = [
    {
      id: 'account',
      title: 'Account',
      description: 'Basic info',
      required: true,
      order: 1
    },
    {
      id: 'business',
      title: 'Business',
      description: 'Company details',
      required: true,
      order: 2
    },
    {
      id: 'tax',
      title: 'Tax Info',
      description: 'PAN & GST',
      required: true,
      order: 3
    },
    {
      id: 'bank',
      title: 'Banking',
      description: 'Account details',
      required: true,
      order: 4
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Upload files',
      required: true,
      order: 5
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Submit app',
      required: true,
      order: 6
    }
  ];

  const stepStatuses = steps.reduce((acc, step) => {
    acc[step.id] = getStepStatus(step.id);
    return acc;
  }, {} as Record<OnboardingStep, any>);

  const handleStepClick = (step: OnboardingStep) => {
    // This would typically be handled by the parent component
    // For now, we'll just log it
    console.log('Navigate to step:', step);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/seller/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-xl font-bold leading-none">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  Sham
                </span>
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  Bit
                </span>
                <span className="text-gray-700 ml-2 text-lg">Seller</span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF6F61] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {seller?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {seller?.fullName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {seller?.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      {showStepper && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Stepper
              currentStep={currentStep}
              steps={steps}
              stepStatuses={stepStatuses}
              onStepClick={handleStepClick}
            />
          </div>
        </div>
      )}

      {/* Status Banner */}
      {showStatusBanner && seller && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <StatusBanner
            status={seller.applicationStatus}
            rejectionReason={seller.rejectionReason}
            clarificationRequests={seller.clarificationRequests}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default SellerLayout;