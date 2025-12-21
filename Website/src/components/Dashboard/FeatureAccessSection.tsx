import React from 'react';
import type { ProfileCompletionStatus, SellerBasicInfo } from '@shambit/shared';

interface FeatureAccessSectionProps {
  completionProgress: ProfileCompletionStatus;
  seller: SellerBasicInfo;
}

export const FeatureAccessSection: React.FC<FeatureAccessSectionProps> = ({
  completionProgress,
  seller
}) => {
  const features = [
    {
      name: 'Product Listing',
      description: 'Add and manage your products',
      icon: '📦',
      enabled: seller.canListProducts,
      requirements: ['Basic Info', 'Business Details', 'Tax Compliance'],
      requiredProgress: 60
    },
    {
      name: 'Payment Processing',
      description: 'Receive payments from customers',
      icon: '💳',
      enabled: seller.payoutEnabled,
      requirements: ['Bank Details', 'Document Verification'],
      requiredProgress: 80
    },
    {
      name: 'Bulk Operations',
      description: 'Upload multiple products at once',
      icon: '📊',
      enabled: completionProgress.overallProgress >= 100 && seller.verificationStatus === 'verified',
      requirements: ['Complete Profile', 'Verified Status'],
      requiredProgress: 100
    },
    {
      name: 'Advanced Analytics',
      description: 'Detailed sales and performance reports',
      icon: '📈',
      enabled: completionProgress.overallProgress >= 100 && seller.verificationStatus === 'verified',
      requirements: ['Complete Profile', 'Verified Status'],
      requiredProgress: 100
    },
    {
      name: 'Priority Support',
      description: 'Faster response times for support',
      icon: '🎧',
      enabled: seller.verificationStatus === 'verified',
      requirements: ['Verified Status'],
      requiredProgress: 100
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Access</h3>
      <p className="text-sm text-gray-600 mb-6">
        Complete your profile to unlock more features and capabilities.
      </p>

      <div className="space-y-4">
        {features.map((feature) => (
          <div
            key={feature.name}
            className={`border rounded-lg p-4 transition-all duration-200 ${
              feature.enabled
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-3">{feature.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{feature.name}</h4>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                feature.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {feature.enabled ? 'Unlocked' : 'Locked'}
              </div>
            </div>

            {/* Progress Bar for Locked Features */}
            {!feature.enabled && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs text-gray-500">
                    {Math.min(completionProgress.overallProgress, feature.requiredProgress)}% / {feature.requiredProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#FF6F61] h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(
                        (completionProgress.overallProgress / feature.requiredProgress) * 100, 
                        100
                      )}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Requirements */}
            <div className="text-xs text-gray-500">
              <span className="font-medium">Requirements:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {feature.requirements.map((req) => (
                  <span
                    key={req}
                    className={`px-2 py-1 rounded-full text-xs ${
                      feature.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unlock More Features CTA */}
      {completionProgress.overallProgress < 100 && (
        <div className="mt-6 bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] rounded-lg p-4 text-white">
          <h4 className="font-medium mb-2">🚀 Unlock All Features</h4>
          <p className="text-sm opacity-90 mb-3">
            Complete your profile to access all seller features and start maximizing your sales potential.
          </p>
          <div className="text-xs opacity-80">
            {100 - completionProgress.overallProgress}% remaining to unlock all features
          </div>
        </div>
      )}

      {/* All Features Unlocked */}
      {completionProgress.overallProgress === 100 && seller.verificationStatus === 'verified' && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-500 mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-900">All Features Unlocked! 🎉</h4>
              <p className="text-sm text-green-700">You now have access to all seller features and capabilities.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};