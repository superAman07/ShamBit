import React from 'react';
import type { SellerBasicInfo, ServiceLevelAgreements } from '@shambit/shared';

interface VerificationStatusSectionProps {
  seller: SellerBasicInfo;
  slaTimelines: ServiceLevelAgreements | null;
}

export const VerificationStatusSection: React.FC<VerificationStatusSectionProps> = ({
  seller,
  slaTimelines
}) => {
  const getVerificationStatusInfo = () => {
    switch (seller.verificationStatus) {
      case 'pending':
        return {
          status: 'Pending Review',
          color: 'yellow',
          icon: '⏳',
          message: 'Your documents are in queue for review',
          timeline: slaTimelines?.documentReview || '48 hours'
        };
      case 'in_review':
        return {
          status: 'Under Review',
          color: 'blue',
          icon: '👀',
          message: 'Our team is currently reviewing your documents',
          timeline: slaTimelines?.currentProcessingTime || '24-48 hours'
        };
      case 'verified':
        return {
          status: 'Verified',
          color: 'green',
          icon: '✅',
          message: 'Your seller account is fully verified',
          timeline: 'Complete'
        };
      case 'rejected':
        return {
          status: 'Needs Attention',
          color: 'red',
          icon: '⚠️',
          message: 'Some documents need to be resubmitted',
          timeline: 'Action required'
        };
      default:
        return {
          status: 'Unknown',
          color: 'gray',
          icon: '❓',
          message: 'Status unavailable',
          timeline: 'N/A'
        };
    }
  };

  const statusInfo = getVerificationStatusInfo();

  const getStatusColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          badge: 'bg-green-100 text-green-800'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const colorClasses = getStatusColorClasses(statusInfo.color);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Verification Status</h3>

      {/* Main Status Card */}
      <div className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-4 mb-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="text-2xl mr-3">{statusInfo.icon}</div>
            <div>
              <h4 className={`font-medium ${colorClasses.text} mb-1`}>{statusInfo.status}</h4>
              <p className={`text-sm ${colorClasses.text} opacity-80 mb-2`}>{statusInfo.message}</p>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-xs ${colorClasses.text} opacity-80`}>
                  Expected timeline: {statusInfo.timeline}
                </span>
              </div>
            </div>
          </div>
          <div className={`${colorClasses.badge} px-3 py-1 rounded-full text-xs font-medium`}>
            {statusInfo.status}
          </div>
        </div>
      </div>

      {/* Verification Details */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Verification Checklist</h4>
        
        <div className="space-y-3">
          {/* Mobile Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                seller.mobileVerified ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {seller.mobileVerified && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">Mobile Number Verification</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              seller.mobileVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {seller.mobileVerified ? 'Verified' : 'Pending'}
            </span>
          </div>

          {/* Email Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                seller.emailVerified ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {seller.emailVerified && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">Email Address Verification</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              seller.emailVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {seller.emailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>

          {/* Document Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                seller.verificationStatus === 'verified' ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {seller.verificationStatus === 'verified' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">Document Verification</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              seller.verificationStatus === 'verified'
                ? 'bg-green-100 text-green-800'
                : seller.verificationStatus === 'in_review'
                ? 'bg-blue-100 text-blue-800'
                : seller.verificationStatus === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {seller.verificationStatus === 'verified' ? 'Verified' :
               seller.verificationStatus === 'in_review' ? 'In Review' :
               seller.verificationStatus === 'rejected' ? 'Rejected' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* SLA Information */}
      {slaTimelines && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Service Commitments</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Document Review</div>
              <div className="font-medium text-gray-900">{slaTimelines.documentReview}</div>
            </div>
            <div>
              <div className="text-gray-500">Support Response</div>
              <div className="font-medium text-gray-900">{slaTimelines.supportResponse}</div>
            </div>
            <div>
              <div className="text-gray-500">Payout Setup</div>
              <div className="font-medium text-gray-900">{slaTimelines.payoutSetup}</div>
            </div>
          </div>
          {slaTimelines.queuePosition && (
            <div className="mt-3 text-xs text-gray-600">
              Your position in review queue: #{slaTimelines.queuePosition}
            </div>
          )}
        </div>
      )}
    </div>
  );
};