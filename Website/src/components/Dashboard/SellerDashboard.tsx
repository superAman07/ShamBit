import React, { useState } from 'react';
import type { SellerBasicInfo, ProfileCompletionStatus, ServiceLevelAgreements } from '@shambit/shared';
import { WelcomeSection } from './WelcomeSection';
import { ProgressIndicator } from './ProgressIndicator';
import { NextStepsSection } from './NextStepsSection';
import { VerificationStatusSection } from './VerificationStatusSection';
import { FeatureAccessSection } from './FeatureAccessSection';
import { HelpSection } from './HelpSection';

interface SellerDashboardProps {
  seller: SellerBasicInfo;
  completionProgress: ProfileCompletionStatus;
  onNavigateToSection: (section: string) => void;
  onLogout: () => void;
  welcomeMessage: boolean;
  onboardingGuide: boolean;
  slaTimelines: ServiceLevelAgreements | null;
}

export const SellerDashboardComponent: React.FC<SellerDashboardProps> = ({
  seller,
  completionProgress,
  onNavigateToSection,
  onLogout,
  welcomeMessage,
  onboardingGuide,
  slaTimelines
}) => {
  const [showOnboarding, setShowOnboarding] = useState(onboardingGuide);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ShamBit Seller Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{seller.fullName}</span>
              </div>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Welcome Section */}
            {welcomeMessage && (
              <WelcomeSection
                seller={seller}
                showOnboarding={showOnboarding}
                onDismissOnboarding={() => setShowOnboarding(false)}
              />
            )}

            {/* Progress Indicator */}
            <ProgressIndicator
              completionProgress={completionProgress}
              onNavigateToSection={onNavigateToSection}
            />

            {/* Next Steps */}
            <NextStepsSection
              completionProgress={completionProgress}
              onNavigateToSection={onNavigateToSection}
            />

            {/* Verification Status */}
            <VerificationStatusSection
              seller={seller}
              slaTimelines={slaTimelines}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Feature Access */}
            <FeatureAccessSection
              completionProgress={completionProgress}
              seller={seller}
            />

            {/* Help Section */}
            <HelpSection />
          </div>
        </div>
      </div>
    </div>
  );
};