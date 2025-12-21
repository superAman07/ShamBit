import React from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface WelcomeSectionProps {
  seller: SellerBasicInfo;
  showOnboarding: boolean;
  onDismissOnboarding: () => void;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  seller,
  showOnboarding,
  onDismissOnboarding
}) => {
  const isNewSeller = new Date(seller.createdAt).getTime() > Date.now() - (24 * 60 * 60 * 1000); // Within 24 hours

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isNewSeller ? `Welcome to ShamBit, ${seller.fullName}! 🎉` : `Welcome back, ${seller.fullName}!`}
          </h2>
          <p className="text-gray-600 mb-4">
            {isNewSeller 
              ? "Congratulations on joining India's fastest-growing marketplace! Let's get your seller profile set up so you can start selling."
              : "Continue building your seller profile to unlock more features and start selling."
            }
          </p>
          
          {/* Account Status */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                seller.mobileVerified ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Mobile: {seller.mobileVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                seller.emailVerified ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Email: {seller.emailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Account Status</div>
              <div className={`font-medium ${
                seller.status === 'active' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {seller.status === 'active' ? 'Active' : 'Pending Setup'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Verification</div>
              <div className={`font-medium ${
                seller.verificationStatus === 'verified' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {seller.verificationStatus === 'verified' ? 'Complete' : 'In Progress'}
              </div>
            </div>
          </div>
        </div>

        {showOnboarding && (
          <button
            onClick={onDismissOnboarding}
            className="text-gray-400 hover:text-gray-600 ml-4"
            aria-label="Dismiss welcome message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Onboarding Guide */}
      {showOnboarding && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">🚀 Quick Start Guide</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
              Complete your business profile (5 minutes)
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
              Upload required documents (PAN, Bank details)
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
              Wait for verification (usually within 48 hours)
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
              Start listing your products and selling!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};