import React, { useState } from 'react';
import type { SellerBasicInfo, ProfileCompletionStatus } from '@shambit/shared';
import { BusinessDetailsForm } from './BusinessDetailsForm';
import { AddressInfoForm } from './AddressInfoForm';
import { TaxComplianceForm } from './TaxComplianceForm';
import { BankDetailsForm } from './BankDetailsForm';
import { DocumentVerificationForm } from './DocumentVerificationForm';
import { BasicInfoForm } from './BasicInfoForm';

interface ProfileCompletionFormProps {
  section: string;
  seller: SellerBasicInfo;
  completionStatus: ProfileCompletionStatus;
  onSectionComplete: (data: any, partialSave?: boolean) => Promise<void>;
  onBackToDashboard: () => void;
}

export const ProfileCompletionForm: React.FC<ProfileCompletionFormProps> = ({
  section,
  seller,
  completionStatus,
  onSectionComplete,
  onBackToDashboard
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSectionInfo = () => {
    switch (section) {
      case 'basicInfo':
        return {
          title: 'Basic Information',
          description: 'Update your personal and contact details',
          icon: '👤',
          completed: completionStatus.basicInfo
        };
      case 'businessDetails':
        return {
          title: 'Business Details',
          description: 'Tell us about your business type and nature',
          icon: '🏢',
          completed: completionStatus.businessDetails
        };
      case 'addressInfo':
        return {
          title: 'Address Information',
          description: 'Provide your business and warehouse addresses',
          icon: '📍',
          completed: completionStatus.addressInfo
        };
      case 'taxCompliance':
        return {
          title: 'Tax & Compliance',
          description: 'Add your PAN and GST details for compliance',
          icon: '📋',
          completed: completionStatus.taxCompliance
        };
      case 'bankDetails':
        return {
          title: 'Bank Details',
          description: 'Add your bank details to receive payments',
          icon: '🏦',
          completed: completionStatus.bankDetails
        };
      case 'documentVerification':
        return {
          title: 'Document Verification',
          description: 'Upload required documents for verification',
          icon: '📄',
          completed: completionStatus.documentVerification
        };
      default:
        return {
          title: 'Unknown Section',
          description: 'Invalid section',
          icon: '❓',
          completed: false
        };
    }
  };

  const sectionInfo = getSectionInfo();

  const handleFormSubmit = async (data: any, partialSave: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      await onSectionComplete(data, partialSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const renderSectionForm = () => {
    switch (section) {
      case 'basicInfo':
        return (
          <BasicInfoForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      case 'businessDetails':
        return (
          <BusinessDetailsForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      case 'addressInfo':
        return (
          <AddressInfoForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      case 'taxCompliance':
        return (
          <TaxComplianceForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      case 'bankDetails':
        return (
          <BankDetailsForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      case 'documentVerification':
        return (
          <DocumentVerificationForm
            seller={seller}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Invalid section: {section}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBackToDashboard}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Profile Completion</h1>
            </div>
            <div className="text-sm text-gray-600">
              {Math.round(completionStatus.overallProgress)}% Complete
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#FF6F61] bg-opacity-10 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">{sectionInfo.icon}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{sectionInfo.title}</h2>
                <p className="text-gray-600 mt-1">{sectionInfo.description}</p>
              </div>
            </div>
            
            {sectionInfo.completed && (
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(completionStatus.overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionStatus.overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {renderSectionForm()}
        </div>

        {/* Feature Unlock Info */}
        {!sectionInfo.completed && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">🔓 What you'll unlock:</h3>
            <div className="text-sm text-blue-800">
              {section === 'businessDetails' && (
                <p>• Better product categorization and business insights</p>
              )}
              {section === 'taxCompliance' && (
                <p>• Product listing capabilities and tax compliance</p>
              )}
              {section === 'bankDetails' && (
                <p>• Payment processing and payout capabilities</p>
              )}
              {section === 'addressInfo' && (
                <p>• Shipping and logistics setup</p>
              )}
              {section === 'documentVerification' && (
                <p>• Full account verification and all seller features</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};