import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface BusinessDetailsFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const BusinessDetailsForm: React.FC<BusinessDetailsFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'individual' as 'individual' | 'proprietorship' | 'partnership' | 'llp' | 'private_limited',
    natureOfBusiness: '',
    yearOfEstablishment: new Date().getFullYear(),
    primaryProductCategories: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const businessTypes = [
    { value: 'individual', label: 'Individual Seller', description: 'Selling as an individual person' },
    { value: 'proprietorship', label: 'Sole Proprietorship', description: 'Single owner business' },
    { value: 'partnership', label: 'Partnership', description: 'Business with multiple partners' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)', description: 'Registered LLP entity' },
    { value: 'private_limited', label: 'Private Limited Company', description: 'Registered private company' }
  ];

  const businessNatures = [
    'Manufacturer',
    'Wholesaler',
    'Retailer',
    'Distributor',
    'Importer',
    'Exporter',
    'Service Provider',
    'Reseller',
    'Brand Owner',
    'Other'
  ];

  const productCategories = [
    'Electronics & Accessories',
    'Fashion & Apparel',
    'Home & Kitchen',
    'Health & Personal Care',
    'Books & Stationery',
    'Sports & Fitness',
    'Toys & Games',
    'Automotive',
    'Grocery & Food',
    'Beauty & Cosmetics',
    'Jewelry & Watches',
    'Baby & Kids',
    'Pet Supplies',
    'Industrial & Scientific',
    'Other'
  ];

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }

    if (!formData.natureOfBusiness) {
      errors.natureOfBusiness = 'Nature of business is required';
    }

    if (!formData.primaryProductCategories) {
      errors.primaryProductCategories = 'Primary product category is required';
    }

    const currentYear = new Date().getFullYear();
    if (formData.yearOfEstablishment < 1900 || formData.yearOfEstablishment > currentYear) {
      errors.yearOfEstablishment = `Year must be between 1900 and ${currentYear}`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number) => {
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

        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="businessName"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.businessName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your business name"
          />
          {validationErrors.businessName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.businessName}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            This will be displayed to customers on your seller profile
          </p>
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Business Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {businessTypes.map((type) => (
              <div
                key={type.value}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  formData.businessType === type.value
                    ? 'border-[#FF6F61] bg-[#FF6F61] bg-opacity-5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleInputChange('businessType', type.value)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="businessType"
                    value={type.value}
                    checked={formData.businessType === type.value}
                    onChange={() => handleInputChange('businessType', type.value)}
                    className="mt-1 text-[#FF6F61] focus:ring-[#FF6F61]"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nature of Business */}
        <div>
          <label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700 mb-2">
            Nature of Business <span className="text-red-500">*</span>
          </label>
          <select
            id="natureOfBusiness"
            value={formData.natureOfBusiness}
            onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.natureOfBusiness ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select nature of business</option>
            {businessNatures.map((nature) => (
              <option key={nature} value={nature}>{nature}</option>
            ))}
          </select>
          {validationErrors.natureOfBusiness && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.natureOfBusiness}</p>
          )}
        </div>

        {/* Year of Establishment */}
        <div>
          <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700 mb-2">
            Year of Establishment <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="yearOfEstablishment"
            value={formData.yearOfEstablishment}
            onChange={(e) => handleInputChange('yearOfEstablishment', parseInt(e.target.value) || new Date().getFullYear())}
            min="1900"
            max={new Date().getFullYear()}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.yearOfEstablishment ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="2020"
          />
          {validationErrors.yearOfEstablishment && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.yearOfEstablishment}</p>
          )}
        </div>

        {/* Primary Product Categories */}
        <div>
          <label htmlFor="primaryProductCategories" className="block text-sm font-medium text-gray-700 mb-2">
            Primary Product Categories <span className="text-red-500">*</span>
          </label>
          <select
            id="primaryProductCategories"
            value={formData.primaryProductCategories}
            onChange={(e) => handleInputChange('primaryProductCategories', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.primaryProductCategories ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select primary product category</option>
            {productCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {validationErrors.primaryProductCategories && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.primaryProductCategories}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Choose the main category of products you plan to sell
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
        <h4 className="font-medium text-gray-900 mb-2">💡 Business Information Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Choose the business type that matches your legal registration</li>
          <li>• Your business name will be visible to customers on your seller profile</li>
          <li>• Select the most accurate nature of business for better categorization</li>
          <li>• Primary product category helps us recommend relevant features and tools</li>
          <li>• You can add more product categories later when listing products</li>
        </ul>
      </div>
    </div>
  );
};