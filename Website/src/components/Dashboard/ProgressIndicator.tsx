import React from 'react';
import type { ProfileCompletionStatus } from '@shambit/shared';

interface ProgressIndicatorProps {
  completionProgress: ProfileCompletionStatus;
  onNavigateToSection: (section: string) => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  completionProgress,
  onNavigateToSection
}) => {
  const sections = [
    {
      key: 'basicInfo',
      title: 'Basic Information',
      description: 'Name, contact details',
      completed: completionProgress.basicInfo,
      required: true,
      icon: '👤'
    },
    {
      key: 'businessDetails',
      title: 'Business Details',
      description: 'Business type, nature of business',
      completed: completionProgress.businessDetails,
      required: true,
      icon: '🏢'
    },
    {
      key: 'addressInfo',
      title: 'Address Information',
      description: 'Registered and warehouse addresses',
      completed: completionProgress.addressInfo,
      required: true,
      icon: '📍'
    },
    {
      key: 'taxCompliance',
      title: 'Tax & Compliance',
      description: 'PAN, GST details',
      completed: completionProgress.taxCompliance,
      required: true,
      icon: '📋'
    },
    {
      key: 'bankDetails',
      title: 'Bank Details',
      description: 'Account information for payouts',
      completed: completionProgress.bankDetails,
      required: true,
      icon: '🏦'
    },
    {
      key: 'documentVerification',
      title: 'Document Verification',
      description: 'Upload and verify documents',
      completed: completionProgress.documentVerification,
      required: true,
      icon: '📄'
    }
  ];

  const completedSections = sections.filter(section => section.completed).length;
  const totalSections = sections.length;
  const progressPercentage = Math.round((completedSections / totalSections) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Profile Completion</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#FF6F61]">{progressPercentage}%</div>
          <div className="text-sm text-gray-500">{completedSections} of {totalSections} completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.key}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              section.completed
                ? 'border-green-200 bg-green-50 hover:bg-green-100'
                : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-[#FF6F61]'
            }`}
            onClick={() => onNavigateToSection(section.key)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{section.icon}</span>
                  <h4 className="font-medium text-gray-900">{section.title}</h4>
                  {section.required && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                
                {/* Status */}
                <div className="flex items-center">
                  {section.completed ? (
                    <div className="flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="ml-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {progressPercentage === 100 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-500 mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Profile Complete! 🎉</h4>
              <p className="text-sm text-green-700">Your seller profile is now complete and ready for verification.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};