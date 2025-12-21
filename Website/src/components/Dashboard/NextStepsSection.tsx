import React from 'react';
import type { ProfileCompletionStatus } from '@shambit/shared';

interface NextStepsSectionProps {
  completionProgress: ProfileCompletionStatus;
  onNavigateToSection: (section: string) => void;
}

export const NextStepsSection: React.FC<NextStepsSectionProps> = ({
  completionProgress,
  onNavigateToSection
}) => {
  // Generate next steps based on completion status
  const getNextSteps = () => {
    const steps = [];

    if (!completionProgress.basicInfo) {
      steps.push({
        title: 'Complete Basic Information',
        description: 'Update your personal and contact details',
        action: 'basicInfo',
        priority: 'high',
        estimatedTime: '2 minutes',
        icon: '👤'
      });
    }

    if (!completionProgress.businessDetails) {
      steps.push({
        title: 'Add Business Details',
        description: 'Tell us about your business type and nature',
        action: 'businessDetails',
        priority: 'high',
        estimatedTime: '3 minutes',
        icon: '🏢'
      });
    }

    if (!completionProgress.taxCompliance) {
      steps.push({
        title: 'Provide Tax Information',
        description: 'Add your PAN and GST details for compliance',
        action: 'taxCompliance',
        priority: 'high',
        estimatedTime: '5 minutes',
        icon: '📋'
      });
    }

    if (!completionProgress.bankDetails) {
      steps.push({
        title: 'Setup Bank Account',
        description: 'Add your bank details to receive payments',
        action: 'bankDetails',
        priority: 'high',
        estimatedTime: '3 minutes',
        icon: '🏦'
      });
    }

    if (!completionProgress.addressInfo) {
      steps.push({
        title: 'Add Address Information',
        description: 'Provide your business and warehouse addresses',
        action: 'addressInfo',
        priority: 'medium',
        estimatedTime: '4 minutes',
        icon: '📍'
      });
    }

    if (!completionProgress.documentVerification) {
      steps.push({
        title: 'Upload Documents',
        description: 'Upload required documents for verification',
        action: 'documentVerification',
        priority: 'high',
        estimatedTime: '10 minutes',
        icon: '📄'
      });
    }

    // If everything is complete, show verification steps
    if (steps.length === 0) {
      steps.push({
        title: 'Await Verification',
        description: 'Our team is reviewing your documents',
        action: 'verification-status',
        priority: 'info',
        estimatedTime: 'Up to 48 hours',
        icon: '⏳'
      });
    }

    return steps.slice(0, 3); // Show max 3 next steps
  };

  const nextSteps = getNextSteps();

  if (nextSteps.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Next Steps</h3>
        <div className="text-sm text-gray-500">
          {completionProgress.nextSteps.length} action{completionProgress.nextSteps.length !== 1 ? 's' : ''} required
        </div>
      </div>

      <div className="space-y-4">
        {nextSteps.map((step, index) => (
          <div
            key={step.action}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${getPriorityColor(step.priority)}`}
            onClick={() => step.action !== 'verification-status' && onNavigateToSection(step.action)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-lg">{step.icon}</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="w-6 h-6 bg-[#FF6F61] text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 ml-9">{step.description}</p>
                  
                  <div className="flex items-center ml-9 space-x-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {step.estimatedTime}
                    </div>
                    
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityTextColor(step.priority)} bg-white`}>
                      {step.priority === 'high' ? 'High Priority' : 
                       step.priority === 'medium' ? 'Medium Priority' : 
                       step.priority === 'info' ? 'In Progress' : 'Optional'}
                    </div>
                  </div>
                </div>
              </div>

              {step.action !== 'verification-status' && (
                <div className="ml-4 flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Helpful Tips */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Complete high-priority items first to unlock product listing</li>
          <li>• Keep your documents ready: PAN card, bank statement, GST certificate (if applicable)</li>
          <li>• Verification typically takes 24-48 hours during business days</li>
          <li>• You can save progress and return later to complete any section</li>
        </ul>
      </div>
    </div>
  );
};