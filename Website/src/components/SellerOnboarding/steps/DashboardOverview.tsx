import React from 'react';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import InfoCard from '../components/InfoCard';
import type { SellerProfile, SectionStatus, OnboardingStep } from '../types';

interface DashboardOverviewProps {
  seller: SellerProfile;
  sectionStatus: SectionStatus;
  progress: number;
  onNavigateToSection: (section: OnboardingStep) => void;
  onSubmitApplication: () => void;
  canSubmit: boolean;
  submitting: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  seller,
  sectionStatus,
  progress,
  onNavigateToSection,
  onSubmitApplication,
  canSubmit,
  submitting
}) => {
  const sectionItems = [
    {
      id: 'business' as OnboardingStep,
      title: 'Business Details',
      description: 'Company information and registered address',
      completed: sectionStatus.business,
      required: true
    },
    {
      id: 'tax' as OnboardingStep,
      title: 'Tax Information',
      description: 'PAN, GST, and compliance details',
      completed: sectionStatus.tax,
      required: true
    },
    {
      id: 'bank' as OnboardingStep,
      title: 'Bank Details',
      description: 'Account information for payments',
      completed: sectionStatus.bank,
      required: true
    },
    {
      id: 'documents' as OnboardingStep,
      title: 'Documents',
      description: 'Upload verification documents',
      completed: sectionStatus.documents,
      required: true
    }
  ];

  const getNextAction = () => {
    if (seller.applicationStatus === 'approved') {
      return {
        title: 'Start Selling',
        description: 'Your application is approved. Start listing products!',
        buttonText: 'Go to Products',
        buttonAction: () => window.location.href = '/seller/products'
      };
    }

    if (seller.applicationStatus === 'submitted') {
      return {
        title: 'Application Under Review',
        description: 'We\'ll notify you once the review is complete.',
        buttonText: null,
        buttonAction: null
      };
    }

    if (canSubmit) {
      return {
        title: 'Ready to Submit',
        description: 'All sections completed. Submit your application for review.',
        buttonText: 'Submit Application',
        buttonAction: onSubmitApplication
      };
    }

    const nextIncomplete = sectionItems.find(item => !item.completed);
    if (nextIncomplete) {
      return {
        title: 'Continue Setup',
        description: `Complete your ${nextIncomplete.title.toLowerCase()} to proceed.`,
        buttonText: `Complete ${nextIncomplete.title}`,
        buttonAction: () => onNavigateToSection(nextIncomplete.id)
      };
    }

    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <SectionCard
        title={`Welcome back, ${seller.fullName.split(' ')[0]}!`}
        description="Complete your seller profile to start selling on ShamBit"
      >
        <div className="space-y-6">
          {/* Progress Overview */}
          <div>
            <ProgressBar 
              progress={progress}
              label="Profile Completion"
              className="mb-4"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {Object.values(sectionStatus).filter(Boolean).length} of 4 sections completed
              </span>
              <StatusBadge status={seller.applicationStatus} size="sm" />
            </div>
          </div>

          {/* Next Action */}
          {nextAction && (
            <InfoCard 
              type={seller.applicationStatus === 'approved' ? 'success' : 'info'}
              title={nextAction.title}
            >
              <p className="mb-3">{nextAction.description}</p>
              {nextAction.buttonAction && (
                <button
                  onClick={nextAction.buttonAction}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : nextAction.buttonText}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </InfoCard>
          )}
        </div>
      </SectionCard>

      {/* Sections Grid */}
      <SectionCard
        title="Profile Sections"
        description="Complete all sections to submit your seller application"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionItems.map((section) => (
            <button
              key={section.id}
              onClick={() => onNavigateToSection(section.id)}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-gray-900 group-hover:text-[#FF6F61] transition-colors">
                    {section.title}
                  </h3>
                  {section.required && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {section.description}
                </p>
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                {section.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6F61] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Application Status Details */}
      {(seller.applicationStatus === 'rejected' || seller.applicationStatus === 'clarification_needed') && (
        <SectionCard
          title="Action Required"
          description="Please address the following items to proceed"
        >
          <div className="space-y-4">
            {seller.rejectionReason && (
              <InfoCard type="error" title="Rejection Reason">
                {seller.rejectionReason}
              </InfoCard>
            )}
            
            {seller.clarificationRequests && seller.clarificationRequests.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Required Clarifications:</h4>
                {seller.clarificationRequests.map((request, index) => (
                  <InfoCard key={index} type="warning">
                    {request}
                  </InfoCard>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Help Section */}
      <SectionCard
        title="Need Help?"
        description="Get support with your seller application"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">FAQ</h4>
            <p className="text-sm text-gray-600">Common questions</p>
          </div>
          
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Live Chat</h4>
            <p className="text-sm text-gray-600">Get instant help</p>
          </div>
          
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Email Support</h4>
            <p className="text-sm text-gray-600">seller@shambit.com</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default DashboardOverview;