import React, { useState, useCallback, useMemo } from 'react';
import { ArrowRight, Save, CheckCircle, AlertCircle, MapPin, Building2, Calendar, Tag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps, ValidationResult, SaveOptions } from '../types';

// Define proper form data type
type BusinessFormData = {
  businessName: string;
  businessType: string;
  natureOfBusiness: string;
  yearOfEstablishment: string;
  primaryProductCategories: string;
  registeredAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    country: 'India';
  };
};

const BusinessStepEnhanced: React.FC<BaseStepProps> = ({ 
  seller, 
  onSave, 
  canEdit
}) => {
  const [formData, setFormData] = useState<BusinessFormData>({
    businessName: seller.businessDetails?.businessName || '',
    businessType: seller.businessDetails?.businessType || '',
    natureOfBusiness: seller.businessDetails?.natureOfBusiness || '',
    yearOfEstablishment: seller.businessDetails?.yearOfEstablishment?.toString() || '',
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});

  const businessTypes = [
    { value: 'individual', label: 'Individual/Proprietorship', description: 'Single person business' },
    { value: 'partnership', label: 'Partnership', description: '2+ partners sharing profits' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)', description: 'Partnership with limited liability' },
    { value: 'private_limited', label: 'Private Limited Company', description: 'Separate legal entity, limited liability' },
    { value: 'public_limited', label: 'Public Limited Company', description: 'Can raise capital from public' },
    { value: 'trust', label: 'Trust', description: 'Non-profit organization' },
    { value: 'society', label: 'Society', description: 'Registered society' },
    { value: 'ngo', label: 'NGO', description: 'Non-governmental organization' }
  ];

  const productCategorySuggestions = [
    'Electronics & Gadgets', 'Fashion & Apparel', 'Home & Garden', 'Health & Beauty',
    'Sports & Fitness', 'Books & Media', 'Automotive', 'Baby & Kids', 'Food & Beverages',
    'Jewelry & Accessories', 'Art & Crafts', 'Industrial Supplies', 'Office Supplies'
  ];

  const businessNatureSuggestions = [
    'Manufacturing and selling consumer electronics',
    'Retail clothing and fashion accessories',
    'Wholesale distribution of home appliances',
    'Online marketplace for handmade crafts',
    'Import and export of industrial equipment',
    'Software development and IT services',
    'Food processing and packaging',
    'Educational services and training'
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

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = [
      formData.businessName,
      formData.businessType,
      formData.natureOfBusiness,
      formData.registeredAddress.line1,
      formData.registeredAddress.city,
      formData.registeredAddress.state,
      formData.registeredAddress.pincode
    ];
    
    const completedFields = requiredFields.filter(field => field && field.toString().trim()).length;
    return Math.round((completedFields / requiredFields.length) * 100);
  }, [formData]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(touched).some(key => touched[key]);
  }, [touched]);

  // Enhanced validation with better error messages
  const validateField = useCallback((field: string, value: string): string => {
    switch (field) {
      case 'businessName':
        if (!value.trim()) return 'Business name is required';
        if (value.length < 2) return 'Business name must be at least 2 characters';
        if (value.length > 100) return 'Business name cannot exceed 100 characters';
        if (!/^[a-zA-Z0-9\s&.-]+$/.test(value)) return 'Business name contains invalid characters';
        return '';
      
      case 'businessType':
        if (!value) return 'Please select a business type';
        return '';
      
      case 'natureOfBusiness':
        if (!value.trim()) return 'Nature of business is required';
        if (value.length < 10) return 'Please provide a more detailed description (at least 10 characters)';
        if (value.length > 500) return 'Description cannot exceed 500 characters';
        return '';
      
      case 'yearOfEstablishment':
        if (value && (parseInt(value) < 1900 || parseInt(value) > new Date().getFullYear())) {
          return `Year must be between 1900 and ${new Date().getFullYear()}`;
        }
        return '';
      
      case 'addressLine1':
        if (!value.trim()) return 'Address line 1 is required';
        if (value.length < 5) return 'Please provide a complete address';
        return '';
      
      case 'city':
        if (!value.trim()) return 'City is required';
        if (!/^[a-zA-Z\s.-]+$/.test(value)) return 'City name contains invalid characters';
        return '';
      
      case 'state':
        if (!value.trim()) return 'State is required';
        return '';
      
      case 'pincode':
        if (!value.trim()) return 'PIN code is required';
        if (!/^[1-9][0-9]{5}$/.test(value)) return 'Please enter a valid 6-digit PIN code';
        return '';
      
      default:
        return '';
    }
  }, []);

  const validateForm = (): ValidationResult => {
    const newErrors: Record<string, string> = {};

    // Validate all fields
    newErrors.businessName = validateField('businessName', formData.businessName);
    newErrors.businessType = validateField('businessType', formData.businessType);
    newErrors.natureOfBusiness = validateField('natureOfBusiness', formData.natureOfBusiness);
    newErrors.yearOfEstablishment = validateField('yearOfEstablishment', String(formData.yearOfEstablishment ?? ''));
    newErrors.addressLine1 = validateField('addressLine1', formData.registeredAddress.line1);
    newErrors.city = validateField('city', formData.registeredAddress.city);
    newErrors.state = validateField('state', formData.registeredAddress.state);
    newErrors.pincode = validateField('pincode', formData.registeredAddress.pincode);

    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleInputChange = (field: string, value: string) => {
    // Update form data
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

    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));

    // Real-time validation
    const error = validateField(field.replace('address.', ''), value);
    setErrors(prev => ({ ...prev, [field.replace('address.', '')]: error }));
  };

  const handleSuggestionClick = (field: string, suggestion: string) => {
    handleInputChange(field, suggestion);
    setShowSuggestions(prev => ({ ...prev, [field]: false }));
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
      
      // Normalize payload: Convert yearOfEstablishment from string to number or null
      const dataToSave = {
        ...formData,
        yearOfEstablishment: formData.yearOfEstablishment && formData.yearOfEstablishment.trim() !== '' 
          ? parseInt(formData.yearOfEstablishment) 
          : null
      };
      
      await onSave(dataToSave, options);
      
      // Clear touched state after successful save
      setTouched({});
      
      // Show success feedback
      if (saveAsDraft) {
        console.log('Draft saved successfully');
      } else {
        console.log('Business details saved successfully');
      }
    } catch (error) {
      console.error('Error saving business details:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6F61] rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
              <p className="text-sm text-gray-600">Complete your business information</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Unsaved changes indicator */}
            <AnimatePresence>
              {hasUnsavedChanges && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 text-sm text-amber-600"
                >
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{completionPercentage}% Complete</div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#FF6F61] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <SectionCard
        title="Business Information"
        description="Provide accurate business details for verification and compliance"
        actions={
          !canEdit && (
            <InfoCard type="info" className="text-xs">
              This section has been submitted and is under review
            </InfoCard>
          )
        }
      >
        <form className="space-y-8">
          {/* Business Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <Building2 className="w-5 h-5 text-[#FF6F61]" />
              <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="space-y-2">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                      errors.businessName ? 'border-red-300 bg-red-50' : 
                      touched.businessName && !errors.businessName ? 'border-green-300 bg-green-50' :
                      'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                    placeholder="Enter your registered business name"
                  />
                  {touched.businessName && !errors.businessName && (
                    <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                  )}
                  {errors.businessName && (
                    <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
                  )}
                </div>
                {errors.businessName && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.businessName}
                  </motion.p>
                )}
                <p className="text-xs text-gray-500">
                  Enter the exact name as registered with authorities
                </p>
              </div>

              {/* Business Type */}
              <div className="space-y-2">
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                      errors.businessType ? 'border-red-300 bg-red-50' : 
                      touched.businessType && !errors.businessType ? 'border-green-300 bg-green-50' :
                      'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  >
                    <option value="">Select your business structure</option>
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value} title={type.description}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {touched.businessType && !errors.businessType && formData.businessType && (
                    <CheckCircle className="absolute right-8 top-3 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors.businessType && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.businessType}
                  </motion.p>
                )}
                {formData.businessType && (
                  <p className="text-xs text-blue-600">
                    {businessTypes.find(t => t.value === formData.businessType)?.description}
                  </p>
                )}
              </div>
            </div>

            {/* Nature of Business */}
            <div className="space-y-2">
              <label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700">
                Nature of Business <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  id="natureOfBusiness"
                  value={formData.natureOfBusiness}
                  onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, natureOfBusiness: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, natureOfBusiness: false })), 200)}
                  disabled={!canEdit}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 resize-none ${
                    errors.natureOfBusiness ? 'border-red-300 bg-red-50' : 
                    touched.natureOfBusiness && !errors.natureOfBusiness ? 'border-green-300 bg-green-50' :
                    'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  placeholder="Describe your business activities in detail..."
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {formData.natureOfBusiness.length}/500
                </div>
              </div>
              
              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions.natureOfBusiness && canEdit && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
                  >
                    <p className="text-xs font-medium text-gray-600 px-2 py-1">Suggestions:</p>
                    {businessNatureSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick('natureOfBusiness', suggestion)}
                        className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {errors.natureOfBusiness && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 flex items-center gap-1"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.natureOfBusiness}
                </motion.p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Year of Establishment */}
              <div className="space-y-2">
                <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 inline mr-1" />
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                    errors.yearOfEstablishment ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                  placeholder="YYYY"
                />
                {errors.yearOfEstablishment && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.yearOfEstablishment}
                  </motion.p>
                )}
              </div>

              {/* Primary Product Categories */}
              <div className="space-y-2">
                <label htmlFor="primaryProductCategories" className="block text-sm font-medium text-gray-700">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Primary Product Categories
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="primaryProductCategories"
                    value={formData.primaryProductCategories}
                    onChange={(e) => handleInputChange('primaryProductCategories', e.target.value)}
                    onFocus={() => setShowSuggestions(prev => ({ ...prev, categories: true }))}
                    onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, categories: false })), 200)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 border-gray-300 ${
                      !canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'
                    }`}
                    placeholder="e.g., Electronics, Clothing, Home & Garden"
                  />
                </div>
                
                {/* Category suggestions */}
                <AnimatePresence>
                  {showSuggestions.categories && canEdit && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white border border-gray-200 rounded-lg shadow-lg p-2"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        {productCategorySuggestions.map((category, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              const current = formData.primaryProductCategories;
                              const newValue = current ? `${current}, ${category}` : category;
                              handleSuggestionClick('primaryProductCategories', newValue);
                            }}
                            className="text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Registered Address Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <MapPin className="w-5 h-5 text-[#FF6F61]" />
              <h3 className="text-lg font-medium text-gray-900">Registered Address</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="addressLine1"
                    value={formData.registeredAddress.line1}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                    disabled={!canEdit}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                      errors.addressLine1 ? 'border-red-300 bg-red-50' : 
                      touched['address.line1'] && !errors.addressLine1 ? 'border-green-300 bg-green-50' :
                      'border-gray-300'
                    } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                    placeholder="Building name, street name"
                  />
                  {touched['address.line1'] && !errors.addressLine1 && (
                    <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors.addressLine1 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.addressLine1}
                  </motion.p>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 border-gray-300 ${
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
                  <div className="relative">
                    <input
                      type="text"
                      id="city"
                      value={formData.registeredAddress.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      disabled={!canEdit}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                        errors.city ? 'border-red-300 bg-red-50' : 
                        touched['address.city'] && !errors.city ? 'border-green-300 bg-green-50' :
                        'border-gray-300'
                      } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                      placeholder="Enter city"
                    />
                    {touched['address.city'] && !errors.city && (
                      <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {errors.city && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.city}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="state"
                      value={formData.registeredAddress.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      disabled={!canEdit}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                        errors.state ? 'border-red-300 bg-red-50' : 
                        touched['address.state'] && !errors.state ? 'border-green-300 bg-green-50' :
                        'border-gray-300'
                      } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                    >
                      <option value="">Select state</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {touched['address.state'] && !errors.state && formData.registeredAddress.state && (
                      <CheckCircle className="absolute right-8 top-3 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {errors.state && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.state}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="pincode"
                      value={formData.registeredAddress.pincode}
                      onChange={(e) => handleInputChange('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={!canEdit}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent transition-all duration-200 ${
                        errors.pincode ? 'border-red-300 bg-red-50' : 
                        touched['address.pincode'] && !errors.pincode ? 'border-green-300 bg-green-50' :
                        'border-gray-300'
                      } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
                      placeholder="6-digit PIN code"
                      maxLength={6}
                    />
                    {touched['address.pincode'] && !errors.pincode && formData.registeredAddress.pincode.length === 6 && (
                      <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {errors.pincode && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.pincode}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200"
            >
              <button
                type="button"
                onClick={() => handleSave({ saveAsDraft: true })}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Draft...' : 'Save as Draft'}
              </button>
              
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </form>
      </SectionCard>

      {/* Enhanced Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <InfoCard type="info" title="Important Guidelines">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Business Name</p>
                <p className="text-gray-600">Must match your official registration documents exactly</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Registered Address</p>
                <p className="text-gray-600">Will be used for legal correspondence and document verification</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Manual Save</p>
                <p className="text-gray-600">Click "Save as Draft" or "Save & Continue" to save your progress</p>
              </div>
            </div>
          </div>
        </InfoCard>
      </motion.div>
    </div>
  );
};

export default BusinessStepEnhanced;