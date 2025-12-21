import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface AddressInfoFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: 'India';
  landmark: string;
  addressType: 'registered' | 'warehouse' | 'pickup';
}

export const AddressInfoForm: React.FC<AddressInfoFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [formData, setFormData] = useState({
    registeredAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India' as const,
      landmark: '',
      addressType: 'registered' as const
    },
    warehouseAddresses: [] as Address[],
    sameAsRegistered: true
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry',
    'Andaman and Nicobar Islands'
  ];

  const validateAddress = (address: Address, prefix: string = '') => {
    const errors: Record<string, string> = {};

    if (!address.line1.trim()) {
      errors[`${prefix}line1`] = 'Address line 1 is required';
    }

    if (!address.city.trim()) {
      errors[`${prefix}city`] = 'City is required';
    }

    if (!address.state) {
      errors[`${prefix}state`] = 'State is required';
    }

    if (!address.pincode.trim()) {
      errors[`${prefix}pincode`] = 'Pincode is required';
    } else if (!/^\d{6}$/.test(address.pincode)) {
      errors[`${prefix}pincode`] = 'Enter valid 6-digit pincode';
    }

    return errors;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate registered address
    const registeredErrors = validateAddress(formData.registeredAddress, 'registered.');
    Object.assign(errors, registeredErrors);

    // Validate warehouse addresses if different from registered
    if (!formData.sameAsRegistered) {
      formData.warehouseAddresses.forEach((address, index) => {
        const warehouseErrors = validateAddress(address, `warehouse.${index}.`);
        Object.assign(errors, warehouseErrors);
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (addressType: 'registered' | 'warehouse', field: string, value: string, index?: number) => {
    if (addressType === 'registered') {
      setFormData(prev => ({
        ...prev,
        registeredAddress: { ...prev.registeredAddress, [field]: value }
      }));
    } else if (addressType === 'warehouse' && index !== undefined) {
      setFormData(prev => ({
        ...prev,
        warehouseAddresses: prev.warehouseAddresses.map((addr, i) => 
          i === index ? { ...addr, [field]: value } : addr
        )
      }));
    }

    // Clear validation error
    const errorKey = addressType === 'registered' 
      ? `registered.${field}` 
      : `warehouse.${index}.${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleSameAsRegisteredChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAsRegistered: checked,
      warehouseAddresses: checked ? [] : [{
        ...prev.registeredAddress,
        addressType: 'warehouse' as const
      }]
    }));
  };

  const addWarehouseAddress = () => {
    setFormData(prev => ({
      ...prev,
      warehouseAddresses: [...prev.warehouseAddresses, {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        landmark: '',
        addressType: 'warehouse'
      }]
    }));
  };

  const removeWarehouseAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      warehouseAddresses: prev.warehouseAddresses.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const submitData = {
      registeredAddress: formData.registeredAddress,
      warehouseAddresses: formData.sameAsRegistered ? [formData.registeredAddress] : formData.warehouseAddresses
    };
    
    await onSubmit(submitData, false);
  };

  const handlePartialSave = async () => {
    const submitData = {
      registeredAddress: formData.registeredAddress,
      warehouseAddresses: formData.sameAsRegistered ? [formData.registeredAddress] : formData.warehouseAddresses
    };
    
    await onSubmit(submitData, true);
  };

  const renderAddressForm = (
    address: Address, 
    prefix: string, 
    title: string, 
    onChange: (field: string, value: string) => void,
    onRemove?: () => void
  ) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{title}</h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address Line 1 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.line1}
            onChange={(e) => onChange('line1', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
              validationErrors[`${prefix}line1`] ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Building name, floor, room number"
          />
          {validationErrors[`${prefix}line1`] && (
            <p className="mt-1 text-sm text-red-600">{validationErrors[`${prefix}line1`]}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 2 <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            value={address.line2}
            onChange={(e) => onChange('line2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent"
            placeholder="Street name, area"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => onChange('city', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
              validationErrors[`${prefix}city`] ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter city"
          />
          {validationErrors[`${prefix}city`] && (
            <p className="mt-1 text-sm text-red-600">{validationErrors[`${prefix}city`]}</p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            value={address.state}
            onChange={(e) => onChange('state', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
              validationErrors[`${prefix}state`] ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select state</option>
            {indianStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {validationErrors[`${prefix}state`] && (
            <p className="mt-1 text-sm text-red-600">{validationErrors[`${prefix}state`]}</p>
          )}
        </div>

        {/* Pincode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.pincode}
            onChange={(e) => onChange('pincode', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
              validationErrors[`${prefix}pincode`] ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="123456"
            maxLength={6}
          />
          {validationErrors[`${prefix}pincode`] && (
            <p className="mt-1 text-sm text-red-600">{validationErrors[`${prefix}pincode`]}</p>
          )}
        </div>

        {/* Landmark */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Landmark <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            value={address.landmark}
            onChange={(e) => onChange('landmark', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent"
            placeholder="Near landmark"
          />
        </div>
      </div>
    </div>
  );

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

        {/* Registered Address */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Registered Business Address</h3>
          {renderAddressForm(
            formData.registeredAddress,
            'registered.',
            'Registered Address',
            (field, value) => handleAddressChange('registered', field, value)
          )}
        </div>

        {/* Warehouse Address Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse/Pickup Address</h3>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.sameAsRegistered}
                onChange={(e) => handleSameAsRegisteredChange(e.target.checked)}
                className="text-[#FF6F61] focus:ring-[#FF6F61] rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Same as registered address
              </span>
            </label>
          </div>

          {!formData.sameAsRegistered && (
            <div className="space-y-4">
              {formData.warehouseAddresses.map((address, index) => (
                <div key={index}>
                  {renderAddressForm(
                    address,
                    `warehouse.${index}.`,
                    `Warehouse Address ${index + 1}`,
                    (field, value) => handleAddressChange('warehouse', field, value, index),
                    formData.warehouseAddresses.length > 1 ? () => removeWarehouseAddress(index) : undefined
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addWarehouseAddress}
                className="flex items-center text-[#FF6F61] hover:text-[#E55A4F] text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Another Warehouse Address
              </button>
            </div>
          )}
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
        <h4 className="font-medium text-gray-900 mb-2">📍 Address Information Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Registered address should match your business registration documents</li>
          <li>• Warehouse address is where you'll store and ship products from</li>
          <li>• You can add multiple warehouse addresses if you have multiple locations</li>
          <li>• Accurate addresses help with shipping calculations and delivery estimates</li>
          <li>• All addresses must be within India for domestic selling</li>
        </ul>
      </div>
    </div>
  );
};