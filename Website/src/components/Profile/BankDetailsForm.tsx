import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface BankDetailsFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const BankDetailsForm: React.FC<BankDetailsFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'savings' as 'savings' | 'current',
    verificationMethod: 'cancelled_cheque' as 'cancelled_cheque' | 'bank_statement'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateIFSC = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const validateAccountNumber = (accountNumber: string) => {
    // Basic validation: 9-18 digits
    const accountRegex = /^[0-9]{9,18}$/;
    return accountRegex.test(accountNumber);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required';
    } else if (!validateAccountNumber(formData.accountNumber)) {
      errors.accountNumber = 'Enter valid account number (9-18 digits)';
    }

    if (!formData.confirmAccountNumber.trim()) {
      errors.confirmAccountNumber = 'Please confirm account number';
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      errors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!formData.ifscCode.trim()) {
      errors.ifscCode = 'IFSC code is required';
    } else if (!validateIFSC(formData.ifscCode.toUpperCase())) {
      errors.ifscCode = 'Enter valid IFSC code (e.g., SBIN0001234)';
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
    
    const submitData = {
      ...formData,
      ifscCode: formData.ifscCode.toUpperCase(),
      verificationStatus: 'pending'
    };
    
    await onSubmit(submitData, false);
  };

  const handlePartialSave = async () => {
    const submitData = {
      ...formData,
      ifscCode: formData.ifscCode.toUpperCase(),
      verificationStatus: 'pending'
    };
    
    await onSubmit(submitData, true);
  };

  const popularBanks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Indian Bank',
    'Bank of India',
    'Central Bank of India',
    'IDFC First Bank',
    'Yes Bank',
    'IndusInd Bank',
    'Other'
  ];

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

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">🏦 Bank Account Information</h3>
          <p className="text-sm text-blue-800">
            This account will be used to receive payments from your sales. Ensure all details are accurate as verification is required before payouts can be processed.
          </p>
        </div>

        {/* Account Holder Name */}
        <div>
          <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="accountHolderName"
            value={formData.accountHolderName}
            onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.accountHolderName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Full name as per bank account"
          />
          {validationErrors.accountHolderName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.accountHolderName}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must match exactly with your bank account records
          </p>
        </div>

        {/* Bank Name */}
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <select
            id="bankName"
            value={formData.bankName}
            onChange={(e) => handleInputChange('bankName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.bankName ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select your bank</option>
            {popularBanks.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
          {validationErrors.bankName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.bankName}</p>
          )}
          
          {formData.bankName === 'Other' && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Enter bank name"
                value={formData.bankName === 'Other' ? '' : formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.accountNumber ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter account number"
            maxLength={18}
          />
          {validationErrors.accountNumber && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.accountNumber}</p>
          )}
        </div>

        {/* Confirm Account Number */}
        <div>
          <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="confirmAccountNumber"
            value={formData.confirmAccountNumber}
            onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.confirmAccountNumber ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Re-enter account number"
            maxLength={18}
          />
          {validationErrors.confirmAccountNumber && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.confirmAccountNumber}</p>
          )}
        </div>

        {/* IFSC Code */}
        <div>
          <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-2">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="ifscCode"
            value={formData.ifscCode}
            onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-colors ${
              validationErrors.ifscCode ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="SBIN0001234"
            maxLength={11}
            style={{ textTransform: 'uppercase' }}
          />
          {validationErrors.ifscCode && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.ifscCode}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            11-character IFSC code (found on cheque book or bank statement)
          </p>
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Account Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                formData.accountType === 'savings'
                  ? 'border-[#FF6F61] bg-[#FF6F61] bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange('accountType', 'savings')}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="savings"
                  checked={formData.accountType === 'savings'}
                  onChange={() => handleInputChange('accountType', 'savings')}
                  className="text-[#FF6F61] focus:ring-[#FF6F61]"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Savings Account</div>
                  <div className="text-sm text-gray-600">Personal savings account</div>
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                formData.accountType === 'current'
                  ? 'border-[#FF6F61] bg-[#FF6F61] bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange('accountType', 'current')}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="current"
                  checked={formData.accountType === 'current'}
                  onChange={() => handleInputChange('accountType', 'current')}
                  className="text-[#FF6F61] focus:ring-[#FF6F61]"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Current Account</div>
                  <div className="text-sm text-gray-600">Business current account</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Verification Method <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                formData.verificationMethod === 'cancelled_cheque'
                  ? 'border-[#FF6F61] bg-[#FF6F61] bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange('verificationMethod', 'cancelled_cheque')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="verificationMethod"
                  value="cancelled_cheque"
                  checked={formData.verificationMethod === 'cancelled_cheque'}
                  onChange={() => handleInputChange('verificationMethod', 'cancelled_cheque')}
                  className="mt-1 text-[#FF6F61] focus:ring-[#FF6F61]"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Cancelled Cheque</div>
                  <div className="text-sm text-gray-600">
                    Upload a cancelled cheque leaf with account details clearly visible
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                formData.verificationMethod === 'bank_statement'
                  ? 'border-[#FF6F61] bg-[#FF6F61] bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange('verificationMethod', 'bank_statement')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="verificationMethod"
                  value="bank_statement"
                  checked={formData.verificationMethod === 'bank_statement'}
                  onChange={() => handleInputChange('verificationMethod', 'bank_statement')}
                  className="mt-1 text-[#FF6F61] focus:ring-[#FF6F61]"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Bank Statement</div>
                  <div className="text-sm text-gray-600">
                    Upload recent bank statement (within last 3 months) showing account details
                  </div>
                </div>
              </div>
            </div>
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
        <h4 className="font-medium text-gray-900 mb-2">🏦 Bank Account Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Account holder name must match your PAN card name exactly</li>
          <li>• Double-check account number and IFSC code for accuracy</li>
          <li>• Current accounts are recommended for business transactions</li>
          <li>• Bank verification typically takes 1-2 business days</li>
          <li>• You can update bank details later, but re-verification will be required</li>
          <li>• Ensure your account can receive NEFT/RTGS transfers</li>
        </ul>
      </div>
    </div>
  );
};