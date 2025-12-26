import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

const AccountStep: React.FC<BaseStepProps> = ({ seller, onSave: _onSave, canEdit: _canEdit, isLoading: _isLoading }) => {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Account Information"
        description="Your basic account details"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={seller.fullName || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={seller.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                value={seller.mobile || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  seller.applicationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                  seller.applicationStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
                  seller.applicationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                  seller.applicationStatus === 'clarification_needed' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {seller.applicationStatus?.replace('_', ' ').toUpperCase() || 'INCOMPLETE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <InfoCard type="info" title="Account Information">
        <ul className="text-sm space-y-1">
          <li>• Your account information was set during registration</li>
          <li>• Contact support if you need to update your email or mobile number</li>
          <li>• Complete all sections to activate your seller account</li>
        </ul>
      </InfoCard>
    </div>
  );
};

export default AccountStep;