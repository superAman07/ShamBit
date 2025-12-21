import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface BasicInfoFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  seller,
  onSubmit,
  loading,
  error
}) => {
  const [formData, setFormData] = useState({
    fullName: seller.fullName || '',
    mobile: seller.mobile || '',
    email: seller.email || '',
    alternateEmail: '',
    alternatePhone: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      errors.mobile = 'Enter valid 10-digit mobile number starting with 6-9';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    if (formData.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.alternateEmail)) {
      errors.alternateEmail = 'Enter a valid alternate email address';
    }

    if (formData.alternatePhone && !/^[6-9]\d{9}$/.test(formData.alternatePhone)) {
      errors.alternatePhone = 'Enter valid 10-digit alternate phone number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    await onSubmit(formData, false);
  };

  const handlePartialSave = async () => {
    await onSubmit(formData, true);
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-500 mr-3">⚠️</div>
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.fullName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your full name as per official documents"
          />
          {validationErrors.fullName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">+91</span>
            </div>
            <input
              type="tel"
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleInputChange('mobile', e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                validationErrors.mobile ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="9876543210"
              maxLength={10}
            />
          </div>
          {validationErrors.mobile && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.mobile}</p>
          )}
          {seller.mobileVerified && (
            <div className="mt-1 flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="your.email@example.com"
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
          )}
          {seller.emailVerified && (
            <div className="mt-1 flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          )}
        </div>

        {/* Alternate Email (Optional) */}
        <div>
          <label htmlFor="alternateEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Alternate Email Address <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="email"
            id="alternateEmail"
            value={formData.alternateEmail}
            onChange={(e) => handleInputChange('alternateEmail', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.alternateEmail ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="alternate.email@example.com"
          />
          {validationErrors.alternateEmail && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.alternateEmail}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Backup email for important notifications
          </p>
        </div>

        {/* Alternate Phone (Optional) */}
        <div>
          <label htmlFor="alternatePhone" className="block text-sm font-medium text-gray-700 mb-2">
            Alternate Phone Number <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">+91</span>
            </div>
            <input
              type="tel"
              id="alternatePhone"
              value={formData.alternatePhone}
              onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                validationErrors.alternatePhone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="9876543210"
              maxLength={10}
            />
          </div>
          {validationErrors.alternatePhone && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.alternatePhone}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Backup contact number for urgent communications
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={handlePartialSave}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save & Continue Later'}
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">💡 Important Notes</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Your mobile number and email are already verified from registration</li>
          <li>• Alternate contact details help us reach you if primary contacts are unavailable</li>
          <li>• All contact information will be kept confidential and used only for business purposes</li>
          <li>• You can update this information anytime from your profile settings</li>
        </ul>
      </div>
    </div>
  );
};