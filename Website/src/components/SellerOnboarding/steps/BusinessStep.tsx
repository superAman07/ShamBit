import React, { useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps, ValidationResult, SaveOptions } from '../types';

const BusinessStep: React.FC<BaseStepProps> = ({ 
  seller, 
  onSave, 
  canEdit, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    businessName: seller.businessDetails?.businessName || '',
    businessType: seller.businessDetails?.businessType || '',
    natureOfBusiness: seller.businessDetails?.natureOfBusiness || '',
    yearOfEstablishment: seller.businessDetails?.yearOfEstablishment || '',
    primaryProductCategories: seller.businessDetails?.primaryProductCategories || '',
    registeredAddress: {
      line1: seller.addressInfo?.registeredAddress?.line1 || '',
      line2: seller.addressInfo?.registeredAddress?.line2 || '',
      city: seller.addressInfo?.registeredAddress?.city || '',
      state: seller.addressInfo?.registeredAddress?.state || '',
      pincode: seller.addressInfo?.registeredAddress?.pincode || '',
      country: 'India' as const
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const businessTypes = [
    { value: 'individual', label: 'Individual/Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'ngo', label: 'NGO' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const validateForm = (): ValidationResult => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
    }

    if (!formData.natureOfBusiness.trim()) {
      newErrors.natureOfBusiness = 'Nature of business is required';
    }

    if (!formData.registeredAddress.line1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }

    if (!formData.registeredAddress.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.registeredAddress.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.registeredAddress.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.registeredAddress.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit PIN code';
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      setFormData(prev => ({
        ...prev,
        registeredAddress: {
          ...prev.registeredAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async (options: SaveOptions = {}) => {
    const { saveAsDraft = false, skipValidation = false } = options;

    if (!skipValidation && !saveAsDraft) {
      const validation = validateForm();
      if (!validation.isValid) {
        return;
      }
    }

    try {
      setSaving(true);
      await onSave('business', formData);
    } catch (error) {
      console.error('Error saving business details:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Business Details"
        description="Provide your business information for verification and compliance"
        actions={
          !canEdit && (
            <InfoCard type="info" className="text-xs">
              This section has been submitted and is under review
            </InfoCard>
          )
        }
      >
        <form className="space-y-6">
          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                    errors.businessName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  placeholder="Enter your business name"
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                )}
              </div>

              <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                    errors.businessType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                >
                  <option value="">Select business type</option>
                  {businessTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.businessType && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700 mb-2">
                Nature of Business <span className="text-red-500">*</span>
              </label>
              <textarea
                id="natureOfBusiness"
                value={formData.natureOfBusiness}
                onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)}
                disabled={!canEdit}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors resize-none ${
                  errors.natureOfBusiness ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                placeholder="Describe your business activities (e.g., Manufacturing and selling electronics, Retail clothing, etc.)"
              />
              {errors.natureOfBusiness && (
                <p className="mt-1 text-sm text-red-600">{errors.natureOfBusiness}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700 mb-2">
                  Year of Establishment
                </label>
                <input
                  type="number"
                  id="yearOfEstablishment"
                  value={formData.yearOfEstablishment}
                  onChange={(e) => handleInputChange('yearOfEstablishment', e.target.value)}
                  disabled={!canEdit}
                  min="1900"
                  max={new Date().getFullYear()}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors border-gray-300 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'
                  }`}
                  placeholder="YYYY"
                />
              </div>

              <div>
                <label htmlFor="primaryProductCategories" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Product Categories
                </label>
                <input
                  type="text"
                  id="primaryProductCategories"
                  value={formData.primaryProductCategories}
                  onChange={(e) => handleInputChange('primaryProductCategories', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors border-gray-300 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'
                  }`}
                  placeholder="e.g., Electronics, Clothing, Home & Garden"
                />
              </div>
            </div>
          </div>

          {/* Registered Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Registered Address
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="addressLine1"
                  value={formData.registeredAddress.line1}
                  onChange={(e) => handleInputChange('address.line1', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                    errors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  placeholder="Building name, street name"
                />
                {errors.addressLine1 && (
                  <p className="mt-1 text-sm text-red-600">{errors.addressLine1}</p>
                )}
              </div>

              <div>
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="addressLine2"
                  value={formData.registeredAddress.line2}
                  onChange={(e) => handleInputChange('address.line2', e.target.value)}
                  disabled={!canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors border-gray-300 ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'
                  }`}
                  placeholder="Area, landmark (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.registeredAddress.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                      errors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    value={formData.registeredAddress.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                      errors.state ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  >
                    <option value="">Select state</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    value={formData.registeredAddress.pincode}
                    onChange={(e) => handleInputChange('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                      errors.pincode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                    placeholder="6-digit PIN code"
                    maxLength={6}
                  />
                  {errors.pincode && (
                    <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleSave({ saveAsDraft: true })}
                disabled={saving || isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Draft...' : 'Save as Draft'}
              </button>
              
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving || isLoading ? 'Saving...' : 'Save & Continue'}
                {!saving && !isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </form>
      </SectionCard>

      {/* Help Section */}
      <InfoCard type="info" title="Need Help?">
        <ul className="text-sm space-y-1">
          <li>• Business name should match your official registration documents</li>
          <li>• Registered address will be used for legal correspondence</li>
          <li>• Ensure all information is accurate to avoid delays in verification</li>
        </ul>
      </InfoCard>
    </div>
  );
};

export default BusinessStep;