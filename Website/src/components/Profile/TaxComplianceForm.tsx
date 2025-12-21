import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface TaxComplianceFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const TaxComplianceForm: React.FC<TaxComplianceFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [formData, setFormData] = useState({
    panNumber: '',
    panHolderName: '',
    gstRegistered: false,
    gstNumber: '',
    aadhaarNumber: '',
    gstExempt: false,
    exemptionReason: '' as 'turnover_below_threshold' | 'exempt_goods' | 'composition_scheme' | '',
    turnoverDeclaration: 0
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const exemptionReasons = [
    { value: 'turnover_below_threshold', label: 'Annual turnover below ₹40 lakhs' },
    { value: 'exempt_goods', label: 'Selling only GST-exempt goods' },
    { value: 'composition_scheme', label: 'Registered under composition scheme' }
  ];

  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateGST = (gst: string) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  const validateAadhaar = (aadhaar: string) => {
    const aadhaarRegex = /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // PAN validation
    if (!formData.panNumber.trim()) {
      errors.panNumber = 'PAN number is required';
    } else if (!validatePAN(formData.panNumber.toUpperCase())) {
      errors.panNumber = 'Enter valid PAN number (e.g., ABCDE1234F)';
    }

    if (!formData.panHolderName.trim()) {
      errors.panHolderName = 'PAN holder name is required';
    }

    // GST validation
    if (formData.gstRegistered) {
      if (!formData.gstNumber.trim()) {
        errors.gstNumber = 'GST number is required when GST registered';
      } else if (!validateGST(formData.gstNumber.toUpperCase())) {
        errors.gstNumber = 'Enter valid GST number (15 digits)';
      } else {
        // Cross-validate GST with PAN
        const panFromGst = formData.gstNumber.substring(2, 12);
        if (panFromGst !== formData.panNumber.toUpperCase()) {
          errors.gstNumber = 'GST number must contain the same PAN number';
        }
      }
    }

    // GST exemption validation
    if (formData.gstExempt && !formData.exemptionReason) {
      errors.exemptionReason = 'Please select exemption reason';
    }

    if (formData.exemptionReason === 'turnover_below_threshold' && formData.turnoverDeclaration >= 4000000) {
      errors.turnoverDeclaration = 'Turnover should be below ₹40 lakhs for this exemption';
    }

    // Aadhaar validation (optional)
    if (formData.aadhaarNumber && !validateAadhaar(formData.aadhaarNumber)) {
      errors.aadhaarNumber = 'Enter valid 12-digit Aadhaar number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle GST registration toggle
    if (field === 'gstRegistered' && !value) {
      setFormData(prev => ({ ...prev, gstNumber: '', gstExempt: true }));
    }

    if (field === 'gstRegistered' && value) {
      setFormData(prev => ({ ...prev, gstExempt: false, exemptionReason: '', turnoverDeclaration: 0 }));
    }
  };

  const formatAadhaar = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,4})(\d{0,4})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join(' ');
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const submitData = {
      ...formData,
      panNumber: formData.panNumber.toUpperCase(),
      gstNumber: formData.gstNumber.toUpperCase(),
      aadhaarNumber: formData.aadhaarNumber.replace(/\s/g, '')
    };
    
    await onSubmit(submitData, false);
  };

  const handlePartialSave = async () => {
    const submitData = {
      ...formData,
      panNumber: formData.panNumber.toUpperCase(),
      gstNumber: formData.gstNumber.toUpperCase(),
      aadhaarNumber: formData.aadhaarNumber.replace(/\s/g, '')
    };
    
    await onSubmit(submitData, true);
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

        {/* PAN Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">📋 PAN Information (Required)</h3>
          <p className="text-sm text-blue-800 mb-4">
            PAN is mandatory for all sellers as per Indian tax regulations
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAN Number */}
            <div>
              <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                  validationErrors.panNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ABCDE1234F"
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
              />
              {validationErrors.panNumber && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.panNumber}</p>
              )}
            </div>

            {/* PAN Holder Name */}
            <div>
              <label htmlFor="panHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                Name as per PAN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="panHolderName"
                value={formData.panHolderName}
                onChange={(e) => handleInputChange('panHolderName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                  validationErrors.panHolderName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Full name as per PAN card"
              />
              {validationErrors.panHolderName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.panHolderName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must match exactly with PAN card
              </p>
            </div>
          </div>
        </div>

        {/* GST Information */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">🏢 GST Information</h3>

          {/* GST Registration Status */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.gstRegistered}
                onChange={(e) => handleInputChange('gstRegistered', e.target.checked)}
                className="text-[#FF6F61] focus:ring-[#FF6F61] rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                I have GST registration
              </span>
            </label>
          </div>

          {/* GST Number */}
          {formData.gstRegistered && (
            <div className="mb-4">
              <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-2">
                GST Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="gstNumber"
                value={formData.gstNumber}
                onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                  validationErrors.gstNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="22ABCDE1234F1Z5"
                maxLength={15}
                style={{ textTransform: 'uppercase' }}
              />
              {validationErrors.gstNumber && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.gstNumber}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                15-character GST number (must contain your PAN)
              </p>
            </div>
          )}

          {/* GST Exemption */}
          {!formData.gstRegistered && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.gstExempt}
                    onChange={(e) => handleInputChange('gstExempt', e.target.checked)}
                    className="text-[#FF6F61] focus:ring-[#FF6F61] rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I am exempt from GST registration
                  </span>
                </label>
              </div>

              {formData.gstExempt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exemption Reason <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {exemptionReasons.map((reason) => (
                      <label key={reason.value} className="flex items-center">
                        <input
                          type="radio"
                          name="exemptionReason"
                          value={reason.value}
                          checked={formData.exemptionReason === reason.value}
                          onChange={(e) => handleInputChange('exemptionReason', e.target.value)}
                          className="text-[#FF6F61] focus:ring-[#FF6F61]"
                        />
                        <span className="ml-2 text-sm text-gray-700">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                  {validationErrors.exemptionReason && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.exemptionReason}</p>
                  )}
                </div>
              )}

              {formData.exemptionReason === 'turnover_below_threshold' && (
                <div>
                  <label htmlFor="turnoverDeclaration" className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Turnover Declaration <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="turnoverDeclaration"
                      value={formData.turnoverDeclaration}
                      onChange={(e) => handleInputChange('turnoverDeclaration', parseInt(e.target.value) || 0)}
                      className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                        validationErrors.turnoverDeclaration ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="3500000"
                      max={3999999}
                    />
                  </div>
                  {validationErrors.turnoverDeclaration && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.turnoverDeclaration}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Must be below ₹40,00,000 for GST exemption
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aadhaar Information (Optional) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">🆔 Aadhaar Information (Optional)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Aadhaar helps with faster verification and additional security
          </p>

          <div>
            <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Aadhaar Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="aadhaarNumber"
              value={formData.aadhaarNumber}
              onChange={(e) => handleInputChange('aadhaarNumber', formatAadhaar(e.target.value))}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
                validationErrors.aadhaarNumber ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="1234 5678 9012"
              maxLength={14}
            />
            {validationErrors.aadhaarNumber && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.aadhaarNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              12-digit Aadhaar number (will be encrypted and stored securely)
            </p>
          </div>
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
        <h4 className="font-medium text-gray-900 mb-2">📋 Tax Compliance Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• PAN is mandatory for all sellers as per Indian tax laws</li>
          <li>• GST registration is required if annual turnover exceeds ₹40 lakhs</li>
          <li>• GST number must contain your PAN number (characters 3-12)</li>
          <li>• Small sellers below ₹40L turnover are exempt from GST</li>
          <li>• All tax information will be verified during document review</li>
          <li>• Incorrect tax details may delay your seller approval</li>
        </ul>
      </div>
    </div>
  );
};